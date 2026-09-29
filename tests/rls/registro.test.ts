import { afterAll, describe, expect, it } from "vitest";
import { clienteAnonimo, clienteServicio } from "./clientes";

/**
 * Quién decide el rol de una cuenta nueva.
 *
 * `app.handle_new_user()` leía el rol de `raw_user_meta_data`, que es donde
 * gotrue guarda el objeto `data` de la petición de registro. Lo escribe el
 * cliente. Con el registro abierto, cualquiera podía pedir `admin_iwl` y
 * quedarse con la cartera entera.
 *
 * Aquí se comprueba lo contrario: venga lo que venga en los metadatos, una
 * cuenta nueva nace con el rol de menos alcance.
 *
 * La prueba crea las cuentas con la clave de servicio, no abriendo el
 * registro: lo que se prueba es el trigger, y el trigger es el mismo por los
 * dos caminos. Abrir el registro para probarlo dejaría la instancia abierta
 * si el test se cortara a la mitad.
 */

const CORREOS: string[] = [];

async function crearCuenta(metadatos: Record<string, unknown>) {
  const correo = `registro-${crypto.randomUUID()}@ejemplo.test`;
  CORREOS.push(correo);

  const { data, error } = await clienteServicio().auth.admin.createUser({
    email: correo,
    password: "una-clave-bastante-larga-99",
    email_confirm: true,
    user_metadata: metadatos,
  });

  expect(error).toBeNull();
  return { correo, id: data!.user!.id };
}

async function rolDe(id: string) {
  const { data } = await clienteServicio()
    .from("profiles")
    .select("role, full_name")
    .eq("id", id)
    .single();
  return data;
}

afterAll(async () => {
  // Se limpia lo creado, por el camino de servicio y no por el que se prueba
  const servicio = clienteServicio();
  const { data } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  for (const usuario of data?.users ?? []) {
    if (CORREOS.includes(usuario.email ?? "")) {
      await servicio.auth.admin.deleteUser(usuario.id);
    }
  }
});

describe("el rol de una cuenta nueva", () => {
  it("no es el que pidan los metadatos", async () => {
    const { id } = await crearCuenta({ role: "admin_iwl", full_name: "Intruso" });
    expect((await rolDe(id))?.role).toBe("fundadora");
  });

  it("tampoco cuando se pide equipo de IWL o revisor", async () => {
    for (const pedido of ["equipo_iwl", "revisor_niage", "mentor"]) {
      const { id } = await crearCuenta({ role: pedido });
      expect((await rolDe(id))?.role).toBe("fundadora");
    }
  });

  it("el nombre sí se respeta, que es solo presentación", async () => {
    const { id } = await crearCuenta({ full_name: "Nombre Puesto" });
    expect((await rolDe(id))?.full_name).toBe("Nombre Puesto");
  });

  it("y la cuenta recién creada no ve ninguna compañía", async () => {
    const { correo } = await crearCuenta({ role: "admin_iwl" });

    const anonimo = clienteAnonimo();
    const { error: falloEntrada } = await anonimo.auth.signInWithPassword({
      email: correo,
      password: "una-clave-bastante-larga-99",
    });
    expect(falloEntrada).toBeNull();

    /*
     * El rol por sí solo no abre nada: lo que deja ver una compañía es estar
     * en company_members, y eso solo lo escribe quien ya está autorizado.
     */
    const { data } = await anonimo.from("companies").select("id");
    expect(data).toEqual([]);
  });
});
