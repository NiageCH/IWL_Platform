import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { USUARIOS, clienteAnonimo, clienteServicio, entrarComo } from "./clientes";

/**
 * El registro de correos: lo escribe solo el servidor, con la clave de
 * servicio, y lo lee IWL. Una fundadora no ve a quién se escribe, ni nadie
 * con sesión puede apuntar un correo como enviado.
 */

let id = "";
const CORREO = `rls.correo.${crypto.randomUUID().slice(0, 8)}@ejemplo.test`;

beforeAll(async () => {
  const { data, error } = await clienteServicio()
    .from("correos")
    .insert({ evento: "recordatorio", destinatario: CORREO, asunto: "Prueba", datos: { cuerpo: "x" }, estado: "sin_enviar" })
    .select("id")
    .single();
  expect(error).toBeNull();
  id = data!.id;
});

afterAll(async () => {
  await clienteServicio().from("correos").delete().eq("id", id);
});

describe("el registro de correos", () => {
  it("lo lee IWL", async () => {
    const iwl = await entrarComo(USUARIOS.equipoIwl);
    const { data } = await iwl.from("correos").select("id").eq("id", id);
    expect(data).toEqual([{ id }]);
  });

  it("no lo lee una fundadora ni quien no ha entrado", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    expect((await fundadora.from("correos").select("id").eq("id", id)).data).toEqual([]);
    expect((await clienteAnonimo().from("correos").select("id").eq("id", id)).data ?? []).toEqual([]);
  });

  it("nadie con sesión lo escribe, ni dirección", async () => {
    const admin = await entrarComo(USUARIOS.admin);
    const nuevo = await admin.from("correos").insert({ evento: "recordatorio", destinatario: CORREO, asunto: "x" });
    expect(nuevo.error).not.toBeNull();
    const { data } = await admin.from("correos").update({ estado: "enviado" }).eq("id", id).select("id");
    expect(data ?? []).toEqual([]);
    const { data: fila } = await clienteServicio().from("correos").select("estado").eq("id", id).single();
    expect(fila!.estado).toBe("sin_enviar");
  });

  it("un evento que no existe no se apunta", async () => {
    const { error } = await clienteServicio().from("correos").insert({ evento: "boletin", destinatario: CORREO, asunto: "x" });
    expect(error).not.toBeNull();
  });
});
