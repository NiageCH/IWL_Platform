import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Hoja de ruta.
 *
 * El plan lo diseña IWL y lo lee la compañía. Cambiar el plan es una
 * conversación, no un formulario: la fundadora no mueve sus etapas. Lo que sí
 * hace es mover sus hitos, que es trabajo suyo.
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

describe("quién ve la hoja de ruta", () => {
  it("la fundadora ve las etapas de su compañía y ninguna más", async () => {
    const { data } = await fundadoraMarea
      .from("roadmap_stages")
      .select("company_id, name");

    expect(data?.length).toBeGreaterThan(0);
    expect(new Set(data?.map((e) => e.company_id))).toEqual(
      new Set([COMPANIAS.marea]),
    );
  });

  it("una fundadora de otra compañía no ve nada de esta", async () => {
    const { data } = await fundadoraVega
      .from("roadmap_stages")
      .select("id")
      .eq("company_id", COMPANIAS.marea);

    expect(data).toEqual([]);
  });

  it("el equipo de IWL ve las de toda la cartera", async () => {
    const { data } = await equipoIwl.from("roadmap_stages").select("company_id");
    const companias = new Set(data?.map((e) => e.company_id));
    expect(companias.size).toBeGreaterThan(1);
  });
});

describe("quién diseña la hoja de ruta", () => {
  it("la fundadora no puede crear una etapa", async () => {
    const { error } = await fundadoraMarea.from("roadmap_stages").insert({
      company_id: COMPANIAS.marea,
      name: "Etapa que no debería existir",
      objective: "Comprobar que la política bloquea la escritura.",
      order_index: 99,
    });

    expect(error).not.toBeNull();
  });

  it("la fundadora no puede mover las fechas de una etapa suya", async () => {
    const { data: etapa } = await servicio
      .from("roadmap_stages")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .limit(1)
      .single();

    const { data } = await fundadoraMarea
      .from("roadmap_stages")
      .update({ ends_on: "2030-01-01" })
      .eq("id", etapa!.id)
      .select();

    // La política no deja pasar la fila: no hay error, pero no cambia nada
    expect(data).toEqual([]);
  });

  it("el equipo de IWL crea y borra etapas", async () => {
    const { data: creada, error } = await equipoIwl
      .from("roadmap_stages")
      .insert({
        company_id: COMPANIAS.vega,
        name: "Etapa de prueba",
        objective: "Comprobar que el equipo de IWL sí puede escribir.",
        order_index: 90,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(creada?.status).toBe("planificada");

    await equipoIwl.from("roadmap_stages").delete().eq("id", creada!.id);
  });
});

describe("borrar una etapa no borra sus hitos", () => {
  it("el hito sobrevive y se queda sin etapa", async () => {
    const { data: etapa } = await equipoIwl
      .from("roadmap_stages")
      .insert({
        company_id: COMPANIAS.vega,
        name: "Etapa efímera",
        objective: "Se va a borrar para ver qué pasa con sus hitos.",
        order_index: 91,
      })
      .select()
      .single();

    const { data: hito } = await equipoIwl
      .from("milestones")
      .insert({
        company_id: COMPANIAS.vega,
        stage_id: etapa!.id,
        title: "Hito acordado en sesión",
        success_criteria: "Un criterio comprobable cualquiera.",
      })
      .select()
      .single();

    await equipoIwl.from("roadmap_stages").delete().eq("id", etapa!.id);

    const { data: despues } = await equipoIwl
      .from("milestones")
      .select("id, stage_id")
      .eq("id", hito!.id)
      .single();

    expect(despues).not.toBeNull();
    expect(despues!.stage_id).toBeNull();

    await equipoIwl.from("milestones").delete().eq("id", hito!.id);
  });
});

describe("las plantillas son configuración de la dirección", () => {
  it("cualquiera con sesión las lee: la fundadora entiende de dónde sale su plan", async () => {
    const { data } = await fundadoraMarea
      .from("roadmap_templates")
      .select("code, name");

    expect(data?.length).toBeGreaterThan(0);
  });

  it("el equipo de IWL no las cambia; la dirección sí", async () => {
    const { error: falloEquipo } = await equipoIwl
      .from("roadmap_templates")
      .insert({
        code: "no_deberia_existir",
        name: "Recorrido inventado",
        entry_state: "idea",
      });

    expect(falloEquipo).not.toBeNull();

    const { data: creada, error: falloAdmin } = await admin
      .from("roadmap_templates")
      .insert({
        code: "prueba_direccion",
        name: "Recorrido de prueba",
        entry_state: "idea",
      })
      .select()
      .single();

    expect(falloAdmin).toBeNull();
    await admin.from("roadmap_templates").delete().eq("id", creada!.id);
  });
});

/**
 * La hoja de ruta en cuatro tramos (REVISION, 22 y 23 nov · bloque 5). Con
 * Vega, una idea sin hoja de ruta en la semilla: se le genera, se prueba y
 * se quita, dejándola como estaba. Marea y Raíz traen la suya de la semilla.
 */
describe("la hoja de ruta en cuatro tramos", () => {
  async function hitoDelTramo(tramo: number, orden: number) {
    const { data } = await servicio
      .from("roadmap_template_milestones")
      .select("id, roadmap_template_stages!inner(tramo, roadmap_templates!inner(code))")
      .eq("roadmap_template_stages.roadmap_templates.code", "hoja_iwl")
      .eq("roadmap_template_stages.tramo", tramo)
      .eq("order_index", orden)
      .single();
    return data!.id;
  }

  async function limpiarVega() {
    await servicio.from("milestones").delete().eq("company_id", COMPANIAS.vega).not("stage_id", "is", null);
    await servicio.from("roadmap_stages").delete().eq("company_id", COMPANIAS.vega);
    await servicio.from("entry_checks").delete().eq("company_id", COMPANIAS.vega);
  }

  it("su diagnóstico lo contesta ella y lo verifica IWL; cada «ya lo tenemos» con su archivo", async () => {
    await limpiarVega();
    const uno = await hitoDelTramo(1, 1);
    const dos = await hitoDelTramo(1, 2);
    // Sin archivo, un «sí» no vale
    expect(
      (await fundadoraVega.rpc("responder_lista_entrada", { p_company: COMPANIAS.vega, p_hito: uno, p_respuesta: "si" })).error
        ?.message,
    ).toMatch(/adjunta el archivo/);
    // Ni un archivo de otra compañía
    expect(
      (await fundadoraVega.rpc("responder_lista_entrada", {
        p_company: COMPANIAS.vega,
        p_hito: uno,
        p_respuesta: "si",
        p_ruta: `${COMPANIAS.marea}/evidencia/x.pdf`,
        p_nombre: "x.pdf",
      })).error,
    ).not.toBeNull();
    expect(
      (await fundadoraVega.rpc("responder_lista_entrada", {
        p_company: COMPANIAS.vega,
        p_hito: uno,
        p_respuesta: "si",
        p_ruta: `${COMPANIAS.vega}/evidencia/entrevistas.pdf`,
        p_nombre: "entrevistas.pdf",
      })).error,
    ).toBeNull();
    expect((await fundadoraVega.rpc("responder_lista_entrada", { p_company: COMPANIAS.vega, p_hito: dos, p_respuesta: "no" })).error).toBeNull();
    // IWL no contesta por ella
    expect((await equipoIwl.rpc("responder_lista_entrada", { p_company: COMPANIAS.vega, p_hito: dos, p_respuesta: "si" })).error).not.toBeNull();

    const { data: check } = await servicio.from("entry_checks").select("id").eq("company_id", COMPANIAS.vega).eq("template_milestone_id", uno).single();
    // Ella no se verifica lo suyo
    expect((await fundadoraVega.rpc("verificar_lista_entrada", { p_check: check!.id, p_verificado: true })).error).not.toBeNull();
    // «No basta» pide comentario
    expect((await equipoIwl.rpc("verificar_lista_entrada", { p_check: check!.id, p_verificado: false })).error?.message).toMatch(/por qué no basta/);
    // «No basta», y ella sube otro: vuelve a «por verificar»
    expect(
      (await equipoIwl.rpc("verificar_lista_entrada", { p_check: check!.id, p_verificado: false, p_comentario: "Faltan entrevistas." })).error,
    ).toBeNull();
    await fundadoraVega.rpc("responder_lista_entrada", {
      p_company: COMPANIAS.vega,
      p_hito: uno,
      p_respuesta: "si",
      p_ruta: `${COMPANIAS.vega}/evidencia/entrevistas-2.pdf`,
      p_nombre: "entrevistas-2.pdf",
    });
    const { data: otraVez } = await servicio.from("entry_checks").select("verification, review_comment").eq("id", check!.id).single();
    expect(otraVez).toEqual({ verification: null, review_comment: null });
    expect((await equipoIwl.rpc("verificar_lista_entrada", { p_check: check!.id, p_verificado: true })).error).toBeNull();
  });

  it("una idea lleva los cuatro tramos, encadenados; lo verificado entra cumplido", async () => {
    // Ella no se la genera
    expect((await fundadoraVega.rpc("generar_hoja_de_ruta", { p_company: COMPANIAS.vega, p_inicio: "2026-02-02" })).error).not.toBeNull();

    const { data: creadas, error } = await equipoIwl.rpc("generar_hoja_de_ruta", { p_company: COMPANIAS.vega, p_inicio: "2026-02-02" });
    expect(error).toBeNull();
    expect(creadas).toBe(4);

    const { data: tramos } = await servicio
      .from("roadmap_stages")
      .select("tramo, starts_on, ends_on, milestones(title, status, fundamental, from_tramo)")
      .eq("company_id", COMPANIAS.vega)
      .order("order_index");
    expect(tramos!.map((t) => t.tramo)).toEqual([1, 2, 3, 4]);
    expect(tramos![0].starts_on).toBe("2026-02-02");
    // De idea a MVP dura seis meses; cada tramo empieza donde acaba el anterior
    expect(tramos![0].ends_on).toBe("2026-08-01");
    for (let i = 1; i < tramos!.length; i += 1) {
      const fin = new Date(tramos![i - 1].ends_on!);
      expect(new Date(tramos![i].starts_on!).getTime() - fin.getTime()).toBe(24 * 60 * 60 * 1000);
    }
    const tramo1 = tramos![0].milestones as Array<{ title: string; status: string; fundamental: boolean; from_tramo: number | null }>;
    expect(tramo1).toHaveLength(5);
    expect(tramo1.every((m) => m.fundamental && m.from_tramo === null)).toBe(true);
    expect(tramo1.filter((m) => m.status === "cumplido").map((m) => m.title)).toEqual([
      "Problema validado con entrevistas a clientes potenciales",
    ]);

    // No se genera dos veces, y la lista ya no se cambia
    expect((await equipoIwl.rpc("generar_hoja_de_ruta", { p_company: COMPANIAS.vega })).error?.message).toMatch(/Ya tiene hoja de ruta/);
    const dos = await hitoDelTramo(1, 2);
    expect((await fundadoraVega.rpc("responder_lista_entrada", { p_company: COMPANIAS.vega, p_hito: dos, p_respuesta: "no" })).error?.message).toMatch(/ya está hecha/);
  });

  it("un hito fundamental lo quita solo dirección, con motivo; uno propio, quien coordina", async () => {
    const { data: fundamental } = await servicio
      .from("milestones")
      .select("id")
      .eq("company_id", COMPANIAS.vega)
      .eq("fundamental", true)
      .limit(1)
      .single();
    expect((await equipoIwl.rpc("quitar_hito", { p_hito: fundamental!.id, p_motivo: "No aplica a este proyecto." })).error).not.toBeNull();
    expect((await admin.rpc("quitar_hito", { p_hito: fundamental!.id, p_motivo: "corto" })).error?.message).toMatch(/por qué se quita/);
    // Ni a mano, sin pasar por el motivo
    expect((await admin.from("milestones").delete().eq("id", fundamental!.id)).error?.message).toMatch(/fundamental/);
    expect((await admin.rpc("quitar_hito", { p_hito: fundamental!.id, p_motivo: "Ya lo cubre el piloto que firmó en octubre." })).error).toBeNull();
    const { data: registro } = await servicio
      .from("activity_log")
      .select("detail")
      .eq("entity_id", fundamental!.id)
      .eq("action", "hito_fundamental_quitado")
      .single();
    expect((registro!.detail as { motivo: string }).motivo).toBe("Ya lo cubre el piloto que firmó en octubre.");

    // Uno propio, quien coordina, sin motivo
    const { data: etapa } = await servicio.from("roadmap_stages").select("id").eq("company_id", COMPANIAS.vega).eq("tramo", 1).single();
    const { data: propio } = await equipoIwl
      .from("milestones")
      .insert({ company_id: COMPANIAS.vega, stage_id: etapa!.id, title: "Hito propio", success_criteria: "Algo comprobable", origin: "acordado" })
      .select("id")
      .single();
    expect((await equipoIwl.rpc("quitar_hito", { p_hito: propio!.id })).error).toBeNull();

    // Mientras no hay Acuerdo firmado, el borrador se rehace entero
    expect((await equipoIwl.rpc("borrar_borrador_hoja_de_ruta", { p_company: COMPANIAS.vega })).error).toBeNull();
    expect((await servicio.from("roadmap_stages").select("id").eq("company_id", COMPANIAS.vega)).data).toEqual([]);
    await limpiarVega();
  });

  it("ningún hito más allá del plazo del programa, salvo que lo guarde dirección", async () => {
    await limpiarVega();
    try {
      // Una idea, prevista para firmar el 2 de febrero: 18 meses, hasta el 1 de agosto de 2027
      expect((await equipoIwl.rpc("generar_hoja_de_ruta", { p_company: COMPANIAS.vega, p_inicio: "2026-02-02" })).error).toBeNull();
      const { data: hito } = await servicio
        .from("milestones")
        .select("id")
        .eq("company_id", COMPANIAS.vega)
        .eq("fundamental", true)
        .limit(1)
        .single();
      expect((await equipoIwl.from("milestones").update({ due_date: "2027-08-01" }).eq("id", hito!.id)).error).toBeNull();
      expect((await equipoIwl.from("milestones").update({ due_date: "2027-08-02" }).eq("id", hito!.id)).error?.message).toMatch(
        /Fuera del plazo del programa: acaba el 01\/08\/2027/,
      );
      // Ni uno propio nuevo
      const { data: etapa } = await servicio.from("roadmap_stages").select("id").eq("company_id", COMPANIAS.vega).eq("tramo", 4).single();
      expect(
        (await equipoIwl
          .from("milestones")
          .insert({ company_id: COMPANIAS.vega, stage_id: etapa!.id, title: "Tarde", success_criteria: "x", origin: "acordado", due_date: "2028-01-01" })).error
          ?.message,
      ).toMatch(/Fuera del plazo/);
      // Dirección sí
      expect((await admin.from("milestones").update({ due_date: "2027-09-01" }).eq("id", hito!.id)).error).toBeNull();
    } finally {
      await limpiarVega();
    }
  });

  it("no se propone el Acuerdo con algo de la lista por verificar", async () => {
    await limpiarVega();
    const { data: anexo } = await admin
      .from("annexes")
      .insert({ company_id: COMPANIAS.vega, duration_months: 18, committed_hours: 40, firmantes: [{ nombre: "Fundadora", apellidos: "De Prueba" }] })
      .select("id")
      .single();
    try {
      const uno = await hitoDelTramo(1, 1);
      await servicio.from("entry_checks").insert({
        company_id: COMPANIAS.vega,
        template_milestone_id: uno,
        answer: "si",
        evidence_path: `${COMPANIAS.vega}/evidencia/x.pdf`,
        evidence_name: "x.pdf",
      });
      expect((await admin.from("annexes").update({ status: "propuesto" }).eq("id", anexo!.id)).error?.message).toMatch(
        /Faltan 1 por verificar/,
      );
    } finally {
      await servicio.from("annexes").delete().eq("id", anexo!.id);
      await limpiarVega();
    }
  });

  it("en entrada, el mentor principal ve la lista pero no el due diligence; después, todo", async () => {
    const { data: mentor } = await servicio.from("profiles").select("id").eq("email", USUARIOS.mentorProducto).single();
    const { data: antes } = await servicio.from("companies").select("tramo").eq("id", COMPANIAS.vega).single();
    await servicio.from("company_members").insert({ company_id: COMPANIAS.vega, profile_id: mentor!.id, member_role: "mentor_principal" });
    const uno = await hitoDelTramo(1, 1);
    await servicio.from("entry_checks").insert({ company_id: COMPANIAS.vega, template_milestone_id: uno, answer: "no" });
    try {
      await servicio.from("companies").update({ tramo: "entrada" }).eq("id", COMPANIAS.vega);
      const elMentor = await entrarComo(USUARIOS.mentorProducto);
      expect((await elMentor.from("entry_checks").select("id").eq("company_id", COMPANIAS.vega)).data).toHaveLength(1);
      expect((await elMentor.from("dd_items").select("id").eq("company_id", COMPANIAS.vega)).data).toEqual([]);
      expect((await elMentor.from("documents").select("id").eq("company_id", COMPANIAS.vega)).data).toEqual([]);
      // Ya incorporada, el due diligence es de quien acompaña la compañía
      await servicio.from("companies").update({ tramo: "incubacion" }).eq("id", COMPANIAS.vega);
      expect((await elMentor.from("dd_items").select("id").eq("company_id", COMPANIAS.vega)).data!.length).toBeGreaterThan(0);
    } finally {
      await servicio.from("companies").update({ tramo: antes!.tramo }).eq("id", COMPANIAS.vega);
      await servicio.from("company_members").delete().eq("company_id", COMPANIAS.vega).eq("profile_id", mentor!.id);
      await servicio.from("entry_checks").delete().eq("company_id", COMPANIAS.vega);
    }
  });

  it("MVP sin piloto: los del tramo 1 que faltan van dentro de su tramo 2, marcados", async () => {
    const { data: tramos } = await servicio
      .from("roadmap_stages")
      .select("tramo, milestones(from_tramo)")
      .eq("company_id", COMPANIAS.marea)
      .order("order_index");
    expect(tramos!.map((t) => t.tramo)).toEqual([2, 3, 4]);
    const delUno = (tramos![0].milestones as Array<{ from_tramo: number | null }>).filter((m) => m.from_tramo === 1);
    expect(delUno).toHaveLength(5);
  });

  it("un tramo se cierra solo al validarse su último hito, y avisa a ella y a dirección", async () => {
    const { data: tramo } = await servicio
      .from("roadmap_stages")
      .select("id, status, closed_at, milestones(id, status)")
      .eq("company_id", COMPANIAS.marea)
      .eq("tramo", 4)
      .single();
    const hitos = tramo!.milestones as Array<{ id: string; status: string }>;
    try {
      for (const h of hitos) {
        await servicio.from("milestones").update({ status: "cumplido" }).eq("id", h.id);
      }
      const { data: despues } = await servicio.from("roadmap_stages").select("status, closed_at").eq("id", tramo!.id).single();
      expect(despues!.status).toBe("completada");
      expect(despues!.closed_at).not.toBeNull();
      // El tramo 4: a dirección, listo para valorar si es invertible; a ella, que cerró el tramo
      const { data: avisos } = await servicio
        .from("avisos")
        .select("tipo")
        .eq("company_id", COMPANIAS.marea)
        .in("tipo", ["listo_para_invertible", "tramo_cerrado_ella"])
        .is("cerrado_at", null);
      expect(new Set(avisos!.map((a) => a.tipo))).toEqual(new Set(["listo_para_invertible", "tramo_cerrado_ella"]));
    } finally {
      for (const h of hitos) {
        await servicio.from("milestones").update({ status: h.status as never }).eq("id", h.id);
      }
      await servicio.from("roadmap_stages").update({ status: tramo!.status, closed_at: tramo!.closed_at }).eq("id", tramo!.id);
      await servicio.from("avisos").delete().eq("company_id", COMPANIAS.marea).in("tipo", ["listo_para_invertible", "tramo_cerrado_ella"]);
      await servicio.from("activity_log").delete().eq("company_id", COMPANIAS.marea).eq("action", "tramo_cerrado");
    }
  });

  it("vencido el plazo, no se cierra nada: aviso a dirección, una vez, y solo lo llama el cron", async () => {
    expect((await admin.rpc("avisar_plazos_vencidos")).error).not.toBeNull();
    try {
      // Hoy, con la semilla, ninguna está fuera de plazo
      expect((await servicio.rpc("avisar_plazos_vencidos")).data).toBe(0);
      // El 1 de marzo de 2027: Raíz firmó el 1 de sept, facturando, cinco meses, y ya
      // vencieron; Marea, doce desde el 6 de marzo de 2026, acaba el 5: todavía no
      await servicio.rpc("avisar_plazos_vencidos", { p_hoy: "2027-03-01" });
      await servicio.rpc("avisar_plazos_vencidos", { p_hoy: "2027-03-01" });
      const { data: raiz } = await servicio.from("avisos").select("id").eq("company_id", COMPANIAS.raiz).eq("tipo", "plazo_vencido");
      expect(raiz).toHaveLength(1);
      const { data: marea } = await servicio.from("avisos").select("id").eq("company_id", COMPANIAS.marea).eq("tipo", "plazo_vencido");
      expect(marea).toEqual([]);
      const { data: c } = await servicio.from("companies").select("tramo, archived_at").eq("id", COMPANIAS.raiz).single();
      expect(c).toEqual({ tramo: "incubacion", archived_at: null });
    } finally {
      await servicio.from("avisos").delete().eq("tipo", "plazo_vencido");
    }
  });
});

describe("la hoja de ruta, segunda parte (REVISION, 23 nov)", () => {
  async function limpiarVega() {
    await servicio.from("milestones").delete().eq("company_id", COMPANIAS.vega).not("stage_id", "is", null);
    await servicio.from("roadmap_stages").delete().eq("company_id", COMPANIAS.vega);
    await servicio.from("entry_checks").delete().eq("company_id", COMPANIAS.vega);
  }

  it("las fechas se reparten a lo largo de cada tramo, y el último hito cae en su fin", async () => {
    await limpiarVega();
    try {
      expect((await equipoIwl.rpc("generar_hoja_de_ruta", { p_company: COMPANIAS.vega, p_inicio: "2026-02-02" })).error).toBeNull();
      const { data: tramo } = await servicio
        .from("roadmap_stages")
        .select("starts_on, ends_on, milestones(due_date)")
        .eq("company_id", COMPANIAS.vega)
        .eq("tramo", 1)
        .single();
      const fechas = (tramo!.milestones as Array<{ due_date: string }>).map((m) => m.due_date).sort();
      expect(new Set(fechas).size).toBe(fechas.length);
      expect(fechas[0] > tramo!.starts_on!).toBe(true);
      expect(fechas.at(-1)).toBe(tramo!.ends_on);
    } finally {
      await limpiarVega();
    }
  });

  it("tras la firma, un fundamental lo cambia solo dirección y con motivo; uno propio, quien coordina", async () => {
    const { data: fundamental } = await servicio
      .from("milestones")
      .select("id, due_date")
      .eq("company_id", COMPANIAS.marea)
      .eq("fundamental", true)
      .neq("status", "cumplido")
      .not("due_date", "is", null)
      .limit(1)
      .single();
    const mentor = await entrarComo(USUARIOS.mentorProducto);
    let propio: string | null = null;
    try {
      // Ni el equipo, ni el mentor que coordina
      expect((await equipoIwl.rpc("fechar_hito", { p_hito: fundamental!.id, p_fecha: "2026-12-20", p_motivo: "Se retrasa el piloto." })).error?.message).toMatch(
        /solo dirección, con motivo/,
      );
      expect((await mentor.rpc("fechar_hito", { p_hito: fundamental!.id, p_fecha: "2026-12-20", p_motivo: "Se retrasa el piloto." })).error).not.toBeNull();
      // Dirección, sin motivo, tampoco
      expect((await admin.rpc("fechar_hito", { p_hito: fundamental!.id, p_fecha: "2026-12-20" })).error?.message).toMatch(/por qué cambia/);
      expect((await admin.rpc("fechar_hito", { p_hito: fundamental!.id, p_fecha: "2026-12-20", p_motivo: "El piloto empieza en diciembre." })).error).toBeNull();
      const { data: registro } = await servicio
        .from("activity_log")
        .select("detail")
        .eq("entity_id", fundamental!.id)
        .eq("action", "hito_fundamental_cambiado")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      expect(registro!.detail).toMatchObject({ fecha_despues: "2026-12-20", motivo: "El piloto empieza en diciembre." });

      // Uno propio: lo añade y lo cambia el mentor que coordina; ella no
      const { data: etapa } = await servicio.from("roadmap_stages").select("id").eq("company_id", COMPANIAS.marea).eq("tramo", 4).single();
      expect(
        (await fundadoraMarea.from("milestones").insert({ company_id: COMPANIAS.marea, stage_id: etapa!.id, title: "Mío", success_criteria: "Algo comprobable", origin: "acordado" })).error,
      ).not.toBeNull();
      const { data: nuevo, error } = await mentor
        .from("milestones")
        .insert({ company_id: COMPANIAS.marea, stage_id: etapa!.id, title: "Hito propio tras la firma", success_criteria: "Algo comprobable", origin: "acordado" })
        .select("id")
        .single();
      expect(error).toBeNull();
      propio = nuevo!.id;
      expect((await mentor.rpc("fechar_hito", { p_hito: propio, p_fecha: "2026-12-15" })).error).toBeNull();
      const { data: acciones } = await servicio.from("activity_log").select("action").eq("entity_id", propio);
      expect(new Set(acciones!.map((a) => a.action))).toEqual(new Set(["hito_propio_anadido", "hito_propio_cambiado"]));
    } finally {
      await servicio.from("milestones").update({ due_date: fundamental!.due_date }).eq("id", fundamental!.id);
      await servicio.from("activity_log").delete().eq("entity_id", fundamental!.id).eq("action", "hito_fundamental_cambiado");
      if (propio) {
        await servicio.from("milestones").delete().eq("id", propio);
        await servicio.from("activity_log").delete().eq("entity_id", propio);
      }
    }
  });

  it("la copia del Anexo lleva la sección I", async () => {
    const { data: copia } = await servicio
      .from("anexo_versiones")
      .select("contenido")
      .eq("company_id", COMPANIAS.raiz)
      .eq("momento", "firmado")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const c = copia!.contenido as { plazo_meses: number; hoja_de_ruta: Array<{ tramo: number; hitos: unknown[] }> };
    expect(c.plazo_meses).toBe(5);
    expect(c.hoja_de_ruta.map((t) => t.tramo)).toEqual([4]);
    expect(c.hoja_de_ruta[0].hitos.length).toBeGreaterThan(0);
  });

  it("en entrada, el mentor que coordina ve lo que presentó ella y el comité; nadie más fuera de IWL", async () => {
    const { data: mentorId } = await servicio.from("profiles").select("id").eq("email", USUARIOS.mentorComercial).single();
    const { data: antes } = await servicio.from("companies").select("tramo").eq("id", COMPANIAS.vega).single();
    const mentor = await entrarComo(USUARIOS.mentorComercial);
    try {
      // Sin ser quien coordina, no
      expect((await mentor.rpc("ficha_entrada", { p_company: COMPANIAS.vega })).error).not.toBeNull();
      expect((await fundadoraVega.rpc("ficha_entrada", { p_company: COMPANIAS.vega })).error).not.toBeNull();

      // Cambiarlo es de dirección
      expect((await equipoIwl.rpc("cambiar_mentor_principal", { p_company: COMPANIAS.vega, p_mentor: mentorId!.id })).error).not.toBeNull();
      expect((await admin.rpc("cambiar_mentor_principal", { p_company: COMPANIAS.vega, p_mentor: mentorId!.id })).error).toBeNull();

      await servicio.from("companies").update({ tramo: "entrada" }).eq("id", COMPANIAS.vega);
      const { data: ficha, error } = await mentor.rpc("ficha_entrada", { p_company: COMPANIAS.vega });
      expect(error).toBeNull();
      // Lo de la candidatura que presentó ella, sin notas ni deliberación
      if (ficha) {
        expect(Object.keys(ficha as object)).not.toContain("notas");
        expect(Object.keys(ficha as object)).not.toContain("resumen");
      }
    } finally {
      await servicio.from("companies").update({ tramo: antes!.tramo }).eq("id", COMPANIAS.vega);
      await servicio.from("company_members").delete().eq("company_id", COMPANIAS.vega).eq("member_role", "mentor_principal");
      await servicio.from("activity_log").delete().eq("company_id", COMPANIAS.vega).eq("action", "mentor_principal_cambiado");
    }
  });
});
