import { expect, test, type Page } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, entrarComo, insertar } from "./entrada";

/*
 * Aquí se borraba el Anexo de Raíz antes de empezar, para tener una
 * compañía sin Anexo firmado. Desde el bloque 5 la semilla le da uno, y
 * borrarlo dejaba sin Anexo a las pruebas que vienen después. La prueba
 * que lo necesita crea ahora su propia condición en Vega, que no tiene
 * Anexo, y la deshace al acabar.
 */

/**
 * Avances y aportación no horaria.
 *
 * Lo que se comprueba es que los dos lados escriben sobre el mismo plan y que
 * cada uno cae en su carril sin poder elegirlo, porque el carril lo pone la
 * base según quién entra.
 */

/**
 * Abre un tramo plegado del Recorrido.
 *
 * Solo queda abierto el tramo en curso; lo demás vive dentro de un
 * `<details>`. Se busca por el identificador de la tarjeta y no por su
 * texto, porque el nombre del tramo sale también en la línea de puntos de
 * la cabecera.
 */
async function abrirTramo(page: Page, nombre: string) {
  const tramo = page
    .locator("section[id^='etapa-']")
    .filter({ has: page.getByRole("heading", { name: nombre }) })
    .first();

  if (!(await tramo.locator("details[open]").count())) {
    await tramo.locator("summary").first().click();
  }
  return tramo;
}

test("los dos carriles se ven sobre la misma etapa", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  /*
   * El diagnóstico está cerrado, y desde que el Recorrido solo deja
   * abierto el tramo en curso hay que abrirlo. Se abre como lo abriría
   * cualquiera: pulsando su línea.
   */
  const tramo = await abrirTramo(page, "Tramo 2 · De MVP a piloto");

  await expect(tramo.getByText("La compañía").first()).toBeVisible();
  await expect(tramo.getByText("IWL", { exact: true }).first()).toBeVisible();

  // Un avance de cada lado en la etapa de diagnóstico
  await expect(tramo.getByText("Data room completado")).toBeVisible();
  await expect(
    tramo.getByText("Primera sesión técnica con el equipo"),
  ).toBeVisible();
});

test("la fundadora registra un avance y cae en su carril", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  /*
   * El primero **visible**, no el primero del marcado: los tramos
   * plegados llevan el suyo dentro de un `<details>` cerrado, y ese es el
   * que venía primero en la página.
   */
  await page.locator("button:visible", { hasText: "Registrar un avance" }).first().click();

  const alta = page.locator("form", { has: page.locator('input[name="title"]') });
  await alta
    .locator('input[name="title"]')
    .fill("Avance escrito por la fundadora en la prueba");
  await alta.getByRole("button", { name: "Registrar" }).click();

  /*
   * Primero se espera al acuse, y solo después se busca el avance.
   *
   * Antes se esperaba a que el formulario se cerrara. Ya no se cierra: un
   * panel cuya acción devuelve mensaje se queda puesto para enseñarlo, y lo
   * cierra quien lo lee. Siete veces se perdió una confirmación por cerrar
   * el panel que la contenía, así que ahora lo impide `<Formulario>`.
   *
   * Entre el acuse y el avance hay una revalidación del servidor, y bajo
   * carga tarda más de los cinco segundos por defecto: esta prueba fallaba
   * una de cada varias pasadas de la suite entera, nunca en aislamiento.
   */
  await expect(page.getByText("Avance registrado.")).toBeVisible();

  const tarjeta = page
    .locator("article", {
      hasText: "Avance escrito por la fundadora en la prueba",
    })
    .first();

  await expect(tarjeta).toBeVisible({ timeout: 15_000 });
  await expect(tarjeta.getByText("La compañía")).toBeVisible();
});

test("la aportación que no son horas se ve con su resultado y su etapa", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/aportacion");

  await expect(
    page.getByRole("heading", { name: "Compras, eventos y reuniones" }),
  ).toBeVisible();

  await expect(page.getByText("Feria de salud digital")).toBeVisible();
  await expect(
    page.getByText(/Nueve conversaciones, dos de ellas con centros/),
  ).toBeVisible();

  // El evento cuesta 1.800 y vale 6.500: la diferencia es la aportación
  await expect(page.getByText("Aportación 4.700 €")).toBeVisible();
});

test("la fundadora no registra aportación de IWL", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/aportacion");

  await expect(
    page.getByText("Registrar una compra, un evento o una reunión"),
  ).toHaveCount(0);
});

test("sin Anexo firmado se sigue viendo lo que IWL ya ha puesto", async ({
  page,
}) => {
  // Vega no tiene Anexo. Antes esto escondía la pantalla entera
  const titulo = `Compra de prueba sin Anexo ${Date.now()}`;
  const compra = await insertar<{ id: string }>("contribution_items", {
    company_id: COMPANIAS.vega,
    kind: "compra",
    occurred_on: "2026-10-01",
    title: titulo,
    description: "Una compra de IWL antes de firmar nada.",
    amount: 300,
    market_value: 300,
  });
  try {
    await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva/aportacion");
    await expect(page.getByText(/no hay Anexo de Programa firmado/)).toBeVisible();
    // Y aun así se ve lo que IWL ha puesto
    await expect(page.getByText(titulo)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Detalle de horas" })).toBeVisible();
  } finally {
    await borrar("contribution_items", { id: compra.id });
  }
});

test.afterAll(async () => {
  await borrar("progress_entries", {
    title: "Avance escrito por la fundadora en la prueba",
    company_id: COMPANIAS.marea,
  });
});
