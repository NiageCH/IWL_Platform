import { expect, test } from "@playwright/test";
import {
  AJUSTES_BASE,
  COMPANIAS,
  USUARIOS,
  ajustar,
  borrar,
  entrarComo,
} from "./entrada";

// Vega es la compañía sin línea base y sin plan. Otras pruebas le crean las
// dos cosas, así que se limpia antes de empezar para no depender del orden
test.beforeAll(async () => {
  await ajustar("pesos_madurez", AJUSTES_BASE.pesos_madurez);
  await borrar("baselines", { company_id: COMPANIAS.vega });
  await borrar("milestones", { company_id: COMPANIAS.vega });
  await borrar("roadmap_stages", { company_id: COMPANIAS.vega });
});

/**
 * Madurez y transformación.
 *
 * La pregunta es «¿está este proyecto más maduro que cuando entró?». Sin
 * línea base congelada no se puede contestar, y la pantalla lo dice en vez de
 * enseñar un número que parece una respuesta y no lo es.
 */

test("la fundadora ve su madurez de hoy contra la del día de partida", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");

  await expect(
    page.getByRole("heading", { name: "Madurez y transformación" }),
  ).toBeVisible();

  await expect(page.getByText("Al empezar")).toBeVisible();
  await expect(page.getByText(/Línea base del 05 abr 2026/)).toBeVisible();
  await expect(page.getByText("Puntos ganados desde el inicio")).toBeVisible();

  // Los cinco ejes, cada uno con el porqué de su número
  for (const eje of ["Tecnología", "Gobierno", "Plan", "Tracción", "Solidez"]) {
    await expect(page.getByText(eje, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText(/hitos ya exigibles/)).toBeVisible();
  await expect(page.getByText(/sobre el mínimo de 6/)).toBeVisible();
});

test("la fundadora no congela líneas base", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");

  await expect(page.getByText(/Congelar (la|otra) línea base/)).toHaveCount(0);
});

test("sin línea base se dice que no hay transformación que medir", async ({
  page,
}) => {
  // Vega no tiene línea base congelada
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva");

  await expect(page.getByText("Sin línea base congelada").first()).toBeVisible();
  await expect(
    page.getByText(/Sin línea base congelada no hay transformación que medir/),
  ).toBeVisible();
  await expect(page.getByText("Congelar la línea base")).toBeVisible();
});

test("IWL congela una línea base y pasa a haber con qué comparar", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva");
  await page.getByText("Congelar la línea base").click();

  const alta = page.locator("form", { has: page.locator('select[name="kind"]') });
  await expect(alta.getByText(/No se puede editar después/)).toBeVisible();
  await alta.getByRole("button", { name: "Congelar" }).click();

  /*
   * El formulario se cierra al guardar y el bloque se redibuja, así que lo
   * que se comprueba es el efecto y no el mensaje: ahora hay contra qué
   * comparar donde antes no había nada.
   */
  await expect(page.getByText(/Línea base del/)).toBeVisible();
  await expect(page.getByText("Una línea base congelada")).toBeVisible();
  await expect(page.getByText("Congelar otra línea base")).toBeVisible();

  // Recién congelada, la transformación es cero: hoy y el punto de partida
  // son el mismo estado. Que salga «—» sería esconder que ya se puede medir
  await expect(page.getByText("+0,0")).toBeVisible();
});

test("un eje sin datos no cuenta como un cero", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva");

  // Vega no tiene el técnico terminado ni ingreso cargado
  await expect(page.getByText(/Sin medir:/)).toBeVisible();
  await expect(
    page.getByText(/No cuentan como cero: el índice se reparte/),
  ).toBeVisible();
  await expect(page.getByText(/% del peso medido/)).toBeVisible();
});

test("los pesos de los ejes se tocan desde administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/programa");

  await expect(page.getByRole("heading", { name: "Ejes de madurez" })).toBeVisible();

  const pesos = page.locator("form", {
    has: page.locator('input[name="tecnologia"]'),
  });
  await expect(pesos.locator('input[name="tecnologia"]')).toHaveValue("30");

  await pesos.locator('input[name="solidez"]').fill("25");
  await pesos.getByRole("button", { name: "Guardar pesos" }).click();
  await expect(page.getByText(/Pesos guardados/)).toBeVisible();

  await page.reload();
  await expect(pesos.locator('input[name="solidez"]')).toHaveValue("25");
});

test.afterAll(async () => {
  await ajustar("pesos_madurez", AJUSTES_BASE.pesos_madurez);
  await borrar("baselines", { company_id: COMPANIAS.vega });
  await borrar("milestones", { company_id: COMPANIAS.vega });
  await borrar("roadmap_stages", { company_id: COMPANIAS.vega });
});
