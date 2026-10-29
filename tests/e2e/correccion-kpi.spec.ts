import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  consultar,
  entrarComo,
} from "./entrada";

/**
 * Corregir un mes de KPI ya enviado.
 *
 * No se podía: la pantalla de carga calcula sola «el siguiente al último
 * con datos», así que un MRR mal tecleado quedaba mal para siempre y
 * arrastraba el runway, el crecimiento y la comparativa. La acción existía
 * desde el principio y no tenía por dónde llamarse.
 */

const MAREA = "00000000-0000-0000-0004-000000000001";

/**
 * El MRR que la semilla deja en el último mes, para devolverlo al acabar.
 *
 * Se guarda también **de qué fila** era: la primera versión de esta
 * limpieza filtraba solo por compañía y mes, así que al restaurar ponía el
 * MRR en todos los KPI de ese mes. Lo destapó la segunda pasada.
 */
let original: number | null = null;
let mesTocado = "";
let filaMrr = "";
/** El mes que la segunda prueba crea y cierra, para borrarlo al acabar */
let mesRevisado = "";

test("un MRR mal tecleado se corrige y la comparativa cambia", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/kpi");

  const bloque = page
    .locator("section")
    .filter({ hasText: "Corregir un mes" })
    .first();

  // El mes más reciente cargado, que la semilla deja sin revisar
  const fila = bloque.locator("li").first();
  mesTocado = (await fila.locator("span").first().innerText()).trim();

  const [antes] = await consultar<{ id: string; value: string }>(
    "kpi_values",
    {
      company_id: `eq.${MAREA}`,
      period: `eq.${mesTocado}-01`,
      "company_kpis.kpi_definitions.code": "eq.mrr",
      select: "id,value,company_kpis!inner(kpi_definitions!inner(code))",
    },
    "id,value,company_kpis!inner(kpi_definitions!inner(code))",
  );
  original = antes ? Number(antes.value) : null;
  filaMrr = antes?.id ?? "";

  await fila.getByRole("button", { name: "Corregir este mes" }).click();

  const campo = bloque.locator("form", { has: page.getByText("MRR") }).first();
  await campo.locator('input[name="value"]').fill("999999");
  await campo.locator('input[name="note"]').fill("Prueba: MRR mal tecleado.");
  await campo.getByRole("button", { name: "Corregir" }).click();

  await expect(page.getByText(/Corregido\./)).toBeVisible();

  // El valor nuevo está en la base
  const [despues] = await consultar<{ value: string }>(
    "kpi_series",
    { company_id: `eq.${MAREA}`, code: "eq.mrr", period: `eq.${mesTocado}-01` },
    "value",
  );
  expect(Number(despues.value)).toBe(999999);

  /*
   * Y queda el rastro: qué decía antes, qué dice ahora, quién y cuándo.
   * Lo escribe un disparador, no la acción, así que una corrección por
   * otro camino tampoco se escapa.
   */
  await page.reload();
  await page.getByText("Historial de correcciones").click();
  await expect(page.getByText(/→ 999999|→ 999\.999/)).toBeVisible();

  /*
   * Lo que de verdad importa: la comparativa de IWL lee el valor corregido.
   * Antes no había forma de llegar aquí, así que un número mal tecleado se
   * quedaba dentro de las medias de la cohorte para siempre.
   */
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);
  await entrarComo(page, USUARIOS.admin, "/comparativa");

  await expect(page.getByText(/999\.999|999999/).first()).toBeVisible();
});

test("un mes que IWL ya revisó no lo corrige la compañía", async ({
  page,
}) => {
  /*
   * Lo impide un disparador, no la pantalla: alguien pudo tomar una
   * decisión con ese número. Se recorre el camino de verdad —IWL carga el
   * mes y lo da por revisado— en vez de marcarlo por detrás, que además la
   * base no deja sin sesión.
   */
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/kpi");

  const carga = page.locator("form", {
    has: page.locator('input[name="period"]'),
  });
  mesRevisado = await carga.first().locator('input[name="period"]').inputValue();

  // Un valor cualquiera, para que el mes exista como cargado
  const primerKpi = carga.first().locator('input[inputmode="decimal"]').first();
  await primerKpi.fill("1000");
  await carga.first().getByRole("button").last().click();
  await expect(page.getByText(/Valores guardados|guardado/i).first()).toBeVisible();

  // Y se da por revisado, que es lo que cierra el mes
  const update = page.locator("form", {
    has: page.locator('select[name="status"]'),
  });
  await update.locator('select[name="status"]').selectOption("revisado");
  await update.getByRole("button", { name: /Guardar update/ }).click();
  await expect(page.getByText(/Update guardado|guardado/i).first()).toBeVisible();

  // La fundadora lo ve cerrado y sin forma de tocarlo
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/kpi");

  const fila = page.locator("li").filter({ hasText: mesRevisado }).first();
  await expect(fila.getByText(/que lo reabran/)).toBeVisible();
  await expect(
    fila.getByRole("button", { name: "Corregir este mes" }),
  ).toHaveCount(0);

  // Y la salida es que IWL lo reabra
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/kpi");

  const deIwl = page.locator("li").filter({ hasText: mesRevisado }).first();
  await deIwl.getByRole("button", { name: "Reabrir para corregir" }).click();

  await page.reload();
  const trasReabrir = page.locator("li").filter({ hasText: mesRevisado }).first();
  await expect(
    trasReabrir.getByRole("button", { name: "Corregir este mes" }),
  ).toBeVisible();
});

test.afterAll(async () => {
  /*
   * Se deja la semilla como estaba. Lo que estas pruebas crearon se borra
   * —el mes que cargó la segunda— y lo que encontraron se restaura —el MRR
   * que corrigió la primera—.
   */
  if (filaMrr && original !== null) {
    await actualizar("kpi_values", { id: `eq.${filaMrr}` }, { value: original });
  }

  if (mesRevisado) {
    await borrar("kpi_values", {
      company_id: MAREA,
      period: `${mesRevisado}-01`,
    });
    await borrar("monthly_updates", {
      company_id: MAREA,
      period: `${mesRevisado}-01`,
    });
  }

  await borrar("kpi_value_history", { company_id: MAREA });
});
