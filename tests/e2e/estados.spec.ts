import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * El lenguaje de estados.
 *
 * Cinco estados, los mismos para los tres públicos, cada uno con color,
 * icono y palabra. Lo que se comprueba aquí no es el tono —eso no se puede
 * afirmar desde una prueba— sino las dos cosas de las que depende que la
 * pantalla se lea sin distinguir colores: que cada estado lleve su icono y
 * que lleve su palabra.
 *
 * Nada de esto depende del día en que se ejecute: se cuenta lo que hay en
 * pantalla contra lo que hay en pantalla, no contra un estado concreto que
 * la semilla tendría hoy y no dentro de un mes.
 */

test("el due diligence abre con su avance: cuántos hechos de cuántos", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/diligencia");

  /*
   * Era una fila de cuadritos, uno por punto. Cinco colores seguidos no
   * se leen como avance, así que ahora es una barra de un solo color con
   * su par al lado.
   */
  const barra = page.getByRole("img", { name: /Puntos del checklist/ }).first();
  await expect(barra).toBeVisible();

  const puntos = await page.locator("li[id^='punto-']").count();
  expect(puntos).toBeGreaterThan(0);

  const etiqueta = (await barra.getAttribute("aria-label")) ?? "";
  const [, hechos, total] = etiqueta.match(/(\d+) de (\d+)/) ?? [];
  expect(Number(total)).toBe(puntos);
  expect(Number(hechos)).toBeLessThanOrEqual(puntos);
});

test("solo salen las excepciones, y pulsarlas filtra la lista", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/diligencia");

  /*
   * Lo que va según lo previsto no ocupa sitio: el hueco de la barra ya
   * lo dice. Solo se nombra lo vencido y lo que pide atención, que es lo
   * que hace que una excepción se note.
   */
  const vencidos = page.getByRole("link", { name: /vencidos?$/ }).first();
  await expect(vencidos).toBeVisible();

  const todos = await page.locator("li[id^='punto-']").count();
  await vencidos.click();
  await expect(page.getByText("Ver todo").first()).toBeVisible();

  const filtrados = await page.locator("li[id^='punto-']").count();
  expect(filtrados).toBeGreaterThan(0);
  expect(filtrados).toBeLessThan(todos);
});

test("cada pastilla de estado lleva su icono, no solo su color", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/diligencia");

  const pastillas = page.locator(".estado");
  const cuantas = await pastillas.count();
  expect(cuantas).toBeGreaterThan(0);

  for (let i = 0; i < cuantas; i++) {
    await expect(pastillas.nth(i).locator("svg")).toHaveCount(1);
  }
});

test("la leyenda nombra los cinco estados y aparece una sola vez", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/diligencia");

  const leyenda = page.getByText("Estados", { exact: true });
  await expect(leyenda).toHaveCount(1);

  const pie = leyenda.locator("xpath=..");
  for (const nombre of ["Hecho", "En curso", "Por hacer", "Atención", "Vencido"]) {
    await expect(pie.getByText(nombre, { exact: true })).toBeVisible();
  }
});

test("el recorrido abre con la línea de puntos y marca dónde se está", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/ruta");

  await expect(page.getByText("Estás aquí")).toHaveCount(1);

  /*
   * Y cada punto de la línea lleva a su tarjeta. Sin eso la línea sería un
   * adorno: se mira, se entiende y hay que bajar a buscar a mano.
   */
  const destino = await page
    .locator("a[href^='#etapa-']")
    .first()
    .getAttribute("href");

  expect(destino).toBeTruthy();
  await expect(page.locator(`section[id='${destino!.slice(1)}']`)).toHaveCount(1);
});

test("la fundadora ve los mismos cinco estados que IWL", async ({ page }) => {
  /*
   * Criterio de aceptación del documento: el lenguaje es el mismo para los
   * tres públicos. Si la fundadora viera otra escala, volvería a haber dos
   * vocabularios y la conversación entre las dos partes tendría traducción.
   */
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/diligencia");

  await expect(
    page.getByRole("img", { name: /Puntos del checklist/ }).first(),
  ).toBeVisible();

  const leyenda = page.getByText("Estados", { exact: true });
  await expect(leyenda).toHaveCount(1);
  await expect(leyenda.locator("xpath=..").getByText("Vencido")).toBeVisible();
});
