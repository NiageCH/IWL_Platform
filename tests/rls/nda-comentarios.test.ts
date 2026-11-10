import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Comentar el NDA y tener uno propio.
 *
 * Con una candidatura y una cuenta de candidata recién creadas, en orden:
 * comenta, IWL responde, se le guarda una versión propia, firma, se le
 * cambia el texto y su firma se anula, firma otra vez, IWL contrafirma, y
 * ya no cabe ni otra versión ni otro comentario.
 *
 * Se prueba entrando como ella y como una fundadora ajena, que son quienes
 * tendrían interés en leer o escribir lo que no es suyo.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const COHORTE = "00000000-0000-0000-0003-000000000001";
const AMBAR = "00000000-0000-0000-0005-000000000004";
const CLAVE = "una-clave-de-prueba-88";
const SELLO = crypto.randomUUID().slice(0, 8);
const CORREO = `rls.nda.${SELLO}@ejemplo.test`;

let candidaturaId = "";
let candidataId = "";
let ella: SupabaseClient;

const textoLargo = (que: string) => `${que}. ${"Texto de prueba de un NDA, que no es un NDA. ".repeat(8)}`;

async function perfil(email: string) {
  const { data } = await clienteServicio().from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

const firmar = (plantilla: string) =>
  clienteServicio().rpc("firmar_nda", {
    p_candidatura: candidaturaId,
    p_profile: candidataId,
    p_nombre: "Candidata de Prueba",
    p_plantilla: plantilla,
    p_ip: "1.2.3.4",
    p_ua: "prueba",
  });

async function versionPropia(texto: string) {
  const admin = await entrarComo(USUARIOS.admin);
  return admin
    .from("nda_plantillas")
    .insert({ texto, version: 0, hash: "", candidatura_id: candidaturaId })
    .select("id, version")
    .single();
}

beforeAll(async () => {
  const servicio = clienteServicio();
  const { data: c } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS NDA ${SELLO}`,
      contacto_nombre: "Candidata de Prueba",
      contacto_email: CORREO,
      estado: "nda",
    })
    .select("id")
    .single();
  candidaturaId = c!.id;

  const { data: u, error } = await servicio.auth.admin.createUser({
    email: CORREO,
    password: CLAVE,
    email_confirm: true,
  });
  expect(error).toBeNull();
  candidataId = u!.user!.id;

  const admin = await entrarComo(USUARIOS.admin);
  const { error: acceso } = await admin.rpc("dar_acceso_candidatura", {
    p_candidatura: candidaturaId,
    p_profile: candidataId,
  });
  expect(acceso).toBeNull();

  ella = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: entrada } = await ella.auth.signInWithPassword({ email: CORREO, password: CLAVE });
  expect(entrada).toBeNull();
});

afterAll(async () => {
  // Con versiones propias y una firma que las nombra, el borrado en cascada tiene que poder
  const servicio = clienteServicio();
  const { error } = await servicio.from("candidaturas").delete().eq("id", candidaturaId);
  expect(error).toBeNull();
  const { data } = await servicio.from("nda_plantillas").select("id").eq("candidatura_id", candidaturaId);
  expect(data).toEqual([]);
  if (candidataId) await servicio.auth.admin.deleteUser(candidataId);
});

describe("los comentarios", () => {
  it("comenta el suyo, avisa a dirección, y la base pone de quién y sobre qué versión", async () => {
    const { error } = await ella.from("nda_comentarios").insert({
      candidatura_id: candidaturaId,
      texto: "La cláusula 4 no la entiendo.",
      profile_id: "00000000-0000-0000-0002-000000000001",
      respuesta: "Me respondo yo misma",
    });
    expect(error).toBeNull();

    const servicio = clienteServicio();
    const { data: comentario } = await servicio
      .from("nda_comentarios")
      .select("profile_id, plantilla_id, respuesta")
      .eq("candidatura_id", candidaturaId)
      .single();
    const { data: generica } = await servicio
      .from("nda_plantillas")
      .select("id")
      .is("candidatura_id", null)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    expect(comentario).toEqual({ profile_id: candidataId, plantilla_id: generica!.id, respuesta: null });

    const { data: avisos } = await servicio
      .from("avisos")
      .select("tipo, cerrado_at")
      .eq("candidatura_id", candidaturaId)
      .eq("tipo", "nda_comentario");
    expect(avisos).toEqual([{ tipo: "nda_comentario", cerrado_at: null }]);
  });

  it("no comenta el de otra, y una fundadora ajena no lee los suyos", async () => {
    const { error } = await ella.from("nda_comentarios").insert({ candidatura_id: AMBAR, texto: "Intruso" });
    expect(error).not.toBeNull();

    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data } = await fundadora.from("nda_comentarios").select("id").eq("candidatura_id", candidaturaId);
    expect(data).toEqual([]);
  });

  it("responde IWL, no ella; responder cierra el aviso, y el comentario no se edita", async () => {
    const { data: propia } = await ella
      .from("nda_comentarios")
      .update({ respuesta: "Me respondo" })
      .eq("candidatura_id", candidaturaId)
      .select("id");
    expect(propia).toEqual([]);

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error: editar } = await equipo
      .from("nda_comentarios")
      .update({ texto: "Otra cosa", respuesta: "Hola" })
      .eq("candidatura_id", candidaturaId);
    expect(editar?.message).toMatch(/no se edita/);

    const { error } = await equipo
      .from("nda_comentarios")
      .update({ respuesta: "Es la de no competencia: te la explicamos." })
      .eq("candidatura_id", candidaturaId);
    expect(error).toBeNull();

    const servicio = clienteServicio();
    const { data } = await servicio
      .from("nda_comentarios")
      .select("respondido_por, respondido_at")
      .eq("candidatura_id", candidaturaId)
      .single();
    expect(data!.respondido_por).toBe(await perfil(USUARIOS.equipoIwl));
    expect(data!.respondido_at).not.toBeNull();

    const { data: avisos } = await servicio
      .from("avisos")
      .select("cerrado_at")
      .eq("candidatura_id", candidaturaId)
      .eq("tipo", "nda_comentario");
    expect(avisos!.every((a) => a.cerrado_at)).toBe(true);
  });
});

describe("la versión propia", () => {
  let propia = "";

  it("solo la guarda dirección, y la ven IWL y ella, nadie más", async () => {
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error: sinPermiso } = await equipo
      .from("nda_plantillas")
      .insert({ texto: textoLargo("Del equipo"), version: 0, hash: "", candidatura_id: candidaturaId });
    expect(sinPermiso).not.toBeNull();

    const { data, error } = await versionPropia(textoLargo("Versión propia 1"));
    expect(error).toBeNull();
    propia = data!.id;

    const { data: suya } = await ella.rpc("plantilla_nda_de", { p_candidatura: candidaturaId });
    expect(suya).toBe(propia);
    const { data: laLee } = await ella.from("nda_plantillas").select("id").eq("id", propia);
    expect(laLee).toHaveLength(1);

    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data: ajena } = await fundadora.from("nda_plantillas").select("id").eq("id", propia);
    expect(ajena).toEqual([]);
    const { data: cual } = await fundadora.rpc("plantilla_nda_de", { p_candidatura: candidaturaId });
    expect(cual).toBeNull();
  });

  it("con una propia, firmar la genérica no vale", async () => {
    const { data: generica } = await clienteServicio()
      .from("nda_plantillas")
      .select("id")
      .is("candidatura_id", null)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    const { error } = await firmar(generica!.id);
    expect(error?.message).toMatch(/ha cambiado/);

    const { error: buena } = await firmar(propia);
    expect(buena).toBeNull();
  });

  it("otra versión anula su firma si IWL no ha firmado, y queda dicho en el historial", async () => {
    const { data, error } = await versionPropia(textoLargo("Versión propia 2"));
    expect(error).toBeNull();
    propia = data!.id;

    const servicio = clienteServicio();
    const { data: firma } = await servicio.from("nda_firmas").select("candidatura_id").eq("candidatura_id", candidaturaId);
    expect(firma).toEqual([]);

    const { data: estado } = await ella.rpc("estado_nda", { p_candidatura: candidaturaId });
    expect(estado).toBe("por_firmar");

    const { data: eventos } = await servicio
      .from("candidatura_eventos")
      .select("titulo, detalle")
      .eq("candidatura_id", candidaturaId)
      .like("titulo", "Firma del NDA anulada%");
    expect(eventos).toHaveLength(1);
    expect(eventos![0].detalle).toMatch(new RegExp(`Tiene que firmar la versión ${data!.version}`));

    const { data: avisos } = await servicio
      .from("avisos")
      .select("cerrado_at")
      .eq("candidatura_id", candidaturaId)
      .eq("tipo", "nda_firmado");
    expect(avisos!.every((a) => a.cerrado_at)).toBe(true);
  });

  it("con las dos firmas, ni otra versión ni otro comentario", async () => {
    expect((await firmar(propia)).error).toBeNull();
    const { error: contra } = await clienteServicio().rpc("contrafirmar_nda", {
      p_candidatura: candidaturaId,
      p_profile: await perfil(USUARIOS.admin),
      p_ip: "1.2.3.4",
      p_ua: "prueba",
    });
    expect(contra).toBeNull();

    const { error } = await versionPropia(textoLargo("Versión propia 3"));
    expect(error?.message).toMatch(/Un cambio es un NDA nuevo/);

    const { error: comentario } = await ella
      .from("nda_comentarios")
      .insert({ candidatura_id: candidaturaId, texto: "Una cosa más" });
    expect(comentario?.message).toMatch(/ya no se puede comentar/);
  });
});
