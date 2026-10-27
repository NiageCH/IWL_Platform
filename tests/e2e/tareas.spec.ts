import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, entrarComo } from "./entrada";

/**
 * Encargar trabajo y que se vea quién lo tiene.
 *
 * «Quiero asignar x tarea de auditoría técnica a Juan Mishima, o al
 * fundador, o a un tercero.» No tenía respuesta: la tabla, las políticas y
 * el disparador que decide quién asigna a quién llevaban desde septiembre
 * sin una sola pantalla.
 */

const TITULO = `Auditoría técnica del repositorio ${Date.now()}`;

test("IWL encarga una tarea y la asigna a una persona", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  await page.getByRole("button", { name: "Encargar una tarea" }).click();

  const alta = page.locator("form", { has: page.locator('input[name="title"]') });
  await alta.locator('input[name="title"]').fill(TITULO);
  await alta
    .locator('textarea[name="description"]')
    .fill("Revisar dependencias, secretos y cobertura.");
  await alta.locator('select[name="owner_id"]').selectOption({ index: 1 });
  await alta.locator('input[name="due_date"]').fill("2026-12-15");
  await alta.getByRole("button", { name: "Encargar" }).click();

  await expect(page.getByText("Tarea asignada.")).toBeVisible();

  // Y aparece en la lista, con su dueño y su fecha
  const fila = page.locator("li").filter({ hasText: TITULO }).first();
  await expect(fila).toBeVisible();
  await expect(fila.locator("select").first()).not.toHaveValue("");
});

test("la tarea se mueve de estado y se cierra", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  const fila = page.locator("li").filter({ hasText: TITULO }).first();
  const estado = fila.locator('select[name="status"]');

  await estado.selectOption("en_curso");
  await expect(estado).toHaveValue("en_curso");

  await estado.selectOption("hecha");

  /*
   * Al cerrarse baja al plegable de cerradas: lo abierto es lo accionable
   * y es lo que tiene que ocupar sitio.
   */
  await expect(page.getByText(/1 cerrada/)).toBeVisible();
});

test("la fundadora no le encarga trabajo a IWL", async ({ page }) => {
  /*
   * Lo impide un disparador, no la pantalla: sin él, la lista de
   * pendientes de la mentoría la llenaría la compañía. Pedir algo al
   * programa tiene su sitio, que es el update mensual.
   */
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");

  await page.getByRole("button", { name: "Encargar una tarea" }).click();
  const alta = page.locator("form", { has: page.locator('input[name="title"]') });
  await alta.locator('input[name="title"]').fill("Que lo haga IWL");

  const opciones = await alta.locator('select[name="owner_id"] option').count();
  if (opciones > 1) {
    await alta.locator('select[name="owner_id"]').selectOption({ index: 1 });
    await alta.getByRole("button", { name: "Encargar" }).click();
    await expect(page.getByText(/es de IWL o de quien coordina/)).toBeVisible();
  }
});

test.afterAll(async () => {
  await borrar("tasks", { title: TITULO });
  await borrar("tasks", { title: "Que lo haga IWL" });
});
