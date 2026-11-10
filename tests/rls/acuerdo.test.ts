import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * El Anexo como propuesta de Acuerdo, la firma desde la compañía y el
 * cambio de vía.
 *
 * Con dos compañías recién nacidas en entrada:
 *   · una de Aceleración, con su fundadora con cuenta: se le propone el
 *     Anexo, lo comenta, lo acepta, y el Acuerdo no se firma hasta que lo
 *     obligatorio del due diligence está validado;
 *   · una de Construcción, sin cuenta: se firma sin nada validado, y
 *     después dirección la pasa a Aceleración con motivo, y se avisa a su
 *     mentor principal.
 *
 * Se prueba entrando como ella, como una fundadora ajena, como el equipo,
 * como dirección y como el mentor.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const COHORTE = "00000000-0000-0000-0003-000000000001";
const CLAVE = "una-clave-del-acuerdo-55";
const SELLO = crypto.randomUUID().slice(0, 8);
const CORREO = `rls.acuerdo.${SELLO}@ejemplo.test`;

let candAcel = "";
let candCons = "";
let candidataId = "";
let segundaId = "";
let acel = "";
let cons = "";
let anexoAcel = "";
let anexoCons = "";
let ella: SupabaseClient;

async function perfil(email: string) {
  const { data } = await clienteServicio().from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

async function nacerEnEntrada(candidatura: string) {
  const servicio = clienteServicio();
  const { error } = await servicio.rpc("registrar_nda_externo", {
    p_candidatura: candidatura,
    p_profile: await perfil(USUARIOS.admin),
    p_firmado_on: "2026-11-01",
    p_documento: null,
    p_url: "https://ejemplo.test/nda.pdf",
  });
  expect(error).toBeNull();
  const { data } = await servicio.from("candidaturas").select("company_id").eq("id", candidatura).single();
  return data!.company_id as string;
}

async function abrirAnexo(company: string) {
  const admin = await entrarComo(USUARIOS.admin);
  const { data, error } = await admin
    .from("annexes")
    .insert({ company_id: company, version: 1, duration_months: 12, committed_hours: 120, equity_pct: 3 })
    .select("id")
    .single();
  expect(error).toBeNull();
  return data!.id as string;
}

const proponer = async (anexo: string, firmantes = [{ nombre: "Fundadora de Prueba", calidad: "personal" }]) =>
  (await entrarComo(USUARIOS.admin))
    .from("annexes")
    .update({ firmantes, status: "propuesto" })
    .eq("id", anexo)
    .select("id");

const firmar = async (company: string) =>
  (await entrarComo(USUARIOS.equipoIwl)).rpc("firmar_acuerdo", {
    p_company: company,
    p_stage: "pre_semilla",
    p_tech_profile: "software",
    p_firmado_on: "2026-11-10",
  });

beforeAll(async () => {
  const servicio = clienteServicio();
  const { data: a } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS Acuerdo Acel ${SELLO}`,
      contacto_nombre: "Fundadora de Prueba",
      contacto_email: CORREO,
      estado: "preseleccionada",
      via: "aceleracion",
      situacion_societaria: "sin_constituir",
    })
    .select("id")
    .single();
  candAcel = a!.id;

  const { data: c } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS Acuerdo Cons ${SELLO}`,
      contacto_nombre: "Otra de Prueba",
      contacto_email: `rls.acuerdo.cons.${SELLO}@ejemplo.test`,
      estado: "preseleccionada",
      via: "construccion",
      situacion_societaria: "sin_constituir",
    })
    .select("id")
    .single();
  candCons = c!.id;

  const { data: u } = await servicio.auth.admin.createUser({ email: CORREO, password: CLAVE, email_confirm: true });
  candidataId = u!.user!.id;
  const admin = await entrarComo(USUARIOS.admin);
  expect((await admin.rpc("dar_acceso_candidatura", { p_candidatura: candAcel, p_profile: candidataId })).error).toBeNull();

  acel = await nacerEnEntrada(candAcel);
  cons = await nacerEnEntrada(candCons);

  /*
   * Sin sociedad, proponer pide la fecha del hito «Constituir la sociedad»
   * (el equity queda comprometido hasta entonces). Eso tiene su propia
   * prueba, en `construccion.test.ts`; aquí se le pone para probar lo demás.
   */
  await servicio.from("milestones").update({ due_date: "2027-03-01" }).in("company_id", [acel, cons]).eq("origin", "societario");

  ella = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await ella.auth.signInWithPassword({ email: CORREO, password: CLAVE })).error).toBeNull();
});

afterAll(async () => {
  // Primero las candidaturas: una firmada no se queda sin compañía, ni un momento
  const servicio = clienteServicio();
  expect((await servicio.from("candidaturas").delete().in("id", [candAcel, candCons])).error).toBeNull();
  for (const id of [acel, cons].filter(Boolean)) {
    expect((await servicio.from("companies").delete().eq("id", id)).error).toBeNull();
  }
  if (candidataId) await servicio.auth.admin.deleteUser(candidataId);
  if (segundaId) await servicio.auth.admin.deleteUser(segundaId);
});

describe("proponer el Anexo", () => {
  it("nace en borrador, y el borrador ella no lo ve", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error: yaAceptado } = await admin
      .from("annexes")
      .insert({ company_id: acel, version: 1, status: "aceptado", duration_months: 12, committed_hours: 120 });
    expect(yaAceptado?.message).toMatch(/nace en borrador/);

    anexoAcel = await abrirAnexo(acel);
    const { data } = await ella.from("annexes").select("id").eq("company_id", acel);
    expect(data).toEqual([]);
  });

  it("no se propone sin la incorporación en «sí», ni sin quién firma", async () => {
    const { error: sinDecision } = await proponer(anexoAcel);
    expect(sinDecision?.message).toMatch(/decidir la incorporación/);

    const admin = await entrarComo(USUARIOS.admin);
    for (const company of [acel, cons]) {
      expect(
        (await admin.from("decisiones_incorporacion").insert({ company_id: company, decision: "si", base: "estrategica", motivo: "Encaja en la cohorte." })).error,
      ).toBeNull();
    }

    const { error: sinFirmantes } = await proponer(anexoAcel, []);
    expect(sinFirmantes?.message).toMatch(/quién firma/);
  });

  it("propuesto, ella lo ve, la candidatura pasa a «Acuerdo propuesto» y ya no se edita", async () => {
    const { data, error } = await proponer(anexoAcel);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    const { data: suyo } = await ella.from("annexes").select("status, firmantes").eq("id", anexoAcel).single();
    expect(suyo).toEqual({ status: "propuesto", firmantes: [{ nombre: "Fundadora de Prueba", calidad: "personal" }] });

    const servicio = clienteServicio();
    const { data: c } = await servicio.from("candidaturas").select("estado").eq("id", candAcel).single();
    expect(c!.estado).toBe("acuerdo");

    // Ni el equipo ni la clave de servicio: es integridad
    const { error: editar } = await servicio.from("annexes").update({ equity_pct: 10 }).eq("id", anexoAcel);
    expect(editar?.message).toMatch(/no se edita/);
  });
});

describe("comentarlo y aceptarlo", () => {
  it("ella lo comenta: pasa a comentado y avisa a dirección; una ajena no comenta", async () => {
    const { error } = await ella
      .from("anexo_comentarios")
      .insert({ annex_id: anexoAcel, company_id: acel, texto: "¿Las horas incluyen la mentoría?" });
    expect(error).toBeNull();

    const servicio = clienteServicio();
    const { data: a } = await servicio.from("annexes").select("status").eq("id", anexoAcel).single();
    expect(a!.status).toBe("comentado");
    const { data: avisos } = await servicio.from("avisos").select("tipo, cerrado_at").eq("company_id", acel).eq("tipo", "anexo_comentario");
    expect(avisos).toEqual([{ tipo: "anexo_comentario", cerrado_at: null }]);

    const ajena = await entrarComo(USUARIOS.fundadoraMarea);
    const { error: intrusa } = await ajena.from("anexo_comentarios").insert({ annex_id: anexoAcel, company_id: acel, texto: "Intrusa" });
    expect(intrusa).not.toBeNull();
    const { data: lee } = await ajena.from("anexo_comentarios").select("id").eq("company_id", acel);
    expect(lee).toEqual([]);
  });

  it("responde IWL y el aviso se cierra; ella no se responde", async () => {
    const { data: suya } = await ella.from("anexo_comentarios").update({ respuesta: "Sí" }).eq("company_id", acel).select("id");
    expect(suya).toEqual([]);

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error } = await equipo.from("anexo_comentarios").update({ respuesta: "Sí, las incluyen." }).eq("company_id", acel);
    expect(error).toBeNull();

    const { data: avisos } = await clienteServicio().from("avisos").select("cerrado_at").eq("company_id", acel).eq("tipo", "anexo_comentario");
    expect(avisos!.every((a) => a.cerrado_at)).toBe(true);
  });

  it("la acepta ella: ni IWL ni una fundadora ajena", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error: iwl } = await admin.from("annexes").update({ status: "aceptado" }).eq("id", anexoAcel);
    expect(iwl?.message).toMatch(/la acepta la fundadora/);

    const ajena = await entrarComo(USUARIOS.fundadoraMarea);
    expect((await ajena.rpc("aceptar_anexo", { p_anexo: anexoAcel })).error).not.toBeNull();

    // Firmar antes de que la acepte, no
    expect((await firmar(acel)).error?.message).toMatch(/acepte la propuesta/);

    const { error } = await ella.rpc("aceptar_anexo", { p_anexo: anexoAcel });
    expect(error).toBeNull();
    const { data } = await clienteServicio().from("annexes").select("status, aceptado_por").eq("id", anexoAcel).single();
    expect(data).toEqual({ status: "aceptado", aceptado_por: candidataId });
  });

  it("devolverlo a borrador para cambiarlo quita la aceptación", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    expect((await admin.from("annexes").update({ status: "borrador" }).eq("id", anexoAcel)).error).toBeNull();
    const { data } = await clienteServicio().from("annexes").select("aceptado_at").eq("id", anexoAcel).single();
    expect(data!.aceptado_at).toBeNull();

    // Y otra vez: propuesto y aceptado
    expect((await proponer(anexoAcel)).error).toBeNull();
    expect((await ella.rpc("aceptar_anexo", { p_anexo: anexoAcel })).error).toBeNull();
  });
});

describe("firmar el Acuerdo", () => {
  it("en Aceleración, no sin lo obligatorio del due diligence validado", async () => {
    const { error } = await firmar(acel);
    expect(error?.message).toMatch(/obligatorio del due diligence.*Faltan \d+/);
  });

  it("validado lo obligatorio, pasa a incubación con KPI, y la candidatura queda firmada", async () => {
    const servicio = clienteServicio();
    await servicio
      .from("dd_items")
      .update({ status: "validado" })
      .eq("company_id", acel)
      .eq("is_required", true)
      .not("status", "in", "(validado,no_aplica)");

    const { error } = await firmar(acel);
    expect(error).toBeNull();

    const { data: co } = await servicio.from("companies").select("tramo, stage, tech_profile").eq("id", acel).single();
    expect(co).toEqual({ tramo: "incubacion", stage: "pre_semilla", tech_profile: "software" });
    const { data: a } = await servicio.from("annexes").select("status, signed_on").eq("id", anexoAcel).single();
    expect(a).toEqual({ status: "firmado", signed_on: "2026-11-10" });
    const { data: kpis } = await servicio.from("company_kpis").select("id").eq("company_id", acel);
    expect(kpis!.length).toBeGreaterThan(0);
    const { data: c } = await servicio.from("candidaturas").select("estado, equity_pct, acuerdo_firmantes").eq("id", candAcel).single();
    expect(c).toEqual({ estado: "firmada", equity_pct: 3, acuerdo_firmantes: [{ nombre: "Fundadora de Prueba", calidad: "personal" }] });
  });

  it("sin una fundadora con cuenta no se propone; «Dar acceso» la hace fundadora, y solo lo da IWL", async () => {
    anexoCons = await abrirAnexo(cons);
    const firmantes = [{ nombre: "Otra de Prueba", calidad: "personal" }];
    const { error: sinCuenta } = await proponer(anexoCons, firmantes);
    expect(sinCuenta?.message).toMatch(/tiene que tener cuenta/);

    const servicio = clienteServicio();
    const correo = `rls.acuerdo.cons.${SELLO}@ejemplo.test`;
    const { data: u } = await servicio.auth.admin.createUser({ email: correo, password: CLAVE, email_confirm: true });
    segundaId = u!.user!.id;

    const ajena = await entrarComo(USUARIOS.fundadoraMarea);
    expect((await ajena.rpc("dar_acceso_fundadora", { p_company: cons, p_profile: segundaId })).error).not.toBeNull();

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    expect((await equipo.rpc("dar_acceso_fundadora", { p_company: cons, p_profile: segundaId })).error).toBeNull();
    const { data: miembro } = await servicio
      .from("company_members")
      .select("member_role")
      .eq("company_id", cons)
      .eq("profile_id", segundaId);
    expect(miembro).toEqual([{ member_role: "fundadora" }]);
    const { data: c } = await servicio.from("candidaturas").select("profile_id").eq("id", candCons).single();
    expect(c!.profile_id).toBe(segundaId);

    expect((await proponer(anexoCons, firmantes)).error).toBeNull();
  });

  it("en Construcción, se firma sin nada validado, cuando ella lo acepta con su cuenta", async () => {
    const segunda = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    expect(
      (await segunda.auth.signInWithPassword({ email: `rls.acuerdo.cons.${SELLO}@ejemplo.test`, password: CLAVE })).error,
    ).toBeNull();
    expect((await segunda.rpc("aceptar_anexo", { p_anexo: anexoCons })).error).toBeNull();

    const { data: validados } = await clienteServicio().from("dd_items").select("id").eq("company_id", cons).eq("status", "validado");
    expect(validados).toEqual([]);

    expect((await firmar(cons)).error).toBeNull();
    const { data } = await clienteServicio().from("companies").select("tramo").eq("id", cons).single();
    expect(data!.tramo).toBe("incubacion");
  });
});

describe("ningún Anexo se firma sin su aceptación", () => {
  it("ni de borrador a firmado, ni con la clave de servicio, ni en incubación", async () => {
    const servicio = clienteServicio();
    const { data: nuevo } = await servicio
      .from("annexes")
      .insert({ company_id: acel, version: 2, duration_months: 12, committed_hours: 60 })
      .select("id")
      .single();
    const { error } = await servicio.from("annexes").update({ status: "firmado", signed_on: "2026-11-10" }).eq("id", nuevo!.id);
    expect(error?.message).toMatch(/cuando ella lo ha aceptado/);
    await servicio.from("annexes").delete().eq("id", nuevo!.id);
  });

  it("ni insertándolo ya firmado con sesión", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error } = await admin
      .from("annexes")
      .insert({ company_id: acel, version: 2, status: "firmado", signed_on: "2026-11-10", committed_hours: 10 });
    expect(error?.message).toMatch(/nace en borrador/);
  });
});

describe("pasar de Construcción a Aceleración", () => {
  let mentorId = "";

  beforeAll(async () => {
    mentorId = await perfil(USUARIOS.mentorProducto);
    await clienteServicio()
      .from("company_members")
      .insert({ company_id: cons, profile_id: mentorId, member_role: "mentor_principal" });
  });

  it("no con un update directo, ni el equipo, ni sin motivo", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error: directo } = await admin.from("companies").update({ via: "aceleracion" }).eq("id", cons);
    expect(directo?.message).toMatch(/pide el motivo/);

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    expect((await equipo.rpc("pasar_a_aceleracion", { p_company: cons, p_motivo: "Ya factura cada mes." })).error).not.toBeNull();

    expect((await admin.rpc("pasar_a_aceleracion", { p_company: cons, p_motivo: "Factura" })).error?.message).toMatch(/motivo/);
  });

  it("con motivo: lo por construir pasa a por entregar, queda en el registro y avisa al mentor principal", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error } = await admin.rpc("pasar_a_aceleracion", { p_company: cons, p_motivo: "Ya factura cada mes desde octubre." });
    expect(error).toBeNull();

    const servicio = clienteServicio();
    const { data: puntos } = await servicio.from("dd_items").select("status").eq("company_id", cons).eq("status", "por_construir");
    expect(puntos).toEqual([]);

    const { data: registro } = await servicio
      .from("activity_log")
      .select("detail")
      .eq("company_id", cons)
      .eq("action", "cambio_via")
      .single();
    expect((registro!.detail as { motivo: string }).motivo).toBe("Ya factura cada mes desde octubre.");

    const mentor = await entrarComo(USUARIOS.mentorProducto);
    const { data: suyos } = await mentor.from("avisos").select("id, tipo").eq("company_id", cons);
    expect(suyos!.map((a) => a.tipo)).toEqual(["cambio_via"]);

    // Lo da por visto él mismo
    const { data: cerrado } = await mentor
      .from("avisos")
      .update({ cerrado_at: new Date().toISOString() })
      .eq("id", suyos![0].id)
      .select("id");
    expect(cerrado).toHaveLength(1);

    // Y no le llega a nadie más: ni al otro mentor, ni a una fundadora
    const otro = await entrarComo(USUARIOS.mentorComercial);
    expect((await otro.from("avisos").select("id").eq("company_id", cons)).data).toEqual([]);
  });

  it("y de Aceleración no se vuelve", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error } = await admin.from("companies").update({ via: "construccion" }).eq("id", cons);
    expect(error?.message).toMatch(/no se vuelve/);
  });
});
