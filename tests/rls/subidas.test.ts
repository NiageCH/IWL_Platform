import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteAnonimo, clienteServicio, entrarComo } from "./clientes";

/**
 * Las direcciones firmadas de subida (REVISION, 13 nov).
 *
 * Los ficheros ya no pasan por el servidor de la aplicación: el servidor
 * pide a Storage una dirección firmada **con la sesión de quien sube**, y
 * Storage aplica las políticas de `storage.objects` al firmarla. Aquí se
 * comprueba eso directamente contra Storage, entrando como quien menos
 * puede: nadie obtiene una dirección para una carpeta que no es suya.
 *
 * Lo que se sube para comprobar que la dirección propia sí funciona se
 * borra al acabar.
 */

const servicio = clienteServicio();
let fundadoraVega: SupabaseClient;
let fundadoraMarea: SupabaseClient;
let mentor: SupabaseClient;
let idVega = "";
let idMarea = "";
const subidas: Array<[string, string]> = [];

beforeAll(async () => {
  [fundadoraVega, fundadoraMarea, mentor] = await Promise.all([
    entrarComo(USUARIOS.fundadoraVega),
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.mentorProducto),
  ]);
  const { data } = await servicio
    .from("profiles")
    .select("id, email")
    .in("email", [USUARIOS.fundadoraVega, USUARIOS.fundadoraMarea]);
  idVega = data!.find((p) => p.email === USUARIOS.fundadoraVega)!.id;
  idMarea = data!.find((p) => p.email === USUARIOS.fundadoraMarea)!.id;
});

afterAll(async () => {
  for (const [bucket, ruta] of subidas) await servicio.storage.from(bucket).remove([ruta]);
});

async function firma(quien: SupabaseClient, bucket: string, ruta: string) {
  const { data, error } = await quien.storage.from(bucket).createSignedUploadUrl(ruta);
  return { url: data?.signedUrl ?? null, error: error?.message ?? null };
}

describe("una dirección firmada de subida", () => {
  it("se firma para la carpeta de la propia compañía, y sirve para subir", async () => {
    const ruta = `${COMPANIAS.vega}/financiero/${crypto.randomUUID()}/prueba.pdf`;
    const { url, error } = await firma(fundadoraVega, "data-room", ruta);
    expect(error).toBeNull();
    const r = await fetch(url!, {
      method: "PUT",
      headers: { "content-type": "application/pdf", "x-upsert": "false" },
      body: new Blob(["%PDF-1.4 prueba"], { type: "application/pdf" }),
    });
    expect(r.ok).toBe(true);
    subidas.push(["data-room", ruta]);
  });

  it("no se firma para el data room de otra compañía", async () => {
    for (const compania of [COMPANIAS.marea, COMPANIAS.raiz]) {
      const { url, error } = await firma(fundadoraVega, "data-room", `${compania}/financiero/x/intrusa.pdf`);
      expect(url).toBeNull();
      expect(error).toMatch(/row-level security/);
    }
    // Un mentor, solo donde está asignado: producto no está en Vega
    const { url } = await firma(mentor, "data-room", `${COMPANIAS.vega}/financiero/x/intrusa.pdf`);
    expect(url).toBeNull();
  });

  it("no se firma para el CV de otra persona", async () => {
    expect((await firma(fundadoraVega, "personas", `${idVega}/${Date.now()}.pdf`)).error).toBeNull();
    const ajena = await firma(fundadoraVega, "personas", `${idMarea}/${Date.now()}.pdf`);
    expect(ajena.url).toBeNull();
  });

  it("no se firma para el expediente de una candidatura ajena, ni para un logo, ni sin sesión", async () => {
    const candidatura = "00000000-0000-0000-0005-000000000001";
    expect((await firma(fundadoraMarea, "candidaturas", `${candidatura}/x.pdf`)).url).toBeNull();
    expect((await firma(fundadoraMarea, "logos", `${COMPANIAS.marea}/logo.png`)).url).toBeNull();
    expect((await firma(clienteAnonimo(), "data-room", `${COMPANIAS.marea}/financiero/x/anonima.pdf`)).url).toBeNull();
  });

  it("los buckets no aceptan más de lo decidido, aunque la dirección sea buena", async () => {
    const { data } = await servicio.storage.listBuckets();
    const limite = Object.fromEntries((data ?? []).map((b) => [b.id, b.file_size_limit]));
    expect(limite["data-room"]).toBe(25 * 1024 * 1024);
    expect(limite["candidaturas"]).toBe(25 * 1024 * 1024);
    expect(limite["personas"]).toBe(10 * 1024 * 1024);

    const ruta = `${COMPANIAS.vega}/financiero/${crypto.randomUUID()}/enorme.pdf`;
    const { url } = await firma(fundadoraVega, "data-room", ruta);
    const r = await fetch(url!, {
      method: "PUT",
      headers: { "content-type": "application/pdf", "x-upsert": "false" },
      body: new Blob([new Uint8Array(26 * 1024 * 1024)], { type: "application/pdf" }),
    });
    expect(r.ok).toBe(false);
    subidas.push(["data-room", ruta]);
  });
});
