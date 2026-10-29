import { expect, test } from "@playwright/test";
import { USUARIOS, actualizar, consultar, entrarComo } from "./entrada";

/**
 * Corregir los datos de una startup.
 *
 * «Necesito que los datos de las startups los pueda editar. Por ejemplo si
 * quiero cambiar el nombre.»
 *
 * Se podía, pero solo desde Administración y sabiendo que estaba allí: en
 * la ficha de la compañía, que es donde uno está mirando cuando se da
 * cuenta de que el nombre está mal, no había nada que pulsar. Y en el
 * embudo no se podía en absoluto: `editarCandidatura` era otra acción sin
 * botón.
 */

const MAREA = "00000000-0000-0000-0004-000000000001";
const BROTA = "00000000-0000-0000-0005-000000000001";

test("desde la ficha de la compañía se llega a editarla, ya abierta", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  /*
   * Los enlaces sueltos de la cabecera pasan a un único menú de acciones.
   * Eran tres compitiendo con el nombre de la compañía, y cada acción
   * nueva empujaba a la siguiente.
   */
  await page.getByRole("button", { name: "Acciones" }).click();
  await page.getByRole("menuitem", { name: "Editar la ficha" }).click();

  // Llega al formulario de esa compañía, abierto: no hay que buscar la fila
  await expect(page).toHaveURL(/\/admin\/companias\?editar=marea-clinica/);

  /*
   * Se acota a su fila por el ancla.
   *
   * En esta pantalla hay más formularios con un campo «name» —el alta de
   * una compañía, el alta de una cohorte—, así que buscarlo por el nombre
   * del campo coge tres a la vez.
   */
  const fila = page.locator("li#marea-clinica");
  await expect(fila.locator('input[name="name"]')).toHaveValue("Marea Clínica");
});

test("se cambia el nombre de una compañía, y los campos que faltaban", async ({
  page,
}) => {
  await entrarComo(
    page,
    USUARIOS.admin,
    "/admin/companias?editar=marea-clinica",
  );

  /* Dentro de su fila, el formulario que lleva la web: el primero es el
     del logo */
  const formulario = page
    .locator("li#marea-clinica")
    .locator("form", { has: page.locator('input[name="website"]') });

  await formulario.locator('input[name="name"]').fill("Marea Clínica Salud");

  /*
   * Los tres que estaban en la tabla y no se podían tocar desde ninguna
   * pantalla.
   */
  await formulario.locator('input[name="website"]').fill("https://marea.test");
  await formulario.locator('input[name="founded_on"]').fill("2024-03-15");
  await formulario
    .locator('input[name="female_leadership_pct"]')
    .fill("60 %");

  await formulario.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Ficha actualizada.")).toBeVisible();

  const [c] = await consultar<{
    name: string;
    website: string | null;
    founded_on: string | null;
    female_leadership_pct: number | null;
  }>(
    "companies",
    { id: `eq.${MAREA}` },
    "name,website,founded_on,female_leadership_pct",
  );

  expect(c.name).toBe("Marea Clínica Salud");
  expect(c.website).toBe("https://marea.test");
  expect(c.founded_on).toBe("2024-03-15");
  // El porcentaje se escribe como lo escribe una persona
  expect(Number(c.female_leadership_pct)).toBe(60);
});

test("en el embudo se corrigen los datos de una candidatura", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, `/embudo/${BROTA}`);

  await page.getByRole("button", { name: "Corregir los datos" }).click();

  const formulario = page.locator("form", {
    has: page.locator('input[name="contacto_telefono"]'),
  });
  await expect(formulario).toHaveCount(1);
  await formulario.locator('input[name="nombre"]').fill("Brota Nombre Nuevo");
  await formulario.locator('input[name="pais"]').fill("Portugal");
  await formulario.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText(/Guardado|actualizada/i)).toBeVisible();

  const [c] = await consultar<{ nombre: string; pais: string | null }>(
    "candidaturas",
    { id: `eq.${BROTA}` },
    "nombre,pais",
  );
  expect(c.nombre).toBe("Brota Nombre Nuevo");
  expect(c.pais).toBe("Portugal");
});

test("desde la compañía también se llega a archivarla o darla de baja", async ({
  page,
}) => {
  /*
   * Tercera vez que Rodrigo busca desde la ficha algo que vive en
   * Administración: primero cambiar el nombre, luego restablecer una
   * contraseña, ahora dar de baja una startup. El sitio donde uno se da
   * cuenta de que hay que hacer algo es la ficha, no el panel.
   */
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  await page.getByRole("button", { name: "Acciones" }).click();
  await page.getByRole("menuitem", { name: "Archivar o dar de baja" }).click();

  // Cae en su fila, con las dos opciones a mano
  await expect(page).toHaveURL(/\/admin\/companias#marea-clinica/);
  const fila = page.locator("li#marea-clinica");
  await expect(fila.getByRole("button", { name: "Archivar" })).toBeVisible();
  await expect(
    fila.getByRole("button", { name: /Borrar/ }),
  ).toBeVisible();
});

/*
 * Se deja todo como estaba: las dos filas son de la semilla, así que se
 * restauran por fuera del camino que se acaba de probar.
 */
test.afterAll(async () => {
  await actualizar(
    "companies",
    { id: `eq.${MAREA}` },
    {
      name: "Marea Clínica",
      website: null,
      founded_on: null,
      female_leadership_pct: null,
    },
  );
  await actualizar(
    "candidaturas",
    { id: `eq.${BROTA}` },
    { nombre: "Brota Analítica", pais: null },
  );
});
