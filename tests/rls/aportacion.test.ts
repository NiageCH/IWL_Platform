import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Registro de aportación y línea base.
 *
 * El reparto es el del documento de aportación (§5): la compañía carga y ve,
 * IWL registra su aportación y valida. Nadie valida su propio trabajo.
 */

let fundadoraMarea: SupabaseClient;
let fundadoraVega: SupabaseClient;
let equipoIwl: SupabaseClient;
let admin: SupabaseClient;

const servicio = clienteServicio();

beforeAll(async () => {
  [fundadoraMarea, fundadoraVega, equipoIwl, admin] = await Promise.all([
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.fundadoraVega),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.admin),
  ]);
});

/** Deja una compañía con Anexo y una hora imputada, y devuelve sus ids */
async function prepararAportacion(companyId: string) {
  const { data: anexoExistente } = await servicio
    .from("annexes")
    .select("id")
    .eq("company_id", companyId)
    .limit(1)
    .maybeSingle();

  const anexoId =
    anexoExistente?.id ??
    (
      await servicio
        .from("annexes")
        .insert({
          company_id: companyId,
          status: "firmado",
          signed_on: "2026-04-01",
          committed_hours: 100,
          committed_cash: 10000,
          equity_pct: 8,
        })
        .select("id")
        .single()
    ).data!.id;

  const { data: materia } = await servicio
    .from("contribution_subjects")
    .select("id")
    .limit(1)
    .single();

  return { anexoId, materiaId: materia!.id };
}

describe("horas de aportación", () => {
  it("las registra IWL, no la compañía", async () => {
    const { anexoId, materiaId } = await prepararAportacion(COMPANIAS.marea);

    const deLaFundadora = await fundadoraMarea.from("contribution_hours").insert({
      company_id: COMPANIAS.marea,
      annex_id: anexoId,
      worked_on: "2026-09-01",
      person_name: "Yo misma",
      profile_code: "socio",
      subject_id: materiaId,
      description: "Horas que me apunto yo",
      hours: 8,
      applied_rate: 95,
      market_rate: 180,
    });

    expect(deLaFundadora.error).not.toBeNull();

    const deIwl = await equipoIwl.from("contribution_hours").insert({
      company_id: COMPANIAS.marea,
      annex_id: anexoId,
      worked_on: "2026-09-01",
      person_name: "Programa IWL",
      profile_code: "operacion",
      subject_id: materiaId,
      description: "Sesión de seguimiento mensual",
      hours: 2,
    });

    expect(deIwl.error).toBeNull();
  });

  /**
   * Criterio de aceptación del documento §10: un cambio de tarifa no altera
   * el valor de las horas ya registradas. Por eso la tarifa se copia en la
   * línea y no se referencia.
   */
  it("un cambio de tarifa no reescribe las horas ya imputadas", async () => {
    const { anexoId, materiaId } = await prepararAportacion(COMPANIAS.marea);

    const { data: antes } = await servicio
      .from("contribution_hours")
      .insert({
        company_id: COMPANIAS.marea,
        annex_id: anexoId,
        worked_on: "2026-08-15",
        person_name: "Prueba de tarifa",
        profile_code: "senior",
        subject_id: materiaId,
        description: "Línea para comprobar que la tarifa queda congelada",
        hours: 10,
      })
      .select("applied_rate, market_rate")
      .single();

    expect(Number(antes!.applied_rate)).toBe(80);

    // Se cambia la tarifa del perfil
    const { data: tarifa } = await servicio
      .from("rate_cards")
      .select("id, applied_rate")
      .eq("profile_code", "senior")
      .single();

    await servicio
      .from("rate_cards")
      .update({ applied_rate: 999 })
      .eq("id", tarifa!.id);

    const { data: despues } = await servicio
      .from("contribution_hours")
      .select("applied_rate")
      .eq("person_name", "Prueba de tarifa")
      .single();

    expect(Number(despues!.applied_rate)).toBe(80);

    await servicio
      .from("rate_cards")
      .update({ applied_rate: tarifa!.applied_rate })
      .eq("id", tarifa!.id);
    await servicio
      .from("contribution_hours")
      .delete()
      .eq("person_name", "Prueba de tarifa");
  });

  it("la compañía ve su extracto con el valor en euros", async () => {
    const { data, error } = await fundadoraMarea
      .from("contribution_hours_valued")
      .select("applied_value, market_value, discount_value")
      .eq("company_id", COMPANIAS.marea);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    // El valor no se le oculta: es el argumento del equity (§7.1)
    expect(Number(data![0].applied_value)).toBeGreaterThan(0);
  });

  it("ninguna compañía ve el extracto de otra", async () => {
    const { data } = await fundadoraVega
      .from("contribution_hours_valued")
      .select("company_id");

    expect(data?.every((h) => h.company_id === COMPANIAS.vega)).toBe(true);
  });
});

describe("objeciones", () => {
  it("la compañía objeta una hora y IWL la resuelve", async () => {
    const { data: hora } = await servicio
      .from("contribution_hours")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .limit(1)
      .single();

    const { data: perfil } = await servicio
      .from("profiles")
      .select("id")
      .eq("email", USUARIOS.fundadoraMarea)
      .single();

    const alta = await fundadoraMarea.from("objections").insert({
      company_id: COMPANIAS.marea,
      entity: "contribution_hours",
      entity_id: hora!.id,
      reason: "Esa sesión duró una hora, no dos.",
      raised_by: perfil!.id,
    });

    expect(alta.error).toBeNull();

    // Resolverla es de IWL
    const { data: objecion } = await servicio
      .from("objections")
      .select("id")
      .eq("entity_id", hora!.id)
      .limit(1)
      .single();

    const porLaFundadora = await fundadoraMarea
      .from("objections")
      .update({ status: "aceptada" })
      .eq("id", objecion!.id)
      .select();

    expect(porLaFundadora.data ?? []).toEqual([]);

    const porIwl = await equipoIwl
      .from("objections")
      .update({ status: "aceptada", resolution: "Corregido a una hora." })
      .eq("id", objecion!.id)
      .select();

    expect(porIwl.data).toHaveLength(1);

    await servicio.from("objections").delete().eq("id", objecion!.id);
  });
});

describe("introducciones", () => {
  it("las crea IWL; la compañía actualiza el resultado", async () => {
    const { data: contacto } = await servicio
      .from("contacts")
      .insert({ name: "Contacto de prueba", kind: "cliente" })
      .select("id")
      .single();

    const deLaFundadora = await fundadoraMarea.from("introductions").insert({
      company_id: COMPANIAS.marea,
      contact_id: contacto!.id,
      introducer_name: "Yo misma",
      introduced_on: "2026-09-01",
    });

    expect(deLaFundadora.error).not.toBeNull();

    const { data: introduccion } = await servicio
      .from("introductions")
      .insert({
        company_id: COMPANIAS.marea,
        contact_id: contacto!.id,
        introducer_name: "Dirección IWL",
        introduced_on: "2026-09-01",
        counts_for_commission: true,
      })
      .select("id")
      .single();

    // La compañía sí actualiza cómo fue
    const actualizacion = await fundadoraMarea
      .from("introductions")
      .update({ status: "reunion_celebrada", outcome: "Reunión el día 12." })
      .eq("id", introduccion!.id)
      .select();

    expect(actualizacion.data).toHaveLength(1);

    await servicio.from("introductions").delete().eq("id", introduccion!.id);
    await servicio.from("contacts").delete().eq("id", contacto!.id);
  });

  /**
   * La agenda de contactos es de IWL y se comparte entre la cartera, pero la
   * compañía sí ve con quién la presentaron: si no, su extracto diría
   * «reunión con alguien», que no es información.
   */
  it("la compañía ve el contacto de su introducción, no la agenda entera", async () => {
    const { data: ajeno } = await servicio
      .from("contacts")
      .insert({ name: "Contacto de otra compañía", kind: "inversor" })
      .select("id")
      .single();

    const { data: propio } = await servicio
      .from("contacts")
      .insert({ name: "Contacto presentado a Marea", kind: "cliente" })
      .select("id")
      .single();

    const { data: intro } = await servicio
      .from("introductions")
      .insert({
        company_id: COMPANIAS.marea,
        contact_id: propio!.id,
        introducer_name: "Dirección IWL",
        introduced_on: "2026-09-01",
      })
      .select("id")
      .single();

    const visibles = await fundadoraMarea.from("contacts").select("id, name");
    const ids = (visibles.data ?? []).map((c) => c.id);

    expect(ids).toContain(propio!.id);
    expect(ids).not.toContain(ajeno!.id);

    await servicio.from("introductions").delete().eq("id", intro!.id);
    await servicio.from("contacts").delete().in("id", [ajeno!.id, propio!.id]);
  });
});

describe("línea base", () => {
  it("no se puede editar una vez creada", async () => {
    const { data: linea } = await servicio
      .from("baselines")
      .insert({
        company_id: COMPANIAS.marea,
        kind: "inicial",
        taken_on: "2026-04-01",
        stage: "semilla",
        content: { kpi: { caja: 300000 }, nota: "Foto de partida" },
      })
      .select("id")
      .single();

    // Ni siquiera con la clave de servicio: el trigger no distingue
    const { error } = await servicio
      .from("baselines")
      .update({ content: { kpi: { caja: 999999 } } })
      .eq("id", linea!.id);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("no se edita");

    await servicio.from("baselines").delete().eq("id", linea!.id);
  });
});

describe("anexo", () => {
  it("un Anexo firmado no se reescribe", async () => {
    const { anexoId } = await prepararAportacion(COMPANIAS.raiz);

    await servicio.from("annexes").update({ status: "firmado" }).eq("id", anexoId);

    const { error } = await equipoIwl
      .from("annexes")
      .update({ committed_hours: 9999 })
      .eq("id", anexoId);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("versión nueva");
  });

  it("la compañía lee su Anexo pero no lo escribe", async () => {
    const lectura = await fundadoraMarea.from("annexes").select("id, company_id");
    expect(lectura.error).toBeNull();
    expect(lectura.data?.every((a) => a.company_id === COMPANIAS.marea)).toBe(true);

    const escritura = await fundadoraMarea
      .from("annexes")
      .update({ equity_pct: 0 })
      .eq("company_id", COMPANIAS.marea)
      .select();

    expect(escritura.data ?? []).toEqual([]);
  });
});

describe("hitos", () => {
  it("la compañía mueve el hito pero no lo da por cumplido", async () => {
    const { data: hito } = await servicio
      .from("milestones")
      .insert({
        company_id: COMPANIAS.marea,
        title: "Hito de prueba",
        success_criteria: "Que este test pase.",
        status: "pendiente",
      })
      .select("id")
      .single();

    const enCurso = await fundadoraMarea
      .from("milestones")
      .update({ status: "en_curso" })
      .eq("id", hito!.id);

    expect(enCurso.error).toBeNull();

    const cumplido = await fundadoraMarea
      .from("milestones")
      .update({ status: "cumplido" })
      .eq("id", hito!.id);

    expect(cumplido.error).not.toBeNull();
    expect(cumplido.error?.message).toContain("equipo de IWL");

    const porIwl = await equipoIwl
      .from("milestones")
      .update({ status: "cumplido" })
      .eq("id", hito!.id);

    expect(porIwl.error).toBeNull();

    // Y queda sellado quién y cuándo
    const { data } = await servicio
      .from("milestones")
      .select("confirmed_by, confirmed_at, completed_on")
      .eq("id", hito!.id)
      .single();

    expect(data?.confirmed_by).not.toBeNull();
    expect(data?.completed_on).not.toBeNull();

    await servicio.from("milestones").delete().eq("id", hito!.id);
  });
});

describe("tarifas", () => {
  it("solo admin las cambia, pero todo el mundo las ve", async () => {
    const lectura = await fundadoraMarea.from("rate_cards").select("profile_code");
    expect(lectura.data?.length).toBeGreaterThan(0);

    const { data: tarifa } = await servicio
      .from("rate_cards")
      .select("id, applied_rate")
      .limit(1)
      .single();

    const porIwl = await equipoIwl
      .from("rate_cards")
      .update({ applied_rate: 1 })
      .eq("id", tarifa!.id)
      .select();

    expect(porIwl.data ?? []).toEqual([]);

    const porAdmin = await admin
      .from("rate_cards")
      .update({ applied_rate: tarifa!.applied_rate })
      .eq("id", tarifa!.id)
      .select();

    expect(porAdmin.data).toHaveLength(1);
  });
});
