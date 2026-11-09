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
