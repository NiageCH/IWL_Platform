import { expect, test } from "@playwright/test";
import { USUARIOS, actualizar, entrarComo } from "./entrada";

/*
 * Ninguna compañía archivada al empezar.
 *
 * Varias pruebas de aquí archivan y restauran, y si una se corta a mitad deja
 * el estado cambiado para las siguientes. Se restaura por fuera del camino
 * que se prueba, que es lo único que hace la suite repetible.
 */
test.beforeEach(async () => {
  await actualizar(
    "companies",
    { archived_at: "not.is.null" },
    { archived_at: null, archived_by: null, archive_reason: null },
  );
});

/**
 * Administración de personas y compañías.
 *
 * Lo que se comprueba es que el papel de cada mentor va por proyecto y que
 * el borrado no se ofrece cuando destruiría un historial. Las reglas de fondo
 * las prueban los tests de RLS; aquí se prueba que la pantalla las cuenta
 * bien, que es lo que decide si alguien las entiende.
 */

test("una mentora coordina un proyecto y apoya en otro", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const producto = page.locator("li", { hasText: "mentor@iwl.test" }).first();

  /*
   * Se busca la etiqueta junto a su compañía: «coordina» aparece también en
   * las opciones del desplegable de asignación, así que el texto suelto no
   * distingue lo que hay de lo que se puede elegir.
   */
  const marea = producto.locator("li", { hasText: "Marea Clínica" });
  const raiz = producto.locator("li", { hasText: "Raíz Sensórica" });

  await expect(marea.getByText("Coordina", { exact: true })).toBeVisible();
  await expect(raiz.getByText("Apoyo", { exact: true })).toBeVisible();

  // Con sus horas acordadas y las que lleva puestas en cada uno
  await expect(marea.getByText(/70,0 de 120 h/)).toBeVisible();
  await expect(raiz.getByText(/0,0 de 60 h/)).toBeVisible();
});

test("el papel de mentoría a secas ya no se ofrece", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const papeles = page.locator('select[name="member_role"]').first();
  await expect(papeles.locator("option", { hasText: "coordina el proyecto" })).toHaveCount(1);
  await expect(papeles.locator("option", { hasText: "Mentoría · apoyo" })).toHaveCount(1);
  await expect(papeles.locator('option[value="mentor"]')).toHaveCount(0);
});

test("al asignar mentoría se piden las horas acordadas", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const fila = page.locator("li", { hasText: "mentor2@iwl.test" }).first();
  const papeles = fila.locator('select[name="member_role"]');

  // Con un papel que no es de mentoría no hay horas que acordar
  await expect(fila.locator('input[name="assigned_hours"]')).toHaveCount(0);

  await papeles.selectOption("mentor_principal");
  await expect(fila.locator('input[name="assigned_hours"]')).toBeVisible();
  await expect(
    fila.getByText(/Quien coordina responde del avance del proyecto/),
  ).toBeVisible();

  await papeles.selectOption("mentor_secundario");
  await expect(fila.getByText(/No punt[úu]a ni confirma hitos/)).toBeVisible();
});

test("no se ofrece borrar a quien tiene trabajo a su nombre", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const conTrabajo = page.locator("li", { hasText: "revisor@niage.test" }).first();
  await expect(
    conTrabajo.getByText("No se puede borrar: tiene trabajo a su nombre"),
  ).toBeVisible();
  await expect(conTrabajo.getByRole("button", { name: "Borrar" })).toHaveCount(0);

  // Y sí a quien no ha dejado rastro
  const sinTrabajo = page.locator("li", { hasText: "cto@marea.test" }).first();
  await expect(sinTrabajo.getByRole("button", { name: "Borrar" })).toBeVisible();
});

test("una compañía con trabajo registrado se archiva, no se borra", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const marea = page.locator("li", { hasText: "Marea Clínica" }).first();

  await expect(
    marea.getByText("No se puede borrar: tiene trabajo registrado"),
  ).toBeVisible();

  await marea.getByRole("button", { name: "Archivar" }).click();
  await expect(
    marea.getByText(/su equipo fundador deja de verla/),
  ).toBeVisible();
  await expect(
    marea.getByText(/El histórico se conserva entero/),
  ).toBeVisible();
});

test("archivar saca de la cartera y restaurar la devuelve", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const vega = page.locator("li", { hasText: "Vega Predictiva" }).first();
  await vega.getByRole("button", { name: "Archivar" }).click();

  const formulario = vega.locator("form", {
    has: page.locator('input[name="motivo"]'),
  });
  await formulario.locator('input[name="motivo"]').fill("Prueba de archivado");
  await formulario.getByRole("button", { name: "Archivar" }).click();

  await expect(page.getByRole("heading", { name: "Archivadas" })).toBeVisible();
  await expect(page.getByText("Prueba de archivado")).toBeVisible();

  // Sale de la cartera
  await page.goto("/cartera");
  await expect(page.getByRole("link", { name: "Vega Predictiva" })).toHaveCount(0);

  // Y vuelve al restaurarla
  await page.goto("/admin/companias");
  const archivada = page
    .locator("li", { hasText: "Vega Predictiva" })
    .filter({ hasText: "Prueba de archivado" });
  await archivada.getByRole("button", { name: "Restaurar" }).click();
  await expect(page.getByText("Prueba de archivado")).toHaveCount(0);

  await page.goto("/cartera");
  await expect(
    page.getByRole("link", { name: "Vega Predictiva" }).first(),
  ).toBeVisible();
});

test("la fundadora de una compañía archivada deja de verla", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const vega = page.locator("li", { hasText: "Vega Predictiva" }).first();
  await vega.getByRole("button", { name: "Archivar" }).click();
  await vega
    .locator("form", { has: page.locator('input[name="motivo"]') })
    .getByRole("button", { name: "Archivar" })
    .click();
  await expect(page.getByRole("heading", { name: "Archivadas" })).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await entrarComo(page, USUARIOS.fundadoraVega);

  // No tiene compañía visible, así que no llega a su proyecto
  await expect(page).toHaveURL(/sin-compania|entrar/);

  // El beforeEach de la siguiente prueba la desarchiva
});

test("la ficha de una compañía se edita desde administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const raiz = page.locator("li", { hasText: "Raíz Sensórica" }).first();
  await raiz.getByRole("button", { name: "Editar" }).click();

  const formulario = raiz.locator("form", {
    has: page.locator('input[name="name"]'),
  });
  await formulario.locator('input[name="sector"]').fill("Agrotecnología de precisión");
  await formulario.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Agrotecnología de precisión")).toBeVisible();

  // Se deja como estaba
  await page
    .locator("li", { hasText: "Raíz Sensórica" })
    .first()
    .getByRole("button", { name: "Editar" })
    .click();
  await page
    .locator("li", { hasText: "Raíz Sensórica" })
    .first()
    .locator("form", { has: page.locator('input[name="name"]') })
    .locator('input[name="sector"]')
    .fill("Agrotecnología");
  await page
    .locator("li", { hasText: "Raíz Sensórica" })
    .first()
    .getByRole("button", { name: "Guardar" })
    .click();
});
