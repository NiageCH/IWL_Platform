import { expect, test } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, entrarComo } from "./entrada";

/*
 * Raíz es la compañía sin Anexo firmado, que es lo que hace falta para probar
 * que la aportación se ve igual sin él. Otras pruebas le crean uno al pasar,
 * así que se quita antes de empezar en vez de depender del orden.
 */
test.beforeAll(async () => {
  await borrar("annexes", { company_id: COMPANIAS.raiz });
});

/**
 * Avances y aportación no horaria.
 *
 * Lo que se comprueba es que los dos lados escriben sobre el mismo plan y que
 * cada uno cae en su carril sin poder elegirlo, porque el carril lo pone la
 * base según quién entra.
 */

test("los dos carriles se ven sobre la misma etapa", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  await expect(page.getByText("La compañía").first()).toBeVisible();
  await expect(page.getByText("IWL", { exact: true }).first()).toBeVisible();

  // Un avance de cada lado en la etapa de diagnóstico
  await expect(page.getByText("Data room completado")).toBeVisible();
  await expect(page.getByText("Primera sesión técnica con el equipo")).toBeVisible();
});

test("la fundadora registra un avance y cae en su carril", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  await page.getByText("Registrar un avance").first().click();

  const alta = page.locator("form", { has: page.locator('input[name="title"]') });
  await alta
    .locator('input[name="title"]')
    .fill("Avance escrito por la fundadora en la prueba");
  await alta.getByRole("button", { name: "Registrar" }).click();

  const tarjeta = page
    .locator("article", {
      hasText: "Avance escrito por la fundadora en la prueba",
    })
    .first();

  await expect(tarjeta).toBeVisible();
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
  // Raíz no tiene Anexo. Antes esto escondía la pantalla entera
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/raiz-sensorica/aportacion");

  await expect(page.getByText(/no hay Anexo de Programa firmado/)).toBeVisible();

  // Y aun así se ven las horas y las compras
  await expect(page.getByText("Lote de sensores para banco de pruebas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Detalle de horas" })).toBeVisible();
});

test.afterAll(async () => {
  await borrar("progress_entries", {
    title: "Avance escrito por la fundadora en la prueba",
    company_id: COMPANIAS.marea,
  });
});
