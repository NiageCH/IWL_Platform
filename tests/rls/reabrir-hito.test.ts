import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Reabrir un hito cumplido (REVISION, 24 nov): solo el mentor principal de
 * la compañía o dirección, con motivo, que queda en su historial y en el
 * registro. Vuelve a pendiente y conserva su evidencia. Un hito que
 * condiciona invertible de una compañía graduada no se reabre.
 *
 * Con dos compañías recién creadas, que se borran enteras al acabar.
 */

const servicio = clienteServicio();
const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const COHORTE = "00000000-0000-0000-0003-000000000001";

let admin: SupabaseClient;
let equipo: SupabaseClient;
let mentor: SupabaseClient;
let fundadora: SupabaseClient;
let compania: string;
let graduada: string;
let hito: string;

async function crearCompania(nombre: string) {
  const sello = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await servicio
    .from("companies")
    .insert({
      organization_id: ORGANIZACION,
      cohort_id: COHORTE,
      name: `${nombre} ${sello}`,
      slug: `reabrir-${sello}`,
      tramo: "incubacion",
      entry_state: "facturando",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id as string;
}

/** Un hito cumplido con su evidencia: la evidencia primero, que a uno cumplido ya no se le añade */
async function hitoCumplido(company: string, titulo: string, invertible = false) {
  const id = crypto.randomUUID();
  await servicio.from("evidence_links").insert({
    company_id: company,
    entity: "milestone",
    entity_id: id,
    kind: "enlace",
    url: "https://ejemplo.test/entrega",
    label: "Entrega validada",
  });
  const { error } = await servicio.from("milestones").insert({
    id,
    company_id: company,
    title: titulo,
    success_criteria: "Algo que se puede comprobar",
    origin: "anexo",
    gates_investable: invertible,
    requires_validation: true,
    status: "cumplido",
  });
  if (error) throw error;
  return id;
}

beforeAll(async () => {
  [admin, equipo, mentor, fundadora] = await Promise.all([
    entrarComo(USUARIOS.admin),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.mentorComercial),
    entrarComo(USUARIOS.fundadoraVega),
  ]);
  compania = await crearCompania("Reabrir un hito");
  graduada = await crearCompania("Ya graduada");
  const { data: personas } = await servicio
    .from("profiles")
    .select("id, email")
    .in("email", [USUARIOS.mentorComercial, USUARIOS.fundadoraVega]);
  const id = (email: string) => personas!.find((p) => p.email === email)!.id;
  await servicio.from("company_members").insert([
    { company_id: compania, profile_id: id(USUARIOS.mentorComercial), member_role: "mentor_principal" },
    { company_id: compania, profile_id: id(USUARIOS.fundadoraVega), member_role: "fundadora" },
  ]);
  hito = await hitoCumplido(compania, "Clientes que repiten");
});

afterAll(async () => {
  for (const id of [compania, graduada]) {
    await servicio.from("activity_log").delete().eq("company_id", id);
    await servicio.from("evidence_links").delete().eq("company_id", id);
    const { error } = await servicio.from("companies").delete().eq("id", id);
    expect(error).toBeNull();
  }
});

describe("reabrir un hito cumplido", () => {
  it("a mano no se reabre: ni quien coordina", async () => {
    const { error } = await equipo.from("milestones").update({ status: "pendiente" }).eq("id", hito);
    expect(error?.message).toMatch(/se reabre con «Reabrir el hito»/);
  });

  it("solo el mentor de la compañía o dirección", async () => {
    const motivo = "El cliente que repetía ha cancelado el contrato.";
    expect((await equipo.rpc("reabrir_hito", { p_hito: hito, p_motivo: motivo })).error?.message).toMatch(
      /del mentor de la compañía o de dirección/,
    );
    expect((await fundadora.rpc("reabrir_hito", { p_hito: hito, p_motivo: motivo })).error?.message).toMatch(
      /del mentor de la compañía o de dirección/,
    );
  });

  it("con motivo", async () => {
    expect((await mentor.rpc("reabrir_hito", { p_hito: hito, p_motivo: "corto" })).error?.message).toMatch(
      /por qué se reabre/,
    );
  });

  it("vuelve a pendiente, conserva su evidencia y deja el motivo en su historial y en el registro", async () => {
    const motivo = "El cliente que repetía ha cancelado el contrato.";
    expect((await mentor.rpc("reabrir_hito", { p_hito: hito, p_motivo: motivo })).error).toBeNull();

    const { data: h } = await servicio.from("milestones").select("status, confirmed_by").eq("id", hito).single();
    expect(h).toEqual({ status: "pendiente", confirmed_by: null });

    const { data: evidencia } = await servicio.from("evidence_links").select("id").eq("entity_id", hito);
    expect(evidencia).toHaveLength(1);

    const { data: historial } = await servicio
      .from("milestone_reviews")
      .select("kind, comment")
      .eq("milestone_id", hito);
    expect(historial).toEqual([{ kind: "reapertura", comment: motivo }]);

    const { data: registro } = await servicio
      .from("activity_log")
      .select("detail")
      .eq("entity_id", hito)
      .eq("action", "hito_reabierto")
      .single();
    expect(registro!.detail).toMatchObject({ motivo });

    // Y ya no está cumplido: no se reabre dos veces
    expect((await admin.rpc("reabrir_hito", { p_hito: hito, p_motivo: motivo })).error?.message).toMatch(
      /Solo se reabre un hito cumplido/,
    );
  });

  it("en una compañía graduada, uno que condiciona invertible no se reabre: antes, la compañía", async () => {
    const marcado = await hitoCumplido(graduada, "Data room completo", true);
    const { error: cierre } = await admin.rpc("cerrar_compania", {
      p_company: graduada,
      p_cierre: "graduada",
      p_fecha: "2026-11-20",
      p_motivo: "Cerró su ronda: prueba de reabrir.",
    });
    expect(cierre).toBeNull();
    expect(
      (await admin.rpc("reabrir_hito", { p_hito: marcado, p_motivo: "Se reabre para probar el guardián." })).error
        ?.message,
    ).toMatch(/reabre antes la compañía/);
  });
});
