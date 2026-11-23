import { type Page, test } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, consultar, entrarComo } from "../e2e/entrada";

/**
 * La pestaña Hoja de ruta de una compañía, con el patrón de Administración
 * (REVISION, 23 nov): una en idea (Vega) y otra facturando (Raíz), en
 * escritorio y en móvil, como la ve dirección. En escritorio, también el
 * menú de un hito y el panel de añadir. CAPTURA=antes o CAPTURA=despues.
 */

const DIR = "docs/constancia";
const FASE = process.env.CAPTURA ?? "despues";
const CASOS = [
  { slug: "vega-predictiva", id: COMPANIAS.vega, nombre: "idea" },
  { slug: "raiz-sensorica", id: COMPANIAS.raiz, nombre: "facturando" },
];

/**
 * Vega, la de idea, no trae hoja de ruta en la semilla. Si no la tiene, se
 * le genera como lo haría el equipo, desde el asistente, y se le quita al
 * acabar: se deja como se encontró.
 */
async function asegurarHoja(page: Page, slug: string, id: string): Promise<boolean> {
  const etapas = await consultar("roadmap_stages", { company_id: `eq.${id}` }, "id");
  if (etapas.length) return false;
  await entrarComo(page, USUARIOS.equipoIwl, `/cartera/${slug}/programa`);
  const asistente = page.locator("#asistente-hoja");
  await asistente.locator('input[name="inicio"]').fill("2026-04-06");
  await asistente.getByRole("button", { name: "Generar la hoja de ruta" }).click();
  await asistente.getByText("Tramo 1 · De idea a MVP").waitFor();
  return true;
}

for (const c of CASOS) {
  test(`hoja de ruta de una compañía en ${c.nombre}`, async ({ page }, info) => {
    const proyecto = info.project.name;
    const creada = await asegurarHoja(page, c.slug, c.id);
    try {
      await entrarComo(page, USUARIOS.admin, `/cartera/${c.slug}/ruta`);
      await page.locator("#seguimiento").waitFor();
      await page.screenshot({ path: `${DIR}/compania-hoja-${c.nombre}-${FASE}-${proyecto}.png`, fullPage: true });

      if (FASE === "despues" && proyecto === "escritorio" && c.nombre === "facturando") {
        const fila = page.locator("[data-fila-hito]:visible").first();
        await fila.getByRole("button", { name: /Acciones de/ }).click();
        await page.screenshot({ path: `${DIR}/compania-hoja-${FASE}-menu.png` });
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Añadir hito" }).first().click();
        await page.getByRole("dialog").waitFor();
        await page.screenshot({ path: `${DIR}/compania-hoja-${FASE}-panel.png` });
      }
    } finally {
      if (creada) {
        await borrar("milestones", { company_id: c.id });
        await borrar("roadmap_stages", { company_id: c.id });
      }
    }
  });
}
