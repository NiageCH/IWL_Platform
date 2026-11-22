import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Hitos: ella entrega con evidencia, el mentor valida (REVISION, 13 y 18 nov).
 *
 * Con una compañía y una fundadora recién creadas, no con las de la
 * semilla: hace falta un Anexo en borrador para poder marcar hitos con
 * financiación (el equity ya no va por hitos), y proponerlo después para ver que las marcas quedan fijas. El
 * mentor de producto coordina; el comercial acompaña sin coordinar.
 *
 * Todo lo que se crea se borra al acabar: la compañía (con sus hitos,
 * evidencias, historial y avisos) y la cuenta.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const sufijo = crypto.randomUUID().slice(0, 8);
const CORREO = `rls.hitos.${sufijo}@ejemplo.test`;
const CLAVE = `clave-de-prueba-${sufijo}`;

const servicio = clienteServicio();
const sql = postgres(process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres", {
  max: 1,
  onnotice: () => {},
});

let companyId = "";
let fundadoraId = "";
let ella: SupabaseClient;
let principal: SupabaseClient;
let secundario: SupabaseClient;
let equipo: SupabaseClient;
let admin: SupabaseClient;

async function idDe(email: string) {
  const { data } = await servicio.from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

async function nuevoHito(campos: Record<string, unknown> = {}) {
  const { data, error } = await servicio
    .from("milestones")
    .insert({
      company_id: companyId,
      title: `Hito ${crypto.randomUUID().slice(0, 6)}`,
      success_criteria: "Que la prueba pase.",
      status: "en_curso",
      ...campos,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

async function adjuntar(cliente: SupabaseClient, hito: string) {
  return cliente.from("evidence_links").insert({
    company_id: companyId,
    entity: "milestone",
    entity_id: hito,
    kind: "enlace",
    url: "https://ejemplo.test/entregable",
    label: "Entregable",
  });
}

async function hito(id: string) {
  const { data } = await servicio
    .from("milestones")
    .select("status, delivered_at, delivered_by, confirmed_by, completed_on")
    .eq("id", id)
    .single();
  return data!;
}

beforeAll(async () => {
  const { data: co, error } = await servicio
    .from("companies")
    .insert({ organization_id: ORGANIZACION, name: `RLS Hitos ${sufijo}`, slug: `rls-hitos-${sufijo}` })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  companyId = co!.id;

  const { data: u } = await servicio.auth.admin.createUser({ email: CORREO, password: CLAVE, email_confirm: true });
  fundadoraId = u!.user!.id;

  equipo = await entrarComo(USUARIOS.equipoIwl);
  admin = await entrarComo(USUARIOS.admin);
  expect((await equipo.rpc("dar_acceso_fundadora", { p_company: companyId, p_profile: fundadoraId })).error).toBeNull();

  await servicio.from("company_members").insert([
    { company_id: companyId, profile_id: await idDe(USUARIOS.mentorProducto), member_role: "mentor_principal" },
    { company_id: companyId, profile_id: await idDe(USUARIOS.mentorComercial), member_role: "mentor_secundario" },
  ]);

  const { error: falloAnexo } = await servicio.from("annexes").insert({
    company_id: companyId,
    version: 1,
    status: "borrador",
    equity_pct: 5,
    committed_cash: 30000,
    duration_months: 12,
    committed_hours: 100,
  });
  if (falloAnexo) throw new Error(falloAnexo.message);

  ella = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await ella.auth.signInWithPassword({ email: CORREO, password: CLAVE })).error).toBeNull();
  principal = await entrarComo(USUARIOS.mentorProducto);
  secundario = await entrarComo(USUARIOS.mentorComercial);
});

afterAll(async () => {
  if (companyId) {
    const { error } = await servicio.from("companies").delete().eq("id", companyId);
    expect(error).toBeNull();
  }
  if (fundadoraId) await servicio.auth.admin.deleteUser(fundadoraId);
  await sql.end();
});

describe("entregar", () => {
  it("sin evidencia no se entrega, y el estado no se pone a mano", async () => {
    const id = await nuevoHito();
    const sin = await ella.rpc("entregar_hito", { p_hito: id });
    expect(sin.error?.message).toMatch(/evidencia/);

    await adjuntar(ella, id);
    const aMano = await ella.from("milestones").update({ status: "entregado" }).eq("id", id);
    expect(aMano.error?.message).toMatch(/Entregar/);
    expect((await hito(id)).status).toBe("en_curso");
  });

  it("con evidencia queda entregado, guardado en el historial y con aviso al mentor principal", async () => {
    const id = await nuevoHito();
    expect((await adjuntar(ella, id)).error).toBeNull();

    const { data, error } = await ella.rpc("entregar_hito", { p_hito: id, p_nota: "Aquí está" });
    expect(error).toBeNull();
    expect(data).toBe("entregado");

    const fila = await hito(id);
    expect(fila.status).toBe("entregado");
    expect(fila.delivered_by).toBe(fundadoraId);
    expect(fila.delivered_at).not.toBeNull();

    const { data: historial } = await servicio
      .from("milestone_reviews")
      .select("kind, comment, evidence")
      .eq("milestone_id", id);
    expect(historial).toEqual([
      { kind: "entrega", comment: "Aquí está", evidence: [{ label: "Entregable", url: "https://ejemplo.test/entregable", document_id: null }] },
    ]);

    const { data: avisos } = await servicio.from("avisos").select("tipo, para").eq("milestone_id", id);
    expect(avisos).toEqual([{ tipo: "hito_entregado", para: await idDe(USUARIOS.mentorProducto) }]);

    // Lo que se está revisando no se cambia
    const quitar = await ella.from("evidence_links").delete().eq("entity_id", id);
    expect(quitar.error?.message).toMatch(/no se cambia/);
  });
});

describe("revisar", () => {
  it("el secundario deja una nota, pero no valida ni pide cambios", async () => {
    const id = await nuevoHito();
    await adjuntar(ella, id);
    await ella.rpc("entregar_hito", { p_hito: id });

    expect((await secundario.rpc("validar_hito", { p_hito: id })).error).not.toBeNull();
    expect((await secundario.rpc("pedir_cambios_hito", { p_hito: id, p_comentario: "No" })).error).not.toBeNull();
    expect((await secundario.rpc("comentar_hito", { p_hito: id, p_nota: "Buena pinta" })).error).toBeNull();
    // Ella tampoco
    expect((await ella.rpc("validar_hito", { p_hito: id })).error).not.toBeNull();
    expect((await ella.from("milestones").update({ status: "en_curso" }).eq("id", id)).error).not.toBeNull();
    expect((await hito(id)).status).toBe("entregado");
  });

  it("pedir cambios pide comentario, vuelve a en curso y cierra el aviso; validar lo cumple", async () => {
    const id = await nuevoHito();
    await adjuntar(ella, id);
    await ella.rpc("entregar_hito", { p_hito: id });

    expect((await principal.rpc("pedir_cambios_hito", { p_hito: id, p_comentario: "  " })).error?.message).toMatch(
      /qué hay que cambiar/,
    );
    expect((await principal.rpc("pedir_cambios_hito", { p_hito: id, p_comentario: "Falta el anexo" })).error).toBeNull();
    expect((await hito(id)).status).toBe("en_curso");
    const { data: abiertos } = await servicio.from("avisos").select("id").eq("milestone_id", id).is("cerrado_at", null);
    expect(abiertos).toEqual([]);

    // Vuelve a entregar: ahora sí puede tocar la evidencia
    expect((await adjuntar(ella, id)).error).toBeNull();
    expect((await ella.rpc("entregar_hito", { p_hito: id })).error).toBeNull();
    expect((await principal.rpc("validar_hito", { p_hito: id, p_nota: "Perfecto" })).error).toBeNull();

    const fila = await hito(id);
    expect(fila.status).toBe("cumplido");
    expect(fila.confirmed_by).toBe(await idDe(USUARIOS.mentorProducto));

    const { data: historial } = await servicio
      .from("milestone_reviews")
      .select("kind")
      .eq("milestone_id", id)
      .order("created_at");
    expect(historial!.map((r) => r.kind)).toEqual(["entrega", "cambios", "entrega", "validacion"]);

    // Lo validado, ella no lo reabre
    expect((await ella.from("milestones").update({ status: "en_curso" }).eq("id", id)).error).not.toBeNull();
  });

  it("si quien coordina se lo encarga, el secundario también valida", async () => {
    const id = await nuevoHito();
    expect(
      (await ella.from("milestones").update({ reviewer_id: await idDe(USUARIOS.mentorComercial) }).eq("id", id)).error,
    ).not.toBeNull();
    expect(
      (await principal.from("milestones").update({ reviewer_id: await idDe(USUARIOS.mentorComercial) }).eq("id", id))
        .error,
    ).toBeNull();
    await adjuntar(ella, id);
    await ella.rpc("entregar_hito", { p_hito: id });
    const { data: avisos } = await servicio.from("avisos").select("para").eq("milestone_id", id);
    expect(avisos).toHaveLength(2);
    expect((await secundario.rpc("validar_hito", { p_hito: id })).error).toBeNull();
    expect((await hito(id)).status).toBe("cumplido");
  });
});

describe("sin validación", () => {
  it("lo quita quien coordina, y entonces entregar es cumplir", async () => {
    const id = await nuevoHito();
    expect((await ella.from("milestones").update({ requires_validation: false }).eq("id", id)).error).not.toBeNull();
    expect((await principal.from("milestones").update({ requires_validation: false }).eq("id", id)).error).toBeNull();

    await adjuntar(ella, id);
    const { data } = await ella.rpc("entregar_hito", { p_hito: id });
    expect(data).toBe("cumplido");
    const fila = await hito(id);
    expect(fila.status).toBe("cumplido");
    expect(fila.confirmed_by).toBeNull();
    expect(fila.completed_on).not.toBeNull();
    const { data: avisos } = await servicio.from("avisos").select("id").eq("milestone_id", id);
    expect(avisos).toEqual([]);
  });
});

describe("efecto económico", () => {
  let economico = "";

  it("el equity no va por hitos: ningún hito lo devenga, ni con la clave de servicio (REVISION, 22 nov)", async () => {
    const id = await nuevoHito();
    expect((await admin.from("milestones").update({ accrues_equity_pct: 2 }).eq("id", id)).error).not.toBeNull();
    expect((await servicio.from("milestones").update({ accrues_equity_pct: 2 }).eq("id", id)).error?.message).toMatch(
      /milestones_sin_equity_de_compania/,
    );
  });

  it("la financiación la pone dirección, y no pasa de lo que compromete el Anexo", async () => {
    economico = await nuevoHito();
    expect(
      (await equipo.from("milestones").update({ releases_funding: 2000 }).eq("id", economico)).error?.message,
    ).toMatch(/dirección/);
    expect((await admin.from("milestones").update({ releases_funding: 20000 }).eq("id", economico)).error).toBeNull();

    const otro = await nuevoHito();
    const caja = await admin.from("milestones").update({ releases_funding: 15000 }).eq("id", otro);
    expect(caja.error?.message).toMatch(/Quedan 10000 €/);

    // Con marca, la validación no se quita
    const quitar = await principal.from("milestones").update({ requires_validation: false }).eq("id", economico);
    expect(quitar.error?.code).toBe("23514");
  });

  it("con el Anexo propuesto quedan fijas, y van en su historial", async () => {
    const proponer = await servicio
      .from("annexes")
      .update({ firmantes: [{ nombre: "Fundadora de Prueba", calidad: "personal" }], status: "propuesto" })
      .eq("company_id", companyId);
    expect(proponer.error?.message ?? null).toBeNull();
    const cambiar = await admin.from("milestones").update({ releases_funding: 1000 }).eq("id", economico);
    expect(cambiar.error?.message).toMatch(/quedan fijos/);

    const { data: version } = await servicio
      .from("anexo_versiones")
      .select("contenido")
      .eq("company_id", companyId)
      .eq("momento", "propuesto")
      .single();
    const hitos = (version!.contenido as { hitos_economicos: Array<{ equity_pct: number; financiacion: number }> })
      .hitos_economicos;
    expect(hitos).toHaveLength(1);
    expect(hitos[0]).toMatchObject({ financiacion: 20000 });
  });

  it("se cumple solo por «Validar», sobre una entrega, y deja lo liberado en el registro", async () => {
    // Quien coordina no lo da por cumplido desde el selector
    expect((await principal.from("milestones").update({ status: "cumplido" }).eq("id", economico)).error).not.toBeNull();

    await adjuntar(ella, economico);
    await ella.rpc("entregar_hito", { p_hito: economico });
    expect((await principal.rpc("validar_hito", { p_hito: economico })).error).toBeNull();

    const { data: registro } = await servicio
      .from("activity_log")
      .select("action, detail")
      .eq("entity_id", economico)
      .in("action", ["equity_devengado", "financiacion_liberada"])
      .order("action");
    expect(registro).toHaveLength(1);
    expect(registro![0]).toMatchObject({ action: "financiacion_liberada", detail: { importe: 20000 } });
    expect((registro![0].detail as { validado_por: string | null }).validado_por).toBeTruthy();
  });

  it("lo devengado no se reabre ni se borra sin motivo, ni siquiera dirección", async () => {
    expect((await admin.from("milestones").update({ status: "en_curso" }).eq("id", economico)).error?.message).toMatch(
      /no se reabre/,
    );
    const borrar = await admin.from("milestones").delete().eq("id", economico);
    expect(borrar.error?.message).toMatch(/sin motivo/);
    expect((await hito(economico)).status).toBe("cumplido");
  });
});

describe("siete días sin revisar", () => {
  it("el cron avisa a dirección una sola vez, y nadie con sesión puede llamarlo", async () => {
    const id = await nuevoHito();
    await adjuntar(ella, id);
    await ella.rpc("entregar_hito", { p_hito: id });

    // La antigüedad no la deja escribir el disparador: se envejece sin él
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role = replica`;
      await tx`update milestones set delivered_at = now() - interval '8 days' where id = ${id}`;
    });

    expect((await admin.rpc("avisar_hitos_sin_revisar")).error).not.toBeNull();
    expect((await servicio.rpc("avisar_hitos_sin_revisar")).error).toBeNull();
    await servicio.rpc("avisar_hitos_sin_revisar");

    const { data: avisos } = await servicio
      .from("avisos")
      .select("para")
      .eq("milestone_id", id)
      .eq("tipo", "hito_sin_revisar");
    expect(avisos).toEqual([{ para: null }]);
  });
});
