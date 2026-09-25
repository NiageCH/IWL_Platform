import { expect, test } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, entrarComo } from "./entrada";

/**
 * Hoja de ruta.
 *
 * Es la respuesta a «¿por dónde vamos?». Lo que se comprueba aquí es que las
 * dos partes ven el mismo plan y que solo IWL lo diseña: el reparto de la
 * plataforma entera, aplicado al recorrido.
 */

test("la fundadora ve su hoja de ruta con el objetivo de cada etapa", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  await expect(page.getByRole("heading", { name: "Hoja de ruta" })).toBeVisible();
  await expect(page.getByText("Entró en MVP")).toBeVisible();

  // Las etapas del recorrido «Desde el MVP», en orden
  await expect(page.getByText("1. Diagnóstico y línea base")).toBeVisible();
  await expect(page.getByText("3. Motor comercial repetible")).toBeVisible();

  // Y el objetivo, que es lo que distingue una etapa de un plazo
  await expect(
    page.getByText(/Que vender deje de depender del fundador/),
  ).toBeVisible();
});

test("la fundadora no puede rediseñar el plan", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  await expect(page.getByText("Añadir una etapa")).toHaveCount(0);
  await expect(page.getByText("Editar la etapa")).toHaveCount(0);
  await expect(page.getByText(/Añadir un hito/)).toHaveCount(0);
});

test("la fundadora sí mueve sus hitos, pero no los da por cumplidos", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  const estado = page.locator('select[name="status"]').first();
  await expect(estado).toBeVisible();
  await expect(estado.locator('option[value="en_curso"]')).toHaveCount(1);
  await expect(estado.locator('option[value="cumplido"]')).toHaveCount(0);
});

test("el equipo de IWL diseña y edita el plan", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica/ruta");

  await expect(page.getByText("Editar la etapa").first()).toBeVisible();
  await expect(
    page.getByText("Añadir un hito a esta etapa").first(),
  ).toBeVisible();

  // Y sí puede confirmar un hito
  const estado = page.locator('select[name="status"]').first();
  await expect(estado.locator('option[value="cumplido"]')).toHaveCount(1);
});

test("una compañía sin hoja de ruta invita a diseñarla, y se diseña", async ({
  page,
}) => {
  // Vega está en fase 1, todavía en diagnóstico: no tiene plan. Este test se
  // lo crea, así que se deja como estaba para poder volver a pasarlo
  await borrar("milestones", { company_id: COMPANIAS.vega });
  await borrar("roadmap_stages", { company_id: COMPANIAS.vega });

  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva/ruta");

  await expect(
    page.getByText(/todavía no tiene hoja de ruta/),
  ).toBeVisible();

  const disenar = page.locator("form", {
    has: page.locator('select[name="template_id"]'),
  });
  await disenar.locator('input[name="starts_on"]').fill("2026-04-06");
  await disenar.getByRole("button", { name: "Crear la hoja de ruta" }).click();

  /*
   * El formulario desaparece al crearse el plan, sustituido por la lista, así
   * que lo que se comprueba es el efecto y no el mensaje: la plantilla
   * sugerida fue la del estado de entrada de Vega, que entró en idea.
   */
  await expect(page.getByText("1. Validación del problema")).toBeVisible();
  await expect(page.getByText("Entró en Idea")).toBeVisible();
  await expect(page.getByText("06 abr 2026 → 31 may 2026")).toBeVisible();

  // Y ninguna etapa está abierta todavía: el plan existe, el trabajo no
  await expect(page.getByText("Etapa que toca")).toBeVisible();
  await expect(
    page.getByText("Por calendario. Nadie la ha abierto todavía"),
  ).toBeVisible();
});

test("añadir una etapa exige decir qué se persigue en ella", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica/ruta");

  await page.getByText("Añadir una etapa").click();

  const alta = page.locator("form", {
    has: page.locator('input[name="order_index"]'),
  });
  await alta.locator('input[name="name"]').fill("Etapa sin rumbo");
  await alta.locator('textarea[name="objective"]').fill("Corto");
  await alta.getByRole("button", { name: "Añadir etapa" }).click();

  await expect(page.getByText(/Sin objetivo, una etapa es solo un plazo/)).toBeVisible();
});

test("los recorridos se configuran desde administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/rutas");

  await expect(
    page.getByRole("heading", { name: "Recorridos del programa" }),
  ).toBeVisible();

  // Los tres del catálogo inicial, uno por estado de entrada
  await expect(page.getByRole("heading", { name: "Desde la idea" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Desde el MVP" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Con facturación" }),
  ).toBeVisible();

  // Y se explica por qué tocarlos aquí no rompe nada en marcha
  await expect(
    page.getByText(/no toca ninguna hoja de ruta en marcha/),
  ).toBeVisible();
});

test("el equipo de IWL no llega a configurar los recorridos", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl);
  await page.goto("/admin/rutas");
  await expect(page).toHaveURL(/\/cartera/);
});

test.afterAll(async () => {
  /*
   * Los hitos también, y primero.
   *
   * Borrar una etapa no borra sus hitos —la columna es `on delete set null`,
   * a propósito— así que limpiar solo las etapas dejaba hitos sueltos que
   * luego contaban en el eje de plan de otras pruebas.
   */
  await borrar("milestones", { company_id: COMPANIAS.vega });
  await borrar("roadmap_stages", { company_id: COMPANIAS.vega });
});
