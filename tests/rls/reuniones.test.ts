import { afterAll, describe, expect, it } from "vitest";
import { USUARIOS, clienteAnonimo, clienteServicio, entrarComo } from "./clientes";

/**
 * Las reuniones con una candidata son de IWL, y lo que ella ve de ellas es
 * solo el momento: «Reunión propuesta». Si abrió su enlace lo apunta la
 * propia página, sin sesión.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const creadas: string[] = [];

async function candidaturaEnReunion() {
  const servicio = clienteServicio();
  const { data } = await servicio
    .from("candidaturas")
    .insert({
      cohort_id: COHORTE,
      nombre: `RLS Reunión ${crypto.randomUUID().slice(0, 8)}`,
      contacto_nombre: "Prueba",
      contacto_email: `rls.reunion.${crypto.randomUUID().slice(0, 8)}@ejemplo.test`,
      estado: "reunion",
    })
    .select("id, token")
    .single();
  creadas.push(data!.id);
  return data!;
}

afterAll(async () => {
  await clienteServicio().from("candidaturas").delete().in("id", creadas);
});

describe("las reuniones", () => {
  it("solo las ve IWL: ni una fundadora ni quien no ha entrado", async () => {
    const c = await candidaturaEnReunion();
    await clienteServicio().from("candidatura_reuniones").insert({
      candidatura_id: c.id,
      propuesta_at: new Date().toISOString(),
      franjas: [],
    });

    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    expect((await fundadora.from("candidatura_reuniones").select("id").eq("candidatura_id", c.id)).data).toEqual([]);
    expect((await clienteAnonimo().from("candidatura_reuniones").select("id").eq("candidatura_id", c.id)).data ?? []).toEqual([]);

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    expect((await equipo.from("candidatura_reuniones").select("id").eq("candidatura_id", c.id)).data).toHaveLength(1);
  });

  it("con una propuesta sin celebrar, ella ve «Reunión propuesta»", async () => {
    const c = await candidaturaEnReunion();
    const anonimo = clienteAnonimo();
    const antes = await anonimo.rpc("ver_candidatura", { p_token: c.token! });
    expect((antes.data as { momento: string }[])[0].momento).toBe("en_estudio");

    await clienteServicio().from("candidatura_reuniones").insert({
      candidatura_id: c.id,
      propuesta_at: new Date().toISOString(),
      franjas: [],
    });
    const despues = await anonimo.rpc("ver_candidatura", { p_token: c.token! });
    expect((despues.data as { momento: string }[])[0].momento).toBe("reunion_propuesta");
  });
});

describe("si abrió el enlace", () => {
  it("lo apunta la página sin sesión, y la primera vez no se mueve", async () => {
    const c = await candidaturaEnReunion();
    const anonimo = clienteAnonimo();

    await anonimo.rpc("registrar_apertura_enlace", { p_token: c.token! });
    const servicio = clienteServicio();
    const { data: una } = await servicio
      .from("candidaturas")
      .select("enlace_abierto_at, enlace_visto_at")
      .eq("id", c.id)
      .single();
    expect(una!.enlace_abierto_at).not.toBeNull();

    await new Promise((r) => setTimeout(r, 20));
    await anonimo.rpc("registrar_apertura_enlace", { p_token: c.token! });
    const { data: dos } = await servicio
      .from("candidaturas")
      .select("enlace_abierto_at, enlace_visto_at")
      .eq("id", c.id)
      .single();
    expect(dos!.enlace_abierto_at).toBe(una!.enlace_abierto_at);
    expect(dos!.enlace_visto_at! > una!.enlace_visto_at!).toBe(true);
  });
});

describe("la reunión se acuerda en la plataforma", () => {
  const dentro = (horas: number, minutos = 45) => {
    const inicio = new Date(Date.now() + horas * 3_600_000);
    inicio.setUTCSeconds(0, 0);
    return { inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + minutos * 60_000).toISOString() };
  };

  async function propuesta(franjas = [dentro(48), dentro(72)]) {
    const c = await candidaturaEnReunion();
    const { data, error } = await clienteServicio()
      .from("candidatura_reuniones")
      .insert({
        candidatura_id: c.id,
        propuesta_at: new Date().toISOString(),
        franjas,
        formato: "videollamada",
        enlace: "https://meet.ejemplo.test/x",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    return { c, id: data!.id as string, franjas };
  }

  it("ella la ve con su testigo; con otro testigo, nada", async () => {
    const { c, id } = await propuesta();
    const suya = await clienteAnonimo().rpc("reunion_vigente", { p_token: c.token! });
    expect((suya.data as { id: string }[])[0].id).toBe(id);
    const ajena = await clienteAnonimo().rpc("reunion_vigente", { p_token: "no-es-un-testigo" });
    expect(ajena.data).toEqual([]);
  });

  it("elige una franja con su testigo y queda confirmada, con su evento y su aviso", async () => {
    const { c, id, franjas } = await propuesta();
    const { error } = await clienteAnonimo().rpc("reunion_elegir", { p_reunion: id, p_inicio: franjas[1].inicio, p_token: c.token! });
    expect(error).toBeNull();
    const servicio = clienteServicio();
    const { data: r } = await servicio.from("candidatura_reuniones").select("estado, elegida").eq("id", id).single();
    expect(r!.estado).toBe("confirmada");
    expect((r!.elegida as { inicio: string }).inicio).toBe(franjas[1].inicio);
    const { data: avisos } = await servicio.from("avisos").select("tipo").eq("candidatura_id", c.id);
    expect(avisos).toEqual([{ tipo: "reunion_elegida" }]);
    // Ya confirmada, no se vuelve a elegir
    const otra = await clienteAnonimo().rpc("reunion_elegir", { p_reunion: id, p_inicio: franjas[0].inicio, p_token: c.token! });
    expect(otra.error?.message).toMatch(/ya no espera tu respuesta/);
  });

  it("con el testigo de otra, o una fecha que no es de las propuestas, no", async () => {
    const { id, franjas } = await propuesta();
    const otra = await candidaturaEnReunion();
    const ajena = await clienteAnonimo().rpc("reunion_elegir", { p_reunion: id, p_inicio: franjas[0].inicio, p_token: otra.token! });
    expect(ajena.error?.message).toMatch(/no es tuya/);
    const { c } = await propuesta();
    const inventada = await clienteAnonimo().rpc("reunion_elegir", {
      p_reunion: (await clienteServicio().from("candidatura_reuniones").select("id").eq("candidatura_id", c.id).single()).data!.id,
      p_inicio: dentro(100).inicio,
      p_token: c.token!,
    });
    expect(inventada.error?.message).toMatch(/no es una de las fechas propuestas/);
  });

  it("una franja pasada no se elige", async () => {
    const pasada = dentro(-24);
    const { c, id } = await propuesta([pasada, dentro(48)]);
    const { error } = await clienteAnonimo().rpc("reunion_elegir", { p_reunion: id, p_inicio: pasada.inicio, p_token: c.token! });
    expect(error?.message).toMatch(/ya ha pasado/);
  });

  it("propone otras: de dos a tres, por venir; y queda en contrapropuesta, con aviso", async () => {
    const { c, id } = await propuesta();
    const una = await clienteAnonimo().rpc("reunion_contraproponer", { p_reunion: id, p_franjas: [dentro(30)], p_token: c.token! });
    expect(una.error?.message).toMatch(/dos o tres fechas/);
    const pasadas = await clienteAnonimo().rpc("reunion_contraproponer", {
      p_reunion: id,
      p_franjas: [dentro(-5), dentro(30)],
      p_token: c.token!,
    });
    expect(pasadas.error?.message).toMatch(/dos o tres fechas/);

    const { error } = await clienteAnonimo().rpc("reunion_contraproponer", {
      p_reunion: id,
      p_franjas: [dentro(30), dentro(54)],
      p_nota: "Por la tarde nos va mejor",
      p_token: c.token!,
    });
    expect(error).toBeNull();
    const servicio = clienteServicio();
    const { data: r } = await servicio
      .from("candidatura_reuniones")
      .select("estado, propuesta_de, nota_candidata")
      .eq("id", id)
      .single();
    expect(r).toEqual({ estado: "contrapropuesta", propuesta_de: "candidata", nota_candidata: "Por la tarde nos va mejor" });
    const { data: avisos } = await servicio.from("avisos").select("tipo").eq("candidatura_id", c.id);
    expect(avisos).toEqual([{ tipo: "reunion_contrapropuesta" }]);
  });

  it("lo que cada estado pide lo exige la base, también sin sesión", async () => {
    const { id, franjas } = await propuesta();
    const servicio = clienteServicio();
    const sinElegida = await servicio.from("candidatura_reuniones").update({ estado: "confirmada" }).eq("id", id);
    expect(sinElegida.error?.message).toMatch(/franja elegida/);
    const otra = await servicio
      .from("candidatura_reuniones")
      .update({ estado: "confirmada", elegida: dentro(200) })
      .eq("id", id);
    expect(otra.error?.message).toMatch(/no es una de las propuestas/);
    const sinMotivo = await servicio.from("candidatura_reuniones").update({ estado: "cancelada" }).eq("id", id);
    expect(sinMotivo.error?.message).toMatch(/lleva su motivo/);
    const sinEnlace = await servicio.from("candidatura_reuniones").update({ enlace: "" }).eq("id", id);
    expect(sinEnlace.error?.message).toMatch(/lleva su enlace/);
    expect(
      (await servicio.from("candidatura_reuniones").update({ estado: "confirmada", elegida: franjas[0] }).eq("id", id)).error,
    ).toBeNull();

    // Confirmada, cambiarla —volver a propuesta— también lleva su motivo
    const cambioSinMotivo = await servicio
      .from("candidatura_reuniones")
      .update({ estado: "propuesta", elegida: null, cambiada_motivo: " " })
      .eq("id", id);
    expect(cambioSinMotivo.error?.message).toMatch(/Cambiar una reunión confirmada lleva su motivo/);
    expect(
      (
        await servicio
          .from("candidatura_reuniones")
          .update({ estado: "propuesta", elegida: null, cambiada_motivo: "Quien iba de IWL no puede." })
          .eq("id", id)
      ).error,
    ).toBeNull();
  });

  it("caducada —todas las fechas pasadas sin elegir—, un aviso a IWL, una sola vez", async () => {
    const { c } = await propuesta([dentro(-48), dentro(-24)]);
    const servicio = clienteServicio();
    expect((await servicio.rpc("avisar_reuniones_caducadas")).error).toBeNull();
    await servicio.rpc("avisar_reuniones_caducadas");
    const { data: avisos } = await servicio.from("avisos").select("tipo").eq("candidatura_id", c.id);
    expect(avisos).toEqual([{ tipo: "reunion_caducada" }]);
    // Y nadie con sesión lo dispara
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    expect((await equipo.rpc("avisar_reuniones_caducadas")).error).not.toBeNull();
  });
});
