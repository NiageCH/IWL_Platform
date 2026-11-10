import { describe, expect, it } from "vitest";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * El NDA: lo que hace que su rastro pruebe algo.
 *
 * La IP y el navegador los pone el servidor. Si alguien con sesión pudiera
 * llamar a la función de firma, se escribiría la IP que quisiera; si una
 * versión de la plantilla se pudiera editar, el hash dejaría de decir qué
 * se firmó. Se prueba entrando como quien tendría interés en hacerlo.
 */

const AMBAR = "00000000-0000-0000-0005-000000000004";

describe("firmar no se hace con la sesión", () => {
  it("ni una fundadora ni dirección llaman a la firma directamente", async () => {
    for (const quien of [USUARIOS.fundadoraMarea, USUARIOS.admin]) {
      const cliente = await entrarComo(quien);
      const { error } = await cliente.rpc("firmar_nda", {
        p_candidatura: AMBAR,
        p_profile: "00000000-0000-0000-0002-000000000001",
        p_nombre: "Alguien",
        p_plantilla: "00000000-0000-0000-0000-000000000000",
        p_texto: "Texto del NDA ya completado, sin huecos.",
        p_datos: {},
        p_ip: "1.2.3.4",
        p_ua: "inventado",
      });
      expect(error).not.toBeNull();

      const { error: contra } = await cliente.rpc("contrafirmar_nda", {
        p_candidatura: AMBAR,
        p_profile: "00000000-0000-0000-0002-000000000001",
        p_ip: "1.2.3.4",
        p_ua: "inventado",
      });
      expect(contra).not.toBeNull();
    }
  });
});

describe("la plantilla", () => {
  it("una versión no se edita ni se borra, ni con la clave de servicio", async () => {
    const servicio = clienteServicio();
    const { data: vigente } = await servicio
      .from("nda_plantillas")
      .select("id, texto")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const { error: editar } = await servicio
      .from("nda_plantillas")
      .update({ texto: "Otro texto" })
      .eq("id", vigente!.id);
    expect(editar?.message).toMatch(/no se edita ni se borra/);

    const { error: borrar } = await servicio.from("nda_plantillas").delete().eq("id", vigente!.id);
    expect(borrar?.message).toMatch(/no se edita ni se borra/);
  });

  it("solo dirección crea versiones nuevas", async () => {
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error } = await equipo
      .from("nda_plantillas")
      .insert({ texto: "Un texto cualquiera", version: 0, hash: "" });
    expect(error).not.toBeNull();
  });

  it("el hash lo calcula la base, sobre el texto exacto", async () => {
    const servicio = clienteServicio();
    const { data } = await servicio
      .from("nda_plantillas")
      .select("texto, hash")
      .order("version", { ascending: false })
      .limit(1)
      .single();
    const esperado = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data!.texto))),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(data!.hash).toBe(esperado);
  });
});

describe("en qué punto está", () => {
  it("una fundadora no sabe nada del NDA de una candidatura ajena", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data } = await fundadora.rpc("estado_nda", { p_candidatura: AMBAR });
    expect(data).toBeNull();
  });

  it("IWL sí", async () => {
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { data } = await equipo.rpc("estado_nda", { p_candidatura: AMBAR });
    expect(data).toBe("por_firmar");
  });
});
