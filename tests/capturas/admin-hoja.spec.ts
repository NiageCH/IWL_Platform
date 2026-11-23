import { test } from "@playwright/test";
import { USUARIOS, entrarComo } from "../e2e/entrada";

/**
 * Administración → Hoja de ruta (REVISION, 23 nov: «que no parezca un
 * Word»). La pantalla entera, en escritorio y en móvil, y en escritorio
 * también el menú de un hito abierto y el panel de editar. CAPTURA=antes o
 * CAPTURA=despues pone el sufijo del fichero.
 */

const DIR = "docs/constancia";
const FASE = process.env.CAPTURA ?? "despues";

test("administración, hoja de ruta del programa", async ({ page }, info) => {
  const proyecto = info.project.name;
  await entrarComo(page, USUARIOS.admin, "/admin/rutas");
  await page.getByRole("heading", { name: "Hoja de ruta del programa" }).waitFor();
  await page.screenshot({ path: `${DIR}/admin-hoja-${FASE}-${proyecto}.png`, fullPage: true });

  if (FASE === "despues" && proyecto === "escritorio") {
    const fila = page.locator("li[data-hito]").first();
    await fila.getByRole("button", { name: /Acciones de/ }).click();
    await page.screenshot({ path: `${DIR}/admin-hoja-${FASE}-menu.png` });
    await page.getByRole("menuitem", { name: "Editar" }).click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: `${DIR}/admin-hoja-${FASE}-panel.png` });
  }
});
