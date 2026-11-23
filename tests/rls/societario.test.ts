import { afterEach, describe, expect, it } from "vitest";
import { COMPANIAS, USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * La situación societaria: quién la cambia y qué arrastra.
 *
 * Se prueba sobre Marea, que coordina el mentor de producto, entrando como
 * la fundadora —que no debe poder quitarse lo societario— y como el
 * mentor —que puede dar la sociedad por constituida cumpliendo su hito,
 * pero no escribir la situación a mano—. Al acabar, Marea queda como
 * estaba: sin situación, sin el hito y sin los puntos que sustituyen a lo
 * societario.
 */

const MAREA = COMPANIAS.marea;

async function restaurar() {
  const servicio = clienteServicio();
  await servicio
    .from("companies")
    .update({ situacion_societaria: "constituida" })
    .eq("id", MAREA);
  await servicio
    .from("companies")
    .update({ situacion_societaria: null, constitucion_prevista: null })
    .eq("id", MAREA);
  await servicio.from("milestones").delete().eq("company_id", MAREA).eq("origin", "societario");

  const { data: sustitutos } = await servicio
    .from("dd_item_templates")
    .select("id")
    .eq("solo_sin_sociedad", true);
  await servicio
    .from("dd_items")
    .delete()
    .eq("company_id", MAREA)
    .in("template_id", (sustitutos ?? []).map((t) => t.id));
}

afterEach(restaurar);

describe("la situación societaria", () => {
  it("la fundadora no se la cambia", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { error } = await fundadora
      .from("companies")
      .update({ situacion_societaria: "sin_constituir" })
      .eq("id", MAREA);
    expect(error?.message).toMatch(/la fija el equipo de IWL/);
  });

  it("sin sociedad, la base pone el hito y lo que sustituye a lo societario", async () => {
    const servicio = clienteServicio();
    await servicio
      .from("companies")
      .update({ situacion_societaria: "en_constitucion", constitucion_prevista: "2027-01-15" })
      .eq("id", MAREA);

    const { data: hito } = await servicio
      .from("milestones")
      .select("title, due_date, status")
      .eq("company_id", MAREA)
      .eq("origin", "societario")
      .single();
    expect(hito).toMatchObject({ title: "Constituir la sociedad", due_date: "2027-01-15", status: "pendiente" });

    const { data: puntos } = await servicio
      .from("dd_items")
      .select("title, dd_item_templates!inner(solo_sin_sociedad)")
      .eq("company_id", MAREA)
      .eq("dd_item_templates.solo_sin_sociedad", true);
    expect((puntos ?? []).map((p) => p.title).sort()).toEqual([
      "Pacto entre fundadoras",
      "Titularidad de lo construido",
    ]);
  });

  it("validado el hito, la sociedad queda constituida", async () => {
    const servicio = clienteServicio();
    await servicio
      .from("companies")
      .update({ situacion_societaria: "sin_constituir" })
      .eq("id", MAREA);
    const { data: hito } = await servicio
      .from("milestones")
      .select("id")
      .eq("company_id", MAREA)
      .eq("origin", "societario")
      .single();

    // A mano, no puede
    const mentor = await entrarComo(USUARIOS.mentorProducto);
    const { error: aMano } = await mentor
      .from("companies")
      .update({ situacion_societaria: "constituida" })
      .eq("id", MAREA);
    expect(aMano?.message).toMatch(/la fija el equipo de IWL/);

    // Marcándolo cumplido a mano, tampoco: se cumple validando su entrega (REVISION, 23 nov)
    const { error: directo } = await mentor.from("milestones").update({ status: "cumplido" }).eq("id", hito!.id);
    expect(directo?.message).toMatch(/validando su entrega/);

    // Entregado con su evidencia y validado, sí
    const { data: prueba } = await servicio
      .from("evidence_links")
      .insert({
        company_id: MAREA,
        entity: "milestone",
        entity_id: hito!.id,
        kind: "enlace",
        url: "https://ejemplo.test/escritura",
        label: "Escritura de constitución",
      })
      .select("id")
      .single();
    await servicio.from("milestones").update({ status: "entregado" }).eq("id", hito!.id);
    const { error } = await mentor.rpc("validar_hito", { p_hito: hito!.id });
    expect(error).toBeNull();

    const { data: compania } = await servicio
      .from("companies")
      .select("situacion_societaria")
      .eq("id", MAREA)
      .single();
    expect(compania!.situacion_societaria).toBe("constituida");

    // Lo que creó, fuera; el hito vuelve a como estaba en la semilla
    await servicio.from("milestone_reviews").delete().eq("milestone_id", hito!.id);
    await servicio.from("evidence_links").delete().eq("id", prueba!.id);
  });
});

describe("un punto que no aplica", () => {
  it("la fundadora no se lo quita de encima", async () => {
    const servicio = clienteServicio();
    const { data: punto } = await servicio
      .from("dd_items")
      .select("id, status")
      .eq("company_id", MAREA)
      .eq("status", "pendiente")
      .order("id")
      .limit(1)
      .single();

    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { error } = await fundadora
      .from("dd_items")
      .update({ status: "no_aplica" })
      .eq("id", punto!.id);
    expect(error?.message).toMatch(/lo decide quien valida/);

    const { data: despues } = await servicio.from("dd_items").select("status").eq("id", punto!.id).single();
    expect(despues!.status).toBe("pendiente");
  });
});
