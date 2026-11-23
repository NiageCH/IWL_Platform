import { test, type Locator, type Page } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  crearCuenta,
  entrarComo,
  insertar,
  llamar,
} from "../e2e/entrada";

/**
 * Las capturas del bloque 5 para que Rodrigo lo revise antes de construir
 * el resto (REVISION, 23 nov): el diagnóstico de una idea, «Lo que ya
 * tenéis» de una compañía facturando, el asistente en «ajustar» y el
 * seguimiento con un tramo a medias. En claro y en oscuro.
 *
 * El área de trabajo no tiene modo oscuro: va siempre en claro, y lo
 * oscuro es la marca. La versión oscura es la misma pantalla con los tokens
 * oscuros, para ver que se sostiene. Crea dos compañías y las borra.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const DIR = "docs/constancia";
const SELLO = Date.now();

async function nacer(nombre: string, estadio: string) {
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre,
    contacto_nombre: "Fundadora",
    contacto_apellidos: "De Demostración",
    contacto_email: `capturas.${estadio}.${SELLO}@ejemplo.test`,
    estado: "preseleccionada",
    estado_verificado: estadio,
    situacion_societaria: "sin_constituir",
  });
  const [admin] = await consultar<{ id: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "id");
  await llamar("registrar_nda_externo", {
    p_candidatura: c.id,
    p_profile: admin.id,
    p_firmado_on: "2026-11-01",
    p_documento: null,
    p_url: "https://ejemplo.test/nda.pdf",
  });
  const [con] = await consultar<{ company_id: string }>("candidaturas", { id: `eq.${c.id}` }, "company_id");
  const [co] = await consultar<{ slug: string }>("companies", { id: `eq.${con.company_id}` }, "slug");
  await actualizar("companies", { id: `eq.${con.company_id}` }, { situacion_societaria: "sin_constituir" });
  return { candidatura: c.id, compania: con.company_id, slug: co.slug };
}

async function hitos(tramo: number) {
  return consultar<{ id: string; order_index: number }>(
    "roadmap_template_milestones",
    { "roadmap_template_stages.tramo": `eq.${tramo}`, order: "order_index" },
    "id,order_index,roadmap_template_stages!inner(tramo)",
  );
}

type Respuesta = "verificado" | "por_verificar" | "no_basta" | "todavia_no" | null;

async function contestar(compania: string, tramo: number, respuestas: Respuesta[]) {
  const lista = await hitos(tramo);
  for (let i = 0; i < respuestas.length; i++) {
    const r = respuestas[i];
    if (!r) continue;
    const si = r !== "todavia_no";
    await insertar("entry_checks", {
      company_id: compania,
      template_milestone_id: lista[i].id,
      answer: si ? "si" : "no",
      evidence_path: si ? `${compania}/evidencia/demo/${tramo}-${i + 1}.pdf` : null,
      evidence_name: si ? `Evidencia ${tramo}.${i + 1}.pdf` : null,
      verification: r === "verificado" ? "verificado" : r === "no_basta" ? "no_basta" : null,
      review_comment: r === "no_basta" ? "Son tres entrevistas: hacen falta al menos diez con quien firma la compra." : null,
      verified_at: r === "verificado" || r === "no_basta" ? new Date().toISOString() : null,
    });
  }
}

/** La misma pantalla en claro y en oscuro: cambiando el tema de su marco */
async function capturar(page: Page, zona: Locator, nombre: string) {
  const dispositivo = test.info().project.name;
  await zona.scrollIntoViewIfNeeded();
  await zona.screenshot({ path: `${DIR}/IWL_HojaDeRuta_${nombre}_${dispositivo}_claro.png` });
  await page.evaluate(() => {
    document.querySelectorAll('[data-tema="claro"]').forEach((e) => e.setAttribute("data-tema", "oscuro"));
  });
  await zona.screenshot({ path: `${DIR}/IWL_HojaDeRuta_${nombre}_${dispositivo}_oscuro.png` });
}

test("las cuatro pantallas del bloque 5", async ({ page }) => {
  test.setTimeout(180_000);
  const idea = await nacer(`Brezo Analítica ${SELLO}`, "idea");
  const factura = await nacer(`Cardo Logística ${SELLO}`, "facturando");
  const correo = `capturas.ella.${SELLO}.${test.info().project.name}@ejemplo.test`;
  try {
    // 1. El diagnóstico de una idea, visto por ella, a medio contestar
    await contestar(idea.compania, 1, ["verificado", "no_basta", "por_verificar", "todavia_no", null]);
    const ella = await crearCuenta(correo);
    await actualizar("profiles", { id: `eq.${ella}` }, { role: "fundadora", full_name: "Fundadora" });
    await insertar("company_members", { company_id: idea.compania, profile_id: ella, member_role: "fundadora" });
    await entrarComo(page, correo, "/proyecto");
    await capturar(page, page.locator("#lista-entrada"), "1_Diagnostico_idea");

    // 2. «Lo que ya tenéis» de una compañía facturando, vista por IWL para verificar
    await contestar(factura.compania, 1, ["verificado", "verificado", "verificado", "todavia_no", "verificado"]);
    await contestar(factura.compania, 2, ["verificado", "por_verificar", "no_basta"]);
    await contestar(factura.compania, 3, ["verificado", "por_verificar", "todavia_no"]);
    await entrarComo(page, USUARIOS.admin, `/cartera/${factura.slug}`);
    await capturar(page, page.locator("#lista-entrada"), "2_LoQueYaTeneis_facturando");

    // 3. El asistente en el paso «ajustar», con la hoja de ruta generada
    await page.goto(`/cartera/${factura.slug}/programa`);
    await page.locator("#asistente-hoja input[name='inicio']").fill("2026-12-01");
    await page.locator("#asistente-hoja").getByRole("button", { name: "Generar la hoja de ruta" }).click();
    await page.locator("#asistente-hoja").getByText("Tramo 4 · De facturación a invertible").waitFor();
    await capturar(page, page.locator("#asistente-hoja"), "3_Asistente_ajustar");

    // 4. El seguimiento con un tramo a medias: Raíz, en su tramo 4
    await entrarComo(page, "fundadora@raiz.test", "/proyecto/ruta");
    await capturar(page, page.locator("#seguimiento"), "4_Seguimiento_tramo_a_medias");
  } finally {
    for (const c of [idea, factura]) {
      await borrar("candidaturas", { id: c.candidatura });
      await borrar("companies", { id: c.compania });
    }
    await borrarCuenta(correo);
  }
});
