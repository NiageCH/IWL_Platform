import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, entrarComo } from "./entrada";

/**
 * Abrir, puntuar y publicar una evaluación técnica.
 *
 * El agujero que esto cubre: la sección decía «todavía no hay una
 * evaluación técnica publicada» y **no había por dónde empezar una**. Las
 * tres que existían venían de la semilla, así que cualquier compañía nueva
 * se quedaba con el módulo central muerto para siempre.
 */

/** Una compañía sin evaluación, creada para esto y borrada al acabar */
const NOMBRE = `Sin Evaluar ${Date.now()}`;
let slug = "";

test("el revisor abre la evaluación, puntúa y la publica", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");
  await page.getByText("Dar de alta una compañía").click();

  slug = `sin-evaluar-${Date.now()}`;
  const alta = page.locator("form", { has: page.locator('input[name="slug"]') });
  await alta.locator('input[name="name"]').fill(NOMBRE);
  await alta.locator('input[name="slug"]').fill(slug);
  await alta.locator('select[name="stage"]').selectOption("semilla");
  await alta.locator('select[name="tech_profile"]').selectOption("software");
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/dada de alta/)).toBeVisible();

  await page.goto(`/cartera/${slug}/tecnico`);

  // Antes aquí no había nada que pulsar
  await expect(page.getByText(/Todavía no hay evaluación/)).toBeVisible();
  await page.getByRole("button", { name: "Abrir la evaluación técnica" }).click();

  /*
   * El acuse es la pantalla cambiada, no un mensaje: el formulario vivía
   * dentro de «si no hay evaluación» y su propio éxito lo desmonta. Donde
   * había un hueco aparece el scorecard, en borrador.
   */
  await expect(page.getByText("Scorecard técnico")).toBeVisible();
  await expect(page.getByText(/En borrador/)).toBeVisible();
  await expect(page.getByText(/Todavía no hay evaluación/)).toHaveCount(0);

  // Sin nada puntuado no se publica: publicar una evaluación vacía miente
  await page.getByRole("button", { name: "Publicar la evaluación" }).click();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText(/puntúa al menos una dimensión/)).toBeVisible();
});

test.afterAll(async () => {
  if (slug) await borrar("companies", { slug });
});
