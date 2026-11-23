import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, borrarCuenta, crearCuenta, actualizar, entrarComo, insertar } from "./entrada";

/**
 * El cierre (REVISION, 22 nov · bloque 8), con una compañía recién creada:
 * dirección la cierra desde su ficha, desaparece de la cartera y queda en
 * el Histórico; ella pierde el acceso y se queda con sus documentos.
 * Cerrar no tiene vuelta atrás, así que la compañía se borra entera al
 * acabar, con su cuenta.
 */

const ORGANIZACION = "00000000-0000-0000-0001-000000000001";
const COHORTE = "00000000-0000-0000-0003-000000000001";

test("dirección cierra una compañía: sale de la cartera, queda en el Histórico y ella conserva sus documentos", async ({ page }) => {
  const sello = `${Date.now()}-${test.info().project.name}`;
  const nombre = `Cierre E2E ${sello}`;
  const correo = `e2e.cierre.${sello}@ejemplo.test`;
  const c = await insertar<{ id: string; slug: string }>("companies", {
    organization_id: ORGANIZACION,
    cohort_id: COHORTE,
    name: nombre,
    slug: `cierre-e2e-${sello}`.toLowerCase(),
    tramo: "incubacion",
    entry_state: "facturando",
  });
  try {
    const ella = await crearCuenta(correo);
    await actualizar("profiles", { id: `eq.${ella}` }, { role: "fundadora", full_name: "Fundadora" });
    await insertar("company_members", { company_id: c.id, profile_id: ella, member_role: "fundadora" });

    // Dirección, desde la ficha
    await entrarComo(page, USUARIOS.admin, `/cartera/${c.slug}`);
    const cierre = page.locator("#cierre");
    await cierre.getByText("Cerrar la compañía").first().click();
    await cierre.getByLabel(/Finalizada · Salida/).check();
    await cierre.getByLabel("Motivo").fill("Terminó el plazo sin llegar a ser invertible.");
    await cierre.getByRole("button", { name: "Cerrar la compañía" }).click();

    // El acuse es el Histórico, donde queda
    await expect(page).toHaveURL(/\/admin\/historico/);
    const ficha = page.locator(`[id="${c.slug}"]`);
    await expect(ficha.getByRole("heading", { name: nombre })).toBeVisible();
    await expect(ficha.getByText("Finalizada · Salida")).toBeVisible();
    await expect(ficha.getByText("Terminó el plazo sin llegar a ser invertible.")).toBeVisible();

    // Su ficha ya no se abre: lleva al Histórico
    await page.goto(`/cartera/${c.slug}`);
    await expect(page).toHaveURL(/\/admin\/historico/);

    // El equipo no la encuentra
    await entrarComo(page, USUARIOS.equipoIwl, "/cartera");
    await expect(page.getByText(nombre)).toHaveCount(0);
    const respuesta = await page.goto(`/cartera/${c.slug}`);
    expect(respuesta?.status()).toBe(404);

    // Ella pierde el acceso y se queda con sus documentos
    await entrarComo(page, correo, "/proyecto");
    await expect(page).toHaveURL(/\/sin-compania/);
    await expect(page.getByRole("heading", { name: "Tu paso por el programa ha terminado" })).toBeVisible();
    await expect(page.getByText(nombre)).toBeVisible();
  } finally {
    await borrar("activity_log", { company_id: c.id });
    await borrar("companies", { id: c.id });
    await borrarCuenta(correo);
  }
});
