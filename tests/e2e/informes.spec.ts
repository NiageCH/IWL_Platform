import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Informes.
 *
 * Son lo único de la plataforma que sale de ella, así que lo que se comprueba
 * no es solo que la página cargue: se genera el PDF de verdad y se mira qué
 * sale en él. Un informe que se ve bien en pantalla y sale roto en papel no
 * sirve para nada, y eso no lo detecta ninguna aserción sobre el DOM.
 *
 * `page.pdf()` solo existe en Chromium, así que estas pruebas se saltan en el
 * proyecto móvil, donde además no tienen sentido.
 */

const TIPOS = [
  { tipo: "tecnico", titulo: "Informe técnico interno" },
  { tipo: "tecnico-inversor", titulo: "Informe de due diligence técnico" },
  { tipo: "aportacion", titulo: "Extracto de aportación" },
  { tipo: "mensual", titulo: "Informe de" },
] as const;

for (const { tipo, titulo } of TIPOS) {
  test(`el informe «${tipo}» se genera y sale en PDF`, async ({
    page,
    browserName,
  }, info) => {
    test.skip(browserName !== "chromium", "page.pdf() es de Chromium");
    test.skip(info.project.name === "movil", "Un informe no se imprime desde el móvil");

    await entrarComo(page, USUARIOS.equipoIwl, `/informe/${tipo}/marea-clinica`);

    await expect(page.getByRole("heading", { name: new RegExp(titulo) })).toBeVisible();

    // En pantalla hay botón; en papel no tiene que salir
    const boton = page.getByRole("button", { name: /Imprimir o guardar en PDF/ });
    await expect(boton).toBeVisible();

    await page.emulateMedia({ media: "print" });
    await expect(boton).toBeHidden();

    const pdf = await page.pdf({ format: "A4", printBackground: true });

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    // Un informe con contenido no baja de unas decenas de kilobytes
    expect(pdf.byteLength).toBeGreaterThan(20_000);

    await page.emulateMedia({ media: "screen" });
  });
}

test("el informe de inversor no lleva el detalle de los hallazgos abiertos", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/informe/tecnico/marea-clinica");

  // La versión interna sí lleva la recomendación de cada hallazgo
  await expect(page.getByText("Recomendación").first()).toBeVisible();
  const interno = await page.locator("article").innerText();

  await page.goto("/informe/tecnico-inversor/marea-clinica");
  const inversor = await page.locator("article").innerText();

  await expect(page.getByText("Recomendación")).toHaveCount(0);
  await expect(
    page.getByText(/describirlo sería explicar cómo aprovecharlo/),
  ).toBeVisible();

  /*
   * Y ningún texto de un hallazgo abierto se cuela en la versión que circula.
   *
   * No basta con quitar la sección: si un título de hallazgo apareciera en
   * otro sitio del documento, el informe seguiría diciendo por dónde atacar.
   */
  const sensibles = interno
    .split("\n")
    .filter((linea) => linea.startsWith("Evidencia:"))
    .map((linea) => linea.slice("Evidencia:".length).trim());

  expect(sensibles.length).toBeGreaterThan(0);
  for (const texto of sensibles) {
    expect(inversor).not.toContain(texto);
  }
});

test("el informe mensual admite pedir un mes concreto", async ({ page }) => {
  await entrarComo(
    page,
    USUARIOS.equipoIwl,
    "/informe/mensual/marea-clinica?periodo=2026-06-01",
  );

  await expect(
    page.getByRole("heading", { name: "Informe de junio de 2026" }),
  ).toBeVisible();

  /*
   * Y trae los avances de junio, no los del último mes. Se busca por el
   * cuerpo del avance y no por su título, que se repite como hito de la misma
   * etapa: no se puede comprobar una cosa con un texto que nombra dos.
   */
  await expect(
    page.getByText(/Cohorte de marzo seguida hasta junio/),
  ).toBeVisible();
  await expect(page.getByText(/71 % de retención en el segmento grande/)).toBeVisible();
});

test("la fundadora genera sus propios informes", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/informe/aportacion/marea-clinica");

  await expect(
    page.getByRole("heading", { name: "Extracto de aportación" }),
  ).toBeVisible();
  await expect(page.getByText("Marea Clínica")).toBeVisible();
});

test("una fundadora no saca el informe de otra compañía", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea);
  await page.goto("/informe/tecnico/vega-predictiva");

  await expect(page).not.toHaveURL(/vega-predictiva/);
  await expect(page.getByText("Vega Predictiva")).toHaveCount(0);
});

test("un tipo de informe que no existe no se inventa", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl);
  const respuesta = await page.goto("/informe/inventado/marea-clinica");

  expect(respuesta?.status()).toBe(404);
});

test("los informes se ofrecen desde la pantalla que los alimenta", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica/tecnico");
  await expect(
    page.getByRole("link", { name: /Informe técnico interno/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Informe de due diligence técnico/ }),
  ).toBeVisible();

  await page.goto("/cartera/marea-clinica/aportacion");
  await expect(
    page.getByRole("link", { name: /Extracto de aportación/ }),
  ).toBeVisible();

  await page.goto("/cartera/marea-clinica");
  await expect(page.getByRole("link", { name: /Informe mensual/ })).toBeVisible();
});
