import { afterAll, describe, expect, it } from "vitest";
import { USUARIOS, clienteAnonimo, clienteServicio, entrarComo } from "./clientes";

/**
 * El acta de comité: lo que la hace valer como prueba.
 *
 * La firma de cada miembro la pone el servidor, y lo firmado no se toca,
 * escriba quien escriba. Cuando firma el último, la decisión se aplica.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const creadas: string[] = [];

async function perfil(email: string) {
  const { data } = await clienteServicio().from("profiles").select("id").eq("email", email).single();
  return data!.id as string;
}

async function candidaturaEnComite() {
  const { data } = await clienteServicio()
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS Comité ${crypto.randomUUID().slice(0, 8)}`,
      contacto_nombre: "Prueba",
      contacto_email: `rls.comite.${crypto.randomUUID().slice(0, 8)}@ejemplo.test`,
      estado: "comite",
      estado_declarado: "mvp",
    })
    .select("id")
    .single();
  creadas.push(data!.id);
  return data!.id as string;
}

async function acta(candidaturaId: string, campos: Record<string, unknown>, miembros: string[]) {
  const servicio = clienteServicio();
  const { data, error } = await servicio
    .from("comite_actas")
    .insert({ candidatura_id: candidaturaId, resumen: "Resumen de prueba", ...campos })
    .select("id")
    .single();
  expect(error).toBeNull();
  await servicio.from("comite_firmas").insert(miembros.map((profile_id) => ({ acta_id: data!.id, profile_id })));
  return data!.id as string;
}

const firmar = (actaId: string, profileId: string) =>
  clienteServicio().rpc("firmar_acta", { p_acta: actaId, p_profile: profileId, p_ip: "1.2.3.4", p_ua: "prueba" });

afterAll(async () => {
  /*
   * Las actas firmadas no se borran sueltas: se van con su candidatura, en
   * cascada. Se comprueba que el borrado no falla, porque una primera
   * versión del guardián lo impedía y la limpieza dejaba basura en silencio.
   */
  const servicio = clienteServicio();
  const { error } = await servicio.from("candidaturas").delete().in("id", creadas);
  expect(error).toBeNull();
  const { data } = await servicio.from("candidaturas").select("id").in("id", creadas);
  expect(data).toEqual([]);
});

describe("el acta", () => {
  it("la ve IWL, no una fundadora ni quien no ha entrado", async () => {
    const c = await candidaturaEnComite();
    const id = await acta(c, { decision: "aplazada", revision_on: "2026-12-15" }, [await perfil(USUARIOS.admin)]);

    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    expect((await fundadora.from("comite_actas").select("id").eq("id", id)).data).toEqual([]);
    expect((await clienteAnonimo().from("comite_actas").select("id").eq("id", id)).data ?? []).toEqual([]);
  });

  it("nadie con sesión firma directamente: la IP la pone el servidor", async () => {
    const c = await candidaturaEnComite();
    const admin = await perfil(USUARIOS.admin);
    const id = await acta(c, { decision: "aplazada", revision_on: "2026-12-15" }, [admin]);

    const direccion = await entrarComo(USUARIOS.admin);
    const { error } = await direccion.rpc("firmar_acta", { p_acta: id, p_profile: admin, p_ip: "9.9.9.9", p_ua: "x" });
    expect(error).not.toBeNull();
  });

  it("con una firma, no se edita, no se borra y el comité no cambia", async () => {
    const c = await candidaturaEnComite();
    const [admin, equipo] = [await perfil(USUARIOS.admin), await perfil(USUARIOS.equipoIwl)];
    const id = await acta(c, { decision: "aplazada", revision_on: "2026-12-15" }, [admin, equipo]);
    expect((await firmar(id, admin)).error).toBeNull();

    const servicio = clienteServicio();
    const editar = await servicio.from("comite_actas").update({ resumen: "Otro" }).eq("id", id);
    expect(editar.error?.message).toMatch(/no se edita/);
    const borrar = await servicio.from("comite_actas").delete().eq("id", id);
    expect(borrar.error?.message).toMatch(/no se borra/);
    const anadir = await servicio.from("comite_firmas").insert({ acta_id: id, profile_id: await perfil(USUARIOS.mentorProducto) });
    expect(anadir.error?.message).toMatch(/el comité no cambia/);
  });

  it("la última firma aplica la decisión y la vía", async () => {
    const c = await candidaturaEnComite();
    const [admin, equipo] = [await perfil(USUARIOS.admin), await perfil(USUARIOS.equipoIwl)];
    const id = await acta(
      c,
      { decision: "preseleccionada", via: "construccion", via_propuesta: "construccion" },
      [admin, equipo],
    );

    expect((await firmar(id, admin)).data).toBe(false);
    const servicio = clienteServicio();
    expect((await servicio.from("candidaturas").select("estado").eq("id", c).single()).data!.estado).toBe("comite");

    expect((await firmar(id, equipo)).data).toBe(true);
    const { data } = await servicio.from("candidaturas").select("estado, via").eq("id", c).single();
    expect(data).toEqual({ estado: "preseleccionada", via: "construccion" });
  });

  it("descartada, con su motivo", async () => {
    const c = await candidaturaEnComite();
    const admin = await perfil(USUARIOS.admin);
    const id = await acta(c, { decision: "descartada", motivo: "Fuera de la tesis de inversión" }, [admin]);
    await firmar(id, admin);
    const { data } = await clienteServicio()
      .from("candidaturas")
      .select("estado, descartada_motivo, descartada_desde")
      .eq("id", c)
      .single();
    expect(data).toEqual({ estado: "descartada", descartada_motivo: "Fuera de la tesis de inversión", descartada_desde: "comite" });
  });

  it("el hash de lo firmado: solo con el acta cerrada, y una vez puesto no cambia, ni sin sesión", async () => {
    const c = await candidaturaEnComite();
    const admin = await perfil(USUARIOS.admin);
    const id = await acta(c, { decision: "aplazada", revision_on: "2026-12-15" }, [admin]);
    const servicio = clienteServicio();
    const hash = (x: string) => x.repeat(64);

    const abierta = await servicio.from("comite_actas").update({ contenido_hash: hash("a") }).eq("id", id);
    expect(abierta.error?.message).toMatch(/cuando el acta está firmada por todos/);

    await firmar(id, admin);
    expect((await servicio.from("comite_actas").update({ contenido_hash: hash("a") }).eq("id", id)).error).toBeNull();
    const otra = await servicio.from("comite_actas").update({ contenido_hash: hash("b") }).eq("id", id);
    expect(otra.error?.message).toMatch(/El hash de un acta no cambia/);
    // Y nada que no sea un SHA-256
    const raro = await servicio.from("comite_actas").update({ contenido_hash: "no" }).eq("id", id);
    expect(raro.error).not.toBeNull();
  });

  it("lo que cada decisión pide, lo exige la base", async () => {
    const c = await candidaturaEnComite();
    const servicio = clienteServicio();
    const sinVia = await servicio.from("comite_actas").insert({ candidatura_id: c, resumen: "x", decision: "preseleccionada" });
    expect(sinVia.error).not.toBeNull();
    const sinFecha = await servicio.from("comite_actas").insert({ candidatura_id: c, resumen: "x", decision: "aplazada" });
    expect(sinFecha.error).not.toBeNull();
    const otraViaSinMotivo = await servicio.from("comite_actas").insert({
      candidatura_id: c,
      resumen: "x",
      decision: "preseleccionada",
      via: "aceleracion",
      via_propuesta: "construccion",
    });
    expect(otraViaSinMotivo.error).not.toBeNull();
  });
});
