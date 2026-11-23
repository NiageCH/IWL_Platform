import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Los hitos fundamentales, desde Administración (REVISION, 23 nov): se
 * añaden, se retiran y se ordenan. Retirar no borra: deja de salir en las
 * hojas de ruta nuevas, y las que ya existen no cambian.
 *
 * Todo lo que toca la plantilla se deshace al acabar: la comparten las
 * demás pruebas.
 */

const servicio = clienteServicio();
const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const COHORTE = "00000000-0000-0000-0003-000000000001";

let admin: SupabaseClient;
let equipo: SupabaseClient;
let mentor: SupabaseClient;
let tramo4: string;
let hitos4: Array<{ id: string; order_index: number; title: string }>;
let nuevo: string | null = null;
let compania: string | null = null;

async function leerTramo4() {
  const { data } = await servicio
    .from("roadmap_template_milestones")
    .select("id, order_index, title")
    .eq("template_stage_id", tramo4)
    .is("retired_at", null)
    .order("order_index");
  return data!;
}

beforeAll(async () => {
  [admin, equipo, mentor] = await Promise.all([
    entrarComo(USUARIOS.admin),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.mentorProducto),
  ]);
  const { data: s } = await servicio
    .from("roadmap_template_stages")
    .select("id, roadmap_templates!inner(code)")
    .eq("roadmap_templates.code", "hoja_iwl")
    .eq("tramo", 4)
    .single();
  tramo4 = s!.id;
  hitos4 = await leerTramo4();
});

afterAll(async () => {
  if (compania) {
    await servicio.from("activity_log").delete().eq("company_id", compania);
    await servicio.from("companies").delete().eq("id", compania);
  }
  if (nuevo) await servicio.from("roadmap_template_milestones").delete().eq("id", nuevo);
  // El orden y los retirados, como estaban
  for (const h of hitos4) {
    await servicio.from("roadmap_template_milestones").update({ order_index: -100 - h.order_index }).eq("id", h.id);
  }
  for (const h of hitos4) {
    await servicio.from("roadmap_template_milestones").update({ order_index: h.order_index, retired_at: null, retired_by: null }).eq("id", h.id);
  }
});

describe("hitos fundamentales en Administración", () => {
  it("solo dirección los añade, los retira y los ordena", async () => {
    const fila = { template_stage_id: tramo4, title: "Hito de prueba", success_criteria: "Algo comprobable", fundamental: true, order_index: 99 };
    for (const quien of [equipo, mentor]) {
      expect((await quien.from("roadmap_template_milestones").insert(fila)).error).not.toBeNull();
      const { data } = await quien.from("roadmap_template_milestones").update({ retired_at: new Date().toISOString() }).eq("id", hitos4[0].id).select("id");
      expect(data ?? []).toEqual([]);
      expect((await quien.rpc("mover_hito_fundamental", { p_hito: hitos4[0].id, p_sentido: 1 })).error?.message).toMatch(/dirección/);
    }
    const { data, error } = await admin.from("roadmap_template_milestones").insert(fila).select("id").single();
    expect(error).toBeNull();
    nuevo = data!.id;
  });

  it("ordenar cambia el sitio con el de al lado, y en los extremos no hace nada", async () => {
    expect((await admin.rpc("mover_hito_fundamental", { p_hito: hitos4[0].id, p_sentido: 1 })).error).toBeNull();
    let ahora = await leerTramo4();
    expect(ahora[0].id).toBe(hitos4[1].id);
    expect(ahora[1].id).toBe(hitos4[0].id);

    expect((await admin.rpc("mover_hito_fundamental", { p_hito: hitos4[0].id, p_sentido: -1 })).error).toBeNull();
    expect((await admin.rpc("mover_hito_fundamental", { p_hito: hitos4[0].id, p_sentido: -1 })).error).toBeNull();
    ahora = await leerTramo4();
    expect(ahora.slice(0, hitos4.length).map((h) => h.id)).toEqual(hitos4.map((h) => h.id));
  });

  it("retirado, no sale en una hoja de ruta nueva; las que existen no cambian", async () => {
    const retirado = hitos4[1];
    const antes = (await servicio.from("milestones").select("id").eq("template_milestone_id", retirado.id)).data!.length;
    expect(antes).toBeGreaterThan(0);

    const { error } = await admin.from("roadmap_template_milestones").update({ retired_at: new Date().toISOString() }).eq("id", retirado.id);
    expect(error).toBeNull();
    // No se borra: sigue en la tabla
    expect((await servicio.from("roadmap_template_milestones").select("id").eq("id", retirado.id)).data).toHaveLength(1);

    const sello = Date.now();
    const { data: c } = await servicio
      .from("companies")
      .insert({
        organization_id: ORGANIZACION,
        cohort_id: COHORTE,
        name: `Hoja de prueba ${sello}`,
        slug: `hoja-de-prueba-${sello}`,
        tramo: "entrada",
        entry_state: "facturando",
      })
      .select("id")
      .single();
    compania = c!.id;
    expect((await admin.rpc("generar_hoja_de_ruta", { p_company: compania, p_inicio: "2026-12-01" })).error).toBeNull();

    const { data: copiados } = await servicio.from("milestones").select("template_milestone_id").eq("company_id", compania);
    const ids = copiados!.map((m) => m.template_milestone_id);
    expect(ids).not.toContain(retirado.id);
    expect(ids).toContain(hitos4[0].id);
    expect(ids).toContain(nuevo);

    // Las hojas que ya lo llevaban lo siguen llevando
    expect((await servicio.from("milestones").select("id").eq("template_milestone_id", retirado.id)).data).toHaveLength(antes);
  });
});
