import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMPANIAS,
  USUARIOS,
  clienteAnonimo,
  clienteServicio,
  entrarComo,
} from "./clientes";

/**
 * Aislamiento estricto entre compañías (§5).
 *
 * Criterio de aceptación §11: una fundadora solo accede a su compañía.
 * Estos tests entran como personas reales de la semilla y comprueban lo que
 * devuelve la base, no lo que muestra la interfaz.
 */

let fundadoraMarea: SupabaseClient;
let fundadoraVega: SupabaseClient;
let equipoIwl: SupabaseClient;
let admin: SupabaseClient;
let revisorMareaRaiz: SupabaseClient;
let revisorVega: SupabaseClient;
let mentor: SupabaseClient;

beforeAll(async () => {
  [
    fundadoraMarea,
    fundadoraVega,
    equipoIwl,
    admin,
    revisorMareaRaiz,
    revisorVega,
    mentor,
  ] = await Promise.all([
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.fundadoraVega),
    entrarComo(USUARIOS.equipoIwl),
    entrarComo(USUARIOS.admin),
    entrarComo(USUARIOS.revisorMareaRaiz),
    entrarComo(USUARIOS.revisorVega),
    entrarComo(USUARIOS.mentor),
  ]);
});

describe("companies", () => {
  it("una fundadora solo ve su compañía", async () => {
    const { data, error } = await fundadoraMarea.from("companies").select("id, name");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(COMPANIAS.marea);
  });

  it("una fundadora no alcanza otra compañía ni pidiéndola por su id", async () => {
    const { data, error } = await fundadoraMarea
      .from("companies")
      .select("id, name")
      .eq("id", COMPANIAS.vega);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("el equipo de IWL ve la cartera completa", async () => {
    const { data, error } = await equipoIwl.from("companies").select("id");

    expect(error).toBeNull();
    expect(data?.length).toBe(3);
  });

  it("un revisor de Niage solo ve las compañías que tiene asignadas", async () => {
    const asignadasAlPrimero = await revisorMareaRaiz.from("companies").select("id, slug");
    const asignadasAlSegundo = await revisorVega.from("companies").select("id, slug");

    expect(asignadasAlPrimero.data?.map((c) => c.id).sort()).toEqual(
      [COMPANIAS.marea, COMPANIAS.raiz].sort(),
    );
    expect(asignadasAlSegundo.data?.map((c) => c.id)).toEqual([COMPANIAS.vega]);
  });

  it("un mentor solo ve la compañía donde está asignado", async () => {
    const { data } = await mentor.from("companies").select("id");
    expect(data?.map((c) => c.id)).toEqual([COMPANIAS.marea]);
  });

  it("sin sesión no se ve ninguna compañía", async () => {
    const { data } = await clienteAnonimo().from("companies").select("id");
    expect(data ?? []).toEqual([]);
  });
});

describe("escritura sobre compañías ajenas", () => {
  it("una fundadora no puede modificar otra compañía", async () => {
    const { data } = await fundadoraVega
      .from("companies")
      .update({ one_liner: "Intento de escritura cruzada" })
      .eq("id", COMPANIAS.marea)
      .select();

    // RLS no devuelve error: sencillamente no hay fila que actualizar
    expect(data ?? []).toEqual([]);

    const servicio = clienteServicio();
    const { data: real } = await servicio
      .from("companies")
      .select("one_liner")
      .eq("id", COMPANIAS.marea)
      .single();

    expect(real?.one_liner).not.toBe("Intento de escritura cruzada");
  });

  it("una fundadora sí edita la ficha de su propia compañía", async () => {
    const texto = `Seguimiento de pacientes crónicos. Revisión ${Date.now()}`;

    const { data, error } = await fundadoraMarea
      .from("companies")
      .update({ one_liner: texto })
      .eq("id", COMPANIAS.marea)
      .select("one_liner");

    expect(error).toBeNull();
    expect(data?.[0].one_liner).toBe(texto);
  });

  it("una fundadora no puede crear una compañía", async () => {
    const { error } = await fundadoraMarea.from("companies").insert({
      organization_id: "00000000-0000-0000-0001-000000000001",
      name: "Compañía creada por la fundadora",
      slug: `intento-${Date.now()}`,
    });

    expect(error).not.toBeNull();
  });
});

describe("gobernanza de la ficha", () => {
  /**
   * La etapa decide los niveles objetivo y por tanto el score técnico.
   * Si la fundadora pudiera cambiarla, podría subirse el score sola.
   */
  it("una fundadora no puede cambiar la etapa de su compañía", async () => {
    const { error } = await fundadoraMarea
      .from("companies")
      .update({ stage: "pre_semilla" })
      .eq("id", COMPANIAS.marea);

    expect(error).not.toBeNull();
    expect(error?.message).toContain("equipo de IWL");
  });

  it("una fundadora no puede cambiar su fase del programa", async () => {
    const servicio = clienteServicio();
    const { data: otraFase } = await servicio
      .from("phases")
      .select("id")
      .eq("code", "fase_3")
      .single();

    const { error } = await fundadoraMarea
      .from("companies")
      .update({ phase_id: otraFase!.id })
      .eq("id", COMPANIAS.marea);

    expect(error).not.toBeNull();
  });

  it("el equipo de IWL sí mueve la etapa", async () => {
    const { error } = await equipoIwl
      .from("companies")
      .update({ stage: "semilla" })
      .eq("id", COMPANIAS.marea);

    expect(error).toBeNull();
  });
});

describe("datos dependientes de la compañía", () => {
  it("la cap table de una compañía no se ve desde otra", async () => {
    const propia = await fundadoraMarea.from("cap_table_entries").select("id, company_id");
    const ajena = await fundadoraVega
      .from("cap_table_entries")
      .select("id")
      .eq("company_id", COMPANIAS.marea);

    expect(propia.data?.length).toBeGreaterThan(0);
    expect(propia.data?.every((e) => e.company_id === COMPANIAS.marea)).toBe(true);
    expect(ajena.data ?? []).toEqual([]);
  });

  it("los pilares activos siguen el mismo aislamiento", async () => {
    const { data } = await fundadoraVega.from("company_pillars").select("company_id");

    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((p) => p.company_id === COMPANIAS.vega)).toBe(true);
  });

  it("una fundadora no se añade miembros al equipo por su cuenta", async () => {
    const { error } = await fundadoraMarea.from("company_members").insert({
      company_id: COMPANIAS.marea,
      profile_id: "00000000-0000-0000-0002-000000000021",
      member_role: "fundadora",
    });

    expect(error).not.toBeNull();
  });
});

describe("perfiles", () => {
  it("una fundadora no ve el listado de personas de otras compañías", async () => {
    const { data } = await fundadoraMarea.from("profiles").select("email");
    const correos = data?.map((p) => p.email) ?? [];

    expect(correos).toContain(USUARIOS.fundadoraMarea);
    expect(correos).not.toContain(USUARIOS.fundadoraVega);
    expect(correos).not.toContain(USUARIOS.fundadoraRaiz);
  });

  it("nadie se cambia su propio rol", async () => {
    const { error } = await fundadoraMarea
      .from("profiles")
      .update({ role: "admin_iwl" })
      .eq("email", USUARIOS.fundadoraMarea);

    expect(error).not.toBeNull();
    // Lo rechaza la política, no una recursión: 42501 es violación de RLS
    expect(error?.code).toBe("42501");

    const servicio = clienteServicio();
    const { data } = await servicio
      .from("profiles")
      .select("role")
      .eq("email", USUARIOS.fundadoraMarea)
      .single();

    expect(data?.role).toBe("fundadora");
  });

  it("cada persona sí puede corregir su nombre", async () => {
    const nombre = `Fundadora Marea ${Date.now()}`;
    const { error } = await fundadoraMarea
      .from("profiles")
      .update({ full_name: nombre })
      .eq("email", USUARIOS.fundadoraMarea);

    expect(error).toBeNull();
  });
});

describe("configuración", () => {
  it("la configuración la lee cualquier persona con sesión", async () => {
    const { data, error } = await fundadoraMarea
      .from("tech_dimensions")
      .select("code");

    expect(error).toBeNull();
    expect(data?.length).toBe(10);
  });

  it("solo admin_iwl cambia los niveles objetivo", async () => {
    const servicio = clienteServicio();
    const { data: objetivo } = await servicio
      .from("tech_stage_targets")
      .select("id, target_level")
      .limit(1)
      .single();

    const intentoFundadora = await fundadoraMarea
      .from("tech_stage_targets")
      .update({ target_level: 0 })
      .eq("id", objetivo!.id)
      .select();

    const intentoEquipo = await equipoIwl
      .from("tech_stage_targets")
      .update({ target_level: 0 })
      .eq("id", objetivo!.id)
      .select();

    expect(intentoFundadora.data ?? []).toEqual([]);
    expect(intentoEquipo.data ?? []).toEqual([]);

    const intentoAdmin = await admin
      .from("tech_stage_targets")
      .update({ target_level: objetivo!.target_level })
      .eq("id", objetivo!.id)
      .select();

    expect(intentoAdmin.data?.length).toBe(1);
  });

  it("sin sesión no se lee ni la configuración", async () => {
    const { data } = await clienteAnonimo().from("tech_dimensions").select("code");
    expect(data ?? []).toEqual([]);
  });
});
