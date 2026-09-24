import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Data room (§4.3).
 *
 * El fichero va a un bucket privado bajo una ruta que empieza por el id de la
 * compañía, y el documento se enlaza con su punto del checklist, que pasa a
 * entregado. El acceso se sirve con un enlace firmado, nunca con una URL
 * pública.
 */

function ficheroDePrueba(nombre: string, contenido: string) {
  const dir = mkdtempSync(join(tmpdir(), "iwl-"));
  const ruta = join(dir, nombre);
  writeFileSync(ruta, contenido);
  return ruta;
}

test("la fundadora sube un documento y su punto pasa a entregado", async ({
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

  // Y el punto del checklist ya consta como entregado
  const punto = page.locator("li", { hasText: "Cuentas anuales" }).first();
  await expect(punto.locator("select")).toHaveValue("entregado");
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
