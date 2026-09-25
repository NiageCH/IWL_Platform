import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Avances y aportación no horaria.
 *
 * Los avances los escriben las dos partes y el carril lo decide la base, no
 * el formulario: si se pudiera elegir, los dos carriles dejarían de
 * significar nada. La aportación la registra IWL y la ve la compañía.
 */

let fundadoraMarea: SupabaseClient;
let fundadoraVega: SupabaseClient;
let equipoIwl: SupabaseClient;

const servicio = clienteServicio();

beforeAll(async () => {
  [fundadoraMarea, fundadoraVega, equipoIwl] = await Promise.all([
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.fundadoraVega),
    entrarComo(USUARIOS.equipoIwl),
  ]);
});

describe("el carril lo pone la base", () => {
  it("lo que escribe la fundadora cae en el carril de la compañía, diga lo que diga", async () => {
    const { data, error } = await fundadoraMarea
      .from("progress_entries")
      .insert({
        company_id: COMPANIAS.marea,
        title: "Avance de la compañía que intenta colarse como de IWL",
        // Se manda el carril contrario a propósito
        side: "iwl",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.side).toBe("compania");
    expect(data!.author_id).not.toBeNull();

    await servicio.from("progress_entries").delete().eq("id", data!.id);
  });

  it("lo que escribe el equipo de IWL cae en el suyo", async () => {
    const { data, error } = await equipoIwl
      .from("progress_entries")
      .insert({
        company_id: COMPANIAS.marea,
        title: "Avance registrado por el equipo de IWL",
        side: "compania",
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.side).toBe("iwl");

    await servicio.from("progress_entries").delete().eq("id", data!.id);
  });

  it("un avance no cambia de carril al editarlo", async () => {
    const { data: creado } = await fundadoraMarea
      .from("progress_entries")
      .insert({
        company_id: COMPANIAS.marea,
        title: "Avance que va a intentar cambiarse de carril",
        side: "compania",
      })
      .select()
      .single();

    const { data: editado } = await fundadoraMarea
      .from("progress_entries")
      .update({ side: "iwl", title: "Avance con el título corregido" })
      .eq("id", creado!.id)
      .select()
      .single();

    expect(editado!.side).toBe("compania");
    expect(editado!.title).toBe("Avance con el título corregido");

    await servicio.from("progress_entries").delete().eq("id", creado!.id);
  });
});

describe("quién ve y quién borra los avances", () => {
  it("las dos partes ven los dos carriles: si no, no hay conversación", async () => {
    const { data } = await fundadoraMarea
      .from("progress_entries")
      .select("side")
      .eq("company_id", COMPANIAS.marea);

    expect(new Set(data?.map((a) => a.side))).toEqual(
      new Set(["compania", "iwl"]),
    );
  });

  it("una fundadora de otra compañía no ve nada", async () => {
    const { data } = await fundadoraVega
      .from("progress_entries")
      .select("id")
      .eq("company_id", COMPANIAS.marea);

    expect(data).toEqual([]);
  });

  it("la fundadora no borra un avance que no es suyo", async () => {
    const { data: deIwl } = await equipoIwl
      .from("progress_entries")
      .insert({
        company_id: COMPANIAS.marea,
        title: "Avance de IWL que la fundadora intentará borrar",
        side: "iwl",
      })
      .select()
      .single();

    await fundadoraMarea.from("progress_entries").delete().eq("id", deIwl!.id);

    const { data: sigue } = await servicio
      .from("progress_entries")
      .select("id")
      .eq("id", deIwl!.id)
      .maybeSingle();

    expect(sigue).not.toBeNull();

    await servicio.from("progress_entries").delete().eq("id", deIwl!.id);
  });
});

describe("aportación que no son horas", () => {
  it("la fundadora la ve: es el argumento del equity", async () => {
    const { data } = await fundadoraMarea
      .from("contribution_items")
      .select("kind, amount, market_value");

    expect(data?.length).toBeGreaterThan(0);
    // Ve también los importes, no solo que existe
    expect(data!.some((i) => i.market_value !== null)).toBe(true);
  });

  it("la fundadora no se la puede registrar ella misma", async () => {
    const { error } = await fundadoraMarea.from("contribution_items").insert({
      company_id: COMPANIAS.marea,
      kind: "compra",
      occurred_on: "2026-09-01",
      title: "Compra que la compañía se apunta sola",
    });

    expect(error).not.toBeNull();
  });

  it("el resumen por tipo calcula la diferencia con el mercado", async () => {
    const { data } = await equipoIwl
      .from("contribution_items_summary")
      .select("*")
      .eq("company_id", COMPANIAS.marea)
      .eq("kind", "evento")
      .single();

    // El evento de la semilla: cuesta 1.800 y vale 6.500
    expect(Number(data!.amount)).toBe(1800);
    expect(Number(data!.market_value)).toBe(6500);
    expect(Number(data!.discount)).toBe(4700);
  });

  it("el resumen no deja ver el de otra compañía", async () => {
    const { data } = await fundadoraVega
      .from("contribution_items_summary")
      .select("company_id");

    expect(data?.every((f) => f.company_id === COMPANIAS.vega)).toBe(true);
  });
});
