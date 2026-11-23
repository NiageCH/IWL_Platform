import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * El cierre (REVISION, 22 nov · bloque 8): graduada, salida o baja.
 *
 * Se prueba con una compañía recién creada, no con las de la semilla:
 * cerrar no tiene vuelta atrás, y una de la semilla cerrada dejaría sin
 * datos a las demás pruebas. Al acabar se borra entera.
 */

const servicio = clienteServicio();
const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const COHORTE = "00000000-0000-0000-0003-000000000001";

let admin: SupabaseClient;
let equipo: SupabaseClient;
let mentor: SupabaseClient;
let fundadora: SupabaseClient;
let compania: string;
let hito: string;

beforeAll(async () => {
  [admin, equipo, mentor, fundadora] = await Promise.all([
    entrarComo(USUARIOS.admin),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.mentorComercial),
    entrarComo(USUARIOS.fundadoraVega),
  ]);
  const sello = Date.now();
  const { data: c, error } = await servicio
    .from("companies")
    .insert({
      organization_id: ORGANIZACION,
      cohort_id: COHORTE,
      name: `Cierre de prueba ${sello}`,
      slug: `cierre-de-prueba-${sello}`,
      tramo: "incubacion",
      entry_state: "facturando",
    })
    .select("id")
    .single();
  if (error) throw error;
  compania = c!.id;
  const ids = await servicio.from("profiles").select("id, email").in("email", [USUARIOS.mentorComercial, USUARIOS.fundadoraVega]);
  const id = (email: string) => ids.data!.find((p) => p.email === email)!.id;
  await servicio.from("company_members").insert([
    { company_id: compania, profile_id: id(USUARIOS.mentorComercial), member_role: "mentor_principal" },
    { company_id: compania, profile_id: id(USUARIOS.fundadoraVega), member_role: "fundadora" },
  ]);
  const { data: m } = await servicio
    .from("milestones")
    .insert({ company_id: compania, title: "Un hito suelto", success_criteria: "Algo comprobable", origin: "acordado" })
    .select("id")
    .single();
  hito = m!.id;
  // Graduarla pide sus hitos de invertible validados (graduar.test.ts)
  await servicio.from("milestones").insert({
    company_id: compania,
    title: "Clientes que repiten",
    success_criteria: "Algo comprobable",
    origin: "anexo",
    gates_investable: true,
    requires_validation: true,
    status: "cumplido",
  });
  await servicio.from("avisos").insert({ tipo: "hito_entregado", company_id: compania, para_iwl: true });
});

afterAll(async () => {
  // Borrarla entera: sus filas se van con ella, cerrada o no
  await servicio.from("activity_log").delete().eq("company_id", compania);
  const { error } = await servicio.from("companies").delete().eq("id", compania);
  expect(error).toBeNull();
});

describe("cerrar una compañía", () => {
  it("lo hace solo dirección, con cómo termina, fecha y motivo", async () => {
    const args = { p_company: compania, p_cierre: "graduada", p_fecha: "2026-11-20", p_motivo: "Cerró su ronda con un fondo de tesis agrotech." };
    expect((await equipo.rpc("cerrar_compania", args)).error?.message).toMatch(/de dirección/);
    expect((await mentor.rpc("cerrar_compania", args)).error).not.toBeNull();
    expect((await admin.rpc("cerrar_compania", { ...args, p_motivo: "corto" })).error?.message).toMatch(/por qué se cierra/);
    expect((await admin.rpc("cerrar_compania", { ...args, p_cierre: "otra" })).error).not.toBeNull();
    expect((await admin.rpc("cerrar_compania", { ...args, p_fecha: "2099-01-01" })).error?.message).toMatch(/hoy o antes/);

    // Antes de cerrarla la ven el equipo, su mentor y ella
    for (const quien of [equipo, mentor, fundadora]) {
      expect((await quien.from("companies").select("id").eq("id", compania)).data).toHaveLength(1);
    }

    expect((await admin.rpc("cerrar_compania", args)).error).toBeNull();
    expect((await admin.rpc("cerrar_compania", args)).error?.message).toMatch(/Ya está cerrada/);
  });

  it("cerrada, desaparece para todos menos dirección, y sus avisos se cierran", async () => {
    for (const quien of [equipo, mentor, fundadora]) {
      expect((await quien.from("companies").select("id").eq("id", compania)).data).toEqual([]);
      expect((await quien.from("milestones").select("id").eq("company_id", compania)).data).toEqual([]);
    }
    const { data: c } = await admin.from("companies").select("cierre, cerrada_on, archived_at").eq("id", compania).single();
    expect(c!.cierre).toBe("graduada");
    expect(c!.cerrada_on).toBe("2026-11-20");
    expect(c!.archived_at).not.toBeNull();

    const { data: abiertos } = await servicio.from("avisos").select("id").eq("company_id", compania).is("cerrado_at", null);
    expect(abiertos).toEqual([]);
  });

  it("nadie la edita: tampoco dirección, ni con la clave de servicio", async () => {
    // A dirección ya la para la política (no coordina una cerrada): no toca ninguna fila
    const { data: tocadas } = await admin.from("milestones").update({ title: "Otro" }).eq("id", hito).select("id");
    expect(tocadas ?? []).toEqual([]);
    // Y con la clave de servicio, que se salta las políticas, la para el guardián
    expect((await servicio.from("milestones").update({ title: "Otro" }).eq("id", hito)).error?.message).toMatch(/cerrada: solo se lee/);
    expect((await servicio.from("companies").update({ name: "Otro nombre" }).eq("id", compania)).error?.message).toMatch(/cerrada: solo se lee/);
    expect(
      (await servicio.from("milestones").insert({ company_id: compania, title: "Nuevo", success_criteria: "x", origin: "acordado" })).error
        ?.message,
    ).toMatch(/cerrada: solo se lee/);
  });

  it("ella conserva sus documentos firmados, y solo los suyos", async () => {
    const { data } = await fundadora.rpc("documentos_tras_cierre");
    const suyas = (data as Array<{ compania: string; cierre: string }>).filter((d) => d.cierre === "graduada");
    expect(suyas.map((d) => d.compania)).toEqual([expect.stringMatching(/^Cierre de prueba/)]);
    // El mentor no es fundadora: nada
    expect((await mentor.rpc("documentos_tras_cierre")).data).toEqual([]);
  });

  it("una compañía en entrada no se cierra: es «no se incorpora»", async () => {
    const { data: vega } = await servicio.from("companies").select("id, tramo").eq("slug", "vega-predictiva").single();
    try {
      await servicio.from("companies").update({ tramo: "entrada" }).eq("id", vega!.id);
      expect(
        (await admin.rpc("cerrar_compania", { p_company: vega!.id, p_cierre: "baja", p_fecha: "2026-11-20", p_motivo: "No sigue en el programa." }))
          .error?.message,
      ).toMatch(/no se incorpora/);
    } finally {
      await servicio.from("companies").update({ tramo: vega!.tramo }).eq("id", vega!.id);
    }
  });

  it("dirección la reabre, con motivo, y vuelve como estaba; sus avisos no", async () => {
    const motivo = { p_company: compania, p_motivo: "Se cerró por error: sigue en el programa." };
    expect((await equipo.rpc("reabrir_compania", motivo)).error?.message).toMatch(/de dirección/);
    expect((await mentor.rpc("reabrir_compania", motivo)).error).not.toBeNull();
    expect((await admin.rpc("reabrir_compania", { ...motivo, p_motivo: "corto" })).error?.message).toMatch(/por qué se reabre/);
    // La clave de servicio tampoco le quita el cierre a mano: solo la función
    expect((await servicio.from("companies").update({ cierre: null }).eq("id", compania)).error?.message).toMatch(/cerrada: solo se lee/);

    expect((await admin.rpc("reabrir_compania", motivo)).error).toBeNull();
    expect((await admin.rpc("reabrir_compania", motivo)).error?.message).toMatch(/No está cerrada/);

    const { data: c } = await admin.from("companies").select("cierre, cerrada_on, archived_at, tramo").eq("id", compania).single();
    expect(c).toMatchObject({ cierre: null, cerrada_on: null, archived_at: null, tramo: "incubacion" });
    // Su equipo y sus accesos, de vuelta
    for (const quien of [equipo, mentor, fundadora]) {
      expect((await quien.from("companies").select("id").eq("id", compania)).data).toHaveLength(1);
    }
    expect((await mentor.from("milestones").select("id").eq("id", hito)).data).toHaveLength(1);
    // Se edita otra vez
    expect((await servicio.from("milestones").update({ title: "Un hito suelto" }).eq("id", hito)).error).toBeNull();
    // Los avisos que se cerraron con ella siguen cerrados
    const { data: abiertos } = await servicio.from("avisos").select("id").eq("company_id", compania).is("cerrado_at", null);
    expect(abiertos).toEqual([]);
    // Y queda en el registro, con lo que fue el cierre
    const { data: log } = await servicio
      .from("activity_log")
      .select("detail")
      .eq("company_id", compania)
      .eq("action", "compania_reabierta")
      .single();
    expect(log!.detail).toMatchObject({ cierre: "graduada", motivo: motivo.p_motivo });
  });

  it("si ya estaba archivada antes de cerrarla, sigue archivada al reabrirla", async () => {
    const archivada = "2026-10-01T10:00:00+00:00";
    await servicio.from("companies").update({ archived_at: archivada, archive_reason: "Pausa acordada" }).eq("id", compania);
    const args = { p_company: compania, p_cierre: "baja", p_fecha: "2026-11-20", p_motivo: "No sigue: prueba del archivo previo." };
    expect((await admin.rpc("cerrar_compania", args)).error).toBeNull();
    expect((await admin.rpc("reabrir_compania", { p_company: compania, p_motivo: "Otra vez por error, en la prueba." })).error).toBeNull();
    const { data: c } = await servicio.from("companies").select("archived_at, archive_reason").eq("id", compania).single();
    expect(new Date(c!.archived_at!).toISOString()).toBe(new Date(archivada).toISOString());
    expect(c!.archive_reason).toBe("Pausa acordada");
  });
});
