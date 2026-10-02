import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { USUARIOS, actualizar, borrar, entrarComo } from "./entrada";

/**
 * Data room (§4.3).
 *
 * El fichero va a un bucket privado bajo una ruta que empieza por el id de la
 * compañía, y el documento se enlaza con su punto del checklist, que pasa a
 * revisión. El acceso se sirve con un enlace firmado, nunca con una URL
 * pública.
 */

function ficheroDePrueba(nombre: string, contenido: string) {
  const dir = mkdtempSync(join(tmpdir(), "iwl-"));
  const ruta = join(dir, nombre);
  writeFileSync(ruta, contenido);
  return ruta;
}

test("la fundadora sube un documento y su punto pasa a revisión", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/diligencia");

  const ruta = ficheroDePrueba(
    "cuentas-2025.csv",
    "Concepto;Importe\nIngresos;0\nGastos;103200\n",
  );

  await page.getByText("Subir un documento").click();

  const formulario = page.locator("form", {
    has: page.locator('input[type="file"]'),
  });

  await formulario.locator('select[name="area_id"]').selectOption({ label: "Financiero" });
  await formulario
    .locator('select[name="dd_item_id"]')
    .selectOption({ label: "Cuentas anuales" });
  await formulario.locator('input[name="name"]').fill("Cuentas anuales 2025");
  await formulario.locator('input[type="file"]').setInputFiles(ruta);
  await formulario.getByRole("button", { name: /Subir al data room/ }).click();

  await expect(page.getByText("Documento subido.")).toBeVisible();

  // El documento aparece en el data room con su fichero
  const fila = page.locator("li", { hasText: "Cuentas anuales 2025" }).last();
  await expect(fila.getByRole("button", { name: "Abrir" })).toBeVisible();

  /*
   * Y el punto del checklist pasa a revisión, no a «entregado»: entregar y
   * que alguien lo mire son dos cosas, y la segunda es la que le interesa
   * saber a quien acaba de subir el fichero.
   *
   * Desde ahí ya no lo mueve ella: donde tenía un desplegable ve una
   * etiqueta. No es solo la pantalla —la base rechaza el cambio—, pero
   * enseñar un control que va a dar error es peor que no enseñarlo.
   */
  const punto = page.locator("li", { hasText: "Cuentas anuales" }).first();
  await expect(punto.getByText("En revisión")).toBeVisible();
  await expect(punto.locator("select")).toHaveCount(0);
});

test("se sube el documento desde la propia línea, sin bajar al final", async ({
  page,
}) => {
  /*
   * El data room tenía un solo formulario, al final de la página, donde
   * había que volver a elegir el área y el punto que ya estabas mirando.
   * En una checklist de treinta líneas eso es bajar y buscar treinta veces.
   */
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/diligencia");

  const ruta = ficheroDePrueba("vesting.txt", "Acuerdo de vesting, borrador.");

  const punto = page
    .locator("li")
    .filter({ hasText: "Vesting del equipo fundador" })
    .first();

  await punto.getByRole("button", { name: "Subir" }).click();

  // El punto y el área ya se saben: solo queda el fichero
  await punto.locator('input[type="file"]').setInputFiles(ruta);
  await punto.getByRole("button", { name: "Subir", exact: true }).last().click();

  await expect(page.getByText("Documento subido.")).toBeVisible();

  // El acuse no se lo lleva el panel al cerrarse: se cierra con Hecho
  await expect(punto.getByRole("button", { name: "Hecho" })).toBeVisible();
});

test("la compañía no saca un punto de revisión; IWL sí", async ({ page }) => {
  /*
   * Lo que impide que el checklist signifique una cosa para cada parte.
   * Lo manda la base, no la pantalla: aquí se comprueba entrando como quien
   * menos puede.
   */
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/diligencia");

  const ruta = ficheroDePrueba("precios.txt", "Política de precios 2026.");
  const punto = page
    .locator("li")
    .filter({ hasText: "Política de precios" })
    .first();

  await punto.getByRole("button", { name: "Subir" }).click();
  await punto.locator('input[type="file"]').setInputFiles(ruta);
  await punto.getByRole("button", { name: "Subir", exact: true }).last().click();
  await expect(page.getByText("Documento subido.")).toBeVisible();

  await page.reload();
  const trasSubir = page
    .locator("li")
    .filter({ hasText: "Política de precios" })
    .first();
  await expect(trasSubir.getByText("En revisión")).toBeVisible();
  await expect(trasSubir.locator("select")).toHaveCount(0);

  // Y quien revisa sí lo mueve
  await entrarComo(page, USUARIOS.admin, "/cartera/vega-predictiva/diligencia");
  const deIwl = page
    .locator("li")
    .filter({ hasText: "Política de precios" })
    .first();
  await expect(deIwl.locator("select")).toHaveValue("en_revision");
  await deIwl.locator("select").selectOption("validado");
  await expect(deIwl.locator("select")).toHaveValue("validado");
});

test("no se admite un tipo de fichero que no pinta nada en un data room", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/diligencia");

  const ruta = ficheroDePrueba("script.js", "console.log('no');");

  await page.getByText("Subir un documento").click();

  const formulario = page.locator("form", {
    has: page.locator('input[type="file"]'),
  });

  await formulario.locator('input[name="name"]').fill("Fichero que no toca");
  await formulario.locator('input[type="file"]').setInputFiles(ruta);
  await formulario.getByRole("button", { name: /Subir al data room/ }).click();

  await expect(
    page.getByText(/Ese tipo de fichero no se admite|Revisa los campos/),
  ).toBeVisible();
});

test("un documento de otra compañía no se abre", async ({ page, request }) => {
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/diligencia");

  // Los documentos de Marea y de Raíz existen en la semilla pero no se listan
  // aquí. Se comprueban por nombres que solo tienen ellas.
  await expect(page.getByText("Pacto de socios 2024")).toHaveCount(0);
  await expect(page.getByText("Embudo comercial agosto 2026")).toHaveCount(0);
  await expect(page.getByText("Informe preliminar de certificación")).toHaveCount(0);

  // Y el bucket no sirve nada sin firmar
  const respuesta = await request.get(
    "http://127.0.0.1:54321/storage/v1/object/public/data-room/00000000-0000-0000-0004-000000000001/financiero/x.pdf",
  );
  expect(respuesta.ok()).toBe(false);
});

/*
 * Lo que estas pruebas tocaron, a su sitio.
 *
 * Los tres puntos estaban pendientes en la semilla y se han movido a
 * revisión —y uno a validado—, así que la segunda pasada los encontraría ya
 * cambiados y comprobaría otra cosa. Los documentos los crearon ellas, así
 * que esos sí se borran.
 */
test.afterAll(async () => {
  for (const titulo of [
    "Cuentas anuales",
    "Vesting del equipo fundador",
    "Política de precios",
  ]) {
    await actualizar(
      "dd_items",
      { title: `eq.${titulo}` },
      { status: "pendiente", document_id: null },
    );
  }

  for (const nombre of [
    "Cuentas anuales 2025",
    "Vesting del equipo fundador",
    "Política de precios",
  ]) {
    await borrar("documents", { name: nombre });
  }
});
