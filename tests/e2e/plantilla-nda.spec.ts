import { expect, test } from "@playwright/test";
import { USUARIOS, consultar, entrarComo } from "./entrada";

/**
 * Pegar la plantilla del NDA en Programa: la vista previa enseña cómo
 * saldrá antes de guardar, y una sin marcas —copiada de una vista que ya la
 * pintaba— no se guarda. Nunca se guarda una versión: no se pueden borrar,
 * y la genérica de la semilla tiene que quedarse como está.
 */
test("la vista previa enseña el formato, y una plantilla sin marcas no se guarda", async ({ page }) => {
  const antes = await consultar("nda_plantillas", { candidatura_id: "is.null" }, "id");
  await entrarComo(page, USUARIOS.admin, "/admin/programa");

  const campo = page.getByLabel("Texto del NDA");
  const previa = page.getByRole("region", { name: "Vista previa de la plantilla" });

  // Con marcas: título y cláusula, y nada que lo impida
  await campo.fill(
    `# Acuerdo de prueba en vista previa\r\n\r\n## 01 Objeto\r\n\r\nEntre IWL y {{contraparte_nombre}}.${" Texto de prueba.".repeat(15)}`,
  );
  await expect(previa.getByRole("heading", { name: "Acuerdo de prueba en vista previa", level: 3 })).toBeVisible();
  await expect(previa.getByRole("heading", { name: /^01\s*Objeto$/ })).toBeVisible();
  await expect(previa.getByRole("status")).toHaveCount(0);

  // Copiada de una vista que ya la pintaba: lo dice antes y al guardar
  const pintada = `IWL_NDA_PlantillaPlataforma_ES_v3_20261110 Acuerdo mutuo de confidencialidad En Málaga…${" Texto de prueba.".repeat(20)}`;
  await campo.fill(pintada);
  const aviso = /no lleva las marcas de formato \(# título, ## cláusulas\)/;
  await expect(previa.getByText(aviso)).toBeVisible();
  await page.getByRole("button", { name: "Guardar como versión nueva" }).click();
  await expect(page.getByText(aviso)).toHaveCount(2);

  const despues = await consultar("nda_plantillas", { candidatura_id: "is.null" }, "id");
  expect(despues.length).toBe(antes.length);
});
