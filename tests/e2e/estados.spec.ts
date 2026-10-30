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

test("el due diligence abre con la barra de segmentos, un cuadrado por punto", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/diligencia");

  const barra = page.getByRole("list", { name: "Puntos del checklist" });
  await expect(barra).toBeVisible();

  const cuadrados = await barra.getByRole("listitem").count();
  const puntos = await page.locator("li[id^='punto-']").count();

  expect(puntos).toBeGreaterThan(0);
  expect(cuadrados).toBe(puntos);
});

test("el recuento de la barra suma exactamente los puntos que hay", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/diligencia");

  /*
   * La barra se ve; el recuento se lee. Es lo único que le queda a quien no
   * distingue los tonos, así que tiene que cuadrar con lo que hay.
   */
  const bloque = page
    .locator("section")
    .filter({ hasText: "Due diligence" })
    .first();

  const texto = await bloque.innerText();
  const sumas = [...texto.matchAll(/(\d+)\s+(hecho|en curso|por hacer|atención|vencido)/g)];

  expect(sumas.length).toBeGreaterThan(0);

  const total = sumas.reduce((t, m) => t + Number(m[1]), 0);
  expect(total).toBe(await page.locator("li[id^='punto-']").count());
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
    page.getByRole("list", { name: "Puntos del checklist" }),
  ).toBeVisible();

  const leyenda = page.getByText("Estados", { exact: true });
  await expect(leyenda).toHaveCount(1);
  await expect(leyenda.locator("xpath=..").getByText("Vencido")).toBeVisible();
});
