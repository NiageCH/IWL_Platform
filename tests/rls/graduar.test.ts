import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Graduar exige los hitos que condicionan invertible (REVISION, 23 nov ·
 * invertible decidido). Lo impone la base: por la función de cerrar, y
 * también escribiendo la columna a mano con la clave de servicio.
 *
 * Con dos compañías recién creadas, que se borran enteras al acabar.
 */

const servicio = clienteServicio();
const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const COHORTE = "00000000-0000-0000-0003-000000000001";

let admin: SupabaseClient;
let equipo: SupabaseClient;
let mentor: SupabaseClient;
let graduable: string;
let otra: string;
let marcados: string[] = [];

const cerrar = (quien: SupabaseClient, company: string, cierre: string) =>
  quien.rpc("cerrar_compania", {
    p_company: company,
    p_cierre: cierre,
    p_fecha: "2026-11-20",
    p_motivo: "Cierre de prueba con su motivo.",
  });

async function crearCompania(nombre: string) {
  const sello = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await servicio
    .from("companies")
    .insert({
      organization_id: ORGANIZACION,
      cohort_id: COHORTE,
      name: `${nombre} ${sello}`,
      slug: `graduar-${sello}`,
      tramo: "incubacion",
      entry_state: "facturando",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

async function hitoMarcado(company: string, titulo: string) {
  const { data, error } = await servicio
    .from("milestones")
    .insert({
      company_id: company,
      title: titulo,
      success_criteria: "Algo que se puede comprobar",
      origin: "anexo",
      gates_investable: true,
      requires_validation: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

beforeAll(async () => {
  [admin, equipo, mentor] = await Promise.all([
    entrarComo(USUARIOS.admin),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.mentorComercial),
  ]);
  graduable = await crearCompania("Graduable");
  otra = await crearCompania("Sale sin graduar");
  const { data: p } = await servicio.from("profiles").select("id").eq("email", USUARIOS.mentorComercial).single();
  await servicio.from("company_members").insert([
    { company_id: graduable, profile_id: p!.id, member_role: "mentor_principal" },
  ]);
});

afterAll(async () => {
  for (const id of [graduable, otra]) {
    await servicio.from("activity_log").delete().eq("company_id", id);
    const { error } = await servicio.from("companies").delete().eq("id", id);
    expect(error).toBeNull();
  }
});

describe("graduar una compañía", () => {
  it("por defecto condicionan invertible los cuatro fundamentales del tramo 4, y ninguno más", async () => {
    const { data } = await servicio
      .from("roadmap_template_milestones")
      .select("gates_investable, roadmap_template_stages!inner(tramo, roadmap_templates!inner(code))")
      .eq("roadmap_template_stages.roadmap_templates.code", "hoja_iwl")
      .eq("fundamental", true)
      .is("retired_at", null);
    const tramoDe = (f: { roadmap_template_stages: unknown }) =>
      (f.roadmap_template_stages as { tramo: number }).tramo;
    expect(data!.filter((f) => f.gates_investable).map(tramoDe)).toEqual([4, 4, 4, 4]);
  });

  it("sin hitos que condicionen invertible no se gradúa", async () => {
    expect((await cerrar(admin, graduable, "graduada")).error?.message).toMatch(/no tiene hitos que condicionen invertible/);
  });

  it("con hitos sin validar, tampoco: dice cuántos faltan", async () => {
    marcados = [await hitoMarcado(graduable, "Clientes que repiten"), await hitoMarcado(graduable, "Data room completo")];
    expect((await cerrar(admin, graduable, "graduada")).error?.message).toMatch(/Faltan 2 hitos para poder graduarla/);

    // La cuenta la lee dirección; a los demás, nada
    expect((await admin.rpc("hitos_para_graduar", { p_company: graduable })).data).toEqual({ marcados: 2, pendientes: 2 });
    expect((await equipo.rpc("hitos_para_graduar", { p_company: graduable })).data).toBeNull();

    await servicio.from("milestones").update({ status: "cumplido" }).eq("id", marcados[0]);
    expect((await cerrar(admin, graduable, "graduada")).error?.message).toMatch(/Faltan 1 hito para/);
  });

  it("escribir la columna a mano, ni con la clave de servicio", async () => {
    const { error } = await servicio
      .from("companies")
      .update({
        cierre: "graduada",
        cerrada_on: "2026-11-20",
        cerrada_at: new Date().toISOString(),
        cierre_motivo: "A mano, saltándose la función.",
      })
      .eq("id", graduable);
    expect(error?.message).toMatch(/Faltan 1 hito/);
  });

  it("la marca no se la quita quien coordina: lo decide dirección", async () => {
    for (const quien of [mentor, equipo]) {
      const { error } = await quien.from("milestones").update({ gates_investable: false }).eq("id", marcados[1]);
      expect(error?.message).toMatch(/lo decide dirección/);
    }
    const { data } = await servicio.from("milestones").select("gates_investable").eq("id", marcados[1]).single();
    expect(data!.gates_investable).toBe(true);
  });

  it("con todos validados, se gradúa", async () => {
    await servicio.from("milestones").update({ status: "cumplido" }).eq("id", marcados[1]);
    expect((await admin.rpc("hitos_para_graduar", { p_company: graduable })).data).toEqual({ marcados: 2, pendientes: 0 });
    expect((await cerrar(admin, graduable, "graduada")).error).toBeNull();
  });

  it("finalizada sí se puede elegir con hitos sin validar", async () => {
    await hitoMarcado(otra, "Plan de inversión");
    expect((await cerrar(admin, otra, "salida")).error).toBeNull();
  });
});
