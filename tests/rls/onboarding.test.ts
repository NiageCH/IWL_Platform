import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * El alta paso a paso: lo escribe la base y nadie más, y los avisos son de
 * dirección.
 *
 * Las fechas se prueban entrando como la propia persona, que es quien
 * tendría interés en escribirse un primer acceso; los avisos, entrando como
 * el equipo de IWL, que ve casi todo y estos no.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const CORREOS: string[] = [];
const CLAVE = "una-clave-de-prueba-77";

async function cuentaNueva() {
  const correo = `alta-${crypto.randomUUID()}@ejemplo.test`;
  CORREOS.push(correo);
  const { data, error } = await clienteServicio().auth.admin.createUser({
    email: correo,
    password: CLAVE,
    email_confirm: true,
  });
  expect(error).toBeNull();
  return { correo, id: data!.user!.id };
}

async function entrar(correo: string) {
  const cliente = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({ email: correo, password: CLAVE });
  expect(error).toBeNull();
  return cliente;
}

async function perfil(id: string) {
  const { data } = await clienteServicio()
    .from("profiles")
    .select("primer_acceso_at, contrasena_cambiada_at")
    .eq("id", id)
    .single();
  return data!;
}

async function avisosDe(id: string) {
  const { data } = await clienteServicio()
    .from("avisos")
    .select("id, tipo, cerrado_at")
    .eq("profile_id", id);
  return data ?? [];
}

afterAll(async () => {
  const servicio = clienteServicio();
  const { data } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (CORREOS.includes(u.email ?? "")) await servicio.auth.admin.deleteUser(u.id);
  }
});

describe("las fechas del alta", () => {
  it("el primer acceso lo apunta la base, y avisa a dirección una sola vez", async () => {
    const { correo, id } = await cuentaNueva();
    expect((await perfil(id)).primer_acceso_at).toBeNull();

    await entrar(correo);
    const primero = (await perfil(id)).primer_acceso_at;
    expect(primero).not.toBeNull();
    expect((await avisosDe(id)).filter((a) => a.tipo === "primer_acceso")).toHaveLength(1);

    // Volver a entrar no es la primera vez
    await entrar(correo);
    expect((await perfil(id)).primer_acceso_at).toBe(primero);
    expect((await avisosDe(id)).filter((a) => a.tipo === "primer_acceso")).toHaveLength(1);
  });

  it("cambiar la contraseña temporal apunta cuándo", async () => {
    const { correo, id } = await cuentaNueva();
    await clienteServicio().auth.admin.updateUserById(id, {
      app_metadata: { debe_cambiar_password: true },
    });

    const cliente = await entrar(correo);
    const { error } = await cliente.auth.updateUser({ password: "la-mia-de-prueba-88" });
    expect(error).toBeNull();

    expect((await perfil(id)).contrasena_cambiada_at).not.toBeNull();
  });

  it("nadie se escribe su primer acceso, ni siquiera dirección", async () => {
    const { correo, id } = await cuentaNueva();
    const propia = await entrar(correo);
    const { error } = await propia
      .from("profiles")
      .update({ primer_acceso_at: "2020-01-01T00:00:00Z" })
      .eq("id", id);
    expect(error?.message).toMatch(/las escribe la plataforma/);

    const direccion = await entrarComo(USUARIOS.admin);
    const { error: deDireccion } = await direccion
      .from("profiles")
      .update({ contrasena_cambiada_at: "2020-01-01T00:00:00Z" })
      .eq("id", id);
    expect(deDireccion?.message).toMatch(/las escribe la plataforma/);
  });
});

describe("los avisos son de dirección", () => {
  it("el equipo de IWL no los ve, ni los cierra", async () => {
    const { correo, id } = await cuentaNueva();
    await entrar(correo);
    const [aviso] = await avisosDe(id);

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { data } = await equipo.from("avisos").select("id").eq("id", aviso.id);
    expect(data).toEqual([]);

    await equipo.from("avisos").update({ cerrado_at: new Date().toISOString() }).eq("id", aviso.id);
    expect((await avisosDe(id))[0].cerrado_at).toBeNull();
  });

  it("una fundadora tampoco", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data } = await fundadora.from("avisos").select("id");
    expect(data).toEqual([]);
  });

  it("dirección los ve y los cierra", async () => {
    const { correo, id } = await cuentaNueva();
    await entrar(correo);
    const [aviso] = await avisosDe(id);

    const direccion = await entrarComo(USUARIOS.admin);
    const { data } = await direccion.from("avisos").select("id").eq("id", aviso.id);
    expect(data).toHaveLength(1);

    const { error } = await direccion
      .from("avisos")
      .update({ cerrado_at: new Date().toISOString() })
      .eq("id", aviso.id);
    expect(error).toBeNull();
    expect((await avisosDe(id))[0].cerrado_at).not.toBeNull();
  });
});
