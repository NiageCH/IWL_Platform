import { expect, test, type Page } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, consultar, entrarComo } from "./entrada";

/**
 * Evidencia: en qué se apoya lo que alguien afirma.
 *
 * Hasta ahora solo el business plan podía respaldar lo que decía. En el
 * resto de pantallas —un hito cumplido, una tarea encargada, una
 * dimensión puntuada— había que creerse la afirmación.
 *
 * Lo que se comprueba es el recorrido entero: adjuntar, verlo en su sitio,
 * y que quitarlo no se lleve por delante el documento. Lo que la prueba
 * crea se borra al acabar.
 */

const ROTULO = "Acta del comité de prueba";

/**
 * La fila de una tarea, la que lleva su botón de adjuntar.
 *
 * Por el botón y no solo por el texto: el título de una tarea aparece
 * también en la barra de estados de arriba, y ese `li` no tiene
 * formulario dentro.
 */
function filaDe(page: Page, titulo: string) {
  return page
    .locator("li")
    .filter({ hasText: titulo })
    .filter({ has: page.locator("form, button") })
    .last();
}

test("IWL adjunta un enlace a una tarea y queda con su autor", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  const tarea = filaDe(page, "Montar la sala de datos");

  await tarea.getByRole("button", { name: "Adjuntar evidencia" }).click();
  await tarea.getByRole("tab", { name: "Un enlace" }).click();

  const alta = tarea.locator("form", { has: page.locator('input[name="label"]') });
  await alta.locator('input[name="label"]').fill(ROTULO);
  await alta.locator('input[name="url"]').fill("https://ejemplo.test/acta");
  await alta.getByRole("button", { name: "Adjuntar" }).click();

  /*
   * El acuse es la pantalla cambiada: el panel se cierra y la evidencia
   * aparece en su fila. La acción no devuelve mensaje a propósito.
   */
  await expect(tarea.getByRole("link", { name: ROTULO })).toBeVisible();

  /* Y con su autor y su fecha, que es la mitad de para qué sirve una
     evidencia: saber quién dijo que esto respalda aquello */
  await expect(tarea).toContainText("Dirección IWL");
});

test("una evidencia sin archivo, documento ni enlace no se guarda", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  const tarea = filaDe(page, "Cerrar la segunda venta");

  await tarea.getByRole("button", { name: "Adjuntar evidencia" }).click();

  const alta = tarea.locator("form", { has: page.locator('input[name="label"]') });
  await alta.locator('input[name="label"]').fill("Una evidencia vacía");
  await alta.getByRole("button", { name: "Adjuntar" }).click();

  await expect(
    page.getByText(/Una evidencia es un archivo, un documento del data room/),
  ).toBeVisible();
});

test("quitarla no se lleva el documento del data room", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  const tarea = filaDe(page, "Montar la sala de datos");

  const antes = await consultar("documents", { company_id: `eq.${COMPANIAS.marea}` }, "id");

  await tarea.getByRole("button", { name: `Quitar ${ROTULO}` }).click();
  await expect(tarea.getByRole("link", { name: ROTULO })).toHaveCount(0);

  const despues = await consultar(
    "documents",
    { company_id: `eq.${COMPANIAS.marea}` },
    "id",
  );
  expect(despues).toHaveLength(antes.length);
});

test("la fundadora ve quién ha abierto los documentos de su compañía", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/diligencia");

  /*
   * Se anotaba desde el principio y no lo veía nadie. Que esté vacío es
   * una respuesta legítima —nadie ha abierto nada— y por eso se comprueba
   * que la pregunta se pueda hacer, no que haya filas.
   */
  await page.getByText("Quién ha abierto estos documentos").click();
  await expect(
    page.getByText(/Nadie ha abierto todavía|^Dirección IWL$/).first(),
  ).toBeVisible();
});

test.afterAll(async () => {
  // Lo que creó esta prueba se va; el data room se queda como estaba
  await borrar("evidence_links", { label: ROTULO });
});
