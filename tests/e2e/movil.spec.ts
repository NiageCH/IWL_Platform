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
  /* El score vive en la cabecera, que es lo que se ve en todas las
     pantallas; en el Resumen ya no se repite */
  await expect(page.getByLabel("Score técnico")).toBeVisible();
  /* Era «Siguientes pasos»: ahora los pasos y las tareas van en una sola
     lista, porque son la misma pregunta */
  await expect(page.getByText("Qué falta")).toBeVisible();

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

/**
 * La barra de arriba de IWL en móvil (REVISION, 23 nov). Las pestañas iban
 * en la fila de la marca con desbordamiento, y salían recortadas y montadas
 * sobre la cabecera («rtera», «nbudo»). Ahora van en un botón «Menú» que
 * las despliega enteras. Se comprueba en las pantallas de IWL, no en una.
 */
test("en las pantallas de IWL el menú se despliega entero, sin recortes", async ({ page }) => {
  // En escritorio manda la barra lateral: esto es del móvil
  test.skip(!test.info().project.name.startsWith("movil"), "Solo en móvil");
  await entrarComo(page, USUARIOS.admin, "/cartera");
  const ancho = page.viewportSize()!.width;

  for (const ruta of ["/cartera", "/embudo", "/admin/rutas", "/admin/companias", "/cartera/marea-clinica", "/guia"]) {
    await page.goto(ruta);
    const barra = page.locator(".barra-superior");
    // Plegado: la barra es una sola fila y ninguna pestaña asoma
    expect((await barra.boundingBox())!.height).toBeLessThan(80);
    await expect(page.getByRole("link", { name: "Embudo", exact: true })).toBeHidden();

    await page.getByRole("button", { name: /Menú/ }).click();
    const menu = page.locator("#menu-movil");
    for (const nombre of ["Cartera", "Embudo", "Guía", "Administración"]) {
      const caja = (await menu.getByRole("link", { name: new RegExp(`^${nombre}`) }).boundingBox())!;
      expect(caja.x).toBeGreaterThanOrEqual(0);
      expect(caja.x + caja.width).toBeLessThanOrEqual(ancho);
    }
    const desbordamiento = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desbordamiento, ruta).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: /Menú/ }).click();
    await expect(menu).toHaveCount(0);
  }

  // Al ir a otra página, el menú se cierra solo
  await page.getByRole("button", { name: /Menú/ }).click();
  await page.locator("#menu-movil").getByRole("link", { name: "Embudo", exact: true }).click();
  await expect(page).toHaveURL(/\/embudo/);
  await expect(page.locator("#menu-movil")).toHaveCount(0);
});
