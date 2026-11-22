import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * El modo pruebas del correo (REVISION, 21 nov): solo dirección lo quita,
 * solo con la frase, y queda quién y cuándo. Un `update` a mano desde una
 * sesión no lo apaga. Se restaura lo que había.
 */

const servicio = clienteServicio();
let antes: unknown;
let direccion: SupabaseClient;
let equipo: SupabaseClient;
let direccionId = "";

const leer = async () =>
  (await servicio.from("platform_settings").select("value").eq("key", "correo_modo_pruebas").single()).data!.value as {
    activo: boolean;
    quitado_por?: string;
  };

beforeAll(async () => {
  antes = (await servicio.from("platform_settings").select("value").eq("key", "correo_modo_pruebas").single()).data!.value;
  direccion = await entrarComo(USUARIOS.admin);
  equipo = await entrarComo(USUARIOS.equipoIwl);
  direccionId = (await direccion.auth.getUser()).data.user!.id;
});

afterAll(async () => {
  await servicio.from("platform_settings").update({ value: antes }).eq("key", "correo_modo_pruebas");
  await servicio.from("activity_log").delete().eq("action", "modo_pruebas_quitado").eq("actor_id", direccionId);
});

async function encender() {
  await servicio
    .from("platform_settings")
    .update({ value: { activo: true, dominios: ["inceptionwlab.es", "niage.es"] } })
    .eq("key", "correo_modo_pruebas");
}

describe("quitar el modo pruebas", () => {
  it("el equipo no puede, ni con la frase", async () => {
    await encender();
    expect((await equipo.rpc("quitar_modo_pruebas", { p_confirmacion: "ACTIVAR CORREOS" })).error).not.toBeNull();
    expect((await leer()).activo).toBe(true);
  });

  it("dirección no lo apaga a mano, sin pasar por la frase", async () => {
    await encender();
    const { error } = await direccion
      .from("platform_settings")
      .update({ value: { activo: false, dominios: ["niage.es"] } })
      .eq("key", "correo_modo_pruebas");
    expect(error?.message).toMatch(/Quitar el modo pruebas/);
    expect((await leer()).activo).toBe(true);
  });

  it("con otra frase, no", async () => {
    await encender();
    expect((await direccion.rpc("quitar_modo_pruebas", { p_confirmacion: "activar" })).error).not.toBeNull();
    expect((await leer()).activo).toBe(true);
  });

  it("dirección, con la frase: queda quitado, con quién y cuándo", async () => {
    await encender();
    expect((await direccion.rpc("quitar_modo_pruebas", { p_confirmacion: "ACTIVAR CORREOS" })).error).toBeNull();
    const v = await leer();
    expect(v.activo).toBe(false);
    expect(v.quitado_por).toBe(direccionId);
    const { data: registro } = await servicio
      .from("activity_log")
      .select("id")
      .eq("action", "modo_pruebas_quitado")
      .eq("actor_id", direccionId);
    expect(registro?.length).toBeGreaterThan(0);
  });

  it("volver a ponerlo sí se hace a mano, y cambiar los dominios también", async () => {
    await servicio.from("platform_settings").update({ value: { activo: false, dominios: ["niage.es"] } }).eq("key", "correo_modo_pruebas");
    const { error } = await direccion
      .from("platform_settings")
      .update({ value: { activo: true, dominios: ["niage.es", "otra.org"] } })
      .eq("key", "correo_modo_pruebas");
    expect(error).toBeNull();
    expect((await leer()).activo).toBe(true);
  });

  it("los correos retenidos: «retenido» es un estado que la base acepta", async () => {
    const { data, error } = await servicio
      .from("correos")
      .insert({ evento: "recordatorio", destinatario: "x@ejemplo.test", asunto: "x", datos: {}, estado: "retenido" })
      .select("id")
      .single();
    expect(error).toBeNull();
    await servicio.from("correos").delete().eq("id", data!.id);
  });
});
