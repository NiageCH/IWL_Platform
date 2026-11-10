import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * La compañía nace al contrafirmar el NDA, en entrada.
 *
 * Con dos candidaturas recién creadas:
 *   · una de Construcción, con cuenta, que firma el NDA en la plataforma:
 *     nace su compañía con todo «por construir», ella pasa a fundadora, dice
 *     su situación una vez, IWL la confirma y dirección decide que no;
 *   · una de Aceleración, sin cuenta, con el NDA firmado fuera: nace con
 *     el checklist por entregar y sin nadie dentro.
 *
 * Se prueba entrando como ella, como el equipo y como una fundadora ajena.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const COHORTE = "00000000-0000-0000-0003-000000000001";
const CLAVE = "una-clave-de-entrada-77";
const SELLO = crypto.randomUUID().slice(0, 8);
const CORREO = `rls.entrada.${SELLO}@ejemplo.test`;
const NOMBRE = `Ña Entrada ${SELLO}`;

let construccion = "";
let aceleracion = "";
let candidataId = "";
let companiaC = "";
let companiaA = "";
let ella: SupabaseClient;

async function perfil(email: string) {
  const { data } = await clienteServicio().from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

async function companiaDe(candidatura: string) {
  const { data } = await clienteServicio().from("candidaturas").select("company_id, estado").eq("id", candidatura).single();
  return data as { company_id: string | null; estado: string };
}

beforeAll(async () => {
  const servicio = clienteServicio();

  const { data: c } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: NOMBRE,
      contacto_nombre: "Fundadora de Prueba",
      contacto_email: CORREO,
      estado: "preseleccionada",
      via: "construccion",
      estado_declarado: "mvp",
      sector: "Salud",
    })
    .select("id")
    .single();
  construccion = c!.id;

  const { data: a } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS Aceleración ${SELLO}`,
      contacto_nombre: "Otra de Prueba",
      contacto_email: `rls.acel.${SELLO}@ejemplo.test`,
      estado: "preseleccionada",
      via: "aceleracion",
    })
    .select("id")
    .single();
  aceleracion = a!.id;

  const { data: u } = await servicio.auth.admin.createUser({ email: CORREO, password: CLAVE, email_confirm: true });
  candidataId = u!.user!.id;

  const admin = await entrarComo(USUARIOS.admin);
  expect((await admin.rpc("dar_acceso_candidatura", { p_candidatura: construccion, p_profile: candidataId })).error).toBeNull();

  ella = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await ella.auth.signInWithPassword({ email: CORREO, password: CLAVE })).error).toBeNull();
});

afterAll(async () => {
  const servicio = clienteServicio();
  for (const id of [companiaC, companiaA].filter(Boolean)) {
    const { error } = await servicio.from("companies").delete().eq("id", id);
    expect(error).toBeNull();
  }
  await servicio.from("candidaturas").delete().in("id", [construccion, aceleracion]);
  if (candidataId) await servicio.auth.admin.deleteUser(candidataId);
});

describe("al contrafirmar el NDA", () => {
  it("nace la compañía en entrada, con su vía, y ella pasa a fundadora", async () => {
    const servicio = clienteServicio();
    // La que vale para ella, preguntada con su sesión: con la de servicio no hay a quién responder
    const { data: plantilla } = await ella.rpc("plantilla_nda_de", { p_candidatura: construccion });
    expect(plantilla).toBeTruthy();
    expect(
      (
        await servicio.rpc("firmar_nda", {
          p_candidatura: construccion,
          p_profile: candidataId,
          p_nombre: "Fundadora de Prueba",
          p_plantilla: plantilla,
          p_ip: "1.2.3.4",
          p_ua: "prueba",
        })
      ).error,
    ).toBeNull();

    // Con solo su firma todavía no hay compañía
    expect((await companiaDe(construccion)).company_id).toBeNull();

    const { error } = await servicio.rpc("contrafirmar_nda", {
      p_candidatura: construccion,
      p_profile: await perfil(USUARIOS.admin),
      p_ip: "1.2.3.4",
      p_ua: "prueba",
    });
    expect(error).toBeNull();

    const c = await companiaDe(construccion);
    expect(c.estado).toBe("entrada");
    companiaC = c.company_id!;

    const { data: co } = await servicio
      .from("companies")
      .select("name, slug, tramo, via, stage, sector, entry_state")
      .eq("id", companiaC)
      .single();
    expect(co).toMatchObject({ name: NOMBRE, tramo: "entrada", via: "construccion", stage: null, sector: "Salud", entry_state: "mvp" });
    // El identificador sale del nombre, sin tildes ni eñes
    expect(co!.slug).toBe(`na-entrada-${SELLO}`);

    const { data: yo } = await servicio.from("profiles").select("role").eq("id", candidataId).single();
    expect(yo!.role).toBe("fundadora");
    const { data: miembro } = await servicio
      .from("company_members")
      .select("member_role")
      .eq("company_id", companiaC)
      .eq("profile_id", candidataId);
    expect(miembro).toEqual([{ member_role: "fundadora" }]);

    const { data: eventos } = await servicio
      .from("candidatura_eventos")
      .select("titulo")
      .eq("candidatura_id", construccion)
      .eq("titulo", "Compañía creada, en entrada");
    expect(eventos).toHaveLength(1);
  });

  it("en Construcción, el checklist y el business plan nacen por construir, sin KPI ni hoja de ruta", async () => {
    const servicio = clienteServicio();
    const { data: puntos } = await servicio.from("dd_items").select("status").eq("company_id", companiaC);
    expect(puntos!.length).toBeGreaterThan(0);
    expect(new Set(puntos!.map((p) => p.status))).toEqual(new Set(["por_construir"]));

    const { data: secciones } = await servicio.from("bp_sections").select("status").eq("company_id", companiaC);
    expect(secciones!.length).toBeGreaterThan(0);
    expect(secciones!.every((s) => s.status === "por_construir")).toBe(true);

    const { data: kpis } = await servicio.from("company_kpis").select("id").eq("company_id", companiaC);
    expect(kpis ?? []).toEqual([]);
  });

  it("en Aceleración, con el NDA firmado fuera y sin cuenta, nace por entregar y sin nadie dentro", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error } = await clienteServicio().rpc("registrar_nda_externo", {
      p_candidatura: aceleracion,
      p_profile: await perfil(USUARIOS.admin),
      p_firmado_on: "2026-11-01",
      p_documento: null,
      p_url: "https://ejemplo.test/nda-firmado.pdf",
    });
    expect(error).toBeNull();

    const c = await companiaDe(aceleracion);
    expect(c.estado).toBe("entrada");
    companiaA = c.company_id!;

    const { data: puntos } = await admin.from("dd_items").select("status").eq("company_id", companiaA);
    expect(puntos!.some((p) => p.status === "pendiente")).toBe(true);
    expect(puntos!.some((p) => p.status === "por_construir")).toBe(false);

    const { data: miembros } = await admin.from("company_members").select("id").eq("company_id", companiaA);
    expect(miembros).toEqual([]);
  });
});

describe("la situación societaria", () => {
  it("la dice ella, una vez, y avisa a IWL para confirmarla", async () => {
    // Su sesión es la de antes de pasar a fundadora: el rol se lee de la base
    const { data: suya } = await ella.from("companies").select("id, tramo").eq("id", companiaC);
    expect(suya).toEqual([{ id: companiaC, tramo: "entrada" }]);

    const { error } = await ella
      .from("companies")
      .update({ situacion_societaria: "sin_constituir" })
      .eq("id", companiaC);
    expect(error).toBeNull();

    const servicio = clienteServicio();
    const { data: avisos } = await servicio
      .from("avisos")
      .select("tipo, profile_id, cerrado_at")
      .eq("company_id", companiaC);
    expect(avisos).toEqual([{ tipo: "situacion_dicha", profile_id: candidataId, cerrado_at: null }]);

    // Sin sociedad: lo que la requiere no aplica y lo de sin sociedad nace por construir
    const { data: puntos } = await servicio
      .from("dd_items")
      .select("status, dd_item_templates(code)")
      .eq("company_id", companiaC);
    const de = (code: string) =>
      puntos!.find((p) => (p.dd_item_templates as unknown as { code: string }).code === code)?.status;
    expect(de("sl_escritura")).toBe("no_aplica");
    expect(de("sl_pacto_fundadoras")).toBe("por_construir");

    const { data: hito } = await servicio.from("milestones").select("title").eq("company_id", companiaC).eq("origin", "societario");
    expect(hito).toEqual([{ title: "Constituir la sociedad" }]);
  });

  it("después ya no la cambia ella, ni se confirma a sí misma, ni toca el tramo", async () => {
    const intentos = [
      { situacion_societaria: "en_constitucion", constitucion_prevista: "2027-01-15" },
      { situacion_confirmada_at: new Date().toISOString() },
      { tramo: "incubacion" },
    ];
    for (const cambio of intentos) {
      const { error } = await ella.from("companies").update(cambio).eq("id", companiaC);
      expect(error, JSON.stringify(cambio)).not.toBeNull();
    }
  });

  it("la confirma el equipo, y el aviso se cierra", async () => {
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error } = await equipo
      .from("companies")
      .update({ situacion_confirmada_at: new Date().toISOString(), situacion_confirmada_por: await perfil(USUARIOS.equipoIwl) })
      .eq("id", companiaC);
    expect(error).toBeNull();

    const { data: avisos } = await clienteServicio().from("avisos").select("cerrado_at").eq("company_id", companiaC);
    expect(avisos!.every((a) => a.cerrado_at)).toBe(true);
  });
});

describe("su due diligence, que es el checklist de la compañía", () => {
  /*
   * Lo que antes se probaba sobre la lista de la candidatura, ahora sobre
   * el objeto que la sustituye: quién ve qué y quién decide qué se pide.
   */
  it("ella ve el checklist entero de su compañía, y solo el suyo", async () => {
    const { data: todos } = await clienteServicio().from("dd_items").select("id").eq("company_id", companiaC);
    const { data } = await ella.from("dd_items").select("company_id");
    expect(data!.length).toBe(todos!.length);
    expect([...new Set(data!.map((p) => p.company_id))]).toEqual([companiaC]);
  });

  it("una fundadora ajena no ve nada de él", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data } = await fundadora.from("dd_items").select("id").eq("company_id", companiaC);
    expect(data).toEqual([]);
  });

  it("ella no se pide cosas a sí misma, ni se quita lo que se le pide", async () => {
    const servicio = clienteServicio();
    const { data: antes } = await servicio.from("dd_items").select("id, area_id").eq("company_id", companiaC);

    const { error } = await ella
      .from("dd_items")
      .insert({ company_id: companiaC, area_id: antes![0].area_id, title: "Me lo pido yo" });
    expect(error).not.toBeNull();

    await ella.from("dd_items").delete().eq("company_id", companiaC);
    const { data: despues } = await servicio.from("dd_items").select("id").eq("company_id", companiaC);
    expect(despues!.length).toBe(antes!.length);
  });

  it("ni lo saca de «por construir»: eso es de quien valida", async () => {
    const { data: uno } = await clienteServicio()
      .from("dd_items")
      .select("id")
      .eq("company_id", companiaC)
      .eq("status", "por_construir")
      .limit(1)
      .single();
    const { error } = await ella.from("dd_items").update({ status: "pendiente" }).eq("id", uno!.id);
    expect(error).not.toBeNull();
  });
});

describe("la decisión de incorporación", () => {
  it("no la toma el equipo ni la lee una fundadora", async () => {
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error } = await equipo
      .from("decisiones_incorporacion")
      .insert({ company_id: companiaC, decision: "si", base: "estrategica", motivo: "Del equipo, sin permiso" });
    expect(error).not.toBeNull();

    const admin = await entrarComo(USUARIOS.admin);
    expect(
      (await admin.from("decisiones_incorporacion").insert({ company_id: companiaA, decision: "si", base: "due_diligence", motivo: "Para ver si ella la lee" })).error,
    ).toBeNull();

    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data } = await fundadora.from("decisiones_incorporacion").select("id");
    expect(data).toEqual([]);
    const { data: suya } = await ella.from("decisiones_incorporacion").select("id");
    expect(suya).toEqual([]);
  });

  it("«no» pide el mensaje, archiva la compañía como No incorporada y descarta la candidatura", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error: sinMensaje } = await admin
      .from("decisiones_incorporacion")
      .insert({ company_id: companiaC, decision: "no", base: "estrategica", motivo: "El proyecto ha cambiado de foco." });
    expect(sinMensaje).not.toBeNull();

    const { error } = await admin.from("decisiones_incorporacion").insert({
      company_id: companiaC,
      decision: "no",
      base: "estrategica",
      motivo: "El proyecto ha cambiado de foco.",
      mensaje: "Hola: esta vez no seguimos.",
    });
    expect(error).toBeNull();

    const servicio = clienteServicio();
    const { data: co } = await servicio.from("companies").select("archived_at, archive_reason").eq("id", companiaC).single();
    expect(co!.archived_at).not.toBeNull();
    expect(co!.archive_reason).toBe("No incorporada: El proyecto ha cambiado de foco.");

    const { data: c } = await servicio.from("candidaturas").select("estado, descartada_desde").eq("id", construccion).single();
    expect(c).toEqual({ estado: "descartada", descartada_desde: "entrada" });
  });

  it("una decisión no se cambia ni se borra, ni con la clave de servicio", async () => {
    const servicio = clienteServicio();
    const { error: cambiar } = await servicio
      .from("decisiones_incorporacion")
      .update({ decision: "si" })
      .eq("company_id", companiaC);
    expect(cambiar?.message).toMatch(/no se cambia/);

    const { error: borrar } = await servicio.from("decisiones_incorporacion").delete().eq("company_id", companiaC);
    expect(borrar?.message).toMatch(/no se cambia/);

    const admin = await entrarComo(USUARIOS.admin);
    const { error: otra } = await admin
      .from("decisiones_incorporacion")
      .insert({ company_id: companiaA, decision: "no", base: "due_diligence", motivo: "Otra decisión", mensaje: "Hola" });
    expect(otra).not.toBeNull();
  });
});
