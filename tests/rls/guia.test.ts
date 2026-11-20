import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, clienteServicio, entrarComo } from "./clientes";

/**
 * La guía se abre sola la primera vez (REVISION, 13 nov). Cada persona
 * marca solo la suya, y solo una vez. Se restaura lo que había.
 */

const servicio = clienteServicio();
let ella: SupabaseClient;
let ellaId = "";
let otraId = "";
const antes = new Map<string, string | null>();

beforeAll(async () => {
  ella = await entrarComo(USUARIOS.fundadoraMarea);
  ellaId = (await ella.auth.getUser()).data.user!.id;
  const { data: otra } = await servicio.from("profiles").select("id").eq("email", USUARIOS.admin).single();
  otraId = otra!.id;
  const { data } = await servicio.from("profiles").select("id, guia_vista_at").in("id", [ellaId, otraId]);
  for (const p of data ?? []) antes.set(p.id, p.guia_vista_at);
  await servicio.from("profiles").update({ guia_vista_at: null }).in("id", [ellaId, otraId]);
});

afterAll(async () => {
  for (const [id, valor] of antes) await servicio.from("profiles").update({ guia_vista_at: valor }).eq("id", id);
});

describe("la guía vista", () => {
  it("cada una marca la suya, una vez; la de otra no la toca", async () => {
    expect((await ella.rpc("marcar_guia_vista")).error).toBeNull();
    const { data: suya } = await servicio.from("profiles").select("guia_vista_at").eq("id", ellaId).single();
    expect(suya!.guia_vista_at).not.toBeNull();
    const { data: otra } = await servicio.from("profiles").select("guia_vista_at").eq("id", otraId).single();
    expect(otra!.guia_vista_at).toBeNull();

    // La segunda vez no la mueve
    await ella.rpc("marcar_guia_vista");
    const { data: luego } = await servicio.from("profiles").select("guia_vista_at").eq("id", ellaId).single();
    expect(luego!.guia_vista_at).toBe(suya!.guia_vista_at);
  });
});
