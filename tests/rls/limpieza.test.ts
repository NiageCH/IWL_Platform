import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";
import { limpiarFicherosSueltos } from "@/lib/limpieza";

/**
 * La limpieza diaria de ficheros sueltos (REVISION, 13 nov).
 *
 * Ficheros subidos sin pasar por pantalla. En el data room:
 *   · suelto, de hace 2 días, bajo una carpeta que no es de ninguna
 *     compañía → se borra;
 *   · igual pero de hace 1 hora → se queda: puede ser una subida que se
 *     está registrando;
 *   · igual pero con nombre de NDA firmado → se queda;
 *   · en la carpeta de Vega, de hace 2 días y apuntado por un documento →
 *     se queda;
 *   · en la carpeta de Vega, de hace 2 días y sin apuntar → se queda: Vega
 *     existe (REVISION, 17 nov).
 * Y en el expediente de candidaturas:
 *   · de una candidatura descartada hace 30 días, sin apuntar → se queda;
 *   · de una candidatura que ya no existe, de hace 2 días → se borra.
 *
 * La antigüedad no se puede poner por la API de Storage, así que se
 * envejecen con SQL contra la base local. Lo que crea la prueba se borra al
 * acabar, el registro de actividad incluido.
 */

const servicio = clienteServicio();
const sql = postgres(process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres", {
  max: 1,
  onnotice: () => {},
});

const COHORTE = "00000000-0000-0000-0003-000000000001";

// Una carpeta que no es de nadie: ni compañía ni candidatura
const nadie = `${crypto.randomUUID()}/financiero`;
const viejo = `${nadie}/${crypto.randomUUID()}/viejo-abandonado.pdf`;
const reciente = `${nadie}/${crypto.randomUUID()}/reciente.pdf`;
const firmado = `${nadie}/${crypto.randomUUID()}/NDA-firmado.pdf`;
const documentoId = crypto.randomUUID();
const apuntado = `${COMPANIAS.vega}/financiero/${documentoId}/cuentas.pdf`;
const deVega = `${COMPANIAS.vega}/financiero/${crypto.randomUUID()}/sin-apuntar.pdf`;
const enDataRoom = [viejo, reciente, firmado, apuntado, deVega];

const descartadaId = crypto.randomUUID();
const deDescartada = `${descartadaId}/${Date.now()}-plan-de-negocio.pdf`;
const deDesaparecida = `${crypto.randomUUID()}/${Date.now()}-plan-de-negocio.pdf`;
const enCandidaturas = [deDescartada, deDesaparecida];

async function existe(bucket: string, ruta: string) {
  const [fila] = await sql`select 1 from storage.objects where bucket_id = ${bucket} and name = ${ruta}`;
  return Boolean(fila);
}

async function subir(bucket: string, ruta: string) {
  const { error } = await servicio.storage
    .from(bucket)
    .upload(ruta, new Blob(["%PDF-1.4 prueba de limpieza"], { type: "application/pdf" }));
  if (error) throw new Error(`No se ha podido preparar ${ruta}: ${error.message}`);
}

beforeAll(async () => {
  const hace30 = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const { error: falloCandidatura } = await servicio.from("candidaturas").insert({
    id: descartadaId,
    cohort_id: COHORTE,
    nombre: `Limpieza descartada ${descartadaId.slice(0, 8)}`,
    contacto_nombre: "Prueba",
    contacto_email: `limpieza.${descartadaId.slice(0, 8)}@ejemplo.test`,
    estado: "descartada",
    descartada_desde: "comite",
    descartada_motivo: "Prueba de limpieza",
    descartada_at: hace30,
  });
  if (falloCandidatura) throw new Error(falloCandidatura.message);

  for (const ruta of enDataRoom) await subir("data-room", ruta);
  for (const ruta of enCandidaturas) await subir("candidaturas", ruta);
  const { error } = await servicio.from("documents").insert({
    id: documentoId,
    company_id: COMPANIAS.vega,
    name: "Prueba de limpieza: documento apuntado",
    folder: "financiero",
  });
  if (error) throw new Error(error.message);
  await servicio.from("document_versions").insert({
    document_id: documentoId,
    company_id: COMPANIAS.vega,
    version: 1,
    storage_path: apuntado,
    file_name: "cuentas.pdf",
  });

  await sql`
    update storage.objects set created_at = now() - interval '2 days'
    where bucket_id = 'data-room' and name in ${sql([viejo, firmado, apuntado, deVega])}`;
  await sql`
    update storage.objects set created_at = now() - interval '2 days'
    where bucket_id = 'candidaturas' and name = ${deDesaparecida}`;
  await sql`
    update storage.objects set created_at = now() - interval '30 days'
    where bucket_id = 'candidaturas' and name = ${deDescartada}`;
  await sql`
    update storage.objects set created_at = now() - interval '1 hour'
    where bucket_id = 'data-room' and name = ${reciente}`;
});

afterAll(async () => {
  await servicio.from("documents").delete().eq("id", documentoId);
  await servicio.storage.from("data-room").remove(enDataRoom);
  await servicio.storage.from("candidaturas").remove(enCandidaturas);
  await servicio.from("candidaturas").delete().eq("id", descartadaId);
  await sql`delete from activity_log where action = 'ficheros_sueltos_borrados' and detail::text like ${"%" + viejo + "%"}`;
  await sql.end();
});

describe("la limpieza de ficheros sueltos", () => {
  it("nadie con sesión puede listarlos, ni siquiera dirección", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error } = await admin.rpc("ficheros_sueltos", { p_antes: new Date().toISOString() });
    expect(error).not.toBeNull();
  });

  it("borra los sueltos de hace 2 días que no cuelgan de nadie, y solo esos, y lo deja dicho", async () => {
    const resultado = await limpiarFicherosSueltos(servicio);

    expect(await existe("data-room", viejo)).toBe(false);
    expect(await existe("data-room", reciente)).toBe(true);
    expect(await existe("data-room", firmado)).toBe(true);
    expect(await existe("data-room", apuntado)).toBe(true);
    expect(await existe("data-room", deVega)).toBe(true);
    expect(await existe("candidaturas", deDescartada)).toBe(true);
    expect(await existe("candidaturas", deDesaparecida)).toBe(false);
    expect(resultado.borrados).toBeGreaterThanOrEqual(2);
    expect(resultado.fallidos).toBe(0);

    const [registro] = await sql<{ detail: { cuantos: number; bytes: number; rutas: Array<{ bucket: string; ruta: string; bytes: number }> } }[]>`
      select detail from activity_log
      where action = 'ficheros_sueltos_borrados' and detail::text like ${"%" + viejo + "%"}`;
    expect(registro).toBeTruthy();
    const suya = registro.detail.rutas.find((r) => r.ruta === viejo);
    expect(suya).toMatchObject({ bucket: "data-room", bytes: "%PDF-1.4 prueba de limpieza".length });
    expect(registro.detail.cuantos).toBe(registro.detail.rutas.length);
    const rutas = registro.detail.rutas.map((r) => r.ruta);
    expect(rutas).toContain(deDesaparecida);
    expect(rutas).not.toContain(reciente);
    expect(rutas).not.toContain(deVega);
    expect(rutas).not.toContain(deDescartada);
  });
});
