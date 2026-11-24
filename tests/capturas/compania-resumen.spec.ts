import { type Page, test } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, consultar, entrarComo } from "../e2e/entrada";

/**
 * Vega no trae hoja de ruta en la semilla: se le genera el borrador, como
 * en las capturas de la Hoja de ruta, para que las dos digan lo mismo
 * (REVISION, 24 nov). Se le quita al acabar.
 */
async function asegurarHoja(page: Page, slug: string, id: string): Promise<boolean> {
  const etapas = await consultar("roadmap_stages", { company_id: `eq.${id}` }, "id");
  if (etapas.length) return false;
  await entrarComo(page, USUARIOS.equipoIwl, `/cartera/${slug}/programa`);
  const asistente = page.locator("#asistente-hoja");
  const firma = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  await asistente.locator('input[name="inicio"]').fill(firma);
  await asistente.getByRole("button", { name: "Generar la hoja de ruta" }).click();
  await asistente.getByText("Tramo 1 · De idea a MVP").waitFor();
  return true;
}

/**
 * El Resumen de una compañía con «Por dónde va» en tramos (REVISION, 24
 * nov · fuera las fases antiguas): Vega (idea, con su borrador de hoja de
 * ruta) y Raíz (facturando, con el Acuerdo firmado), en escritorio y
 * en móvil. CAPTURA=antes o CAPTURA=despues pone el sufijo del fichero.
 */

const DIR = "docs/constancia";
const FASE = process.env.CAPTURA ?? "despues";

for (const c of [
  { slug: "vega-predictiva", id: COMPANIAS.vega, nombre: "idea" },
  { slug: "raiz-sensorica", id: COMPANIAS.raiz, nombre: "facturando" },
]) {
  test(`resumen de una compañía en ${c.nombre}`, async ({ page }, info) => {
    const creada = await asegurarHoja(page, c.slug, c.id);
    try {
      await entrarComo(page, USUARIOS.admin, `/cartera/${c.slug}`);
      await page.getByRole("heading", { name: "Por dónde va" }).waitFor();
      await page.screenshot({ path: `${DIR}/compania-resumen-${c.nombre}-${FASE}-${info.project.name}.png`, fullPage: true });
    } finally {
      if (creada) {
        await borrar("milestones", { company_id: c.id });
        await borrar("roadmap_stages", { company_id: c.id });
      }
    }
  });
}
