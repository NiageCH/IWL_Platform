import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Hoja de ruta.
 *
 * El plan lo diseña IWL y lo lee la compañía. Cambiar el plan es una
 * conversación, no un formulario: la fundadora no mueve sus etapas. Lo que sí
 * hace es mover sus hitos, que es trabajo suyo.
 */

let fundadoraMarea: SupabaseClient;
let fundadoraVega: SupabaseClient;
let equipoIwl: SupabaseClient;
let admin: SupabaseClient;

const servicio = clienteServicio();

beforeAll(async () => {
  [fundadoraMarea, fundadoraVega, equipoIwl, admin] = await Promise.all([
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.fundadoraVega),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.admin),
  ]);
});

describe("quién ve la hoja de ruta", () => {
  it("la fundadora ve las etapas de su compañía y ninguna más", async () => {
    const { data } = await fundadoraMarea
      .from("roadmap_stages")
      .select("company_id, name");

    expect(data?.length).toBeGreaterThan(0);
    expect(new Set(data?.map((e) => e.company_id))).toEqual(
      new Set([COMPANIAS.marea]),
    );
  });

  it("una fundadora de otra compañía no ve nada de esta", async () => {
    const { data } = await fundadoraVega
      .from("roadmap_stages")
      .select("id")
      .eq("company_id", COMPANIAS.marea);

    expect(data).toEqual([]);
  });

  it("el equipo de IWL ve las de toda la cartera", async () => {
    const { data } = await equipoIwl.from("roadmap_stages").select("company_id");
    const companias = new Set(data?.map((e) => e.company_id));
    expect(companias.size).toBeGreaterThan(1);
  });
});

describe("quién diseña la hoja de ruta", () => {
  it("la fundadora no puede crear una etapa", async () => {
    const { error } = await fundadoraMarea.from("roadmap_stages").insert({
      company_id: COMPANIAS.marea,
      name: "Etapa que no debería existir",
      objective: "Comprobar que la política bloquea la escritura.",
      order_index: 99,
    });

    expect(error).not.toBeNull();
  });

  it("la fundadora no puede mover las fechas de una etapa suya", async () => {
    const { data: etapa } = await servicio
      .from("roadmap_stages")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .limit(1)
      .single();

    const { data } = await fundadoraMarea
      .from("roadmap_stages")
      .update({ ends_on: "2030-01-01" })
      .eq("id", etapa!.id)
      .select();

    // La política no deja pasar la fila: no hay error, pero no cambia nada
    expect(data).toEqual([]);
  });

  it("el equipo de IWL crea y borra etapas", async () => {
    const { data: creada, error } = await equipoIwl
      .from("roadmap_stages")
      .insert({
        company_id: COMPANIAS.vega,
        name: "Etapa de prueba",
        objective: "Comprobar que el equipo de IWL sí puede escribir.",
        order_index: 90,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(creada?.status).toBe("planificada");

    await equipoIwl.from("roadmap_stages").delete().eq("id", creada!.id);
  });
});

describe("borrar una etapa no borra sus hitos", () => {
  it("el hito sobrevive y se queda sin etapa", async () => {
    const { data: etapa } = await equipoIwl
      .from("roadmap_stages")
      .insert({
        company_id: COMPANIAS.vega,
        name: "Etapa efímera",
        objective: "Se va a borrar para ver qué pasa con sus hitos.",
        order_index: 91,
      })
      .select()
      .single();

    const { data: hito } = await equipoIwl
      .from("milestones")
      .insert({
        company_id: COMPANIAS.vega,
        stage_id: etapa!.id,
        title: "Hito acordado en sesión",
        success_criteria: "Un criterio comprobable cualquiera.",
      })
      .select()
      .single();

    await equipoIwl.from("roadmap_stages").delete().eq("id", etapa!.id);

    const { data: despues } = await equipoIwl
      .from("milestones")
      .select("id, stage_id")
      .eq("id", hito!.id)
      .single();

    expect(despues).not.toBeNull();
    expect(despues!.stage_id).toBeNull();

    await equipoIwl.from("milestones").delete().eq("id", hito!.id);
  });
});

describe("las plantillas son configuración de la dirección", () => {
  it("cualquiera con sesión las lee: la fundadora entiende de dónde sale su plan", async () => {
    const { data } = await fundadoraMarea
      .from("roadmap_templates")
      .select("code, name");

    expect(data?.length).toBeGreaterThan(0);
  });

  it("el equipo de IWL no las cambia; la dirección sí", async () => {
    const { error: falloEquipo } = await equipoIwl
      .from("roadmap_templates")
      .insert({
        code: "no_deberia_existir",
        name: "Recorrido inventado",
        entry_state: "idea",
      });

    expect(falloEquipo).not.toBeNull();

    const { data: creada, error: falloAdmin } = await admin
      .from("roadmap_templates")
      .insert({
        code: "prueba_direccion",
        name: "Recorrido de prueba",
        entry_state: "idea",
      })
      .select()
      .single();

    expect(falloAdmin).toBeNull();
    await admin.from("roadmap_templates").delete().eq("id", creada!.id);
  });
});

describe("instanciar una hoja de ruta", () => {
  it("copia la plantilla entera y encadena los plazos", async () => {
    const { data: plantilla } = await servicio
      .from("roadmap_templates")
      .select("id, roadmap_template_stages ( id )")
      .eq("code", "desde_idea")
      .single();

    const esperadas = plantilla!.roadmap_template_stages.length;

    const { data: creadas, error } = await equipoIwl.rpc(
      "instanciar_hoja_de_ruta",
      {
        target_company: COMPANIAS.vega,
        template: plantilla!.id,
        inicio: "2026-02-02",
      },
    );

    expect(error).toBeNull();
    expect(creadas).toBe(esperadas);

    const { data: etapas } = await equipoIwl
      .from("roadmap_stages")
      .select("order_index, starts_on, ends_on")
      .eq("company_id", COMPANIAS.vega)
      .order("order_index");

    expect(etapas![0].starts_on).toBe("2026-02-02");

    // Cada etapa empieza justo donde acaba la anterior: sin huecos ni solapes
    for (let i = 1; i < etapas!.length; i += 1) {
      const finAnterior = new Date(etapas![i - 1].ends_on!);
      const inicio = new Date(etapas![i].starts_on!);
      expect(inicio.getTime() - finAnterior.getTime()).toBe(24 * 60 * 60 * 1000);
    }

    // Y se queda como estaba, que otros tests leen esta compañía
    await servicio.from("roadmap_stages").delete().eq("company_id", COMPANIAS.vega);
  });

  it("no se instancia dos veces sobre la misma compañía", async () => {
    const { data: plantilla } = await servicio
      .from("roadmap_templates")
      .select("id")
      .eq("code", "desde_mvp")
      .single();

    // Marea ya tiene hoja de ruta del seed
    const { error } = await equipoIwl.rpc("instanciar_hoja_de_ruta", {
      target_company: COMPANIAS.marea,
      template: plantilla!.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/ya tiene hoja de ruta/);
  });

  it("una fundadora no puede instanciarse un plan", async () => {
    const { data: plantilla } = await servicio
      .from("roadmap_templates")
      .select("id")
      .eq("code", "desde_idea")
      .single();

    const { error } = await fundadoraVega.rpc("instanciar_hoja_de_ruta", {
      target_company: COMPANIAS.vega,
      template: plantilla!.id,
    });

    expect(error).not.toBeNull();
  });
});
