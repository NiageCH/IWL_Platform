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

  const fila = page.locator("li", { hasText: "Marea Clínica" }).first();

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

  /*
   * La página contesta preguntas, no enseña una hoja de cálculo.
   *
   * Eran dos tablas anchas de las que había que sacar las conclusiones a
   * ojo. Ahora cada bloque lleva su pregunta por título y un gráfico que la
   * responde.
   */
  await expect(page.getByText("¿Quién va por delante?")).toBeVisible();
  await expect(page.getByText("¿Dónde flojea la cohorte?")).toBeVisible();

  /*
   * Y lo que de verdad hay que no perder: cada una se mide contra el
   * objetivo de SU etapa, no contra un ideal común. Un 2 en pre-semilla y
   * un 2 en serie A no significan lo mismo, así que el eje es el
   * porcentaje de lo que exige su etapa, donde 100 es llegar.
   */
  await expect(page.getByText("% del objetivo de su etapa")).toBeVisible();
  await expect(
    page.getByText(/un 2 en pre-semilla y un 2 en serie A no significan/i),
  ).toBeVisible();

  // Las cifras exactas no se pierden: bajan al final
  const tabla = page.locator("table").first();
  await expect(page.getByText("Las cifras, una a una")).toBeVisible();
  await expect(tabla).toContainText("Preparación");
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
