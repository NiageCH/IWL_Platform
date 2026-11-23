import { expect, test, type Page } from "@playwright/test";
import {
  COMPANIAS,
  USUARIOS,
  actualizar,
  borrar,
  consultar,
  entrarComo,
} from "./entrada";

/**
 * Abre un tramo plegado.
 *
 * Desde que el Recorrido solo deja abierto el tramo en curso, lo demás
 * vive dentro de un `<details>`: el objetivo, los hitos, los avances y los
 * botones de IWL. Se abre como lo abriría una persona, pulsando su línea.
 */
async function abrirTramo(page: Page, nombre: string) {
  const tramo = tramoDe(page, nombre);
  if (!(await tramo.locator("details[open]").count())) {
    await tramo.locator("summary").first().click();
  }
  return tramo;
}

/**
 * La tarjeta de un tramo, por su identificador y no por su texto.
 *
 * Filtrando `section` por el nombre del tramo se cogía la cabecera de la
 * hoja de ruta: la línea de puntos lleva dentro el nombre de los cinco, y
 * esa es la primera sección de la página.
 */
function tramoDe(page: Page, nombre: string) {
  return page
    .locator("section[id^='etapa-']")
    .filter({ has: page.getByRole("heading", { name: nombre }) })
    .first();
}

/**
 * Hoja de ruta.
 *
 * Es la respuesta a «¿por dónde vamos?». Lo que se comprueba aquí es que las
 * dos partes ven el mismo plan y que solo IWL lo diseña: el reparto de la
 * plataforma entera, aplicado al recorrido.
 */

test("la fundadora ve su hoja de ruta con el objetivo de cada etapa", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  await expect(page.getByRole("heading", { name: "Hoja de ruta" })).toBeVisible();
  await expect(page.getByText("Entró en MVP sin piloto")).toBeVisible();

  /*
   * Los tramos de la hoja de ruta IWL desde el suyo, el 2 (REVISION, 22 nov).
   *
   * Por el título de su tarjeta y no por el texto suelto: desde que la
   * hoja de ruta abre con la línea de puntos, el nombre de cada tramo
   * sale dos veces —el punto que baja a la tarjeta y la tarjeta—, y
   * `getByText` se queja de que hay dos.
   */
  await expect(page.getByRole("heading", { name: "Tramo 2 · De MVP a piloto" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tramo 4 · De facturación a invertible" })).toBeVisible();
  // El tramo 1 no se abre: lo que le faltaba de él va dentro del 2
  await expect(page.getByRole("heading", { name: /^Tramo 1 · / })).toHaveCount(0);

  // Y el objetivo, que es lo que distingue un tramo de un plazo. Está
  // dentro del tramo, que nace plegado si no es el que está en curso
  const tramo = await abrirTramo(page, "Tramo 2 · De MVP a piloto");
  await expect(tramo.getByText(/usuarios externos usando el MVP/)).toBeVisible();

  // Arriba, el seguimiento: el tramo en curso, dónde estamos y el plazo
  const seguimiento = page.locator("#seguimiento");
  await expect(seguimiento.getByText("Tramo 4 de 4")).toBeVisible();
  await expect(seguimiento.getByText(/hitos de este tramo cumplidos/)).toBeVisible();
  await expect(seguimiento.getByText(/plazo máximo de 12 meses desde la firma/)).toBeVisible();
});

test("la fundadora no puede rediseñar el plan", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  await expect(page.getByText("Añadir una etapa")).toHaveCount(0);
  await expect(page.getByText("Editar la etapa")).toHaveCount(0);
  await expect(page.getByText(/Añadir un hito/)).toHaveCount(0);
});

test("la fundadora sí mueve sus hitos, pero no los da por cumplidos", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");

  // En el tramo en curso, que es el único abierto: en los plegados el
  // desplegable existe en el marcado pero no se ve
  const estado = page.locator('select[name="status"]:visible').first();
  await expect(estado).toBeVisible();
  await expect(estado.locator('option[value="en_curso"]')).toHaveCount(1);
  await expect(estado.locator('option[value="cumplido"]')).toHaveCount(0);
});

test("el equipo de IWL diseña y edita el plan", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica/ruta");

  /* En el tramo en curso, que es el único que nace abierto. En los demás
     los botones existen igual, a un clic */
  const tramo = tramoDe(page, "Tramo 4 · De facturación a invertible");
  await expect(tramo.getByText("Editar la etapa").first()).toBeVisible();
  await expect(
    tramo.getByText("Añadir un hito a esta etapa").first(),
  ).toBeVisible();

  // Y sí puede confirmar un hito
  const estado = page.locator('select[name="status"]').first();
  await expect(estado.locator('option[value="cumplido"]')).toHaveCount(1);
});

test("una compañía sin hoja de ruta lleva a prepararla, y se genera desde su tramo", async ({ page }) => {
  // Vega, una idea, no tiene hoja de ruta en la semilla. Se la crea esta prueba y la quita
  await borrar("milestones", { company_id: COMPANIAS.vega });
  await borrar("roadmap_stages", { company_id: COMPANIAS.vega });

  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/vega-predictiva/ruta");
  await expect(page.getByText(/todavía no tiene hoja de ruta/)).toBeVisible();
  await page.getByRole("link", { name: "Preparar la hoja de ruta, en Programa y Anexo" }).click();

  // El asistente: el punto de partida dice dónde entra y su plazo
  const asistente = page.locator("#asistente-hoja");
  await expect(asistente.getByText(/tramo 1/)).toBeVisible();
  await expect(asistente.getByText("18 meses")).toBeVisible();
  await asistente.locator('input[name="inicio"]').fill("2026-04-06");
  await asistente.getByRole("button", { name: "Generar la hoja de ruta" }).click();

  // Paso 2: los cuatro tramos, con sus hitos fundamentales
  await expect(asistente.getByText("Tramo 1 · De idea a MVP")).toBeVisible();
  await expect(asistente.getByText("Tramo 4 · De facturación a invertible")).toBeVisible();
  await expect(asistente.getByText(/Sociedad constituida y pacto de socias/)).toBeVisible();

  await page.goto("/cartera/vega-predictiva/ruta");
  await expect(page.getByRole("heading", { name: "Tramo 1 · De idea a MVP" })).toBeVisible();
  await expect(page.getByText("Entró en Idea")).toBeVisible();
  await expect(page.locator("#seguimiento").getByText(/borrador, hasta la firma/)).toBeVisible();
});

test("añadir una etapa exige decir qué se persigue en ella", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica/ruta");

  await page.getByText("Añadir una etapa").click();

  const alta = page.locator("form", {
    has: page.locator('input[name="order_index"]'),
  });
  await alta.locator('input[name="name"]').fill("Etapa sin rumbo");
  await alta.locator('textarea[name="objective"]').fill("Corto");
  await alta.getByRole("button", { name: "Añadir etapa" }).click();

  await expect(page.getByText(/Sin objetivo, una etapa es solo un plazo/)).toBeVisible();
});

test("los recorridos se configuran desde administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/rutas");

  await expect(
    page.getByRole("heading", { name: "Recorridos del programa" }),
  ).toBeVisible();

  // Una sola hoja de ruta, en cuatro tramos (REVISION, 22 nov)
  await expect(page.getByRole("heading", { name: "Hoja de ruta IWL" })).toBeVisible();
  await expect(page.getByText("De idea a MVP").first()).toBeVisible();

  // Y se explica por qué tocarlos aquí no rompe nada en marcha
  await expect(
    page.getByText(/no toca ninguna hoja de ruta en marcha/),
  ).toBeVisible();
});

test("el equipo de IWL no llega a configurar los recorridos", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl);
  await page.goto("/admin/rutas");
  await expect(page).toHaveURL(/\/cartera/);
});

test.afterAll(async () => {
  /*
   * Los hitos también, y primero.
   *
   * Borrar una etapa no borra sus hitos —la columna es `on delete set null`,
   * a propósito— así que limpiar solo las etapas dejaba hitos sueltos que
   * luego contaban en el eje de plan de otras pruebas.
   */
  await borrar("milestones", { company_id: COMPANIAS.vega });
  await borrar("roadmap_stages", { company_id: COMPANIAS.vega });
});

test("un hito del plan sin cumplir bloquea el estado invertible", async ({
  page,
}) => {
  /*
   * Mientras los hitos no existieron, el cálculo recibía una lista vacía y los
   * daba por cumplidos sin decirlo. Marea supera los dos scores y no tiene
   * hallazgos críticos, así que lo único que puede estar frenándola son los
   * hitos de su hoja de ruta que todavía no ha cerrado.
   *
   * La prueba se crea su propia condición en vez de confiar en la semilla.
   *
   * Confiaba, y tenía fecha de caducidad: la semilla marca como cumplidos
   * los hitos de las etapas ya terminadas, y las fechas de las etapas van
   * contra `current_date`. Según pasan las semanas, más etapas quedan
   * atrás y más hitos salen cumplidos. El día que los cuatro hitos que
   * condicionan el estado invertible quedaron cerrados, esta prueba empezó
   * a comprobar lo contrario de lo que dice —y en verde, porque nunca
   * llegó a mirar que de verdad hubiera uno pendiente—.
   */
  const [hito] = await consultar<{ id: string; status: string }>(
    "milestones",
    {
      company_id: `eq.${COMPANIAS.marea}`,
      gates_investable: "eq.true",
      limit: "1",
    },
    "id,status",
  );

  const estadoOriginal = hito.status;
  await actualizar(
    "milestones",
    { id: `eq.${hito.id}` },
    { status: "pendiente", completed_on: null },
  );

  try {
    await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica");

    await expect(
      page.getByText(/Cumplir el hito del Anexo/).first(),
    ).toBeVisible();
  } finally {
    // Se deja como estaba, pase lo que pase con la aserción de arriba
    await actualizar(
      "milestones",
      { id: `eq.${hito.id}` },
      { status: estadoOriginal },
    );
  }
});

test("una etapa se borra y sus hitos no se pierden", async ({ page }) => {
  /*
   * `borrarEtapa` existía desde el principio y **no tenía botón**: desde la
   * pantalla, una etapa mal creada se quedaba ahí para siempre. Lo mismo con
   * `moverHito`.
   */
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/ruta");

  const nombre = `Etapa de prueba ${Date.now()}`;
  await page.getByText("Añadir una etapa").click();
  const alta = page.locator("form", {
    has: page.locator('textarea[name="objective"]'),
  });
  await alta.locator('input[name="name"]').fill(nombre);
  await alta
    .locator('textarea[name="objective"]')
    .fill("Comprobar que una etapa se puede borrar.");
  await alta.getByRole("button", { name: "Añadir etapa" }).click();

  /* Nace plegada: no es el tramo en curso. Se abre como la abriría
     cualquiera, pulsando su línea */
  const etapa = page.locator("section[id^='etapa-']").filter({ hasText: nombre }).last();
  await expect(etapa).toBeVisible();
  await etapa.locator("summary").first().click();

  // Y ahora se borra, que es lo que no se podía
  await etapa.getByRole("button", { name: "Borrar la etapa" }).click();
  await expect(page.getByText(/No tiene hitos/)).toBeVisible();
  await page.getByRole("button", { name: "Borrar", exact: true }).click();

  await expect(page.getByText(nombre)).toHaveCount(0);
});
