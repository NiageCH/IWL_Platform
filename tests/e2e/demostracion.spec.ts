import { expect, test } from "@playwright/test";
import { COMPANIAS, USUARIOS, actualizar, consultar, entrarComo } from "./entrada";

/**
 * La compañía de demostración se ve, pero no cuenta.
 *
 * Hace falta una compañía completa para enseñar la plataforma y para
 * comprobar que cada estado se ve como debe. El problema es que está
 * construida justo para recorrerlos todos, así que tiene por diseño
 * hallazgos críticos, hitos vencidos y un update sin entregar: los datos
 * que peor deforman una media. Si entra en los agregados, el número que
 * IWL mira para decidir lleva dentro un proyecto que no existe.
 *
 * Cada prueba **fija su punto de partida y restaura lo que encontró**. No
 * da por hecho ninguno de los dos: el seed versionado no marca ninguna
 * compañía como demostración, pero una instalación de trabajo sí —en local
 * es Marea Clínica— y una prueba que dé por supuesto cualquiera de los dos
 * estados falla en la mitad de las máquinas, o peor, se lo deja cambiado a
 * quien estuviera usándola.
 */

/** Pone `is_demo` y devuelve cómo dejarlo como estaba */
async function fijarDemo(id: string, valor: boolean): Promise<() => Promise<void>> {
  const [antes] = await consultar<{ is_demo: boolean }>(
    "companies",
    { id: `eq.${id}` },
    "is_demo",
  );

  await actualizar("companies", { id: `eq.${id}` }, { is_demo: valor });
  return () => actualizar("companies", { id: `eq.${id}` }, { is_demo: antes.is_demo });
}

test("la demostración se ve en la cartera, con su distintivo", async ({ page }) => {
  const restaurar = await fijarDemo(COMPANIAS.marea, true);

  try {
    await entrarComo(page, USUARIOS.equipoIwl, "/cartera");

    const fila = page.locator("li", { hasText: "Marea Clínica" }).first();
    await expect(fila).toBeVisible();
    await expect(fila.getByText("Demostración")).toBeVisible();
  } finally {
    await restaurar();
  }
});

test("y lleva el distintivo en su propia cabecera", async ({ page }) => {
  const restaurar = await fijarDemo(COMPANIAS.marea, true);

  try {
    await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica");
    await expect(page.getByText("Demo", { exact: true })).toBeVisible();
  } finally {
    await restaurar();
  }
});

test("pero sale de la comparativa", async ({ page }) => {
  const restaurar = await fijarDemo(COMPANIAS.marea, false);

  try {
    await entrarComo(page, USUARIOS.equipoIwl, "/comparativa");

    // Su columna en la tabla, no cualquier mención suya en la página
    const columna = page.getByRole("columnheader", { name: /Marea Clínica/ });
    await expect(columna).toBeVisible();

    await actualizar("companies", { id: `eq.${COMPANIAS.marea}` }, { is_demo: true });
    await page.reload();

    await expect(columna).toHaveCount(0);

    // Y las otras se siguen comparando: se va una, no la tabla
    await expect(
      page.getByRole("columnheader", { name: /Vega Predictiva/ }),
    ).toBeVisible();
  } finally {
    await restaurar();
  }
});

test("y sale del embudo hacia invertible", async ({ page }) => {
  const restaurar = await fijarDemo(COMPANIAS.marea, false);

  try {
    await entrarComo(page, USUARIOS.equipoIwl, "/cartera");

    /*
     * El embudo nombra a cada compañía bajo su tramo, así que se comprueba
     * por el nombre y no por un total: un total baja también si se cae otra
     * cosa, y entonces la prueba pasaría por el motivo equivocado.
     */
    const embudo = page.locator("section", { hasText: "Camino a invertible" }).first();
    await expect(embudo.getByRole("link", { name: "Marea Clínica" })).toBeVisible();

    await actualizar("companies", { id: `eq.${COMPANIAS.marea}` }, { is_demo: true });
    await page.reload();

    await expect(embudo.getByRole("link", { name: "Marea Clínica" })).toHaveCount(0);

    // Y las otras siguen ahí: lo que se va es una, no el bloque
    await expect(embudo.getByRole("link", { name: "Vega Predictiva" })).toBeVisible();
  } finally {
    await restaurar();
  }
});
