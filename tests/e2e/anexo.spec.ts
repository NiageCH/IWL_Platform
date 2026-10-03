import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, entrarComo } from "./entrada";

/**
 * Abrir, rellenar y firmar el Anexo de Programa.
 *
 * El agujero que esto cubre: la pantalla decía «todavía no hay Anexo
 * firmado» y **no había forma de abrir uno**. Los tres de la semilla
 * existían; cualquier compañía nueva se quedaba sin Programa, sin
 * Aportación y sin poder imputar horas, que es media plataforma.
 */

let slug = "";

test("el Anexo se abre, se rellena y se firma", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");
  await page.getByText("Dar de alta una compañía").click();

  slug = `anexo-${Date.now()}`;
  const alta = page.locator("form", { has: page.locator('input[name="slug"]') });
  await alta.locator('input[name="name"]').fill(`Sin Anexo ${Date.now()}`);
  await alta.locator('input[name="slug"]').fill(slug);
  await alta.locator('select[name="stage"]').selectOption("semilla");
  await alta.locator('select[name="tech_profile"]').selectOption("software");
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/dada de alta/)).toBeVisible();

  await page.goto(`/cartera/${slug}/programa`);

  // Antes aquí no había nada que pulsar
  await expect(page.getByText(/Todavía no hay Anexo\./)).toBeVisible();
  await page.getByRole("button", { name: "Abrir el Anexo" }).click();

  /*
   * El acuse es la pantalla cambiada: el formulario vivía dentro de «si no
   * hay Anexo» y su propio éxito lo desmonta.
   */
  await expect(page.getByText("Borrador")).toBeVisible();
  await expect(page.getByText(/Todavía no hay Anexo\./)).toHaveCount(0);

  // Firmar sin rellenar no vale: lo firmado ya no se edita
  await page.getByRole("button", { name: "Firmar el Anexo" }).click();
  await page.getByRole("button", { name: "Firmar", exact: true }).click();
  await expect(page.getByText(/pon al menos la duración y las horas/)).toBeVisible();

  // Se rellena, y los números se escriben como los escribe una persona
  const anexo = page.locator("form", {
    has: page.locator('input[name="duration_months"]'),
  });
  await anexo.locator('input[name="duration_months"]').fill("12");
  await anexo.locator('input[name="committed_hours"]').fill("120");
  await anexo.locator('input[name="equity_pct"]').fill("7,5 %");
  await anexo.getByRole("button", { name: "Guardar el Anexo" }).click();
  await expect(page.getByText("Anexo guardado.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("120 h")).toBeVisible();
  await expect(page.getByText(/7,5 %|8 %/)).toBeVisible();

  // Y se firma
  await page.getByRole("button", { name: "Firmar el Anexo" }).click();
  await page.getByRole("button", { name: "Firmar", exact: true }).click();

  /*
   * El acuse vuelve a ser la pantalla: el formulario de firma solo existe
   * mientras el Anexo está en borrador, así que firmarlo lo desmonta y un
   * mensaje no lo leería nadie.
   *
   * Lo que se ve es lo que ha cambiado: la pastilla y la desaparición del
   * formulario de edición. Desde aquí el Anexo no se toca.
   */
  await expect(page.getByText(/Firmado el/)).toBeVisible();
  await expect(page.getByText("Borrador")).toHaveCount(0);
  await expect(page.locator('input[name="duration_months"]')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(/Firmado el/)).toBeVisible();
  await expect(page.locator('input[name="duration_months"]')).toHaveCount(0);
});

test.afterAll(async () => {
  if (slug) await borrar("companies", { slug });
});
