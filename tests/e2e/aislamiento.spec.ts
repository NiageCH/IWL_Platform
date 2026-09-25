import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Aislamiento visto desde la pantalla (§11).
 *
 * Los tests de RLS prueban que la base no devuelve datos ajenos. Estos
 * prueban que la interfaz tampoco los enseña ni deja llegar a ellos.
 */

test("sin sesión, cualquier ruta lleva a la entrada", async ({ page }) => {
  await page.goto("/proyecto");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("heading", { name: "Plataforma IWL" })).toBeVisible();
});

test("la fundadora entra en su proyecto y ve su compañía", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);

  await expect(page).toHaveURL(/\/proyecto/);
  await expect(page.getByRole("heading", { name: "Marea Clínica" })).toBeVisible();
  await expect(page.getByText("Vega Predictiva")).toHaveCount(0);
  await expect(page.getByText("Raíz Sensórica")).toHaveCount(0);
});

test("la fundadora no llega a la cartera aunque escriba la ruta", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);

  await page.goto("/cartera");
  await expect(page).toHaveURL(/\/proyecto/);
  await expect(page.getByRole("heading", { name: "Marea Clínica" })).toBeVisible();
});

test("la fundadora no alcanza otra compañía por su ruta", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);

  await page.goto("/cartera/vega-predictiva");
  await expect(page).not.toHaveURL(/vega-predictiva/);
  await expect(page.getByText("Vega Predictiva")).toHaveCount(0);
});

test("el equipo de IWL ve la cohorte completa", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl);

  await expect(page).toHaveURL(/\/cartera/);

  // El dashboard tiene varias tablas: se apunta a la de la cohorte por su
  // sección, no por ser «la tabla»
  const cohorte = page
    .locator("section", { hasText: "Fila por compañía" })
    .getByRole("table");

  for (const nombre of ["Marea Clínica", "Vega Predictiva", "Raíz Sensórica"]) {
    await expect(cohorte.getByRole("link", { name: nombre })).toBeVisible();
  }
});

test("un revisor de Niage solo ve las compañías que lleva", async ({ page }) => {
  await entrarComo(page, USUARIOS.revisorVega, "/cartera");

  const cohorte = page
    .locator("section", { hasText: "Fila por compañía" })
    .getByRole("table");
  await expect(cohorte.getByRole("link", { name: "Vega Predictiva" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Marea Clínica" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Raíz Sensórica" })).toHaveCount(0);
});

test("el semáforo y las severidades llevan texto, no solo color", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva");

  // Semáforo rojo por el hallazgo crítico abierto
  await expect(page.getByText("Bloqueo").first()).toBeVisible();
  await expect(page.getByText("Un hallazgo crítico abierto").first()).toBeVisible();

  await page.goto("/cartera/vega-predictiva/tecnico");
  await expect(page.getByText("Crítico").first()).toBeVisible();
});

test("un hallazgo crítico abierto impide el estado invertible", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva");

  // La cifra de la cabecera: etiqueta «Invertible» y su valor
  const invertible = page
    .locator("div", { has: page.getByText("Invertible", { exact: true }) })
    .last();
  await expect(invertible).toContainText("No");

  await expect(
    page.getByText(/Resolver el hallazgo crítico/).first(),
  ).toBeVisible();
});

test("el score técnico se lee contra el objetivo de la etapa", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica");

  await expect(page.getByText("Sobre el objetivo de semilla").first()).toBeVisible();
});
