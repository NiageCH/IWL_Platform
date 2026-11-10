import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Construcción: no se trabaja sin Acuerdo, y entrar antes cuesta más equity.
 *
 * Con una compañía recién nacida en entrada por Construcción, sin sociedad:
 *   · no se imputan horas, ni con la clave de servicio; y en una que firmó,
 *     ninguna anterior a la firma;
 *   · con la horquilla fijada, proponer un equity fuera de ella pide motivo,
 *     que queda en el registro;
 *   · sin sociedad, proponer pide la fecha del hito «Constituir la
 *     sociedad», que pasa a ser hito del Anexo;
 *   · al constituirse, el equity comprometido se materializa con la fecha.
 *
 * La horquilla es un ajuste de toda la plataforma: se restaura a como
 * estaba, por fuera del camino que se prueba.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = crypto.randomUUID().slice(0, 8);
const CORREO = `rls.construccion.${SELLO}@ejemplo.test`;

let candidatura = "";
let compania = "";
let anexo = "";
let fundadoraId = "";
let horquillaAntes: unknown = {};

async function perfil(email: string) {
  const { data } = await clienteServicio().from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

const proponer = async (cambios: Record<string, unknown> = {}) =>
  (await entrarComo(USUARIOS.admin))
    .from("annexes")
    .update({ firmantes: [{ nombre: "Fundadora de Prueba", calidad: "personal" }], ...cambios, status: "propuesto" })
    .eq("id", anexo)
    .select("id");

beforeAll(async () => {
  const servicio = clienteServicio();
  const { data: h } = await servicio.from("platform_settings").select("value").eq("key", "equity_horquilla").single();
  horquillaAntes = h!.value;

  const { data: c } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS Construcción ${SELLO}`,
      contacto_nombre: "Fundadora de Prueba",
      contacto_email: CORREO,
      estado: "preseleccionada",
      via: "construccion",
      situacion_societaria: "sin_constituir",
    })
    .select("id")
    .single();
  candidatura = c!.id;

  expect(
    (
      await servicio.rpc("registrar_nda_externo", {
        p_candidatura: candidatura,
        p_profile: await perfil(USUARIOS.admin),
        p_firmado_on: "2026-11-01",
        p_documento: null,
        p_url: "https://ejemplo.test/nda.pdf",
      })
    ).error,
  ).toBeNull();
  const { data: con } = await servicio.from("candidaturas").select("company_id").eq("id", candidatura).single();
  compania = con!.company_id;

  const { data: u } = await servicio.auth.admin.createUser({ email: CORREO, password: "una-clave-99-prueba", email_confirm: true });
  fundadoraId = u!.user!.id;
  await servicio.from("company_members").insert({ company_id: compania, profile_id: fundadoraId, member_role: "fundadora" });

  const admin = await entrarComo(USUARIOS.admin);
  await admin.from("decisiones_incorporacion").insert({ company_id: compania, decision: "si", base: "estrategica", motivo: "Encaja en la cohorte." });
  const { data: a } = await admin
    .from("annexes")
    .insert({ company_id: compania, version: 1, duration_months: 12, committed_hours: 120, equity_pct: 3 })
    .select("id")
    .single();
  anexo = a!.id;
});

afterAll(async () => {
  const servicio = clienteServicio();
  await servicio.from("platform_settings").update({ value: horquillaAntes }).eq("key", "equity_horquilla");
  await servicio.from("candidaturas").delete().eq("id", candidatura);
  if (compania) await servicio.from("companies").delete().eq("id", compania);
  if (fundadoraId) await servicio.auth.admin.deleteUser(fundadoraId);
});

describe("las horas", () => {
  const linea = async (worked_on: string) => {
    const { data: materia } = await clienteServicio().from("contribution_subjects").select("id").limit(1).single();
    return {
      company_id: compania,
      worked_on,
      person_name: "Mentora de Prueba",
      profile_code: "senior",
      subject_id: materia!.id,
      description: "Sesión de diagnóstico",
      hours: 2,
    };
  };

  it("en entrada no se imputan, ni con la clave de servicio", async () => {
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error } = await equipo.from("contribution_hours").insert(await linea("2026-11-05"));
    expect(error?.message).toMatch(/cuentan desde la firma/);
    const { error: servicio } = await clienteServicio().from("contribution_hours").insert(await linea("2026-11-05"));
    expect(servicio?.message).toMatch(/cuentan desde la firma/);
  });
});

describe("la horquilla de equity", () => {
  it("vacía no se comprueba; fijada, salirse pide el motivo, que queda en el registro", async () => {
    const servicio = clienteServicio();
    await servicio
      .from("platform_settings")
      .update({ value: { construccion: { min: 8, max: 12 } } })
      .eq("key", "equity_horquilla");
    await servicio.from("milestones").update({ due_date: "2027-03-01" }).eq("company_id", compania).eq("origin", "societario");

    const { error: sinMotivo } = await proponer();
    expect(sinMotivo?.message).toMatch(/horquilla de Construcción/);

    const { error } = await proponer({ equity_fuera_motivo: "Entra con el producto muy avanzado." });
    expect(error).toBeNull();

    const { data: registro } = await servicio
      .from("activity_log")
      .select("detail")
      .eq("company_id", compania)
      .eq("action", "proponer")
      .single();
    expect((registro!.detail as { fuera_de_horquilla: string }).fuera_de_horquilla).toBe("Entra con el producto muy avanzado.");

    // Y propuesto, el motivo tampoco se cambia
    const { error: cambiar } = await servicio.from("annexes").update({ equity_fuera_motivo: "Otro" }).eq("id", anexo);
    expect(cambiar?.message).toMatch(/no se edita/);

    const admin = await entrarComo(USUARIOS.admin);
    expect((await admin.from("annexes").update({ status: "borrador" }).eq("id", anexo)).error).toBeNull();
  });
});

describe("el equity sin sociedad", () => {
  it("proponer pide la fecha de «Constituir la sociedad», que pasa a ser hito del Anexo", async () => {
    const servicio = clienteServicio();
    await servicio.from("platform_settings").update({ value: {} }).eq("key", "equity_horquilla");
    await servicio.from("milestones").update({ due_date: null, annex_id: null }).eq("company_id", compania).eq("origin", "societario");

    const { error: sinFecha } = await proponer();
    expect(sinFecha?.message).toMatch(/Constituir la sociedad/);

    await servicio.from("milestones").update({ due_date: "2027-03-01" }).eq("company_id", compania).eq("origin", "societario");
    expect((await proponer()).error).toBeNull();

    const { data: hito } = await servicio
      .from("milestones")
      .select("annex_id")
      .eq("company_id", compania)
      .eq("origin", "societario")
      .single();
    expect(hito!.annex_id).toBe(anexo);
  });

  it("al constituirse la sociedad, el equity comprometido se materializa con la fecha", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error } = await admin
      .from("companies")
      .update({ situacion_societaria: "constituida", forma_juridica: "sl", denominacion_social: "Prueba SL", cif: "B00000000" })
      .eq("id", compania);
    expect(error).toBeNull();

    const { data } = await clienteServicio().from("annexes").select("equity_materializado_on").eq("id", anexo).single();
    expect(data!.equity_materializado_on).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("las horas, después de firmar", () => {
  it("ninguna anterior a la firma del Acuerdo", async () => {
    const servicio = clienteServicio();
    // La firma, por fuera: lo que se prueba aquí es la fecha de las horas
    await servicio.from("companies").update({ tramo: "incubacion", stage: "pre_semilla", tech_profile: "software" }).eq("id", compania);
    await servicio.from("candidaturas").update({ acuerdo_firmado_on: "2026-11-10" }).eq("id", candidatura);

    const { data: materia } = await servicio.from("contribution_subjects").select("id").limit(1).single();
    const base = {
      company_id: compania,
      person_name: "Mentora de Prueba",
      profile_code: "senior",
      subject_id: materia!.id,
      description: "Sesión de trabajo",
      hours: 2,
    };
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error: antes } = await equipo.from("contribution_hours").insert({ ...base, worked_on: "2026-11-09" });
    expect(antes?.message).toMatch(/anterior/);
    const { error: despues } = await equipo.from("contribution_hours").insert({ ...base, worked_on: "2026-11-10" });
    expect(despues).toBeNull();
  });
});
