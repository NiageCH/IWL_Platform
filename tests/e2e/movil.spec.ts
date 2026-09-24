import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Vista de fundadora en móvil (§11).
 *
 * No basta con que quepa: tiene que poder trabajar. Se comprueba que la
 * cabecera con los scores se lee, que la navegación entre módulos funciona y
 * que nada obliga a desplazarse en horizontal.
 */

test("la fundadora trabaja desde el móvil", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);

  await expect(page.getByRole("heading", { name: "Marea Clínica" })).toBeVisible();
  await expect(page.getByText("Score técnico")).toBeVisible();
  await expect(page.getByText("Siguientes pasos")).toBeVisible();

  // Navegación entre módulos
  await page.getByRole("link", { name: "Due diligence técnico" }).click();
  await expect(page).toHaveURL(/\/proyecto\/tecnico/);
  await expect(page.getByText("Scorecard técnico")).toBeVisible();

  await page.getByRole("link", { name: "KPI y updates" }).click();
  await expect(page).toHaveURL(/\/proyecto\/kpi/);
});

test("la página no se desplaza en horizontal", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);

  for (const ruta of ["/proyecto", "/proyecto/tecnico", "/proyecto/plan", "/proyecto/kpi"]) {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");

    const desbordamiento = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    // Una tabla ancha puede desplazarse dentro de su propio contenedor,
    // pero el cuerpo de la página nunca
    expect(desbordamiento, `La página ${ruta} se desborda en horizontal`).toBeLessThanOrEqual(1);
  }
});
