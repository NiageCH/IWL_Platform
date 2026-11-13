import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { USUARIOS, clienteAnonimo, clienteServicio, entrarComo } from "./clientes";

/**
 * La foto y el LinkedIn de cada persona (REVISION, 13 nov).
 *
 * La foto la sube y la quita solo su dueña, y la ven quienes ya pueden ver
 * a esa persona: IWL, ella misma y quien comparte compañía con ella. Se
 * prueba entrando como quien no comparte nada, que es donde una política
 * rota pasaría en verde.
 *
 * Lo que la prueba sube lo borra; la foto y el LinkedIn que tuviera la
 * fundadora antes se reponen al acabar.
 */

const servicio = clienteServicio();
let fundadora: SupabaseClient;
let mentor: SupabaseClient;
let ajena: SupabaseClient;
let equipoIwl: SupabaseClient;
let idFundadora = "";
let idAjena = "";
let antes: { photo_path: string | null; linkedin_url: string | null } = { photo_path: null, linkedin_url: null };
const subidas: string[] = [];
let imagen: Buffer;

async function idDe(email: string) {
  const { data } = await servicio.from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

beforeAll(async () => {
  [fundadora, mentor, ajena, equipoIwl] = await Promise.all([
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.mentorProducto),
    entrarComo(USUARIOS.fundadoraVega),
    entrarComo(USUARIOS.equipoIwl),
  ]);
  [idFundadora, idAjena] = await Promise.all([idDe(USUARIOS.fundadoraMarea), idDe(USUARIOS.fundadoraVega)]);
  const { data } = await servicio
    .from("profiles")
    .select("photo_path, linkedin_url")
    .eq("id", idFundadora)
    .single();
  antes = data!;
  imagen = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#777777" } })
    .webp()
    .toBuffer();
});

afterAll(async () => {
  await servicio.from("profiles").update(antes).eq("id", idFundadora);
  if (subidas.length) await servicio.storage.from("fotos").remove(subidas);
});

describe("la foto de una persona", () => {
  it("la sube ella, en su carpeta; en la de otra, no", async () => {
    const ruta = `${idFundadora}/prueba-${Date.now()}.webp`;
    const { error } = await fundadora.storage.from("fotos").upload(ruta, imagen, { contentType: "image/webp" });
    expect(error).toBeNull();
    subidas.push(ruta);

    const { error: falloPerfil } = await fundadora.from("profiles").update({ photo_path: ruta }).eq("id", idFundadora);
    expect(falloPerfil).toBeNull();

    const intrusa = `${idAjena}/prueba-${Date.now()}.webp`;
    const { error: ajenoError } = await fundadora.storage
      .from("fotos")
      .upload(intrusa, imagen, { contentType: "image/webp" });
    expect(ajenoError).not.toBeNull();
    const { data: nada } = await servicio.storage.from("fotos").list(idAjena);
    expect((nada ?? []).some((f) => intrusa.endsWith(f.name))).toBe(false);
  });

  it("la ven IWL y quien comparte compañía con ella; otra fundadora y quien no ha entrado, no", async () => {
    const ruta = subidas[0];
    expect(ruta).toBeTruthy();

    for (const quien of [fundadora, mentor, equipoIwl]) {
      const { data, error } = await quien.storage.from("fotos").createSignedUrl(ruta, 60);
      expect(error).toBeNull();
      expect(data?.signedUrl).toBeTruthy();
    }

    const { data: ajenoData } = await ajena.storage.from("fotos").createSignedUrl(ruta, 60);
    expect(ajenoData?.signedUrl ?? null).toBeNull();
    const { data: anonData } = await clienteAnonimo().storage.from("fotos").createSignedUrl(ruta, 60);
    expect(anonData?.signedUrl ?? null).toBeNull();
  });

  it("nadie más la borra, tampoco IWL", async () => {
    const ruta = subidas[0];
    await equipoIwl.storage.from("fotos").remove([ruta]);
    await ajena.storage.from("fotos").remove([ruta]);
    const { data } = await servicio.storage.from("fotos").list(idFundadora);
    expect((data ?? []).some((f) => ruta.endsWith(f.name))).toBe(true);
  });

  it("un perfil no apunta a una foto de otra carpeta, ni con la clave de servicio", async () => {
    const { error } = await servicio
      .from("profiles")
      .update({ photo_path: `${idAjena}/suya.webp` })
      .eq("id", idFundadora);
    expect(error?.message).toMatch(/profiles_photo_path_propia/);
  });
});

describe("el LinkedIn de una persona", () => {
  it("solo un perfil de LinkedIn, en su forma canónica", async () => {
    const { error: bien } = await fundadora
      .from("profiles")
      .update({ linkedin_url: "https://www.linkedin.com/in/prueba-rls" })
      .eq("id", idFundadora);
    expect(bien).toBeNull();

    for (const mala of [
      "https://www.linkedin.com/company/iwl",
      "https://ejemplo.net/in/prueba",
      "javascript:alert(1)",
      "https://www.linkedin.com/in/prueba/",
    ]) {
      const { error } = await servicio.from("profiles").update({ linkedin_url: mala }).eq("id", idFundadora);
      expect(error?.message, mala).toMatch(/profiles_linkedin_url_valida/);
    }
  });
});
