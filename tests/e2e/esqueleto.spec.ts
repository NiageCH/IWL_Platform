import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Paso 2 del rediseño: el esqueleto, igual para todos.
 *
 * Antes IWL tenía barra lateral y la fundadora solo la franja de arriba,
 * así que lo que aprendía una persona no le servía para la otra vista. Y el
 * acceso a una compañía se apoyaba solo en que RLS no devolviera filas:
 * funcionaba, pero no había un cerrojo que se pudiera leer ni probar.
 */

test("los dos roles comparten esqueleto", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera");
  const lateralIwl = page.locator("nav").first();
  await expect(lateralIwl.getByRole("link", { name: "Cartera" })).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);

  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");

  // La fundadora tiene la misma barra lateral, con su entrada
  await expect(
    page.getByRole("link", { name: "Mi compañía" }).first(),
  ).toBeVisible();

  // Y no ve lo que no es suyo
  await expect(page.getByRole("link", { name: "Embudo" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(0);
});

test("el menú sale de una sola lista, no de dos", async ({ page }) => {
  /*
   * La prueba de verdad es que la barra lateral y la compacta de móvil
   * ofrecen lo mismo: estaban escritas a mano en dos ficheros y era
   * cuestión de tiempo que divergieran.
   */
  await entrarComo(page, USUARIOS.admin, "/cartera");

  await page.setViewportSize({ width: 1440, height: 900 });
  const escritorio = await page.getByRole("link", { name: /Cartera|Embudo|Administración/ }).allInnerTexts();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const movil = await page.getByRole("link", { name: /Cartera|Embudo|Administración/ }).allInnerTexts();

  expect(new Set(movil)).toEqual(new Set(escritorio));
});

test("una compañía que no es tuya da 404, no un rebote", async ({ page }) => {
  /*
   * El cerrojo explícito del layout. Y 404 y no 403: decir «no tienes
   * permiso» confirmaría que esa compañía existe, y quién está en la
   * cohorte no es público.
   *
   * Se comprueba con el revisor que lleva Vega pero no Marea, que es quien
   * tiene menos permisos de los que llegan aquí.
   */
  await entrarComo(page, USUARIOS.revisorVega, "/cartera");

  const respuesta = await page.goto("/cartera/marea-clinica");
  expect(respuesta?.status()).toBe(404);
});

test("un revisor entra por la cartera, no por un proyecto suelto", async ({
  page,
}) => {
  /*
   * Antes caía en `/proyecto`, que deduce la compañía de la primera fila
   * de `company_members`: veía una, al azar, y no tenía forma de llegar a
   * las otras que lleva.
   */
  await entrarComo(page, USUARIOS.revisorMarea, "/");
  await expect(page).toHaveURL(/\/cartera$/);

  // Y la cartera le enseña solo las suyas: lo filtra RLS, no la pantalla
  await expect(page.getByText("Marea Clínica").first()).toBeVisible();
  await expect(page.getByText("Vega Predictiva")).toHaveCount(0);

  // Si escribe /proyecto, se le devuelve a la cartera
  await page.goto("/proyecto");
  await expect(page).toHaveURL(/\/cartera$/);
});
