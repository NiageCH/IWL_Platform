import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Que se vea qué se puede pulsar.
 *
 * Rodrigo lo señaló dos veces: la primera vez se puso subrayado permanente a
 * los enlaces, pero en un gris de filete que sobre el lienzo negro no se ve,
 * así que el problema seguía. Estas pruebas fijan lo que quedó decidido para
 * que no se pierda en el siguiente retoque.
 */

test("el menú marca dónde estás y se lee como un control", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera");

  /*
   * El menú de la consola es la barra lateral, con sus propias clases. Lo
   * que se comprueba no es el nombre de la clase sino lo que significa: que
   * la abierta se distingue de las demás y que lo dice también la
   * accesibilidad, no solo el color.
   */
  const cartera = page.getByRole("link", { name: "Cartera", exact: true });
  await expect(cartera).toHaveClass(/item-lateral-activo/);
  await expect(cartera).toHaveAttribute("aria-current", "page");

  const comparativa = page.getByRole("link", { name: "Comparativa", exact: true });
  await expect(comparativa).toHaveClass(/item-lateral/);
  await expect(comparativa).not.toHaveClass(/item-lateral-activo/);
  await expect(comparativa).not.toHaveAttribute("aria-current", "page");

  await comparativa.click();
  await expect(page).toHaveURL(/comparativa/);
  await expect(
    page.getByRole("link", { name: "Comparativa", exact: true }),
  ).toHaveClass(/item-lateral-activo/);
});

test("las secciones de administración marcan la abierta", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  await expect(
    page.getByRole("link", { name: "Personas y accesos" }),
  ).toHaveClass(/pestana-activa/);
  await expect(
    page.getByRole("link", { name: "Compañías y cohortes" }),
  ).not.toHaveClass(/pestana-activa/);
});

test("una fila de la cartera entera lleva al proyecto", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera");

  const fila = page
    .locator("li.fila-enlace")
    .filter({ has: page.getByRole("link", { name: "Marea Clínica" }) })
    .first();

  // La flecha existe para anunciar que la fila lleva a algún sitio
  await expect(fila.locator(".flecha")).toHaveCount(1);

  /*
   * Y la flecha es un enlace de verdad, no un adorno: es el segundo punto
   * por el que entrar, y el que busca el ratón cuando la fila se ilumina.
   *
   * La cohorte dejó de ser una tabla y pasó a lista, así que la fila es un
   * `<li>`. La tabla de compromiso sigue siendo tabla y mantiene su propia
   * flecha, por el mismo motivo: sobre un `<tr>` el enlace estirado no es
   * de fiar, porque `position: relative` en una fila no crea bloque
   * contenedor en todos los navegadores.
   */
  await fila.locator("a.flecha").click();
  await expect(page).toHaveURL(/\/cartera\/marea-clinica$/);
});

test("el subrayado de un enlace se ve sin pasar el ratón", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera");

  const enlace = page.getByRole("link", { name: "Marea Clínica" }).first();

  const medida = await enlace.evaluate((e) => {
    const s = getComputedStyle(e);
    /*
     * El color se resuelve pintándolo en un elemento que hereda el color del
     * enlace: `color-mix` con `currentColor` no se lee de otra forma.
     */
    const d = document.createElement("div");
    d.style.color = s.color;
    d.style.backgroundColor = s.textDecorationColor;
    e.appendChild(d);
    const pintado = getComputedStyle(d).backgroundColor;
    d.remove();
    return { linea: s.textDecorationLine, pintado };
  });

  expect(medida.linea).toContain("underline");

  const canales = medida.pintado.match(/[\d.]+/g)!.map(Number);
  const alfa = canales.length > 3 ? canales[3] : 1;

  /*
   * Lo que se comprueba es que el subrayado tenga cuerpo. La primera versión
   * usaba un gris de filete fijo que sobre el lienzo negro desaparecía, y
   * por eso el problema seguía ahí después de «arreglarlo».
   */
  expect(alfa).toBeGreaterThan(0.5);
});

test("los titulares llevan la tipografía de la marca", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const titular = page.getByRole("heading", { name: "Administración" });
  const estilo = await titular.evaluate((e) => {
    const s = getComputedStyle(e);
    return { fuente: s.fontFamily, caja: s.textTransform, tracking: s.letterSpacing };
  });

  expect(estilo.fuente).toMatch(/Zalando/i);
  expect(estilo.caja).toBe("uppercase");
  // Apretado, como en la web
  expect(parseFloat(estilo.tracking)).toBeLessThan(0);
});

test("el botón principal es una cápsula en mayúsculas", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  // «Asignar» es secundario; el de cápsula es el principal de cada formulario
  await page.getByText("Dar de alta a una persona").click();
  const boton = page.getByRole("button", { name: "Dar de alta" }).first();
  const estilo = await boton.evaluate((e) => {
    const s = getComputedStyle(e);
    return { radio: s.borderRadius, caja: s.textTransform, fondo: s.backgroundColor };
  });

  expect(parseFloat(estilo.radio)).toBeGreaterThan(20);
  expect(estilo.caja).toBe("uppercase");
});

test("todo lo que se pulsa tiene foco visible", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera");

  const enlace = page.getByRole("link", { name: "Comparativa", exact: true });
  await enlace.focus();

  const contorno = await enlace.evaluate((e) => {
    const s = getComputedStyle(e);
    return { ancho: s.outlineWidth, estilo: s.outlineStyle };
  });

  expect(contorno.estilo).not.toBe("none");
  expect(parseFloat(contorno.ancho)).toBeGreaterThan(0);
});

test("los controles de texto se anuncian, no son párrafos", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/plan");

  /*
   * «Redactar la sección» era un botón sin ninguna marca: el control con el
   * que se escribe todo el business plan parecía una línea de texto suelta.
   * Se recorren todos los botones de texto de la página, que son los que no
   * llevan fondo, y se comprueba que alguna forma tienen.
   */
  const sinMarca = await page.evaluate(() => {
    const flojos: string[] = [];

    for (const b of document.querySelectorAll("button, summary")) {
      const s = getComputedStyle(b);
      const texto = (b.textContent ?? "").trim().slice(0, 40);
      if (!texto) continue;

      const conFondo =
        s.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        s.backgroundColor !== "transparent";
      const conBorde = parseFloat(s.borderTopWidth) > 0;
      const subrayado = s.textDecorationLine.includes("underline");
      const hijoSubrayado = [...b.querySelectorAll("*")].some((h) =>
        getComputedStyle(h).textDecorationLine.includes("underline"),
      );

      if (!conFondo && !conBorde && !subrayado && !hijoSubrayado) {
        flojos.push(texto);
      }
    }
    return flojos;
  });

  expect(sinMarca).toEqual([]);
});

/*
 * La consola aguanta cualquier ancho de ventana.
 *
 * Esto salió de un fallo concreto y feo: la lista de la cohorte se montó con
 * una rejilla de siete columnas en rem que sumaban unos 936 px. Con los 240
 * de la barra lateral, la fila pedía casi 1200 px de ventana. La barra
 * aparecía a partir de 1024, así que entre 1024 y 1200 las columnas se
 * aplastaban por debajo de su contenido y los textos se solapaban.
 *
 * No se vio porque se probó a un solo ancho, y ancho de sobra. Un diseño no
 * se comprueba en la ventana que uno tiene abierta: se comprueba en el
 * intervalo donde cambia de forma, y sobre todo justo después de cada corte.
 */
const ANCHOS = [
  { w: 390, h: 844, nombre: "móvil" },
  { w: 760, h: 900, nombre: "justo antes de la barra lateral" },
  { w: 768, h: 900, nombre: "justo cuando aparece la barra lateral" },
  { w: 900, h: 900, nombre: "portátil estrecho" },
  { w: 1024, h: 800, nombre: "portátil" },
  { w: 1180, h: 800, nombre: "el intervalo que se rompía" },
  { w: 1440, h: 900, nombre: "escritorio" },
];

for (const { w, h, nombre } of ANCHOS) {
  test(`la cartera no se desborda a ${w} px (${nombre})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await entrarComo(page, USUARIOS.admin, "/cartera");
    await page.waitForLoadState("networkidle");

    const desbordamiento = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

    expect(
      desbordamiento,
      `La cartera se desborda en horizontal a ${w} px`,
    ).toBeLessThanOrEqual(1);
  });
}

test("hay un solo menú a la vista, nunca los dos ni ninguno", async ({
  page,
}) => {
  /*
   * La barra lateral y la compacta de arriba son las dos caras del mismo
   * menú y las dos están siempre en el documento: quién se enseña lo decide
   * el ancho, que es cosa de CSS. Lo que no puede pasar es que se vean las
   * dos a la vez, ni que a algún ancho no se vea ninguna.
   */
  for (const w of [390, 760, 768, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await entrarComo(page, USUARIOS.admin, "/cartera");

    const visibles = await page
      .getByRole("link", { name: "Cartera", exact: true })
      .count();

    expect(visibles, `A ${w} px no hay exactamente un menú visible`).toBe(1);
  }
});
