import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completarNda } from "@/lib/nda-texto";
import { USUARIOS, clienteAnonimo, clienteServicio, entrarComo } from "./clientes";

/**
 * Presentarse (REVISION, 22 nov · bloques 2 y 3): el NDA primero, con una
 * casilla; después la candidatura, y el filtro al enviarla.
 *
 * Aceptar y enviar van con la clave de servicio, como firmar el NDA: la IP
 * y el navegador los sabe el servidor. Lo que se prueba aquí es que nadie
 * más puede llamarlas, que la base aplica las reglas por su cuenta y que lo
 * que no pasa el filtro no avanza.
 *
 * Crea sus candidaturas y las borra; la convocatoria la deja como estaba.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();
const servicio = clienteServicio();
const creadas: string[] = [];
let convocatoriaAntes: { convocatoria_abierta: boolean; convocatoria_cierra: string | null } | null = null;
let plantilla: { id: string; texto: string } | null = null;

const SOCIAS = [
  { nombre: "Ana", pct: 60, mujer: true },
  { nombre: "Bea", pct: 40, mujer: false },
];

async function aceptar(correo: string) {
  const texto = completarNda(plantilla!.texto, {
    startup: `RLS Presentarse ${SELLO}`,
    contraparte_nombre: "Ana Prueba",
    lugar: "Málaga",
    es_sociedad: false,
    documento: "00000000T",
    domicilio: "Calle de Prueba 1, Málaga",
  });
  const r = await servicio
    .rpc("aceptar_nda", {
      p_startup: `RLS Presentarse ${SELLO}`,
      p_nombre: "Ana",
      p_apellidos: "Prueba",
      p_correo: correo,
      p_plantilla: plantilla!.id,
      p_texto: texto,
      p_datos: { es_sociedad: false },
      p_ip: "203.0.113.7",
      p_ua: "prueba",
    })
    .single<{ candidatura_id: string; token: string }>();
  if (r.data) creadas.push(r.data.candidatura_id);
  return r;
}

async function prueba(candidaturaId: string) {
  const { data } = await servicio
    .from("candidatura_documentos")
    .insert({ candidatura_id: candidaturaId, nombre: "Prueba", storage_path: `${candidaturaId}/prueba/x.pdf` })
    .select("id")
    .single();
  return data!.id;
}

function enviar(token: string, cambios: Partial<Record<string, unknown>> = {}) {
  return servicio
    .rpc("enviar_candidatura", {
      p_token: token,
      p_sector: "HealthTech",
      p_sector_otro: "",
      p_one_liner: "Una frase de prueba que dice qué hace.",
      p_website: "",
      p_estadio: "mvp_sin_piloto",
      p_socios: SOCIAS,
      p_prueba: null as unknown as string,
      p_recomendada: null as unknown as string,
      ...cambios,
    })
    .single<{ filtro: string; motivo: string | null }>();
}

beforeAll(async () => {
  const { data: c } = await servicio.from("cohorts").select("convocatoria_abierta, convocatoria_cierra").eq("id", COHORTE).single();
  convocatoriaAntes = c;
  await servicio.from("cohorts").update({ convocatoria_abierta: true, convocatoria_cierra: null }).eq("id", COHORTE);
  const { data: p } = await servicio
    .from("nda_plantillas")
    .select("id, texto")
    .is("candidatura_id", null)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  plantilla = p;
});

afterAll(async () => {
  if (creadas.length) await servicio.from("candidaturas").delete().in("id", creadas);
  if (convocatoriaAntes) await servicio.from("cohorts").update(convocatoriaAntes).eq("id", COHORTE);
});

describe("aceptar el NDA", () => {
  it("nadie sin la clave de servicio puede aceptar ni enviar, ni presentarse por la puerta vieja", async () => {
    const anonimo = clienteAnonimo();
    expect((await anonimo.rpc("aceptar_nda", {} as never)).error).not.toBeNull();
    expect((await anonimo.rpc("enviar_candidatura", {} as never)).error).not.toBeNull();
    expect((await anonimo.rpc("presentar_candidatura" as never, { p_nombre: "x" } as never)).error).not.toBeNull();
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    expect((await fundadora.rpc("aceptar_nda", {} as never)).error).not.toBeNull();
  });

  it("nace la candidatura en borrador, con la aceptación registrada y sin contrafirma", async () => {
    const { data, error } = await aceptar(`rls.presentarse.${SELLO}@ejemplo.test`);
    expect(error).toBeNull();
    const { data: c } = await servicio.from("candidaturas").select("estado, company_id, filtro").eq("id", data!.candidatura_id).single();
    expect(c).toEqual({ estado: "borrador", company_id: null, filtro: null });
    const { data: f } = await servicio
      .from("nda_firmas")
      .select("modo, texto_hash, firmado_ip, contrafirmado_at, plantilla_id")
      .eq("candidatura_id", data!.candidatura_id)
      .single();
    expect(f).toMatchObject({ modo: "casilla", firmado_ip: "203.0.113.7", contrafirmado_at: null, plantilla_id: plantilla!.id });
    expect(f!.texto_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("con huecos en el texto no se acepta, y el mismo correo no se presenta dos veces", async () => {
    const sinDatos = await servicio.rpc("aceptar_nda", {
      p_startup: "x",
      p_nombre: "Ana",
      p_apellidos: "Prueba",
      p_correo: `rls.huecos.${SELLO}@ejemplo.test`,
      p_plantilla: plantilla!.id,
      p_texto: plantilla!.texto,
      p_datos: {},
      p_ip: "",
      p_ua: "",
    });
    expect(sinDatos.error?.message).toMatch(/le falta un dato/);
    const otra = await aceptar(`rls.presentarse.${SELLO}@ejemplo.test`);
    expect(otra.error?.code).toBe("23505");
  });
});

describe("enviar la candidatura y el filtro", () => {
  it("sin prueba del estadio no se envía; con ella y más del 50 % de mujeres, pasa y avisa a IWL", async () => {
    const { data } = await aceptar(`rls.pasa.${SELLO}@ejemplo.test`);
    expect((await enviar(data!.token)).error?.message).toMatch(/prueba del estadio/);

    const doc = await prueba(data!.candidatura_id);
    const { data: r, error } = await enviar(data!.token, { p_prueba: doc });
    expect(error).toBeNull();
    expect(r).toEqual({ filtro: "pasa", motivo: null });
    const { data: c } = await servicio
      .from("candidaturas")
      .select("estado, liderazgo_femenino_pct, enviada_at")
      .eq("id", data!.candidatura_id)
      .single();
    expect(c!.estado).toBe("presentada");
    expect(Number(c!.liderazgo_femenino_pct)).toBe(60);
    const { data: avisos } = await servicio.from("avisos").select("tipo").eq("candidatura_id", data!.candidatura_id);
    expect(avisos!.map((a) => a.tipo)).toEqual(["candidatura_nueva"]);

    // Enviada, ya no se vuelve a enviar
    expect((await enviar(data!.token, { p_prueba: doc })).error?.message).toMatch(/ya está enviada/);
  });

  it("los socios tienen que sumar el 100 %", async () => {
    const { data } = await aceptar(`rls.suma.${SELLO}@ejemplo.test`);
    const doc = await prueba(data!.candidatura_id);
    const { error } = await enviar(data!.token, { p_prueba: doc, p_socios: [{ nombre: "Ana", pct: 70, mujer: true }] });
    expect(error?.message).toMatch(/sumar el 100 %/);
  });

  describe("lo que no pasa no avanza, salvo que dirección lo saque", () => {
    let id = "";
    let equipo: SupabaseClient;
    let direccion: SupabaseClient;

    beforeAll(async () => {
      const { data } = await aceptar(`rls.nopasa.${SELLO}@ejemplo.test`);
      id = data!.candidatura_id;
      const doc = await prueba(id);
      const { data: r } = await enviar(data!.token, {
        p_prueba: doc,
        p_socios: [
          { nombre: "Ana", pct: 50, mujer: true },
          { nombre: "Carlos", pct: 50, mujer: false },
        ],
      });
      expect(r!.filtro).toBe("no_pasa");
      expect(r!.motivo).toMatch(/más del 50 % del capital en manos de mujeres.*el 50 %/);
      equipo = await entrarComo(USUARIOS.equipoIwl);
      direccion = await entrarComo(USUARIOS.admin);
    });

    it("no se mueve a revisión, ni con la clave de servicio", async () => {
      const { error } = await servicio.from("candidaturas").update({ estado: "en_revision" }).eq("id", id);
      expect(error?.message).toMatch(/no ha pasado el filtro/);
    });

    it("el equipo no la saca; dirección sí, con motivo, y entonces avanza", async () => {
      expect((await equipo.rpc("decidir_filtro", { p_candidatura: id, p_pasa: true, p_motivo: "Lo vemos con el pacto de socios." })).error).not.toBeNull();
      expect((await direccion.rpc("decidir_filtro", { p_candidatura: id, p_pasa: true, p_motivo: "corto" })).error?.message).toMatch(/motivo/);
      expect((await direccion.rpc("decidir_filtro", { p_candidatura: id, p_pasa: true, p_motivo: "El pacto da el control a las socias." })).error).toBeNull();
      const { data: c } = await servicio.from("candidaturas").select("filtro, filtro_decision_motivo").eq("id", id).single();
      expect(c).toEqual({ filtro: "pasa", filtro_decision_motivo: "El pacto da el control a las socias." });
      expect((await equipo.from("candidaturas").update({ estado: "en_revision" }).eq("id", id)).error).toBeNull();
    });
  });

  it("un sector de fuera va a revisión manual, y el equipo la resuelve", async () => {
    const { data } = await aceptar(`rls.manual.${SELLO}@ejemplo.test`);
    const doc = await prueba(data!.candidatura_id);
    const { data: r } = await enviar(data!.token, { p_prueba: doc, p_sector: "Otro", p_sector_otro: "FinTech" });
    expect(r!.filtro).toBe("revision_manual");
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { error } = await equipo.rpc("decidir_filtro", {
      p_candidatura: data!.candidatura_id,
      p_pasa: false,
      p_motivo: "FinTech queda fuera de esta convocatoria.",
    });
    expect(error).toBeNull();
    const { data: c } = await servicio.from("candidaturas").select("filtro, filtro_motivo").eq("id", data!.candidatura_id).single();
    expect(c).toEqual({ filtro: "no_pasa", filtro_motivo: "FinTech queda fuera de esta convocatoria." });
  });

  it("una idea espera a que confirme quien la recomienda, y solo esa persona puede", async () => {
    const { data: equipoPerfil } = await servicio.from("profiles").select("id").eq("email", USUARIOS.equipoIwl).single();
    const { data } = await aceptar(`rls.idea.${SELLO}@ejemplo.test`);
    // Sin recomendación, una idea no se envía
    expect((await enviar(data!.token, { p_estadio: "idea" })).error?.message).toMatch(/quién del equipo de IWL/);
    const { data: r } = await enviar(data!.token, { p_estadio: "idea", p_recomendada: equipoPerfil!.id });
    expect(r!.filtro).toBe("espera_recomendacion");
    const { data: avisos } = await servicio.from("avisos").select("tipo, para").eq("candidatura_id", data!.candidatura_id);
    expect(avisos).toEqual([{ tipo: "recomendacion_pendiente", para: equipoPerfil!.id }]);

    const direccion = await entrarComo(USUARIOS.admin);
    expect((await direccion.rpc("responder_recomendacion", { p_candidatura: data!.candidatura_id, p_confirma: true })).error?.message).toMatch(/no es tuya/);

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    expect((await equipo.rpc("responder_recomendacion", { p_candidatura: data!.candidatura_id, p_confirma: true })).error).toBeNull();
    const { data: c } = await servicio.from("candidaturas").select("filtro, recomendacion").eq("id", data!.candidatura_id).single();
    expect(c).toEqual({ filtro: "pasa", recomendacion: "confirmada" });
  });

  it("quien se presenta solo ve el nombre de quien puede recomendar", async () => {
    const { data } = await clienteAnonimo().rpc("personas_que_recomiendan");
    expect(data!.length).toBeGreaterThan(0);
    expect(Object.keys(data![0]).sort()).toEqual(["id", "nombre"]);
  });
});

/**
 * «Otro» no se salta las demás reglas (REVISION, 22 nov). Primero el
 * capital, el estadio y la prueba o la recomendación; solo con todo eso
 * bien, un sector de fuera va a revisión manual. Las dos primeras se miran
 * en la función pura, por SQL directo: enviar ya pide la prueba y la
 * recomendación antes de llegar al filtro.
 */
describe("«Otro» no se salta las demás reglas", () => {
  async function filtro(estadio: string, prueba: boolean, recomendada: boolean) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres", {
      max: 1,
      onnotice: () => {},
    });
    try {
      const [fila] = await sql`
        select filtro from app.filtro_candidatura(
          'Otro', ${estadio}::estado_entrada, '[{"nombre":"Ana","pct":100,"mujer":true}]'::jsonb,
          ${prueba ? "00000000-0000-0000-0000-000000000001" : null}::uuid,
          ${recomendada ? "00000000-0000-0000-0000-000000000002" : null}::uuid)`;
      return fila.filtro as string;
    } finally {
      await sql.end();
    }
  }

  it("una idea de «Otro» sin recomendación no pasa", async () => {
    expect(await filtro("idea", false, false)).toBe("no_pasa");
  });

  it("un MVP de «Otro» sin prueba no pasa", async () => {
    expect(await filtro("mvp_sin_piloto", false, false)).toBe("no_pasa");
    expect(await filtro("mvp_sin_piloto", true, false)).toBe("revision_manual");
  });

  it("una idea de «Otro» espera la recomendación, y confirmada va a revisión manual, no a «pasa»", async () => {
    const { data: equipoPerfil } = await servicio.from("profiles").select("id").eq("email", USUARIOS.equipoIwl).single();
    const { data } = await aceptar(`rls.idea.otro.${SELLO}@ejemplo.test`);
    const { data: r } = await enviar(data!.token, {
      p_estadio: "idea",
      p_sector: "Otro",
      p_sector_otro: "FinTech",
      p_recomendada: equipoPerfil!.id,
    });
    expect(r!.filtro).toBe("espera_recomendacion");

    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { data: tras, error } = await equipo.rpc("responder_recomendacion", {
      p_candidatura: data!.candidatura_id,
      p_confirma: true,
    });
    expect(error).toBeNull();
    expect(tras).toBe("revision_manual");
    const { data: c } = await servicio
      .from("candidaturas")
      .select("filtro, recomendacion")
      .eq("id", data!.candidatura_id)
      .single();
    expect(c).toEqual({ filtro: "revision_manual", recomendacion: "confirmada" });
    // Y llega a IWL para revisarla a mano
    const { data: avisos } = await servicio
      .from("avisos")
      .select("tipo")
      .eq("candidatura_id", data!.candidatura_id)
      .is("cerrado_at", null);
    expect(avisos!.map((a) => a.tipo)).toEqual(["candidatura_nueva"]);
  });
});
