import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { clienteServicio } from "./clientes";

/**
 * La contraseña que pone otra persona es temporal.
 *
 * Lo que se prueba es lo que haría inútil la barrera: que quien la tiene
 * pudiera quitarse la marca sin cambiar la contraseña. Por eso se entra
 * como la propia cuenta, que es quien tiene interés en saltársela, y no
 * como la dirección.
 *
 * Y que al cambiarla la marca se va sola, que es lo que deja salir de la
 * pantalla de cambio sin clave de servicio.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const CORREOS: string[] = [];
const CLAVE = "la-que-puso-la-direccion-1";

async function cuentaMarcada() {
  const correo = `temporal-${crypto.randomUUID()}@ejemplo.test`;
  CORREOS.push(correo);
  const servicio = clienteServicio();

  const { data, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: CLAVE,
    email_confirm: true,
  });
  expect(error).toBeNull();
  const id = data!.user!.id;

  // Como lo hace la aplicación: la marca después y aparte
  await servicio.auth.admin.updateUserById(id, {
    app_metadata: { debe_cambiar_password: true },
  });

  const cliente = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: falloEntrada } = await cliente.auth.signInWithPassword({
    email: correo,
    password: CLAVE,
  });
  expect(falloEntrada).toBeNull();

  return { id, cliente };
}

async function marcaDe(id: string) {
  const { data } = await clienteServicio().auth.admin.getUserById(id);
  return data.user?.app_metadata?.debe_cambiar_password;
}

afterAll(async () => {
  const servicio = clienteServicio();
  const { data } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  for (const usuario of data?.users ?? []) {
    if (CORREOS.includes(usuario.email ?? "")) {
      await servicio.auth.admin.deleteUser(usuario.id);
    }
  }
});

describe("la contraseña temporal", () => {
  it("la cuenta no se quita la marca sin cambiar la contraseña", async () => {
    const { id, cliente } = await cuentaMarcada();

    // Lo único que la propia cuenta puede escribir de sí misma son los
    // metadatos de usuario; la marca no vive ahí
    await cliente.auth.updateUser({ data: { debe_cambiar_password: false } });

    expect(await marcaDe(id)).toBe(true);
  });

  it("al cambiar la contraseña la marca se va", async () => {
    const { id, cliente } = await cuentaMarcada();

    const { error } = await cliente.auth.updateUser({
      password: "la-que-solo-se-yo-2",
    });
    expect(error).toBeNull();

    expect(await marcaDe(id)).toBeUndefined();
  });

  it("restablecida por la dirección, vuelve a ser temporal", async () => {
    const { id, cliente } = await cuentaMarcada();
    await cliente.auth.updateUser({ password: "la-que-solo-se-yo-3" });
    expect(await marcaDe(id)).toBeUndefined();

    // Contraseña primero, marca después: en la misma llamada no se quedaría
    const servicio = clienteServicio();
    await servicio.auth.admin.updateUserById(id, { password: "otra-de-la-direccion-4" });
    await servicio.auth.admin.updateUserById(id, {
      app_metadata: { debe_cambiar_password: true },
    });

    expect(await marcaDe(id)).toBe(true);
  });
});
