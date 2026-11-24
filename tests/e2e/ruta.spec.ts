import { expect, test, type Page } from "@playwright/test";
import {
  COMPANIAS,
  USUARIOS,
  actualizar,
  borrar,
  consultar,
  entrarComo,
  insertar,
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

  await expect(page.getByText("Añadir un tramo")).toHaveCount(0);
  await expect(page.getByText("Editar el tramo")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Añadir hito" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Acciones del tramo/ })).toHaveCount(0);
});

test("el estado de un hito se lee, no se elige: se avanza entregando y validando", async ({ page }) => {
  /*
   * Había un desplegable Pendiente / En curso / Cumplido que dejaba dar un
   * hito por cumplido sin evidencia y sin validación (REVISION, 23 nov). Ya
   * no está, ni para ella ni para IWL: ella entrega, quien revisa valida.
   * El circuito entero se prueba en hitos.spec.ts.
   */
  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto/ruta");
  await expect(page.locator('li[data-fila-hito] select[name="status"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Entregar «/ }).first()).toBeVisible();

  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica/ruta");
  await expect(page.locator('li[data-fila-hito] select[name="status"]')).toHaveCount(0);
});

test("el equipo de IWL diseña y edita el plan", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/cartera/marea-clinica/ruta");

  /* Con el patrón de Administración (REVISION, 23 nov): «Añadir hito» en
     la cabecera de cada tramo, plegado o no, y editarlo en su menú ⋯ */
  const tramo = tramoDe(page, "Tramo 4 · De facturación a invertible");
  await expect(tramo.getByRole("button", { name: "Añadir hito" })).toBeVisible();
  await tramo.getByRole("button", { name: /^Acciones del tramo/ }).click();
  await expect(page.getByRole("menuitem", { name: "Editar el tramo" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Añadir un hito se hace en el panel, y el acuse es el hito en su tramo
  const titulo = `Hito del panel ${Date.now()}`;
  await tramo.getByRole("button", { name: "Añadir hito" }).click();
  const panel = page.getByRole("dialog", { name: "Añadir un hito al tramo 4" });
  await panel.getByLabel("Título").fill(titulo);
  await panel.getByLabel("Criterio de éxito").fill("Algo que se pueda comprobar sin opinar.");
  // La marca de invertible es de dirección: el equipo no la ve
  await expect(panel.getByLabel("Condiciona invertible")).toHaveCount(0);
  await panel.getByRole("button", { name: "Añadir el hito" }).click();
  await expect(panel).toHaveCount(0);
  const fila = tramo.locator(`li[data-fila-hito="${titulo}"]`);
  await expect(fila).toBeVisible();

  // Y se quita desde su menú, confirmando en el panel, en rojo
  await fila.getByRole("button", { name: `Acciones de «${titulo}»` }).click();
  await page.getByRole("menuitem", { name: "Quitar" }).click();
  const quitar = page.getByRole("dialog", { name: "Quitar el hito" });
  await quitar.getByRole("button", { name: "Quitar el hito" }).click();
  await expect(page.locator(`li[data-fila-hito="${titulo}"]`)).toHaveCount(0);

  // Los tramos son cuatro y fijos: ni se añaden ni se borran
  await expect(page.getByText("Añadir un tramo")).toHaveCount(0);
  await tramo.getByRole("button", { name: /^Acciones del tramo/ }).click();
  await expect(page.getByRole("menuitem", { name: "Borrar el tramo" })).toHaveCount(0);
  await page.keyboard.press("Escape");
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
  const seguimiento = page.locator("#seguimiento");
  await expect(seguimiento.getByText(/borrador, hasta la firma/)).toBeVisible();

  /*
   * Antes de firmar, las fechas son orientativas (REVISION, 23 nov): ni
   * retraso ni vencidos. Y como la fecha prevista de firma (6 abr 2026) ya
   * ha pasado, se dice que hay que actualizarla.
   */
  await expect(seguimiento.getByText("Borrador: las fechas son orientativas hasta la firma.", { exact: false })).toBeVisible();
  await expect(seguimiento.getByText("La fecha prevista de firma ya ha pasado: actualízala.")).toBeVisible();
  await expect(seguimiento.getByRole("link", { name: "Cambiar la fecha prevista" })).toBeVisible();
  await expect(page.getByText(/de retraso sobre su duración/)).toHaveCount(0);
  await expect(page.locator("li[data-fila-hito]").getByText("Vencido", { exact: true })).toHaveCount(0);
  // Un solo resumen: sin «tramo que toca por calendario»
  await expect(page.getByText(/Tramo que toca|Por calendario/)).toHaveCount(0);

  // Y su tarjeta y su cabecera dicen lo mismo: «Borrador» (REVISION, 24 nov)
  await expect(seguimiento.locator("li[aria-current='step']").getByText("Borrador", { exact: true })).toBeVisible();
  const tramo1 = tramoDe(page, "Tramo 1 · De idea a MVP");
  await expect(tramo1.locator("header").getByText("Borrador", { exact: true })).toBeVisible();
  await expect(tramo1.locator("header").getByText("Planificada")).toHaveCount(0);
});

test("un hito cumplido se reabre desde su menú, con motivo, y vuelve a pendiente", async ({ page }) => {
  // Un hito propio en el tramo 4 de Raíz, cumplido y con su evidencia; se borra al acabar
  const [etapa] = await consultar<{ id: string }>(
    "roadmap_stages",
    { company_id: `eq.${COMPANIAS.raiz}`, tramo: "eq.4" },
    "id",
  );
  const id = crypto.randomUUID();
  const titulo = `Hito para reabrir ${Date.now()} ${test.info().project.name}`;
  await insertar("evidence_links", {
    company_id: COMPANIAS.raiz,
    entity: "milestone",
    entity_id: id,
    kind: "enlace",
    url: "https://ejemplo.test/reabrir",
    label: "Entrega validada",
  });
  try {
    await insertar("milestones", {
      id,
      company_id: COMPANIAS.raiz,
      stage_id: etapa.id,
      title: titulo,
      success_criteria: "Algo que se puede comprobar sin opinar.",
      status: "cumplido",
    });
    await entrarComo(page, USUARIOS.admin, "/cartera/raiz-sensorica/ruta");
    const fila = page.locator(`li[data-fila-hito="${titulo}"]`);
    await expect(fila.getByText("Cumplido", { exact: true })).toBeVisible();
    await fila.getByRole("button", { name: `Acciones de «${titulo}»` }).click();
    await page.getByRole("menuitem", { name: "Reabrir el hito" }).click();
    const panel = page.getByRole("dialog", { name: "Reabrir el hito" });
    await panel.getByLabel("Por qué se reabre").fill("El cliente ha cancelado: hay que volver a demostrarlo.");
    await panel.getByRole("button", { name: "Reabrir el hito" }).click();
    await expect(panel).toHaveCount(0);
    await expect(fila.getByText("Pendiente", { exact: true })).toBeVisible();

    // El motivo, en su historial
    await fila.getByRole("button", { name: `Acciones de «${titulo}»` }).click();
    await page.getByRole("menuitem", { name: /Historial/ }).click();
    await expect(page.getByRole("dialog").getByText("El cliente ha cancelado: hay que volver a demostrarlo.")).toBeVisible();
  } finally {
    await borrar("milestones", { id });
    await borrar("evidence_links", { entity_id: id });
    await borrar("activity_log", { entity_id: id });
  }
});

test("lo cumplido al entrar va plegado al final de su tramo", async ({ page }) => {
  // Raíz entró facturando: trae verificados los hitos de los tramos 1 a 3
  await entrarComo(page, USUARIOS.admin, "/cartera/raiz-sensorica/ruta");
  const tramo = tramoDe(page, "Tramo 4 · De facturación a invertible");
  const plegados = tramo.locator("details[data-plegados-al-entrar]");
  await expect(plegados).toHaveCount(1);
  await expect(plegados.locator("summary")).toHaveText(/9 hitos cumplidos al entrar/);
  await expect(plegados.locator("[data-al-entrar]").first()).toBeHidden();
  // Lo que queda por hacer va primero, en filas con su menú
  await expect(tramo.locator("li[data-fila-hito]").first()).toBeVisible();
  await plegados.locator("summary").click();
  await expect(plegados.locator("[data-al-entrar]").first()).toBeVisible();
});

test("los textos de la hoja de ruta se cambian desde administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/rutas");

  await expect(page.getByRole("heading", { name: "Hoja de ruta del programa" })).toBeVisible();
  // Una sola hoja de ruta, en cuatro tramos, con su resumen arriba (REVISION, 22 y 23 nov)
  await expect(page.getByRole("heading", { name: "Tramo 1 · De idea a MVP" })).toBeVisible();
  await expect(page.locator("[data-resumen-tramo]")).toHaveCount(4);
  // Y se dice en una línea por qué tocarlos aquí no rompe nada en marcha
  await expect(page.getByText(/no para las que están en marcha ni para las firmadas/)).toBeVisible();

  // Editar en el panel lateral, y dejarlo como estaba
  const [hito] = await consultar<{ id: string; title: string }>(
    "roadmap_template_milestones",
    { title: "eq.Data room completo" },
    "id,title",
  );
  try {
    const fila = page.locator('li[data-hito="Data room completo"]');
    await fila.getByRole("button", { name: /Acciones de/ }).click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    const panel = page.getByRole("dialog", { name: "Editar el hito" });
    await panel.locator('input[name="title"]').fill("Data room completo y ordenado");
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator('li[data-hito="Data room completo y ordenado"]')).toBeVisible();
  } finally {
    await actualizar("roadmap_template_milestones", { id: `eq.${hito.id}` }, { title: hito.title });
  }
});

test("los hitos fundamentales se añaden, se ordenan y se retiran desde administración", async ({ page }) => {
  const titulo = `Hito E2E ${test.info().project.name} ${Date.now()}`;
  const [{ id: tramoId }] = await consultar<{ id: string }>("roadmap_template_stages", { tramo: "eq.4" }, "id");
  // El orden de antes, para dejarlo como estaba
  const antes = await consultar<{ id: string; order_index: number }>(
    "roadmap_template_milestones",
    { template_stage_id: `eq.${tramoId}` },
    "id,order_index",
  );
  await entrarComo(page, USUARIOS.admin, "/admin/rutas");
  const tramo = page.locator("#tramo-4");
  try {
    // La acción principal del tramo abre el panel
    await tramo.getByRole("button", { name: "Añadir hito" }).click();
    const panel = page.getByRole("dialog", { name: "Añadir un hito al tramo 4" });
    await panel.locator('input[name="title"]').fill(titulo);
    await panel.locator('textarea[name="success_criteria"]').fill("Algo que se pueda comprobar");
    await panel.locator('textarea[name="expected_evidence"]').fill("Un documento");
    await panel.getByRole("button", { name: "Guardar" }).click();
    await expect(panel).toHaveCount(0);

    const fila = page.locator(`li[data-hito="${titulo}"]`);
    await expect(fila).toBeVisible();
    await expect(fila.getByText("Evidencia", { exact: true })).toBeVisible();
    const menu = fila.getByRole("button", { name: /Acciones de/ });

    // Va al final: se puede subir, no bajar
    await menu.click();
    await expect(page.getByRole("menuitem", { name: "Bajar" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Subir" }).click();
    await menu.click();
    await expect(page.getByRole("menuitem", { name: "Bajar" })).toBeVisible();

    // Retirar pide confirmación en la propia fila, y no lo borra
    await page.getByRole("menuitem", { name: "Retirar" }).click();
    await fila.getByRole("alertdialog").getByRole("button", { name: "Retirar" }).click();
    await expect(fila).toHaveCount(0);
    await tramo.getByText(/hitos? retirados?/).click();
    const retirado = tramo.locator(`li[data-retirado="${titulo}"]`);
    await expect(retirado.getByText("Retirado", { exact: true })).toBeVisible();
    await retirado.getByRole("button", { name: "Recuperar" }).click();
    await expect(fila).toBeVisible();
  } finally {
    const [nuevo] = await consultar<{ id: string }>("roadmap_template_milestones", { title: `eq.${titulo}` }, "id");
    if (nuevo) await borrar("roadmap_template_milestones", { id: nuevo.id });
    for (const h of antes) await actualizar("roadmap_template_milestones", { id: `eq.${h.id}` }, { order_index: h.order_index });
  }
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


test("en Programa ya no están las fases antiguas, y la cabecera sale del estadio", async ({ page }) => {
  // Las fases (Due diligence conjunto, Incubación…) no conviven con los tramos (REVISION, 24 nov)
  await entrarComo(page, USUARIOS.admin, "/cartera/raiz-sensorica/programa");
  await expect(page.getByRole("heading", { name: "Fase del programa" })).toHaveCount(0);
  await expect(page.getByText("Due diligence conjunto")).toHaveCount(0);
  // Raíz factura y tiene el Acuerdo firmado: Aceleración. Vega, idea y sin firmar: Diagnóstico
  await expect(page.getByText("Aceleración").first()).toBeVisible();
  await page.goto("/cartera/vega-predictiva");
  await expect(page.getByText("Diagnóstico").first()).toBeVisible();
});
