import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Línea base.
 *
 * Es el punto de partida contra el que se mide todo lo demás, y por eso es
 * inmutable: si se pudiera editar, «avance» volvería a ser una opinión.
 */

let fundadoraMarea: SupabaseClient;
let equipoIwl: SupabaseClient;

const servicio = clienteServicio();

beforeAll(async () => {
  [fundadoraMarea, equipoIwl] = await Promise.all([
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.equipoIwl),
  ]);
});

describe("la línea base es inmutable", () => {
  it("no se puede editar, ni siquiera con la clave de servicio", async () => {
    const { data: base } = await servicio
      .from("baselines")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .single();

    const { error } = await servicio
      .from("baselines")
      .update({ notes: "Un intento de reescribir el punto de partida" })
      .eq("id", base!.id);

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/no se edita/);
  });

  it("no admite dos del mismo tipo con la misma fecha", async () => {
    const { data: base } = await servicio
      .from("baselines")
      .select("kind, taken_on, stage")
      .eq("company_id", COMPANIAS.marea)
      .single();

    const { error } = await equipoIwl.from("baselines").insert({
      company_id: COMPANIAS.marea,
      kind: base!.kind,
      taken_on: base!.taken_on,
      stage: base!.stage,
      content: {},
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("23505");
  });
});

describe("quién congela y quién lee", () => {
  it("la fundadora ve la suya: es contra lo que se la mide", async () => {
    const { data } = await fundadoraMarea
      .from("baselines")
      .select("company_id, taken_on, content");

    expect(data?.length).toBeGreaterThan(0);
    expect(new Set(data?.map((b) => b.company_id))).toEqual(
      new Set([COMPANIAS.marea]),
    );
  });

  it("la fundadora no se congela una línea base ella misma", async () => {
    const { error } = await fundadoraMarea.from("baselines").insert({
      company_id: COMPANIAS.marea,
      kind: "trimestral",
      taken_on: "2026-12-01",
      stage: "semilla",
      content: {},
    });

    expect(error).not.toBeNull();
  });

  it("el equipo de IWL sí, y el contenido queda tal cual se guardó", async () => {
    const contenido = {
      version: 1,
      madurez: { scoreTecnico: 55, scorePreparacion: 40 },
    };

    const { data, error } = await equipoIwl
      .from("baselines")
      .insert({
        company_id: COMPANIAS.vega,
        kind: "trimestral",
        taken_on: "2026-11-15",
        stage: "pre_semilla",
        content: contenido,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.content).toEqual(contenido);

    await servicio.from("baselines").delete().eq("id", data!.id);
  });
});

describe("los pesos de la madurez", () => {
  /*
   * No se comprueba qué valor tienen, sino que el equipo no puede cambiarlo.
   *
   * Son configuración que la dirección mueve desde la pantalla de
   * administración, así que fijar aquí un número concreto haría que esta
   * prueba fallara cada vez que alguien lo toca, que es justo lo que se
   * espera que pase.
   */
  it("los mueve la dirección, no el equipo", async () => {
    const { data: antes } = await equipoIwl
      .from("platform_settings")
      .select("value")
      .eq("key", "pesos_madurez")
      .single();

    expect(antes!.value).toHaveProperty("tecnologia");

    const { data: tras } = await equipoIwl
      .from("platform_settings")
      .update({ value: { tecnologia: 99 } })
      .eq("key", "pesos_madurez")
      .select();

    // La política no deja pasar la fila: no hay error, pero no cambia nada
    expect(tras).toEqual([]);

    const { data: despues } = await equipoIwl
      .from("platform_settings")
      .select("value")
      .eq("key", "pesos_madurez")
      .single();

    expect(despues!.value).toEqual(antes!.value);
  });
});
