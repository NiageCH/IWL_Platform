import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * El logo de una compañía.
 *
 * Sale en la cartera, en los siguientes pasos y en los scorecards, y
 * sustituye al cuadro con las iniciales. Se pone desde administración, que
 * es la única pantalla donde se toca: es un dato de ficha y las fichas las
 * lleva IWL.
 *
 * La prueba recorre el ciclo entero —poner, ver y quitar— porque cada tramo
 * pasa por un sitio distinto: la política de Storage, la acción de servidor,
 * la columna de la ficha y la firma de la dirección al leer. Que funcione
 * uno no dice nada de los demás.
 */

/*
 * Un PNG de 1×1 en memoria. No hace falta que se parezca a un logo: lo que
 * se prueba es el camino, y un fichero de verdad en el repositorio sería un
 * binario que nadie sabría por qué está ahí.
 */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function abrirPanelDeLogo(page: import("@playwright/test").Page) {
  const boton = page
    .getByRole("button", { name: /Poner un logo|Cambiar el logo/ })
    .first();
  await boton.click();
  return boton;
}

test("la dirección pone el logo de una compañía y luego lo quita", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  await abrirPanelDeLogo(page);

  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "logo-de-prueba.png",
      mimeType: "image/png",
      buffer: PNG,
    });

  await page.getByRole("button", { name: "Subir", exact: true }).first().click();
  await expect(page.getByText("Logo actualizado.")).toBeVisible();

  /*
   * Y se ve. El chip pasa de ser un cuadro con iniciales a una imagen: lo
   * que se comprueba es que hay un `<img>`, no cómo se llama el fichero,
   * porque la ruta lleva marca de tiempo para saltarse la caché.
   */
  const conLogo = page.locator("img").first();
  await expect(conLogo).toBeVisible();

  /*
   * Se limpia por el mismo camino que ofrece la pantalla, y sin volver a
   * pulsar el control: el panel se queda abierto a propósito después de
   * subir, para que se lea la confirmación. Pulsarlo otra vez lo cerraría.
   */
  await page
    .getByRole("button", { name: /Quitar el logo/ })
    .first()
    .click();
  await expect(page.getByText(/Logo quitado/)).toBeVisible();
});

test("una fundadora no puede poner el logo de su compañía", async ({
  page,
}) => {
  /*
   * El logo es un dato de ficha. Una fundadora carga su business plan y sus
   * documentos, pero no cambia cómo sale su compañía en la cartera de IWL.
   * Lo impide la política de Storage, no la pantalla: aquí solo se comprueba
   * que la pantalla tampoco lo ofrece.
   */
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");

  await expect(
    page.getByRole("button", { name: /Poner un logo|Cambiar el logo/ }),
  ).toHaveCount(0);
});
