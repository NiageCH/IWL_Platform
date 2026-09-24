import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Lectura de la cohorte y movimiento (§4.4, §4.7).
 *
 * Lo que se comprueba aquí es que la plataforma cuenta un recorrido y no una
 * foto: de dónde viene cada compañía, dónde está el hueco de la cohorte y
 * cómo se comparan entre sí sobre la misma vara.
 */

test("el dashboard abre con una lectura de la cohorte en una frase", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera");

  await expect(page.getByText(/La cohorte (avanza|retrocede|no se ha movido)/)).toBeVisible();
  await expect(page.getByText(/alcanzan el estado invertible|ninguna alcanza/)).toBeVisible();
});

test("cada compañía enseña su recorrido desde la medición de partida", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera");

  const fila = page.locator("tr", { hasText: "Marea Clínica" }).first();

  // La banda acompaña al número: un 93,9 solo no dice nada
  await expect(fila).toContainText("Preparada");
  // Y el recorrido, con su signo
  await expect(fila.getByText(/↑|↓/)).toBeVisible();
});

test("el embudo reparte la cohorte por bandas", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera");

  const embudo = page.locator("section", { hasText: "Camino a invertible" }).last();

  for (const banda of ["Inicio", "En desarrollo", "Consolidada", "Preparada"]) {
    await expect(embudo.getByText(banda, { exact: true })).toBeVisible();
  }

  // Y avisa de que estar en la banda alta no es ser invertible
  await expect(embudo.getByText(/no es lo mismo que ser invertible/)).toBeVisible();
});

test("el mapa de intervención dice dónde rinde más y a quién afecta", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera");

  const mapa = page.locator("section", { hasText: "Mapa de intervención" }).last();

  await expect(mapa).toBeVisible();
  // La primera dimensión nombra las compañías a las que afecta, enlazadas a
  // su propio due diligence técnico
  const primer = mapa.locator("li").first();
  await expect(primer.getByRole("link").first()).toBeVisible();
  await expect(primer).toContainText("demanda");
});

test("la ficha enseña la evolución de los dos scores", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica");

  const recorrido = page.locator("section", { hasText: "Recorrido" }).last();

  await expect(recorrido.getByText("Score técnico")).toBeVisible();
  await expect(recorrido.getByText("Preparación")).toBeVisible();
  // De dónde viene y dónde está
  await expect(recorrido.getByText(/→/).first()).toBeVisible();
});

test("la comparativa mide a cada compañía contra el objetivo de su etapa", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/comparativa");

  await expect(page.getByRole("heading", { name: "Comparativa" })).toBeVisible();

  // La etapa va en la cabecera de cada columna: sin ella, comparar niveles
  // brutos entre etapas distintas sería engañoso
  const tabla = page.locator("table").first();
  await expect(tabla).toContainText("Semilla");
  await expect(tabla).toContainText("Pre-semilla");

  // Y las dimensiones que no aplican se dicen, no se dejan en blanco
  await expect(tabla.getByText("No aplica").first()).toBeVisible();
});

test("la fundadora no llega a la comparativa de la cohorte", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);

  await page.goto("/comparativa");
  await expect(page).toHaveURL(/\/proyecto/);
});

test("la fundadora sí ve el recorrido de su propia compañía", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);

  const recorrido = page.locator("section", { hasText: "Recorrido" }).last();
  await expect(recorrido.getByText("Score técnico")).toBeVisible();
  await expect(page.getByText("Vega Predictiva")).toHaveCount(0);
});
