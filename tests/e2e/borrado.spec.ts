import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  consultar,
  entrarComo,
  ficherosEn,
  subirFichero,
} from "./entrada";

/**
 * Borrar una compañía con todo lo que tiene dentro.
 *
 * Es la única operación de la plataforma sin vuelta atrás, y se pide cuando
 * hay que limpiar: pruebas, altas duplicadas, un proyecto que nunca llegó a
 * entrar. Lo que se comprueba aquí no es que la fila desaparezca —eso lo
 * hace Postgres solo— sino que no queda nada suelto detrás.
 *
 * Los ficheros son el punto ciego: viven en Storage, que no sabe nada de
 * claves ajenas. Borrada la compañía nadie los referencia, así que ni se
 * ven ni hay por dónde llegar a ellos, pero siguen ocupando y una dirección
 * firmada que alguien guardara seguiría abriéndolos.
 */
/** Un PNG de 1x1 transparente: el bucket de logos solo acepta imágenes. */
const PNG_DE_UN_PIXEL = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

test("borrar una compañía con todo se lleva también sus ficheros", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const slug = `borrado-${Date.now()}`;

  await page.getByText("Dar de alta una compañía").click();
  const alta = page.locator("form", { has: page.locator('input[name="slug"]') });
  await alta.locator('input[name="name"]').fill("Compañía que se borra");
  await alta.locator('input[name="slug"]').fill(slug);
  await alta.locator('select[name="stage"]').selectOption("semilla");
  await alta.locator('select[name="tech_profile"]').selectOption("software");
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/dada de alta, con su checklist/)).toBeVisible();

  const [compania] = await consultar<{ id: string }>(
    "companies",
    { slug: `eq.${slug}`, limit: "1" },
    "id",
  );

  /*
   * El escenario se monta por la puerta de atrás a propósito: lo que se
   * prueba es el borrado, no la subida, y así la prueba no depende de que
   * el formulario del logo siga donde está.
   */
  const logo = `${compania.id}/logo.png`;
  await subirFichero("logos", logo, PNG_DE_UN_PIXEL, "image/png");
  await actualizar("companies", { id: `eq.${compania.id}` }, { logo_path: logo });

  expect(await ficherosEn("logos", compania.id)).toHaveLength(1);

  await page.reload();

  /*
   * Por el camino corriente, que es el que se usa limpiando: una compañía
   * creada por error no tiene horas ni documentos ni hitos, así que no
   * ofrece «Borrar con su histórico» sino «Borrar» a secas. El logo no
   * cuenta como contenido —por eso este camino es el que más ficheros
   * dejaba sueltos, no el otro—.
   */
  const fila = page.locator("li", { hasText: "Compañía que se borra" }).first();
  await fila.getByRole("button", { name: "Borrar", exact: true }).click();
  await fila.locator('input[name="confirmacion"]').fill(slug);
  await fila.getByRole("button", { name: "Borrar definitivamente" }).click();

  /*
   * El acuse es la pantalla cambiada, no un mensaje: el formulario vive
   * dentro de la fila que su propio éxito hace desaparecer, así que al
   * borrar se desmonta y se lleva consigo cualquier cosa que dijera.
   */
  await expect(
    page.locator("li", { hasText: "Compañía que se borra" }),
  ).toHaveCount(0);

  // La compañía ya no está...
  expect(await consultar("companies", { slug: `eq.${slug}` }, "id")).toHaveLength(0);

  // ...y su logo tampoco, que es lo que esta prueba vigila
  expect(await ficherosEn("logos", compania.id)).toHaveLength(0);
});

/**
 * Lo normal con una compañía que tiene trabajo registrado es archivarla, y
 * el borrado corriente se niega. Esa negativa es la que protege el extracto
 * de aportación, que justifica una participación.
 */
test("una compañía con histórico no se borra sin pedirlo expresamente", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const fila = page.locator("li", { hasText: "Marea Clínica" }).first();

  await expect(fila.getByText(/Archivar/)).toBeVisible();
  await expect(fila.getByText(/Borrar con su histórico/)).toBeVisible();

  // Y al abrirlo, lo primero que dice es que archive
  await fila.getByText(/Borrar con su histórico/).click();
  await expect(fila.getByText(/Lo normal con una compañía/)).toBeVisible();
  await expect(fila.getByText(/No tiene vuelta atrás/)).toBeVisible();
});
