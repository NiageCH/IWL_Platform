import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * El NDA personalizado: marcadores, huecos y el texto completado.
 *
 * Con una candidatura recién creada en Preseleccionada y una versión del
 * NDA solo para ella —la genérica no se puede tocar en pruebas: las
 * versiones no se borran—:
 *   · un marcador desconocido no deja guardar la plantilla;
 *   · con un hueco entre corchetes no se envía: ni dar cuenta ni pasar a
 *     «NDA enviado», y ella vería «en preparación»;
 *   · sin huecos se envía, y se firma el texto completado: con un hueco
 *     dentro no, y el hash es el del texto que llega;
 *   · IWL contrafirma el mismo texto, con el mismo hash; la fecha de
 *     efecto no es un marcador.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = crypto.randomUUID().slice(0, 8);
const CORREO = `rls.nda.pers.${SELLO}@ejemplo.test`;
const RELLENO = " Texto de prueba, que no es un NDA.".repeat(8);

let candidaturaId = "";
let candidataId = "";

const sha = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

async function perfil(email: string) {
  const { data } = await clienteServicio().from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

async function versionPropia(texto: string) {
  const admin = await entrarComo(USUARIOS.admin);
  return admin
    .from("nda_plantillas")
    .insert({ texto, version: 0, hash: "", candidatura_id: candidaturaId })
    .select("id")
    .single();
}

beforeAll(async () => {
  const servicio = clienteServicio();
  const { data: c } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS NDA Pers ${SELLO}`,
      contacto_nombre: "Candidata de Prueba",
      contacto_email: CORREO,
      estado: "preseleccionada",
    })
    .select("id")
    .single();
  candidaturaId = c!.id;
  const { data: u } = await servicio.auth.admin.createUser({ email: CORREO, password: "una-clave-88-prueba", email_confirm: true });
  candidataId = u!.user!.id;
});

afterAll(async () => {
  const servicio = clienteServicio();
  const { data: c } = await servicio.from("candidaturas").select("company_id").eq("id", candidaturaId).single();
  await servicio.from("candidaturas").delete().eq("id", candidaturaId);
  if (c?.company_id) await servicio.from("companies").delete().eq("id", c.company_id);
  if (candidataId) await servicio.auth.admin.deleteUser(candidataId);
});

describe("la plantilla", () => {
  it("la fecha de efecto no es un marcador: no deja guardarla, y dice por qué", async () => {
    const { error } = await versionPropia(`Con efecto desde {{fecha_efecto}}.${RELLENO}`);
    expect(error?.message).toMatch(/La fecha de efecto no va en el texto/);
  });

  it("un marcador desconocido no deja guardarla", async () => {
    const { error } = await versionPropia(`Hola {{nombre_fundadora}}.${RELLENO}`);
    expect(error?.message).toMatch(/nombre_fundadora/);
  });

  it("con un hueco entre corchetes no se envía: ni cuenta ni «NDA enviado»", async () => {
    expect((await versionPropia(`Firmado en [CIUDAD] con {{startup}}.${RELLENO}`)).error).toBeNull();

    const admin = await entrarComo(USUARIOS.admin);
    const { error: acceso } = await admin.rpc("dar_acceso_candidatura", { p_candidatura: candidaturaId, p_profile: candidataId });
    expect(acceso?.message).toMatch(/\[CIUDAD\]/);
    const { error: paso } = await admin.from("candidaturas").update({ estado: "nda" }).eq("id", candidaturaId);
    expect(paso?.message).toMatch(/\[CIUDAD\]/);

    const { data: estado } = await admin.rpc("estado_nda", { p_candidatura: candidaturaId });
    expect(estado).toBe("plantilla_con_huecos");
  });
});

describe("la firma", () => {
  let plantilla = "";

  it("sin huecos se envía", async () => {
    const { data, error } = await versionPropia(`Entre IWL y {{contraparte_nombre}}, con documento {{documento}}.${RELLENO}`);
    expect(error).toBeNull();
    plantilla = data!.id;
    const admin = await entrarComo(USUARIOS.admin);
    expect((await admin.rpc("dar_acceso_candidatura", { p_candidatura: candidaturaId, p_profile: candidataId })).error).toBeNull();
  });

  const firmar = (texto: string, datos = {}) =>
    clienteServicio().rpc("firmar_nda", {
      p_candidatura: candidaturaId,
      p_profile: candidataId,
      p_nombre: "Candidata de Prueba",
      p_plantilla: plantilla,
      p_texto: texto,
      p_datos: datos,
      p_ip: "1.2.3.4",
      p_ua: "prueba",
    });

  it("con un hueco en el texto no se firma, sea marcador o corchetes", async () => {
    expect((await firmar("Entre IWL y Candidata de Prueba, con documento {{documento}}.")).error?.message).toMatch(/\{\{documento\}\}/);
    expect((await firmar("Entre IWL y Candidata de Prueba, con documento [DNI].")).error?.message).toMatch(/\[DNI\]/);
  });

  it("completado, se firma, y el hash es el del texto que firmó, con sus datos guardados", async () => {
    const texto = `Entre IWL y Candidata de Prueba, con documento 12345678Z.${RELLENO}`;
    expect((await firmar(texto, { documento: "12345678Z", es_sociedad: false })).error).toBeNull();

    const { data } = await clienteServicio()
      .from("nda_firmas")
      .select("texto_hash, texto_firmado, datos")
      .eq("candidatura_id", candidaturaId)
      .single();
    expect(data).toEqual({ texto_hash: sha(texto), texto_firmado: texto, datos: { documento: "12345678Z", es_sociedad: false } });
  });

  it("IWL contrafirma el mismo texto, con el mismo hash: no hay un segundo texto", async () => {
    const { error } = await clienteServicio().rpc("contrafirmar_nda", {
      p_candidatura: candidaturaId,
      p_profile: await perfil(USUARIOS.admin),
      p_ip: "1.2.3.4",
      p_ua: "prueba",
    });
    expect(error).toBeNull();

    const { data } = await clienteServicio()
      .from("nda_firmas")
      .select("*")
      .eq("candidatura_id", candidaturaId)
      .single();
    expect(data!.texto_hash).toBe(sha(data!.texto_firmado));
    expect(data!.contrafirmado_at).not.toBeNull();
    expect(Object.keys(data!)).not.toContain("texto_final");
  });
});
