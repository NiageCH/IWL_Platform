import { test } from "@playwright/test";
import { USUARIOS, entrarComo } from "../e2e/entrada";

/**
 * El Resumen de una compañía con «Por dónde va» en tramos (REVISION, 24
 * nov · fuera las fases antiguas): Vega (idea, sin hoja de ruta en la
 * semilla) y Raíz (facturando, con el Acuerdo firmado), en escritorio y
 * en móvil. CAPTURA=antes o CAPTURA=despues pone el sufijo del fichero.
 */

const DIR = "docs/constancia";
const FASE = process.env.CAPTURA ?? "despues";

for (const c of [
  { slug: "vega-predictiva", nombre: "idea" },
  { slug: "raiz-sensorica", nombre: "facturando" },
]) {
  test(`resumen de una compañía en ${c.nombre}`, async ({ page }, info) => {
    await entrarComo(page, USUARIOS.admin, `/cartera/${c.slug}`);
    await page.getByRole("heading", { name: "Por dónde va" }).waitFor();
    await page.screenshot({ path: `${DIR}/compania-resumen-${c.nombre}-${FASE}-${info.project.name}.png`, fullPage: true });
  });
}
