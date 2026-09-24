import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Quién puede validar y puntuar (§5, §11).
 *
 * «Una fundadora no puede validar ni puntuar sus propios puntos» es el
 * criterio que sostiene la credibilidad de los scores ante un inversor. Se
 * comprueba en base, que es donde tiene que estar: si solo estuviera en la
 * interfaz, bastaría una petición directa a la API para saltárselo.
 */

let fundadoraMarea: SupabaseClient;
let fundadoraVega: SupabaseClient;
let ctoMarea: SupabaseClient;
let equipoIwl: SupabaseClient;
let revisorMareaRaiz: SupabaseClient;
let revisorVega: SupabaseClient;
let mentor: SupabaseClient;

const servicio = clienteServicio();

beforeAll(async () => {
  [
    fundadoraMarea,
    fundadoraVega,
    ctoMarea,
    equipoIwl,
    revisorMareaRaiz,
    revisorVega,
    mentor,
  ] = await Promise.all([
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.fundadoraVega),
    entrarComo(USUARIOS.ctoMarea),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.revisorMareaRaiz),
    entrarComo(USUARIOS.revisorVega),
    entrarComo(USUARIOS.mentor),
  ]);
});

async function puntuacionDe(companyId: string) {
  const { data } = await servicio
    .from("tech_scores")
    .select("id, level, dimension_id, assessment_id")
    .eq("company_id", companyId)
    .limit(1)
    .single();
  return data!;
}

describe("puntuación técnica", () => {
  it("la fundadora lee su puntuación pero no la cambia", async () => {
    const puntuacion = await puntuacionDe(COMPANIAS.marea);

    const lectura = await fundadoraMarea
      .from("tech_scores")
      .select("id, level")
      .eq("id", puntuacion.id);

    expect(lectura.error).toBeNull();
    expect(lectura.data).toHaveLength(1);

    const escritura = await fundadoraMarea
      .from("tech_scores")
      .update({ level: 4 })
      .eq("id", puntuacion.id)
      .select();

    expect(escritura.data ?? []).toEqual([]);

    const { data: real } = await servicio
      .from("tech_scores")
      .select("level")
      .eq("id", puntuacion.id)
      .single();

    expect(real?.level).toBe(puntuacion.level);
  });

  it("el CTO de la compañía tampoco puntúa: es parte del equipo evaluado", async () => {
    const puntuacion = await puntuacionDe(COMPANIAS.marea);

    const { data } = await ctoMarea
      .from("tech_scores")
      .update({ level: 4 })
      .eq("id", puntuacion.id)
      .select();

    expect(data ?? []).toEqual([]);
  });

  it("el revisor de Niage asignado sí puntúa", async () => {
    const puntuacion = await puntuacionDe(COMPANIAS.marea);

    const { data, error } = await revisorMareaRaiz
      .from("tech_scores")
      .update({ level: puntuacion.level })
      .eq("id", puntuacion.id)
      .select("id");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("un revisor no puntúa compañías que no lleva", async () => {
    const puntuacion = await puntuacionDe(COMPANIAS.marea);

    const { data } = await revisorVega
      .from("tech_scores")
      .update({ level: 0 })
      .eq("id", puntuacion.id)
      .select();

    expect(data ?? []).toEqual([]);
  });

  it("una puntuación necesita evidencia", async () => {
    const { data: evaluacion } = await servicio
      .from("tech_assessments")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .single();

    const { data: dimension } = await servicio
      .from("tech_dimensions")
      .select("id")
      .eq("code", "escalabilidad_rendimiento")
      .single();

    const { error } = await revisorMareaRaiz.from("tech_scores").insert({
      assessment_id: evaluacion!.id,
      company_id: COMPANIAS.marea,
      dimension_id: dimension!.id,
      level: 3,
      evidence: null,
    });

    expect(error).not.toBeNull();
  });
});

describe("hallazgos técnicos", () => {
  it("la fundadora no registra ni cierra hallazgos", async () => {
    const { data: hallazgo } = await servicio
      .from("tech_findings")
      .select("id, status")
      .eq("company_id", COMPANIAS.marea)
      .eq("status", "abierto")
      .limit(1)
      .single();

    const cierre = await fundadoraMarea
      .from("tech_findings")
      .update({ status: "resuelto" })
      .eq("id", hallazgo!.id)
      .select();

    expect(cierre.data ?? []).toEqual([]);

    const alta = await fundadoraMarea.from("tech_findings").insert({
      company_id: COMPANIAS.marea,
      dimension_id: (
        await servicio.from("tech_dimensions").select("id").eq("code", "seguridad").single()
      ).data!.id,
      severity: "bajo",
      title: "Hallazgo escrito por la compañía",
      description: "No debería poder crearse",
      recommendation: "Ninguna",
    });

    expect(alta.error).not.toBeNull();
  });

  it("aceptar un riesgo obliga a escribir el motivo", async () => {
    const { data: hallazgo } = await servicio
      .from("tech_findings")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .limit(1)
      .single();

    const sinMotivo = await revisorMareaRaiz
      .from("tech_findings")
      .update({ status: "aceptado" })
      .eq("id", hallazgo!.id);

    expect(sinMotivo.error).not.toBeNull();

    const conMotivo = await revisorMareaRaiz
      .from("tech_findings")
      .update({
        status: "aceptado",
        acceptance_note: "Riesgo asumido hasta el cierre de la ronda, revisable en enero.",
      })
      .eq("id", hallazgo!.id)
      .select();

    expect(conMotivo.error).toBeNull();
    expect(conMotivo.data).toHaveLength(1);

    await servicio
      .from("tech_findings")
      .update({ status: "abierto", acceptance_note: null })
      .eq("id", hallazgo!.id);
  });
});

describe("cuestionario técnico", () => {
  it("la fundadora sí responde el cuestionario de su compañía", async () => {
    const { data: criterio } = await servicio
      .from("tech_criteria")
      .select("id")
      .eq("code", "arq_diagrama")
      .single();

    const { error } = await fundadoraMarea
      .from("tech_questionnaire_answers")
      .upsert(
        {
          company_id: COMPANIAS.marea,
          criterion_id: criterio!.id,
          answer: "Diagrama actualizado en agosto, adjunto en el data room.",
          answered_at: new Date().toISOString(),
        },
        { onConflict: "company_id,criterion_id" },
      );

    expect(error).toBeNull();
  });

  it("no responde el de otra compañía", async () => {
    const { data: criterio } = await servicio
      .from("tech_criteria")
      .select("id")
      .eq("code", "arq_diagrama")
      .single();

    const { error } = await fundadoraVega.from("tech_questionnaire_answers").insert({
      company_id: COMPANIAS.marea,
      criterion_id: criterio!.id,
      answer: "Respuesta cruzada",
    });

    expect(error).not.toBeNull();
  });
});

describe("evaluaciones en borrador", () => {
  it("la compañía no ve una evaluación sin publicar", async () => {
    const { data: borrador } = await servicio
      .from("tech_assessments")
      .insert({
        company_id: COMPANIAS.marea,
        stage: "semilla",
        tech_profile: "software",
        status: "borrador",
        summary: "Revisión en curso",
      })
      .select("id")
      .single();

    const vistaFundadora = await fundadoraMarea
      .from("tech_assessments")
      .select("id")
      .eq("id", borrador!.id);

    const vistaRevisor = await revisorMareaRaiz
      .from("tech_assessments")
      .select("id")
      .eq("id", borrador!.id);

    expect(vistaFundadora.data ?? []).toEqual([]);
    expect(vistaRevisor.data).toHaveLength(1);

    await servicio.from("tech_assessments").delete().eq("id", borrador!.id);
  });
});

describe("due diligence general", () => {
  async function puntoDe(companyId: string, estado: string) {
    const { data } = await servicio
      .from("dd_items")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("status", estado)
      .limit(1)
      .single();
    return data!;
  }

  it("la fundadora marca un punto como entregado", async () => {
    const punto = await puntoDe(COMPANIAS.vega, "pendiente");

    const { error } = await fundadoraVega
      .from("dd_items")
      .update({ status: "entregado" })
      .eq("id", punto.id);

    expect(error).toBeNull();

    await servicio.from("dd_items").update({ status: "pendiente" }).eq("id", punto.id);
  });

  it("la fundadora no da por validado su propio punto", async () => {
    const punto = await puntoDe(COMPANIAS.vega, "pendiente");

    const { error } = await fundadoraVega
      .from("dd_items")
      .update({ status: "validado" })
      .eq("id", punto.id);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("equipo de IWL");
  });

  it("la fundadora tampoco marca nada como bloqueante", async () => {
    const punto = await puntoDe(COMPANIAS.vega, "pendiente");

    const { error } = await fundadoraVega
      .from("dd_items")
      .update({ status: "bloqueante" })
      .eq("id", punto.id);

    expect(error).not.toBeNull();
  });

  it("el equipo de IWL valida, y queda quién y cuándo", async () => {
    const punto = await puntoDe(COMPANIAS.vega, "pendiente");

    const { error } = await equipoIwl
      .from("dd_items")
      .update({ status: "validado" })
      .eq("id", punto.id);

    expect(error).toBeNull();

    const { data } = await servicio
      .from("dd_items")
      .select("validated_by, validated_at")
      .eq("id", punto.id)
      .single();

    expect(data?.validated_by).not.toBeNull();
    expect(data?.validated_at).not.toBeNull();

    await servicio
      .from("dd_items")
      .update({ status: "pendiente" })
      .eq("id", punto.id);
  });

  it("cada cambio de estado queda en el historial", async () => {
    const punto = await puntoDe(COMPANIAS.vega, "pendiente");

    await fundadoraVega.from("dd_items").update({ status: "entregado" }).eq("id", punto.id);

    const { data } = await servicio
      .from("dd_item_status_history")
      .select("from_status, to_status")
      .eq("dd_item_id", punto.id)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(data?.[0]).toMatchObject({ from_status: "pendiente", to_status: "entregado" });

    await servicio.from("dd_items").update({ status: "pendiente" }).eq("id", punto.id);
  });
});

describe("business plan", () => {
  async function seccionDe(companyId: string, codigo: string) {
    const { data: plantilla } = await servicio
      .from("bp_section_templates")
      .select("id")
      .eq("code", codigo)
      .single();

    const { data } = await servicio
      .from("bp_sections")
      .select("id, status, current_version")
      .eq("company_id", companyId)
      .eq("template_id", plantilla!.id)
      .single();

    return data!;
  }

  it("la fundadora edita y manda a revisión, pero no valida", async () => {
    const seccion = await seccionDe(COMPANIAS.vega, "mercado");

    const edicion = await fundadoraVega
      .from("bp_sections")
      .update({ content: `Mercado revisado ${Date.now()}`, status: "en_revision" })
      .eq("id", seccion.id);

    expect(edicion.error).toBeNull();

    const validacion = await fundadoraVega
      .from("bp_sections")
      .update({ status: "validada" })
      .eq("id", seccion.id);

    expect(validacion.error).not.toBeNull();
    expect(validacion.error?.message).toContain("equipo de IWL");
  });

  it("cada cambio de contenido deja versión con su autor", async () => {
    const seccion = await seccionDe(COMPANIAS.vega, "equipo");
    const versionInicial = seccion.current_version;

    await fundadoraVega
      .from("bp_sections")
      .update({ content: `Equipo actualizado ${Date.now()}` })
      .eq("id", seccion.id);

    const { data } = await servicio
      .from("bp_section_versions")
      .select("version, author_id")
      .eq("section_id", seccion.id)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    expect(data?.version).toBe(versionInicial + 1);
    expect(data?.author_id).not.toBeNull();
  });

  it("guardar el mismo contenido no crea versión nueva", async () => {
    const seccion = await seccionDe(COMPANIAS.vega, "problema");

    const { data: antes } = await servicio
      .from("bp_sections")
      .select("content, current_version")
      .eq("id", seccion.id)
      .single();

    await fundadoraVega
      .from("bp_sections")
      .update({ content: antes!.content })
      .eq("id", seccion.id);

    const { data: despues } = await servicio
      .from("bp_sections")
      .select("current_version")
      .eq("id", seccion.id)
      .single();

    expect(despues?.current_version).toBe(antes!.current_version);
  });

  it("el historial de otra compañía no se ve", async () => {
    const { data } = await fundadoraVega
      .from("bp_section_versions")
      .select("company_id");

    expect(data?.every((v) => v.company_id === COMPANIAS.vega)).toBe(true);
  });
});

describe("update mensual y KPI", () => {
  it("la fundadora entrega el update, pero no lo da por revisado", async () => {
    const { data: update } = await servicio
      .from("monthly_updates")
      .select("id, status")
      .eq("company_id", COMPANIAS.vega)
      .eq("status", "entregado")
      .limit(1)
      .single();

    const { error } = await fundadoraVega
      .from("monthly_updates")
      .update({ status: "revisado" })
      .eq("id", update!.id);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("equipo de IWL");
  });

  it("los KPI de una compañía no se leen desde otra", async () => {
    const { data } = await fundadoraVega.from("kpi_values").select("company_id");

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((v) => v.company_id === COMPANIAS.vega)).toBe(true);
  });

  it("la vista de series respeta el mismo aislamiento", async () => {
    const { data } = await fundadoraMarea.from("kpi_series").select("company_id, code");

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((v) => v.company_id === COMPANIAS.marea)).toBe(true);
  });

  it("la vista del score técnico también", async () => {
    const { data } = await fundadoraMarea
      .from("tech_score_input")
      .select("company_id, dimension_code, level, target_level, weight");

    expect(data?.length).toBe(10);
    expect(data?.every((d) => d.company_id === COMPANIAS.marea)).toBe(true);
  });
});

describe("mentor", () => {
  it("un mentor lee el business plan de su compañía pero no lo edita", async () => {
    const lectura = await mentor.from("bp_sections").select("id, company_id");

    expect(lectura.error).toBeNull();
    expect(lectura.data?.every((s) => s.company_id === COMPANIAS.marea)).toBe(true);

    const escritura = await mentor
      .from("bp_sections")
      .update({ content: "Editado por el mentor" })
      .eq("id", lectura.data![0].id)
      .select();

    expect(escritura.data ?? []).toEqual([]);
  });
});
