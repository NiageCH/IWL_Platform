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
  // El equity no se redondea nunca, ni en la ficha ni en el campo (REVISION, 11 nov)
  await expect(page.getByText(/^7,5\s%$/)).toBeVisible();
  await expect(anexo.locator('input[name="equity_pct"]')).toHaveValue("7,5");

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

  // Lo propuesto y lo firmado quedan como copia, para leer
  await page.getByText("Historial de versiones · 2").click();
  await expect(page.getByText("Propuesto · versión 1")).toBeVisible();
  await expect(page.getByText("Firmado · versión 1")).toBeVisible();
  await expect(page.getByText(/Equity 7,5\s% · 120 h/).first()).toBeVisible();
});

test.afterAll(async () => {
  if (slug) await borrar("companies", { slug });
  await borrarCuenta(CORREO);
});

/**
 * El Anexo, más corto (REVISION, 10 nov): sin «Perfiles sénior», con el
 * valor de las horas y el fin calculados. La tarifa es un ajuste de toda la
 * plataforma: se lee antes y se restaura en el `finally`.
 */
test("el valor de las horas sale de la tarifa del programa y el fin, de la duración", async ({ page }) => {
  const sello = `${Date.now()}t`;
  const [antes] = await consultar<{ value: unknown }>("platform_settings", { key: "eq.anexo_tarifa_hora" }, "value");
  const [modelo] = await consultar<{ organization_id: string }>(
    "companies",
    { slug: "eq.marea-clinica" },
    "organization_id",
  );
  const co = await insertar<{ id: string; slug: string }>("companies", {
    organization_id: modelo.organization_id,
    name: `Anexo Tarifa ${sello}`,
    slug: `anexo-tarifa-${sello}`,
    stage: "semilla",
    tech_profile: "software",
  });

  try {
    // Dirección fija la tarifa en Programa, con su botón
    await entrarComo(page, USUARIOS.admin, "/admin/programa");
    const ajuste = page.locator("form", { has: page.getByRole("button", { name: "Guardar la tarifa del Anexo" }) });
    await ajuste.getByLabel(/Tarifa para valorar el Anexo/).fill("75");
    await ajuste.getByRole("button", { name: "Guardar la tarifa del Anexo" }).click();
    await expect(ajuste.getByText(/Guardada\. Los Anexos en borrador valoran sus horas con ella/)).toBeVisible();

    await page.goto(`/cartera/${co.slug}/programa`);
    await page.getByRole("button", { name: "Abrir el Anexo" }).click();
    const anexo = page.locator("form", { has: page.locator('input[name="duration_months"]') });
    await expect(anexo.getByText("Perfiles sénior")).toHaveCount(0);

    // Se calcula mientras se escribe
    await anexo.locator('input[name="committed_hours"]').fill("120");
    await expect(anexo.getByText(/9\.000\s*€/)).toBeVisible();
    await anexo.locator('input[name="duration_months"]').fill("6");
    await anexo.locator('input[name="starts_on"]').fill("2026-12-01");
    await expect(anexo.getByText("31 may 2027")).toBeVisible();
    await expect(anexo.locator('input[name="ends_on"]')).toHaveCount(0);
    await anexo.getByRole("button", { name: "Guardar el Anexo" }).click();
    await expect(page.getByText("Anexo guardado.")).toBeVisible();

    const [guardado] = await consultar<{ committed_hours_value: number; ends_on: string; committed_hours_value_motivo: string | null }>(
      "annexes",
      { company_id: `eq.${co.id}` },
      "committed_hours_value,ends_on,committed_hours_value_motivo",
    );
    expect(guardado).toEqual({ committed_hours_value: 9000, ends_on: "2027-05-31", committed_hours_value_motivo: null });

    // Otro valor pide el motivo, y el motivo va con el Anexo
    await anexo.getByLabel("Poner otro valor que el calculado").check();
    await anexo.locator('input[name="committed_hours_value"]').fill("8000");
    await anexo.getByRole("button", { name: "Guardar el Anexo" }).click();
    await expect(anexo.getByText(/Escribe por qué no es el valor calculado/)).toBeVisible();
    await anexo.getByLabel(/Por qué otro valor/).fill("Veinte horas las pone la red de mentoras sin coste.");
    await anexo.getByRole("button", { name: "Guardar el Anexo" }).click();
    await expect(page.getByText("Anexo guardado.")).toBeVisible();

    await page.reload();
    await expect(
      page.getByText(/Valoradas en 8\.000\s*€, no con la tarifa del programa: Veinte horas las pone la red/),
    ).toBeVisible();
    // Sin financiación escrita, se dice
    await expect(page.getByText("Sin financiación", { exact: true })).toBeVisible();
  } finally {
    await actualizar("platform_settings", { key: "eq.anexo_tarifa_hora" }, { value: antes?.value ?? { euros_hora: null } });
    await borrar("companies", { id: co.id });
  }
});
