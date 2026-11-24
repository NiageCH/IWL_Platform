import { test } from "@playwright/test";
import { USUARIOS, entrarComo } from "../e2e/entrada";

/**
 * La guía dentro del marco de cada rol (REVISION, 24 nov): como dirección y
 * como fundadora, en escritorio y en móvil.
 */

const DIR = "docs/constancia";
const FASE = process.env.CAPTURA ?? "despues";

for (const [quien, nombre] of [
  [USUARIOS.admin, "direccion"],
  [USUARIOS.fundadoraMarea, "fundadora"],
] as const) {
  test(`la guía de ${nombre}`, async ({ page }, info) => {
    await entrarComo(page, quien, "/guia");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.screenshot({ path: `${DIR}/guia-${nombre}-${FASE}-${info.project.name}.png` });
  });
}
