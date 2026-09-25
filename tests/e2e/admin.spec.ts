import { expect, test } from "@playwright/test";
import { AJUSTES_BASE, USUARIOS, ajustar, entrarComo } from "./entrada";

/**
 * Administración.
 *
 * Solo la dirección de IWL. Lo importante es que dar de alta una compañía la
 * deje lista para trabajar, no solo creada: sin checklist, sin secciones y sin
 * KPI, una compañía es una ficha vacía.
 */

test("solo la dirección de IWL entra en administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl);
  await page.goto("/admin/companias");
  await expect(page).toHaveURL(/\/cartera/);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/entrar/);

  await entrarComo(page, USUARIOS.admin, "/admin/companias");
  await expect(page.getByRole("heading", { name: "Administración" })).toBeVisible();
});

test("una fundadora no llega a administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);
  await page.goto("/admin/companias");
  await expect(page).toHaveURL(/\/proyecto/);
});

test("dar de alta una compañía la deja lista para trabajar", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const slug = `prueba-${Date.now()}`;

  await page.getByText("Dar de alta una compañía").click();

  const alta = page.locator("form", { has: page.locator('input[name="slug"]') });
  await alta.locator('input[name="name"]').fill("Compañía de prueba");
  await alta.locator('input[name="slug"]').fill(slug);
  await alta.locator('select[name="stage"]').selectOption("semilla");
  await alta.locator('select[name="tech_profile"]').selectOption("hardware");
  await alta.getByRole("button", { name: "Dar de alta" }).click();

  await expect(page.getByText(/dada de alta, con su checklist/)).toBeVisible();

  // Y la compañía tiene con qué trabajar desde el primer momento
  await page.goto(`/cartera/${slug}/diligencia`);
  await expect(page.getByText("Societario y legal").first()).toBeVisible();

  await page.goto(`/cartera/${slug}/plan`);
  await expect(page.getByText("Necesidad de capital").first()).toBeVisible();

  await page.goto(`/cartera/${slug}/kpi`);
  await expect(page.getByText(/Cargar los KPI del mes/)).toBeVisible();
});

test("el identificador se valida antes de crear nada", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  await page.getByText("Dar de alta una compañía").click();
  const alta = page.locator("form", { has: page.locator('input[name="slug"]') });

  await alta.locator('input[name="name"]').fill("Con identificador repetido");
  await alta.locator('input[name="slug"]').fill("marea-clinica");
  await alta.getByRole("button", { name: "Dar de alta" }).click();

  await expect(
    page.getByText(/identificador está ocupado|Ya hay una compañía/).first(),
  ).toBeVisible();
});

test("los umbrales del estado invertible se tocan desde aquí", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/programa");

  const umbrales = page.locator("form", {
    has: page.locator('input[name="score_tecnico_minimo"]'),
  });

  await expect(umbrales.locator('input[name="score_tecnico_minimo"]')).toHaveValue("80");

  await umbrales.locator('input[name="score_tecnico_minimo"]').fill("85");
  await umbrales.getByRole("button", { name: /Guardar umbrales/ }).click();

  await expect(page.getByText(/Umbrales guardados/)).toBeVisible();
  await page.reload();
  await expect(umbrales.locator('input[name="score_tecnico_minimo"]')).toHaveValue("85");
});

// Se restaura por fuera: si se hiciera con el mismo formulario y el test se
// cortase antes, la siguiente pasada fallaría por el valor que dejó esta
test.afterEach(async () => {
  await ajustar("umbrales_invertible", AJUSTES_BASE.umbrales_invertible);
});

test("las bandas no se guardan si los cortes están desordenados", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/programa");

  const bandas = page.locator("form", {
    has: page.locator('input[name="inicio_hasta"]'),
  });

  await bandas.locator('input[name="inicio_hasta"]').fill("90");
  await bandas.getByRole("button", { name: /Guardar bandas/ }).click();

  await expect(page.getByText(/de menor a mayor/)).toBeVisible();
});

test("los niveles objetivo se editan y explican qué significan", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/evaluacion");

  await expect(page.getByText("Niveles objetivo")).toBeVisible();
  await expect(page.getByText(/El score mide la distancia a estos números/)).toBeVisible();

  // Las dimensiones que no aplican siempre se marcan como tales
  await expect(page.getByText("Solo con IA").first()).toBeVisible();
  await expect(page.getByText("Solo hardware").first()).toBeVisible();
});

test("el rol y la asignación se explican, porque no son lo mismo", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  await expect(page.getByText(/rol.*dice qué puede hacer/)).toBeVisible();
  await expect(
    page.getByText(/un revisor de Niage sin asignación no ve nada/),
  ).toBeVisible();
});
