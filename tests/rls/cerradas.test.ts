import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Una compañía cerrada solo la lee dirección, venga la consulta de donde
 * venga (REVISION, 23 nov). Antes, las tablas con políticas de «es de IWL»
 * —Anexos, decisiones, candidaturas— se la seguían enseñando al equipo
 * consultando la base directamente. Una prueba por tabla: el equipo la ve
 * abierta, deja de verla cerrada, y dirección la sigue viendo.
 *
 * Con una compañía y una candidatura creadas aquí: cerrar no tiene vuelta
 * atrás sin reabrir, y una de la semilla cerrada dejaría sin datos a las
 * demás pruebas.
 */

const servicio = clienteServicio();
const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const COHORTE = "00000000-0000-0000-0003-000000000001";

let admin: SupabaseClient;
let equipo: SupabaseClient;
let mentor: SupabaseClient;
let compania: string;
let candidatura: string;
let ruta: string;

/** Cada tabla con la columna por la que se busca la fila de la prueba */
const TABLAS: Array<{ tabla: string; columna: string; valor: () => string }> = [];
const porCompania = (tabla: string) => TABLAS.push({ tabla, columna: "company_id", valor: () => compania });
const porCandidatura = (tabla: string) => TABLAS.push({ tabla, columna: "candidatura_id", valor: () => candidatura });
[
  "annexes",
  "annex_pillars",
  "anexo_comentarios",
  "baselines",
  "cash_commitments",
  "cash_disbursements",
  "decisiones_incorporacion",
  "correos",
  "avisos",
  "candidaturas",
  "company_members",
  "milestones",
].forEach(porCompania);
[
  "candidatura_documentos",
  "candidatura_enlaces",
  "candidatura_eventos",
  "candidatura_peticiones",
  "candidatura_reuniones",
  "comite_actas",
  "nda_firmas",
  "nda_plantillas",
].forEach(porCandidatura);
let acta: string;
TABLAS.push({ tabla: "comite_firmas", columna: "acta_id", valor: () => acta });

async function crear(tabla: string, fila: Record<string, unknown>): Promise<string | undefined> {
  const { data, error } = await servicio.from(tabla).insert(fila).select().single();
  if (error) throw new Error(`${tabla}: ${error.message}`);
  return (data as { id?: string }).id;
}

beforeAll(async () => {
  [admin, equipo, mentor] = await Promise.all([
    entrarComo(USUARIOS.admin),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.mentorComercial),
  ]);
  const sello = Date.now();
  compania = (await crear("companies", {
    organization_id: ORGANIZACION,
    cohort_id: COHORTE,
    name: `Cerrada de prueba ${sello}`,
    slug: `cerrada-de-prueba-${sello}`,
    tramo: "entrada",
    entry_state: "facturando",
  }))!;
  const { data: perfiles } = await servicio.from("profiles").select("id, email").in("email", [USUARIOS.admin, USUARIOS.mentorComercial, USUARIOS.fundadoraVega]);
  const id = (email: string) => perfiles!.find((p) => p.email === email)!.id;
  const { data: pilar } = await servicio.from("pillars").select("id").limit(1).single();

  candidatura = (await crear("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Cerrada de prueba ${sello}`,
    contacto_nombre: "Persona de prueba",
    contacto_email: `cerrada-${sello}@prueba.test`,
    company_id: compania,
  }))!;

  // La decisión se toma en entrada; después pasa a incubación, que es donde se cierra
  await crear("decisiones_incorporacion", { company_id: compania, decision: "si", base: "estrategica", motivo: "Prueba de cierre" });
  const incubacion = await servicio.from("companies").update({ tramo: "incubacion" }).eq("id", compania);
  if (incubacion.error) throw incubacion.error;

  // Con fundadora: sin ella el Anexo no se le puede proponer
  await crear("company_members", { company_id: compania, profile_id: id(USUARIOS.mentorComercial), member_role: "mentor_principal" });
  await crear("company_members", { company_id: compania, profile_id: id(USUARIOS.fundadoraVega), member_role: "fundadora" });

  const anexo = (await crear("annexes", {
    company_id: compania,
    duration_months: 18,
    committed_hours: 40,
    firmantes: [{ nombre: "Fundadora", apellidos: "De Prueba" }],
  }))!;
  // Solo se comenta un Anexo propuesto
  const propuesto = await servicio.from("annexes").update({ status: "propuesto" }).eq("id", anexo);
  if (propuesto.error) throw propuesto.error;
  await crear("annex_pillars", { annex_id: anexo, company_id: compania, pillar_id: pilar!.id });
  await crear("anexo_comentarios", { annex_id: anexo, company_id: compania, texto: "Un comentario de prueba" });
  await crear("baselines", { company_id: compania, kind: "inicial", taken_on: "2026-10-01", stage: "pre_semilla", content: {} });
  await crear("cash_commitments", { company_id: compania, heading: "Prueba", amount: 100 });
  await crear("cash_disbursements", { company_id: compania, amount: 50, disbursed_on: "2026-10-01" });
  await crear("correos", { evento: "recordatorio", destinatario: "nadie@prueba.test", asunto: "Prueba", company_id: compania });
  await crear("avisos", { tipo: "hito_entregado", company_id: compania, para_iwl: true });
  await crear("milestones", { company_id: compania, title: "Un hito suelto", success_criteria: "Algo comprobable", origin: "acordado" });

  ruta = `${candidatura}/prueba-${sello}.txt`;
  const subida = await servicio.storage.from("candidaturas").upload(ruta, new Blob(["prueba"]), { contentType: "text/plain" });
  if (subida.error) throw subida.error;
  const prueba = await crear("candidatura_documentos", { candidatura_id: candidatura, nombre: "Prueba", storage_path: ruta });
  await servicio.from("candidaturas").update({ prueba_documento_id: prueba }).eq("id", candidatura);
  await crear("candidatura_enlaces", { candidatura_id: candidatura, titulo: "Web", url: "https://prueba.test" });
  await crear("candidatura_eventos", { candidatura_id: candidatura, tipo: "nota" });
  await crear("candidatura_peticiones", { candidatura_id: candidatura, titulo: "Una petición" });
  await crear("candidatura_reuniones", { candidatura_id: candidatura });
  acta = (await crear("comite_actas", { candidatura_id: candidatura, resumen: "Prueba", decision: "aplazada", revision_on: "2026-12-01" }))!;
  await crear("comite_firmas", { acta_id: acta, profile_id: id(USUARIOS.admin) });
  await crear("nda_plantillas", { candidatura_id: candidatura, version: 9000 + (sello % 1000), texto: "NDA de prueba", hash: "prueba" });
  await crear("nda_firmas", { candidatura_id: candidatura, modo: "casilla" });
});

afterAll(async () => {
  // Lo creado se borra entero, cerrado o no: la cascada pasa los guardianes
  await servicio.storage.from("candidaturas").remove([ruta]);
  await servicio.from("candidaturas").delete().eq("id", candidatura);
  await servicio.from("correos").delete().eq("company_id", compania);
  await servicio.from("avisos").delete().eq("company_id", compania);
  await servicio.from("activity_log").delete().eq("company_id", compania);
  const { error } = await servicio.from("companies").delete().eq("id", compania);
  expect(error).toBeNull();
});

async function cuenta(quien: SupabaseClient, t: (typeof TABLAS)[number]) {
  const { data, error } = await quien.from(t.tabla).select("*").eq(t.columna, t.valor());
  expect(error).toBeNull();
  return data!.length;
}

describe("abierta, el equipo la ve", () => {
  it.each(TABLAS.map((t) => [t.tabla, t]))("%s", async (_, t) => {
    expect(await cuenta(equipo, t)).toBeGreaterThan(0);
  });

  it("y el archivo de la candidatura", async () => {
    expect((await equipo.storage.from("candidaturas").download(ruta)).error).toBeNull();
  });

  it("el mentor que coordina abre la prueba del estadio desde la ficha (REVISION, 23 nov)", async () => {
    const { data, error } = await mentor.rpc("ficha_entrada", { p_company: compania });
    expect(error).toBeNull();
    expect((data as { prueba_ruta: string }).prueba_ruta).toBe(ruta);
    expect((await mentor.storage.from("candidaturas").download(ruta)).error).toBeNull();
  });
});

describe("cerrada, solo dirección", () => {
  beforeAll(async () => {
    const { error } = await admin.rpc("cerrar_compania", {
      p_company: compania,
      p_cierre: "baja",
      p_fecha: "2026-11-20",
      p_motivo: "No sigue en el programa: prueba de cierre.",
    });
    expect(error).toBeNull();
  });

  it.each(TABLAS.map((t) => [t.tabla, t]))("%s", async (_, t) => {
    expect(await cuenta(equipo, t)).toBe(0);
    expect(await cuenta(admin, t)).toBeGreaterThan(0);
  });

  it("y el archivo de la candidatura", async () => {
    expect((await equipo.storage.from("candidaturas").download(ruta)).error).not.toBeNull();
    expect((await mentor.storage.from("candidaturas").download(ruta)).error).not.toBeNull();
    expect((await admin.storage.from("candidaturas").download(ruta)).error).toBeNull();
  });

  it("el equipo tampoco escribe en lo que era de IWL", async () => {
    const { data } = await equipo.from("candidaturas").update({ nombre: "Otro" }).eq("id", candidatura).select("id");
    expect(data ?? []).toEqual([]);
    const { error } = await equipo.from("candidatura_enlaces").insert({ candidatura_id: candidatura, titulo: "Otro", url: "https://otro.test" });
    expect(error).not.toBeNull();
  });
});
