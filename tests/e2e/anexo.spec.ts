import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  crearCuenta,
  entrarComo,
  elegirSituacion,
  insertar,
} from "./entrada";

/**
 * Abrir, rellenar, proponer y firmar el Anexo de Programa, en una compañía
 * dada de alta directamente, que es la que no pasa por el embudo.
 *
 * El agujero que esto cubrió primero: la pantalla decía «todavía no hay
 * Anexo firmado» y no había forma de abrir uno. Desde el 10 nov, además,
 * ningún Anexo se firma sin que ella lo acepte: sin una fundadora con
 * cuenta no se propone, y un borrador no se firma.
 */

let slug = "";
const SELLO = Date.now();
const CORREO = `e2e.anexo.${SELLO}@ejemplo.test`;
const PERSONA = `Fundadora Anexo ${SELLO}`;

test("el Anexo se abre, se rellena, se propone, ella lo acepta y se firma", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");
  await page.getByText("Dar de alta una compañía").click();

  slug = `anexo-${SELLO}`;
  const alta = page.locator("form", { has: page.locator('input[name="slug"]') });
  await alta.locator('input[name="name"]').fill(`Sin Anexo ${SELLO}`);
  await alta.locator('input[name="slug"]').fill(slug);
  await alta.locator('select[name="stage"]').selectOption("semilla");
  await alta.locator('select[name="tech_profile"]').selectOption("software");
  await elegirSituacion(alta);
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/dada de alta/)).toBeVisible();

  await page.goto(`/cartera/${slug}/programa`);

  // Antes aquí no había nada que pulsar
  await expect(page.getByText(/Todavía no hay Anexo\./)).toBeVisible();
  await page.getByRole("button", { name: "Abrir el Anexo" }).click();

  /*
   * El acuse es la pantalla cambiada: el formulario vivía dentro de «si no
   * hay Anexo» y su propio éxito lo desmonta.
   */
  await expect(page.getByText("Borrador")).toBeVisible();
  await expect(page.getByText(/Todavía no hay Anexo\./)).toHaveCount(0);

  // Un borrador no se firma: no hay botón
  await expect(page.getByRole("button", { name: "Firmar el Anexo" })).toHaveCount(0);

  // Se rellena, y los números se escriben como los escribe una persona
  const anexo = page.locator("form", {
    has: page.locator('input[name="duration_months"]'),
  });
  await anexo.locator('input[name="duration_months"]').fill("12");
  await anexo.locator('input[name="committed_hours"]').fill("120");
  await anexo.locator('input[name="equity_pct"]').fill("7,5 %");
  await anexo.getByRole("button", { name: "Guardar el Anexo" }).click();
  await expect(page.getByText("Anexo guardado.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("120 h")).toBeVisible();
  await expect(page.getByText(/7,5 %|8 %/)).toBeVisible();

  /*
   * Sin una fundadora con cuenta no se propone: se dice por qué, y «Dar
   * acceso» está al lado. Esta compañía no viene del embudo, así que no hay
   * persona de contacto y lo que dice es dónde darla de alta.
   */
  await expect(page.getByText(/ella tiene que tener cuenta/)).toBeVisible();
  await expect(page.getByText("Proponerle el Acuerdo", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Dar acceso" }).click();
  await expect(page.getByText(/Dale de alta a la fundadora en Administración → Personas/)).toBeVisible();

  // Se le da de alta por fuera, como se haría en Personas
  const [co] = await consultar<{ id: string }>("companies", { slug: `eq.${slug}` }, "id");
  const ella = await crearCuenta(CORREO);
  await actualizar("profiles", { id: `eq.${ella}` }, { full_name: PERSONA });
  await insertar("company_members", { company_id: co.id, profile_id: ella, member_role: "fundadora" });

  await page.reload();
  await page.getByText("Proponerle el Acuerdo", { exact: true }).first().click();
  const propuesta = page.locator("form", { has: page.getByRole("button", { name: "Proponerle el Acuerdo" }) });
  // Con sociedad: firma quien la representa
  await propuesta.getByLabel(/Firma en nombre de la sociedad/).fill(PERSONA);
  await propuesta.getByRole("button", { name: "Proponerle el Acuerdo" }).click();
  await expect(page.getByText(/Propuesta de Acuerdo del .*Falta que ella la acepte/)).toBeVisible();
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);

  // Ella la acepta
  await entrarComo(page, CORREO, "/proyecto/programa");
  await page.getByRole("button", { name: "Aceptar la propuesta" }).click();
  await expect(page.getByText(/aceptada el .*Falta firmarla/)).toBeVisible();
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);

  // Y se firma
  await entrarComo(page, USUARIOS.admin, `/cartera/${slug}/programa`);
  await page.getByRole("button", { name: "Firmar el Anexo" }).click();

  /*
   * El acuse vuelve a ser la pantalla: el formulario de firma solo existe
   * mientras está aceptado, así que firmarlo lo desmonta y un mensaje no
   * lo leería nadie. Lo que se ve es lo que ha cambiado: la fecha de la
   * firma en la cabecera y ningún formulario. Desde aquí el Anexo no se
   * toca.
   */
  await expect(page.getByText(/^Firmado el \d/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Firmar el Anexo" })).toHaveCount(0);
  await expect(page.locator('input[name="duration_months"]')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(/^Firmado el \d/)).toBeVisible();
  await expect(page.locator('input[name="duration_months"]')).toHaveCount(0);
});

test.afterAll(async () => {
  if (slug) await borrar("companies", { slug });
  await borrarCuenta(CORREO);
});
