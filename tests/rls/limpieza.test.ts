import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";
import { limpiarFicherosSueltos } from "@/lib/limpieza";

/**
 * La limpieza diaria de ficheros sueltos (REVISION, 13 nov).
 *
 * Cuatro ficheros en el data room de Vega, todos sin pasar por pantalla:
 *   · suelto y de hace 2 días → se borra;
 *   · suelto y de hace 1 hora → se queda: puede ser una subida que se está
 *     registrando;
 *   · suelto, de hace 2 días, pero con nombre de NDA firmado → se queda;
 *   · de hace 2 días y apuntado por un documento → se queda.
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

const carpeta = `${COMPANIAS.vega}/financiero`;
const viejo = `${carpeta}/${crypto.randomUUID()}/viejo-abandonado.pdf`;
const reciente = `${carpeta}/${crypto.randomUUID()}/reciente.pdf`;
const firmado = `${carpeta}/${crypto.randomUUID()}/NDA-firmado.pdf`;
const documentoId = crypto.randomUUID();
const apuntado = `${carpeta}/${documentoId}/cuentas.pdf`;
const todos = [viejo, reciente, firmado, apuntado];

async function existe(ruta: string) {
  const [fila] = await sql`select 1 from storage.objects where bucket_id = 'data-room' and name = ${ruta}`;
  return Boolean(fila);
}

beforeAll(async () => {
  for (const ruta of todos) {
    const { error } = await servicio.storage
      .from("data-room")
      .upload(ruta, new Blob(["%PDF-1.4 prueba de limpieza"], { type: "application/pdf" }));
    if (error) throw new Error(`No se ha podido preparar ${ruta}: ${error.message}`);
  }
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
    where bucket_id = 'data-room' and name in ${sql([viejo, firmado, apuntado])}`;
  await sql`
    update storage.objects set created_at = now() - interval '1 hour'
    where bucket_id = 'data-room' and name = ${reciente}`;
});

afterAll(async () => {
  await servicio.from("documents").delete().eq("id", documentoId);
  await servicio.storage.from("data-room").remove(todos);
  await sql`delete from activity_log where action = 'ficheros_sueltos_borrados' and detail::text like ${"%" + viejo + "%"}`;
  await sql.end();
});

describe("la limpieza de ficheros sueltos", () => {
  it("nadie con sesión puede listarlos, ni siquiera dirección", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const { error } = await admin.rpc("ficheros_sueltos", { p_antes: new Date().toISOString() });
    expect(error).not.toBeNull();
  });

  it("borra el suelto de hace 2 días, y solo ese, y lo deja dicho", async () => {
    const resultado = await limpiarFicherosSueltos(servicio);

    expect(await existe(viejo)).toBe(false);
    expect(await existe(reciente)).toBe(true);
    expect(await existe(firmado)).toBe(true);
    expect(await existe(apuntado)).toBe(true);
    expect(resultado.borrados).toBeGreaterThanOrEqual(1);
    expect(resultado.fallidos).toBe(0);

    const [registro] = await sql<{ detail: { cuantos: number; bytes: number; rutas: Array<{ bucket: string; ruta: string; bytes: number }> } }[]>`
      select detail from activity_log
      where action = 'ficheros_sueltos_borrados' and detail::text like ${"%" + viejo + "%"}`;
    expect(registro).toBeTruthy();
    const suya = registro.detail.rutas.find((r) => r.ruta === viejo);
    expect(suya).toMatchObject({ bucket: "data-room", bytes: "%PDF-1.4 prueba de limpieza".length });
    expect(registro.detail.cuantos).toBe(registro.detail.rutas.length);
    expect(registro.detail.rutas.map((r) => r.ruta)).not.toContain(reciente);
  });
});
