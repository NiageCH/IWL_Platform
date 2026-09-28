import { beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * Mentoría.
 *
 * El papel va en la asignación, no en la persona: la misma mentora coordina
 * Marea y apoya en Raíz. Todo lo que hay que probar aquí es que los poderes
 * la siguen a cada proyecto por separado, porque si dependieran de su rol
 * global coordinaría las dos o ninguna.
 */

let producto: SupabaseClient;   // coordina Marea, apoya en Raíz
let comercial: SupabaseClient;  // coordina Raíz, apoya en Marea
let fundadoraMarea: SupabaseClient;
let admin: SupabaseClient;

const servicio = clienteServicio();

beforeAll(async () => {
  [producto, comercial, fundadoraMarea, admin] = await Promise.all([
    entrarComo(USUARIOS.mentorProducto),
    entrarComo(USUARIOS.mentorComercial),
    entrarComo(USUARIOS.fundadoraMarea),
    entrarComo(USUARIOS.admin),
  ]);
});

describe("el papel va por proyecto, no por persona", () => {
  it("coordina donde es principal y solo apoya donde es secundaria", async () => {
    const { data } = await producto
      .from("company_members")
      .select("company_id, member_role")
      .eq("profile_id", (await producto.auth.getUser()).data.user!.id);

    const papeles = new Map(data?.map((m) => [m.company_id, m.member_role]));

    expect(papeles.get(COMPANIAS.marea)).toBe("mentor_principal");
    expect(papeles.get(COMPANIAS.raiz)).toBe("mentor_secundario");
  });

  it("ninguna de las dos ve la compañía que no lleva", async () => {
    for (const cliente of [producto, comercial]) {
      const { data } = await cliente
        .from("companies")
        .select("id")
        .eq("id", COMPANIAS.vega);
      expect(data).toEqual([]);
    }
  });
});

describe("lo que puede el mentor que coordina", () => {
  it("puntúa el due diligence técnico de su proyecto", async () => {
    const { data: evaluacion } = await servicio
      .from("tech_assessments")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .limit(1)
      .single();

    const { data: dimension } = await servicio
      .from("tech_dimensions")
      .select("id")
      .eq("code", "arquitectura_producto")
      .single();

    const { data, error } = await producto
      .from("tech_scores")
      .upsert(
        {
          assessment_id: evaluacion!.id,
          company_id: COMPANIAS.marea,
          dimension_id: dimension!.id,
          level: 3,
          evidence: "Revisado en sesión de coordinación del proyecto.",
        },
        { onConflict: "assessment_id,dimension_id" },
      )
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("no puntúa el proyecto donde solo apoya", async () => {
    const { data: evaluacion } = await servicio
      .from("tech_assessments")
      .select("id")
      .eq("company_id", COMPANIAS.raiz)
      .limit(1)
      .single();

    const { data: dimension } = await servicio
      .from("tech_dimensions")
      .select("id")
      .eq("code", "arquitectura_producto")
      .single();

    const { error } = await producto.from("tech_scores").insert({
      assessment_id: evaluacion!.id,
      company_id: COMPANIAS.raiz,
      dimension_id: dimension!.id,
      level: 4,
      evidence: "Intento desde un proyecto donde solo apoya.",
    });

    expect(error).not.toBeNull();
  });

  it("confirma un hito de su proyecto y no del otro", async () => {
    const { data: suyo } = await servicio
      .from("milestones")
      .insert({
        company_id: COMPANIAS.marea,
        title: "Hito de prueba de coordinación",
        success_criteria: "Se cierra cuando lo confirme quien coordina.",
      })
      .select()
      .single();

    const { data: ajeno } = await servicio
      .from("milestones")
      .insert({
        company_id: COMPANIAS.raiz,
        title: "Hito de un proyecto donde solo apoya",
        success_criteria: "No debería poder cerrarlo.",
      })
      .select()
      .single();

    const propio = await producto
      .from("milestones")
      .update({ status: "cumplido" })
      .eq("id", suyo!.id)
      .select();

    expect(propio.error).toBeNull();
    expect(propio.data).toHaveLength(1);
    expect(propio.data![0].confirmed_by).not.toBeNull();

    /*
     * En el proyecto donde solo apoya no llega ni al trigger: la política de
     * escritura le filtra la fila antes, así que no hay error, simplemente no
     * cambia nada. Se comprueba el efecto, que es lo que importa.
     */
    const otro = await producto
      .from("milestones")
      .update({ status: "cumplido" })
      .eq("id", ajeno!.id)
      .select();

    expect(otro.data ?? []).toEqual([]);

    const { data: sigue } = await servicio
      .from("milestones")
      .select("status, confirmed_by")
      .eq("id", ajeno!.id)
      .single();

    expect(sigue!.status).toBe("pendiente");
    expect(sigue!.confirmed_by).toBeNull();

    await servicio.from("milestones").delete().in("id", [suyo!.id, ajeno!.id]);
  });
});

describe("lo que no puede ningún mentor", () => {
  it("tocar el Anexo, que fija el equity", async () => {
    const { data: anexo } = await servicio
      .from("annexes")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .single();

    const { data } = await producto
      .from("annexes")
      .update({ equity_pct: 30 })
      .eq("id", anexo!.id)
      .select();

    expect(data ?? []).toEqual([]);
  });

  it("mover la caja del programa", async () => {
    const { error } = await producto.from("cash_disbursements").insert({
      company_id: COMPANIAS.marea,
      amount: 1000,
      disbursed_on: "2026-09-01",
    });

    expect(error).not.toBeNull();
  });

  it("congelar una línea base", async () => {
    const { error } = await producto.from("baselines").insert({
      company_id: COMPANIAS.marea,
      kind: "trimestral",
      taken_on: "2026-12-31",
      stage: "semilla",
      content: {},
    });

    expect(error).not.toBeNull();
  });

  it("dar de alta una compañía", async () => {
    const { error } = await producto.rpc("crear_compania", {
      p_name: "Compañía que un mentor no puede crear",
      p_slug: "mentor-no-crea",
      p_stage: "semilla",
      p_tech_profile: "software",
      p_phase_code: "fase_0",
    });

    expect(error).not.toBeNull();
  });

  it("cambiar la configuración del programa", async () => {
    const { data } = await producto
      .from("platform_settings")
      .update({ value: { score_tecnico_minimo: 1 } })
      .eq("key", "umbrales_invertible")
      .select();

    expect(data ?? []).toEqual([]);
  });
});

describe("horas y tareas", () => {
  it("un mentor imputa sus propias horas donde solo apoya", async () => {
    const yo = (await producto.auth.getUser()).data.user!.id;

    const { data: materia } = await servicio
      .from("contribution_subjects")
      .select("id")
      .limit(1)
      .single();

    const { data, error } = await producto
      .from("contribution_hours")
      .insert({
        company_id: COMPANIAS.raiz,
        profile_id: yo,
        person_name: "Mentoría producto",
        profile_code: "ingenieria",
        subject_id: materia!.id,
        description: "Sesión de producto en el proyecto donde apoya.",
        hours: 3,
        worked_on: "2026-09-20",
      })
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);

    await servicio.from("contribution_hours").delete().eq("id", data![0].id);
  });

  it("pero no a nombre de otra persona", async () => {
    const otra = (await comercial.auth.getUser()).data.user!.id;

    const { data: materia } = await servicio
      .from("contribution_subjects")
      .select("id")
      .limit(1)
      .single();

    const { error } = await producto.from("contribution_hours").insert({
      company_id: COMPANIAS.raiz,
      profile_id: otra,
      person_name: "Mentoría comercial",
      profile_code: "socio",
      subject_id: materia!.id,
      description: "Horas que no son suyas.",
      hours: 2,
      worked_on: "2026-09-20",
    });

    expect(error).not.toBeNull();
  });

  it("cierra la tarea que tiene asignada", async () => {
    const yo = (await producto.auth.getUser()).data.user!.id;

    const { data: mia } = await servicio
      .from("tasks")
      .select("id")
      .eq("company_id", COMPANIAS.marea)
      .eq("owner_id", yo)
      .limit(1)
      .single();

    const { data, error } = await producto
      .from("tasks")
      .update({ status: "hecha" })
      .eq("id", mia!.id)
      .select();

    expect(error).toBeNull();
    expect(data![0].completed_on).not.toBeNull();
    expect(data![0].completed_by).toBe(yo);

    await servicio
      .from("tasks")
      .update({ status: "en_curso", completed_on: null, completed_by: null })
      .eq("id", mia!.id);
  });

  it("la fundadora no reparte trabajo a la mentoría", async () => {
    const mentora = (await producto.auth.getUser()).data.user!.id;

    const { error } = await fundadoraMarea.from("tasks").insert({
      company_id: COMPANIAS.marea,
      owner_id: mentora,
      title: "Tarea que la compañía intenta asignar a un mentor",
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/peticiones del update mensual/);
  });

  it("pero sí se apunta trabajo propio", async () => {
    const yo = (await fundadoraMarea.auth.getUser()).data.user!.id;

    const { data, error } = await fundadoraMarea
      .from("tasks")
      .insert({
        company_id: COMPANIAS.marea,
        owner_id: yo,
        title: "Trabajo que se apunta el equipo fundador",
        side: "compania",
      })
      .select();

    expect(error).toBeNull();
    await servicio.from("tasks").delete().eq("id", data![0].id);
  });
});

describe("la dedicación se mide contra lo asignado", () => {
  it("cada mentor tiene sus horas por proyecto", async () => {
    const { data } = await admin
      .from("mentoria_dedicacion")
      .select("company_slug, member_role, assigned_hours, imputadas, pct")
      .eq("company_slug", "marea-clinica")
      .in("member_role", ["mentor_principal", "mentor_secundario"]);

    expect(data?.length).toBe(2);

    const principal = data!.find((m) => m.member_role === "mentor_principal")!;
    expect(Number(principal.assigned_hours)).toBe(120);
    expect(Number(principal.imputadas)).toBeGreaterThan(0);
    expect(Number(principal.pct)).toBeGreaterThan(0);
  });

  it("una fundadora no ve la dedicación de otra compañía", async () => {
    const { data } = await fundadoraMarea
      .from("mentoria_dedicacion")
      .select("company_slug");

    expect(data?.every((m) => m.company_slug === "marea-clinica")).toBe(true);
  });
});
