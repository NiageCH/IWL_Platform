import { beforeAll, describe, expect, it } from "vitest";
import { USUARIOS, clienteAnonimo, clienteServicio, entrarComo } from "./clientes";

/**
 * Quién ve el embudo de selección.
 *
 * Aquí hay nombres de startups que no entraron y los motivos por los que se
 * descartaron. Eso no sale del equipo de IWL: ni una fundadora, ni un
 * revisor de Niage, ni desde luego quien no ha entrado.
 *
 * Y la otra mitad: el formulario público tiene que poder escribir una
 * candidatura sin cuenta, y solo eso.
 */

const CORREO_PRUEBA = `rls.candidatura.${Date.now()}@ejemplo.test`;

describe("el embudo solo lo ve IWL", () => {
  it("la dirección ve las candidaturas", async () => {
    const iwl = await entrarComo(USUARIOS.admin);
    const { data } = await iwl.from("candidaturas").select("id, nombre");
    expect(data?.length ?? 0).toBeGreaterThan(0);
  });

  it("el equipo de IWL también", async () => {
    const equipo = await entrarComo(USUARIOS.equipoIwl);
    const { data } = await equipo.from("candidaturas").select("id");
    expect(data?.length ?? 0).toBeGreaterThan(0);
  });

  it("una fundadora no ve ninguna", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data } = await fundadora.from("candidaturas").select("id");
    expect(data).toEqual([]);
  });

  it("un revisor de Niage tampoco", async () => {
    /*
     * Niage hace el due diligence técnico de las compañías que ya están
     * dentro. A quién se descartó en comité no tiene por qué llegarle.
     */
    const revisor = await entrarComo(USUARIOS.revisorMareaRaiz);
    const { data } = await revisor.from("candidaturas").select("id");
    expect(data).toEqual([]);
  });

  it("quien no ha entrado, menos todavía", async () => {
    const anonimo = clienteAnonimo();
    const { data } = await anonimo.from("candidaturas").select("id");
    expect(data ?? []).toEqual([]);
  });

  it("una fundadora no puede escribir una", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { error } = await fundadora.from("candidaturas").insert({
      cohort_id: "00000000-0000-0000-0003-000000000001",
      nombre: "Intento",
      contacto_nombre: "Alguien",
      contacto_email: "alguien@ejemplo.test",
    });
    expect(error).not.toBeNull();
  });

  it("los motivos de descarte tampoco se filtran por los eventos", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { data } = await fundadora.from("candidatura_eventos").select("id");
    expect(data).toEqual([]);
  });
});

describe("el formulario público", () => {
  beforeAll(async () => {
    // La convocatoria tiene que estar abierta para que admita nada
    await clienteServicio()
      .from("cohorts")
      .update({ convocatoria_abierta: true, convocatoria_cierra: null })
      .eq("id", "00000000-0000-0000-0003-000000000001");
  });

  it("alguien sin cuenta puede presentarse", async () => {
    const anonimo = clienteAnonimo();
    const { data, error } = await anonimo.rpc("presentar_candidatura", {
      p_nombre: "Candidata Anónima",
      p_contacto_nombre: "Quien Sea",
      p_contacto_email: CORREO_PRUEBA,
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("y la que crea nace en el primer paso, no donde quiera", async () => {
    /*
     * Esto es lo que de verdad protege el formulario. La función recibe solo
     * los campos del formulario: el estado, la cohorte y las fechas las pone
     * ella. Si fuese un `insert` con política para `anon`, cualquiera con la
     * clave pública —que va en el navegador— podría darse de alta ya
     * preseleccionada, o con un equity pactado.
     */
    const servicio = clienteServicio();
    const { data } = await servicio
      .from("candidaturas")
      .select("estado, equity_pct, company_id")
      .eq("contacto_email", CORREO_PRUEBA)
      .single();

    expect(data?.estado).toBe("presentada");
    expect(data?.equity_pct).toBeNull();
    expect(data?.company_id).toBeNull();
  });

  it("no puede leer lo que ha escrito, ni lo de nadie", async () => {
    const anonimo = clienteAnonimo();
    const { data } = await anonimo
      .from("candidaturas")
      .select("id")
      .eq("contacto_email", CORREO_PRUEBA);
    expect(data ?? []).toEqual([]);
  });

  it("el mismo correo no se presenta dos veces a la misma convocatoria", async () => {
    const anonimo = clienteAnonimo();
    const { error } = await anonimo.rpc("presentar_candidatura", {
      p_nombre: "Candidata Anónima Otra Vez",
      p_contacto_nombre: "Quien Sea",
      p_contacto_email: CORREO_PRUEBA,
    });
    expect(error).not.toBeNull();
  });

  it("con la convocatoria cerrada no admite nada", async () => {
    await clienteServicio()
      .from("cohorts")
      .update({ convocatoria_abierta: false })
      .eq("id", "00000000-0000-0000-0003-000000000001");

    const anonimo = clienteAnonimo();
    const { error } = await anonimo.rpc("presentar_candidatura", {
      p_nombre: "Fuera de plazo",
      p_contacto_nombre: "Quien Sea",
      p_contacto_email: `tarde.${Date.now()}@ejemplo.test`,
    });

    expect(error?.message).toMatch(/convocatoria abierta/i);
  });

  it("y la convocatoria que se enseña no cuenta lo que no es asunto suyo", async () => {
    /*
     * `cohorts` lleva el objetivo de invertibles de la cohorte. Quien se
     * presenta ve el nombre, la fecha de cierre y el texto, y nada más.
     */
    await clienteServicio()
      .from("cohorts")
      .update({ convocatoria_abierta: true })
      .eq("id", "00000000-0000-0000-0003-000000000001");

    const anonimo = clienteAnonimo();
    const { data } = await anonimo.rpc("convocatoria_abierta");
    const fila = (data as Record<string, unknown>[])?.[0];

    expect(Object.keys(fila ?? {}).sort()).toEqual(["cierra", "nombre", "texto"]);

    const directo = await anonimo.from("cohorts").select("investable_target");
    expect(directo.data ?? []).toEqual([]);
  });
});

describe("firmar", () => {
  it("una fundadora no puede firmar una candidatura", async () => {
    const fundadora = await entrarComo(USUARIOS.fundadoraMarea);
    const { error } = await fundadora.rpc("firmar_candidatura", {
      p_candidatura: "00000000-0000-0000-0005-000000000005",
      p_slug: "intento-fundadora",
      p_stage: "pre_semilla",
      p_tech_profile: "software",
    });
    expect(error).not.toBeNull();
  });
});

describe("qué ve la candidata", () => {
  /*
   * Las dos puertas: el enlace privado mientras no tiene cuenta, y la sesión
   * desde que firma el NDA. Lo que importa aquí es lo que NO se enseña.
   */

  it("el enlace privado deja ver el estado, pero en cuatro momentos", async () => {
    const servicio = clienteServicio();
    const { data: c } = await servicio
      .from("candidaturas")
      .select("token")
      .eq("id", "00000000-0000-0000-0005-000000000004") // en comité
      .single();

    const anonimo = clienteAnonimo();
    const { data } = await anonimo.rpc("ver_candidatura", {
      p_token: c!.token,
    });
    const vista = (data as Record<string, unknown>[])?.[0];

    /*
     * Está en comité, pero se le dice «en estudio». El punto exacto del
     * proceso interno no le aporta nada y sí invita a interpretar silencios.
     */
    expect(vista?.momento).toBe("en_estudio");
    expect(vista?.nombre).toBe("Ámbar Educación");
  });

  it("y no deja ver nada de lo que es asunto de IWL", async () => {
    const servicio = clienteServicio();
    const { data: c } = await servicio
      .from("candidaturas")
      .select("token")
      .eq("id", "00000000-0000-0000-0005-000000000004")
      .single();

    const anonimo = clienteAnonimo();
    const { data } = await anonimo.rpc("ver_candidatura", {
      p_token: c!.token,
    });
    const vista = (data as Record<string, unknown>[])?.[0] ?? {};

    // Ni el equity, ni las notas, ni el estado interno, ni el correo
    expect(Object.keys(vista).sort()).toEqual([
      "convocatoria",
      "enlaces",
      "id",
      "momento",
      "nombre",
      "presentada_on",
      "puede_subir",
    ]);
  });

  it("una descartada no lee su motivo de descarte", async () => {
    /*
     * El motivo está escrito para decidir, no para comunicar. Decírselo es
     * una conversación, no un campo de una pantalla.
     */
    const servicio = clienteServicio();
    const { data: c } = await servicio
      .from("candidaturas")
      .select("token, descartada_motivo")
      .eq("id", "00000000-0000-0000-0005-000000000006")
      .single();

    expect(c!.descartada_motivo).toBeTruthy();

    const anonimo = clienteAnonimo();
    const { data } = await anonimo.rpc("ver_candidatura", {
      p_token: c!.token,
    });
    const vista = (data as Record<string, unknown>[])?.[0];

    expect(vista?.momento).toBe("cerrada");
    expect(vista?.puede_subir).toBe(false);
    expect(JSON.stringify(vista)).not.toContain("perfil técnico");
  });

  it("un testigo inventado no devuelve nada", async () => {
    const anonimo = clienteAnonimo();
    const { data } = await anonimo.rpc("ver_candidatura", {
      p_token: "esto-no-es-un-testigo-de-verdad-aaaa",
    });
    expect(data ?? []).toEqual([]);
  });

  it("con el enlace se puede añadir material, y solo eso", async () => {
    const servicio = clienteServicio();
    const { data: c } = await servicio
      .from("candidaturas")
      .select("token")
      .eq("id", "00000000-0000-0000-0005-000000000001")
      .single();

    const anonimo = clienteAnonimo();
    const { error: fallo } = await anonimo.rpc("anadir_enlace_con_token", {
      p_token: c!.token,
      p_titulo: "Pitch actualizado",
      p_url: "https://drive.test/nuevo",
    });
    expect(fallo).toBeNull();

    /*
     * Pero no puede tocar la candidatura.
     *
     * Y lo que se comprueba es el efecto, no el error: una escritura que RLS
     * no deja pasar afecta a cero filas, y eso PostgREST lo devuelve como
     * correcto. Esperar un error aquí daba un test que pasaba por el motivo
     * equivocado el día que la política desapareciera.
     */
    await anonimo
      .from("candidaturas")
      .update({ estado: "preseleccionada" })
      .eq("id", "00000000-0000-0000-0005-000000000001");

    const { data: despues } = await servicio
      .from("candidaturas")
      .select("estado")
      .eq("id", "00000000-0000-0000-0005-000000000001")
      .single();
    expect(despues?.estado).toBe("presentada");

    await servicio
      .from("candidatura_enlaces")
      .delete()
      .eq("url", "https://drive.test/nuevo");
  });

  it("una dirección que no es http no entra", async () => {
    const servicio = clienteServicio();
    const { data: c } = await servicio
      .from("candidaturas")
      .select("token")
      .eq("id", "00000000-0000-0000-0005-000000000001")
      .single();

    const anonimo = clienteAnonimo();
    const { error: fallo } = await anonimo.rpc("anadir_enlace_con_token", {
      p_token: c!.token,
      p_titulo: "Trampa",
      p_url: "javascript:alert(1)",
    });
    expect(fallo).not.toBeNull();
  });

  it("al darle cuenta, el enlace deja de valer", async () => {
    /*
     * Es la razón de pasar de enlace a cuenta: una dirección se reenvía y no
     * se puede retirar, y a partir del NDA lo que entrega es sensible.
     */
    const servicio = clienteServicio();
    const candidatura = "00000000-0000-0000-0005-000000000005"; // en NDA

    const { data: antes } = await servicio
      .from("candidaturas")
      .select("token")
      .eq("id", candidatura)
      .single();

    const anonimo = clienteAnonimo();
    const { data: visible } = await anonimo.rpc("ver_candidatura", {
      p_token: antes!.token,
    });
    expect((visible as unknown[])?.length).toBe(1);

    // Se le da cuenta, con el camino que usa la aplicación
    const iwl = await entrarComo(USUARIOS.admin);
    const { data: perfil } = await servicio
      .from("profiles")
      .select("id")
      .eq("email", "fundadora@raiz.test")
      .single();

    const { error: fallo } = await iwl.rpc("dar_acceso_candidatura", {
      p_candidatura: candidatura,
      p_profile: perfil!.id,
    });
    expect(fallo).toBeNull();

    const { data: despues } = await anonimo.rpc("ver_candidatura", {
      p_token: antes!.token,
    });
    expect(despues ?? []).toEqual([]);

    // Se deja como estaba
    await servicio
      .from("candidaturas")
      .update({ profile_id: null, token_anulado_at: null })
      .eq("id", candidatura);
    await servicio
      .from("profiles")
      .update({ role: "fundadora" })
      .eq("id", perfil!.id);
  });
});
