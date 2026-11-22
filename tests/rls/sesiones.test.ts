import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo, quitarSesiones, registrarSesion } from "./clientes";

/**
 * Sesiones con acta y horas confirmadas por ella (REVISION, 13 nov).
 *
 * Quien acompaña registra; ella confirma o dice que no cuadra; se corrige
 * o se mantiene; si no hay acuerdo, decide dirección. Sin respuesta en 7
 * días se confirma sola. Nada se borra: se anula con motivo.
 *
 * En Marea, donde el mentor de producto coordina. Las sesiones que crea la
 * prueba se quitan al acabar.
 */

const servicio = clienteServicio();
const sql = postgres(process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres", {
  max: 1,
  onnotice: () => {},
});
const creadas: Array<string | null> = [];
let mentor: SupabaseClient;
let ella: SupabaseClient;
let admin: SupabaseClient;
let mentorId = "";
let ellaId = "";

async function nueva(horas = 2) {
  const { id, error } = await registrarSesion(mentor, { company: COMPANIAS.marea, fecha: "2026-11-12", profile: mentorId, horas });
  if (error) throw new Error(error.message);
  creadas.push(id);
  return id!;
}

async function sesion(id: string) {
  const { data } = await servicio.from("work_sessions").select("status, pending_since").eq("id", id).single();
  return data!;
}

async function avisos(id: string) {
  const { data } = await servicio.from("avisos").select("tipo, para").eq("work_session_id", id).is("cerrado_at", null);
  return data ?? [];
}

/** «Por confirmar» va a cada fundadora con cuenta, ella incluida */
async function porConfirmarParaElla(id: string) {
  const abiertos = await avisos(id);
  return abiertos.length > 0 && abiertos.every((a) => a.tipo === "sesion_por_confirmar") && abiertos.some((a) => a.para === ellaId);
}

async function historia(id: string) {
  const { data } = await servicio.from("session_events").select("kind, body, detail").eq("session_id", id).order("created_at");
  return data ?? [];
}

async function linea(id: string) {
  const { data } = await servicio.from("contribution_hours").select("id, hours, session_status").eq("work_session_id", id).single();
  return data!;
}

beforeAll(async () => {
  mentor = await entrarComo(USUARIOS.mentorProducto);
  ella = await entrarComo(USUARIOS.fundadoraMarea);
  admin = await entrarComo(USUARIOS.admin);
  mentorId = (await mentor.auth.getUser()).data.user!.id;
  ellaId = (await ella.auth.getUser()).data.user!.id;
});

afterAll(async () => {
  await quitarSesiones(creadas);
  await sql.end();
});

describe("registrar", () => {
  it("queda por confirmar, con aviso a ella, y no cuenta para el Anexo hasta que confirma", async () => {
    const { data: antes } = await servicio.from("commitment_counter").select("delivered_hours, pending_hours").eq("company_id", COMPANIAS.marea).single();
    const id = await nueva(2);

    expect((await sesion(id)).status).toBe("por_confirmar");
    expect(await porConfirmarParaElla(id)).toBe(true);
    expect((await historia(id)).map((e) => e.kind)).toEqual(["registrada"]);

    const { data: despues } = await servicio.from("commitment_counter").select("delivered_hours, pending_hours").eq("company_id", COMPANIAS.marea).single();
    expect(Number(despues!.delivered_hours)).toBe(Number(antes!.delivered_hours));
    expect(Number(despues!.pending_hours)).toBe(Number(antes!.pending_hours) + 2);

    // Ella la ve, con su aviso
    const { data: suya } = await ella.from("work_sessions").select("id").eq("id", id);
    expect(suya).toHaveLength(1);
    const { data: suyos } = await ella.from("avisos").select("tipo").eq("work_session_id", id);
    expect(suyos).toEqual([{ tipo: "sesion_por_confirmar" }]);
  });

  it("un trabajo fuera de sesión sin entregable no se imputa", async () => {
    const { data: materia } = await servicio.from("contribution_subjects").select("id").limit(1).single();
    const { error } = await mentor.rpc("registrar_sesion", {
      p: {
        company_id: COMPANIAS.marea,
        kind: "trabajo",
        held_on: "2026-11-12",
        title: "Modelo financiero",
        subject_id: materia!.id,
        worked: "Revisión del modelo financiero a tres años.",
        horas: [{ profile_id: mentorId, profile_code: "senior", hours: 3 }],
      },
    });
    expect(error?.message).toMatch(/entregable/);
  });
});

describe("ella confirma", () => {
  it("con un comentario; cuenta para el Anexo y el aviso se cierra", async () => {
    const id = await nueva(1.5);
    // El mentor no confirma sus propias horas
    expect((await mentor.rpc("confirmar_sesion", { p_sesion: id })).error?.message).toMatch(/la compañía/);

    expect((await ella.rpc("confirmar_sesion", { p_sesion: id, p_comentario: "Muy útil." })).error).toBeNull();
    expect((await sesion(id)).status).toBe("confirmada");
    expect((await linea(id)).session_status).toBe("confirmada");
    expect(await avisos(id)).toEqual([]);
    expect((await historia(id)).at(-1)).toMatchObject({ kind: "confirmada", body: "Muy útil." });
  });
});

describe("no cuadra", () => {
  it("abre el hilo; se corrige con la cifra de antes, vuelve a ella, y si no hay acuerdo decide dirección", async () => {
    const id = await nueva(2);

    expect((await ella.rpc("sesion_no_cuadra", { p_sesion: id, p_comentario: "" })).error?.message).toMatch(/qué no cuadra/);
    expect((await ella.rpc("sesion_no_cuadra", { p_sesion: id, p_comentario: "Fue 1 h, no 2." })).error).toBeNull();
    expect((await sesion(id)).status).toBe("en_discusion");
    expect(await avisos(id)).toEqual([{ tipo: "sesion_no_cuadra", para: mentorId }]);

    // Ella no corrige; él sí, con motivo
    const { id: lineaId } = await linea(id);
    expect((await ella.rpc("corregir_horas_sesion", { p_sesion: id, p_linea: lineaId, p_horas: 1, p_motivo: "Me corrijo" })).error).not.toBeNull();
    expect((await mentor.rpc("corregir_horas_sesion", { p_sesion: id, p_linea: lineaId, p_horas: 1.5, p_motivo: "Hubo media hora de preparación." })).error).toBeNull();
    expect(Number((await linea(id)).hours)).toBe(1.5);
    expect((await historia(id)).at(-1)).toMatchObject({ kind: "correccion", detail: { antes: 2, despues: 1.5 } });
    expect((await sesion(id)).status).toBe("por_confirmar");
    expect(await porConfirmarParaElla(id)).toBe(true);

    // Sigue sin cuadrarle; él mantiene; ella la lleva a dirección
    await ella.rpc("sesion_no_cuadra", { p_sesion: id, p_comentario: "La preparación no la pedimos." });
    expect((await ella.rpc("comentar_sesion", { p_sesion: id, p_comentario: "Lo hablamos el lunes." })).error).toBeNull();
    expect((await ella.rpc("llevar_sesion_a_direccion", { p_sesion: id, p_motivo: "No nos ponemos de acuerdo." })).error).toBeNull();
    expect((await sesion(id)).status).toBe("en_direccion");
    expect(await avisos(id)).toEqual([{ tipo: "sesion_en_direccion", para: null }]);

    // Decide dirección, nadie más
    expect((await mentor.rpc("decidir_sesion", { p_sesion: id, p_motivo: "Me lo quedo yo." })).error?.message).toMatch(/dirección/);
    expect(
      (await admin.rpc("decidir_sesion", { p_sesion: id, p_motivo: "La preparación no se imputa.", p_horas: [{ linea: lineaId, horas: 1 }] })).error,
    ).toBeNull();
    expect((await sesion(id)).status).toBe("confirmada_direccion");
    expect(Number((await linea(id)).hours)).toBe(1);
    expect(await avisos(id)).toEqual([]);
    expect((await historia(id)).map((e) => e.kind)).toEqual([
      "registrada",
      "no_cuadra",
      "correccion",
      "no_cuadra",
      "comentario",
      "a_direccion",
      "decision",
    ]);
  });

  it("mantenerlas, con motivo, vuelve a pedirle que confirme", async () => {
    const id = await nueva(1);
    await ella.rpc("sesion_no_cuadra", { p_sesion: id, p_comentario: "No recuerdo esta sesión." });
    expect((await mentor.rpc("mantener_horas_sesion", { p_sesion: id, p_motivo: "Fue la del martes, por videollamada." })).error).toBeNull();
    expect((await sesion(id)).status).toBe("por_confirmar");
    expect(await porConfirmarParaElla(id)).toBe(true);
  });
});

describe("nada se borra ni se toca por fuera", () => {
  it("ni con la clave de servicio: ni el estado, ni las horas, ni la sesión, ni su historia", async () => {
    const id = await nueva(1);
    const { id: lineaId } = await linea(id);
    expect((await servicio.from("work_sessions").update({ status: "confirmada" }).eq("id", id)).error?.message).toMatch(/con sus botones/);
    expect((await servicio.from("contribution_hours").update({ hours: 5 }).eq("id", lineaId)).error?.message).toMatch(/desde la sesión/);
    expect((await servicio.from("contribution_hours").delete().eq("id", lineaId)).error?.message).toMatch(/no se borran/);
    expect((await servicio.from("work_sessions").delete().eq("id", id)).error?.message).toMatch(/se anula con motivo/);
    expect((await servicio.from("session_events").delete().eq("session_id", id)).error?.message).toMatch(/no se toca/);
    // Y nadie escribe la historia a mano
    expect((await mentor.from("session_events").insert({ session_id: id, company_id: COMPANIAS.marea, kind: "confirmada" })).error).not.toBeNull();
  });

  it("anular pide motivo; lo anulado no cuenta en ningún sitio", async () => {
    const id = await nueva(4);
    expect((await ella.rpc("anular_sesion", { p_sesion: id, p_motivo: "No la quiero." })).error).not.toBeNull();
    expect((await mentor.rpc("anular_sesion", { p_sesion: id, p_motivo: "" })).error?.message).toMatch(/por qué/);
    expect((await mentor.rpc("anular_sesion", { p_sesion: id, p_motivo: "Registrada en la compañía equivocada." })).error).toBeNull();
    expect((await sesion(id)).status).toBe("anulada");
    expect(await avisos(id)).toEqual([]);
    const { data } = await servicio.from("contribution_hours_valued").select("id").eq("work_session_id", id);
    expect(data).toEqual([]);
  });

  it("una confirmada solo la anula dirección", async () => {
    const id = await nueva(1);
    await ella.rpc("confirmar_sesion", { p_sesion: id });
    expect((await mentor.rpc("anular_sesion", { p_sesion: id, p_motivo: "Me equivoqué de día." })).error?.message).toMatch(/dirección/);
    expect((await admin.rpc("anular_sesion", { p_sesion: id, p_motivo: "Se imputó dos veces." })).error).toBeNull();
  });
});

describe("siete días sin respuesta", () => {
  it("se confirma sola, «por plazo», y nadie con sesión puede dispararlo", async () => {
    const id = await nueva(1);
    // La antigüedad no la deja escribir el guardián: se envejece por debajo
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role = replica`;
      await tx`update work_sessions set pending_since = now() - interval '8 days' where id = ${id}`;
    });
    expect((await admin.rpc("confirmar_sesiones_por_plazo")).error).not.toBeNull();
    expect((await servicio.rpc("confirmar_sesiones_por_plazo")).error).toBeNull();
    expect((await sesion(id)).status).toBe("confirmada_plazo");
    expect((await linea(id)).session_status).toBe("confirmada_plazo");
    expect(await avisos(id)).toEqual([]);
    expect((await historia(id)).at(-1)?.kind).toBe("confirmada_plazo");
  });
});

describe("un acuerdo del acta", () => {
  it("pasa a tarea o se enlaza a un hito, y queda en la historia", async () => {
    const id = await nueva(1);
    const { data: acuerdo } = await mentor
      .from("session_agreements")
      .insert({ session_id: id, company_id: COMPANIAS.marea, body: "Preparar tres escenarios de precio" })
      .select("id")
      .single();
    const { data: hito } = await servicio.from("milestones").select("id").eq("company_id", COMPANIAS.marea).limit(1).single();
    expect((await mentor.from("session_agreements").update({ milestone_id: hito!.id }).eq("id", acuerdo!.id)).error).toBeNull();
    expect((await historia(id)).at(-1)?.kind).toBe("acta");
    // Ella no escribe acuerdos
    const deElla = await ella.from("session_agreements").insert({ session_id: id, company_id: COMPANIAS.marea, body: "Mío" });
    expect(deElla.error).not.toBeNull();
  });
});

describe("el acta deja versión (REVISION, 20 nov)", () => {
  it("abierta: cada guardado anota quién y qué apartado cambió; a mano no se toca", async () => {
    const id = await nueva(1);
    expect((await mentor.from("work_sessions").update({ worked: "Otra cosa, a mano." }).eq("id", id)).error).not.toBeNull();
    expect((await servicio.from("work_sessions").update({ worked: "Otra cosa, a mano." }).eq("id", id)).error?.message).toMatch(/Editar el acta/);

    // Ella no edita el acta
    expect((await ella.rpc("editar_acta_sesion", { p_sesion: id, p: { worked: "Lo cuento yo." } })).error?.message).toMatch(/mentor de la compañía/);

    const r = await mentor.rpc("editar_acta_sesion", { p_sesion: id, p: { worked: "Repasamos precios, embudo y la retención." } });
    expect(r.error).toBeNull();
    expect(r.data).toBe(true);
    const v = (await historia(id)).at(-1)!;
    expect(v.kind).toBe("version_acta");
    expect(v.detail).toMatchObject({ campos: ["worked"], confirmada: false, reabierta: false });
    expect((await sesion(id)).status).toBe("por_confirmar");

    // Sin cambios no hay versión
    expect((await mentor.rpc("editar_acta_sesion", { p_sesion: id, p: { worked: "Repasamos precios, embudo y la retención." } })).data).toBe(false);
    // Abierta, las horas van por «Corregir las horas»
    const l = await linea(id);
    const conHoras = await mentor.rpc("editar_acta_sesion", { p_sesion: id, p: {}, p_horas: [{ linea: l.id, horas: 3 }] });
    expect(conHoras.error?.message).toMatch(/Corregir las horas/);
  });

  it("confirmada: pide motivo; si cambian las horas vuelve a ella con aviso", async () => {
    const id = await nueva(2);
    await ella.rpc("confirmar_sesion", { p_sesion: id });
    expect((await mentor.rpc("editar_acta_sesion", { p_sesion: id, p: { title: "Precios y embudo" } })).error?.message).toMatch(/di por qué/);

    // Solo el texto: sigue confirmada
    expect((await mentor.rpc("editar_acta_sesion", { p_sesion: id, p: { title: "Precios y embudo" }, p_motivo: "El título no decía de qué fue." })).error).toBeNull();
    expect((await sesion(id)).status).toBe("confirmada");
    expect((await historia(id)).at(-1)).toMatchObject({ kind: "version_acta", body: "El título no decía de qué fue." });

    // Con horas: vuelve a «Por confirmar», con aviso a ella, y queda la cifra de antes
    const l = await linea(id);
    const r = await mentor.rpc("editar_acta_sesion", {
      p_sesion: id,
      p: {},
      p_motivo: "Fueron 2,5 h: se alargó.",
      p_horas: [{ linea: l.id, horas: 2.5 }],
    });
    expect(r.error).toBeNull();
    expect((await sesion(id)).status).toBe("por_confirmar");
    expect((await linea(id)).hours).toBe(2.5);
    expect(await porConfirmarParaElla(id)).toBe(true);
    expect((await historia(id)).at(-1)!.detail).toMatchObject({ reabierta: true, horas: [{ antes: 2, despues: 2.5 }] });
  });

  it("en dirección no se toca", async () => {
    const id = await nueva(1);
    await ella.rpc("sesion_no_cuadra", { p_sesion: id, p_comentario: "No fue tanto." });
    await ella.rpc("llevar_sesion_a_direccion", { p_sesion: id, p_motivo: "No nos ponemos de acuerdo." });
    expect((await mentor.rpc("editar_acta_sesion", { p_sesion: id, p: { title: "Otro" } })).error?.message).toMatch(/ya no está en ese punto/);
  });
});

/**
 * El acta la levanta siempre el mentor de la compañía (REVISION, 22 nov ·
 * bloque 7): principal o secundario. El equipo de IWL ya no; Niage apunta
 * su trabajo fuera de sesión, que no es un acta.
 */
describe("el acta es del mentor", () => {
  it("el mentor secundario la levanta; el equipo, dirección y Niage no", async () => {
    const secundario = await entrarComo(USUARIOS.mentorComercial);
    const secundarioId = (await secundario.auth.getUser()).data.user!.id;
    const suya = await registrarSesion(secundario, { company: COMPANIAS.marea, fecha: "2026-11-12", profile: secundarioId, horas: 1 });
    expect(suya.error).toBeNull();
    creadas.push(suya.id);

    for (const correo of [USUARIOS.equipoIwl, USUARIOS.admin, USUARIOS.revisorMareaRaiz]) {
      const quien = await entrarComo(correo);
      const id = (await quien.auth.getUser()).data.user!.id;
      const r = await registrarSesion(quien, { company: COMPANIAS.marea, fecha: "2026-11-12", profile: id, horas: 1 });
      expect(r.error, correo).not.toBeNull();
    }
  });

  it("Niage apunta su trabajo fuera de sesión, y lo corrige él", async () => {
    const revisor = await entrarComo(USUARIOS.revisorMareaRaiz);
    const revisorId = (await revisor.auth.getUser()).data.user!.id;
    const r = await registrarSesion(revisor, { company: COMPANIAS.marea, fecha: "2026-11-12", profile: revisorId, horas: 1, tipo: "trabajo" });
    expect(r.error).toBeNull();
    creadas.push(r.id);
    expect((await revisor.rpc("editar_acta_sesion", { p_sesion: r.id!, p: { worked: "Revisé la arquitectura del MVP." } })).error).toBeNull();
    // El mentor no se lo cambia: es de quien lo apuntó
    expect((await mentor.rpc("editar_acta_sesion", { p_sesion: r.id!, p: { worked: "Otra cosa." } })).error?.message).toMatch(/mentor de la compañía/);
  });

  it("el acta de un mentor la edita también el otro mentor; dirección no", async () => {
    const id = await nueva();
    const secundario = await entrarComo(USUARIOS.mentorComercial);
    expect((await secundario.rpc("editar_acta_sesion", { p_sesion: id, p: { worked: "Lo completó el otro mentor." } })).error).toBeNull();
    expect((await admin.rpc("editar_acta_sesion", { p_sesion: id, p: { worked: "Lo cambia dirección." } })).error?.message).toMatch(/mentor de la compañía/);
  });
});
