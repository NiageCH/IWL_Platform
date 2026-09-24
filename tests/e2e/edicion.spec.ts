import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Edición desde la interfaz.
 *
 * Lo importante aquí no es que el formulario funcione, que también, sino que
 * cada persona vea exactamente los formularios que le corresponden: la
 * fundadora responde el cuestionario y no puntúa; el revisor puntúa y no
 * responde por ella.
 */

test("la fundadora no tiene delante ningún formulario de puntuación", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/tecnico");

  await expect(page.getByText("Scorecard técnico")).toBeVisible();
  await expect(page.getByText("Ajustar puntuación")).toHaveCount(0);
  await expect(page.getByText("Registrar un hallazgo")).toHaveCount(0);
});

test("la fundadora sí responde el cuestionario técnico", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/tecnico");

  await expect(page.getByText("Cuestionario técnico")).toBeVisible();

  const primera = page.locator('textarea[name="answer"]').first();
  const texto = `Diagrama actualizado. Prueba ${Date.now()}`;
  await primera.fill(texto);
  await primera.locator("xpath=ancestor::form").getByRole("button").click();

  await expect(page.getByText("Respuesta guardada.")).toBeVisible();
});

test("el revisor de Niage puntúa y el score se mueve", async ({ page }) => {
  await entrarComo(page, USUARIOS.revisorMarea, "/cartera/marea-clinica/tecnico");

  // La cifra de la cabecera, no la del panel de evolución
  const cifra = page
    .locator("header")
    .locator("div")
    .filter({ has: page.getByText("Score técnico", { exact: true }) })
    .last();

  await expect(cifra).toContainText("94,2");

  // Seguridad es la única dimensión con brecha en los datos semilla
  const bloque = page
    .locator("li", { hasText: "Seguridad" })
    .filter({ hasText: "Ajustar puntuación" })
    .first();

  await bloque.getByText("Ajustar puntuación").click();
  await bloque.locator('select[name="level"]').selectOption("3");
  await bloque
    .locator('textarea[name="evidence"]')
    .fill("Prueba automatizada: se cierra la brecha de seguridad para verificar el cálculo.");
  await bloque.getByRole("button", { name: /Guardar puntuación/ }).click();

  await expect(page.getByText("Puntuación guardada.")).toBeVisible();

  // Cerrada la única brecha, todas las dimensiones alcanzan su objetivo
  await expect(cifra).toContainText("100,0");

  // El recorrido no se mueve: las instantáneas están congeladas y la de hoy
  // se tomó antes de este cambio. Es lo que las hace comparables
  await expect(cifra).toContainText("↑ 47,1 desde el inicio");

  // Se deja la puntuación como estaba: los tests no ensucian la semilla
  await bloque.locator('select[name="level"]').selectOption("2");
  await bloque
    .locator('textarea[name="evidence"]')
    .fill(
      "Sin secretos en el repositorio y dependencias al día. Falta revisión de autorización a nivel de registro de paciente.",
    );
  await bloque.getByRole("button", { name: /Guardar puntuación/ }).click();
  await expect(cifra).toContainText("94,2");
});

test("una puntuación sin evidencia no se guarda", async ({ page }) => {
  await entrarComo(page, USUARIOS.revisorMarea, "/cartera/marea-clinica/tecnico");

  const bloque = page
    .locator("li", { hasText: "Escalabilidad" })
    .filter({ hasText: "Ajustar puntuación" })
    .first();

  await bloque.getByText("Ajustar puntuación").click();
  await bloque.locator('select[name="level"]').selectOption("4");
  await bloque.locator('textarea[name="evidence"]').fill("corto");
  await bloque.getByRole("button", { name: /Guardar puntuación/ }).click();

  await expect(page.getByText("Revisa los campos marcados.")).toBeVisible();
  await expect(
    page.getByText(/Una puntuación sin evidencia no es una evaluación/),
  ).toBeVisible();
});

test("la fundadora carga los KPI del mes y las derivadas se calculan solas", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/kpi");

  const carga = page.locator("form", { has: page.locator('input[name^="kpi:"]') });
  const mes = await carga.locator('input[name="period"]').inputValue();

  await carga.locator("label", { hasText: "Caja" }).locator("input").fill("120000");
  await carga
    .locator("label", { hasText: "Burn mensual" })
    .locator("input")
    .fill("10000");
  await carga.getByRole("button", { name: /Guardar los valores del mes/ }).click();

  await expect(page.getByText(/valores guardados/)).toBeVisible();

  // Runway = 120.000 / 10.000 = 12 meses, sin que nadie lo escriba.
  // Se muestra con un decimal y coma, que es como se escriben las cifras en
  // español.
  const fila = page.locator("tr", { hasText: mes });
  await expect(fila).toContainText("12,0 meses");
});

test("la fundadora edita una sección del plan pero no la valida", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/plan");

  const bloque = page.locator("section", { hasText: "Mercado" }).last();
  await bloque.getByText(/Editar la sección|Redactar la sección/).click();

  const estados = await bloque.locator('select[name="status"]').innerText();
  expect(estados).toContain("En revisión");
  expect(estados).not.toContain("Validada por IWL");
});

test("el equipo de IWL sí puede validar una sección", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva/plan");

  const bloque = page.locator("section", { hasText: "Mercado" }).last();
  await bloque.getByText(/Editar la sección|Redactar la sección/).click();

  const estados = await bloque.locator('select[name="status"]').innerText();
  expect(estados).toContain("Validada por IWL");
});

test("la fundadora no tiene la opción de validar un punto de due diligence", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraVega, "/proyecto/diligencia");

  const primero = page.locator('select[name="status"]').first();
  const opciones = await primero.innerText();

  expect(opciones).toContain("Entregado");
  expect(opciones).not.toContain("Validado");
  expect(opciones).not.toContain("Bloqueante");
});

test("el equipo de IWL sí valida un punto de due diligence", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva/diligencia");

  const primero = page.locator('select[name="status"]').first();
  const opciones = await primero.innerText();

  expect(opciones).toContain("Validado");
  expect(opciones).toContain("Bloqueante");
});
