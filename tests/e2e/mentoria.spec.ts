import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  consultar,
  entrarComo,
} from "./entrada";

/*
 * Ninguna compañía archivada al empezar.
 *
 * Varias pruebas de aquí archivan y restauran, y si una se corta a mitad deja
 * el estado cambiado para las siguientes. Se restaura por fuera del camino
 * que se prueba, que es lo único que hace la suite repetible.
 */
test.beforeEach(async () => {
  await actualizar(
    "companies",
    { archived_at: "not.is.null" },
    { archived_at: null, archived_by: null, archive_reason: null },
  );
});

/**
 * Administración de personas y compañías.
 *
 * Lo que se comprueba es que el papel de cada mentor va por proyecto y que
 * el borrado no se ofrece cuando destruiría un historial. Las reglas de fondo
 * las prueban los tests de RLS; aquí se prueba que la pantalla las cuenta
 * bien, que es lo que decide si alguien las entiende.
 */

test("una mentora coordina un proyecto y apoya en otro", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const producto = page.locator("li", { hasText: "mentor@iwl.test" }).first();

  /*
   * Se busca la etiqueta junto a su compañía: «coordina» aparece también en
   * las opciones del desplegable de asignación, así que el texto suelto no
   * distingue lo que hay de lo que se puede elegir.
   */
  const marea = producto.locator("li", { hasText: "Marea Clínica" });
  const raiz = producto.locator("li", { hasText: "Raíz Sensórica" });

  await expect(marea.getByText("Coordina", { exact: true })).toBeVisible();
  await expect(raiz.getByText("Apoyo", { exact: true })).toBeVisible();

  /*
   * Las horas, en su ficha.
   *
   * En la lista estorban: ahí se viene a encontrar a alguien y a darle o
   * quitarle acceso, no a leer su dedicación proyecto a proyecto.
   */
  await producto.getByRole("link", { name: "Mentoría producto" }).click();

  const fichaMarea = page.locator("li", { hasText: "Marea Clínica" }).first();
  const fichaRaiz = page.locator("li", { hasText: "Raíz Sensórica" }).first();
  await expect(fichaMarea.getByText(/70,0 de 120 h/)).toBeVisible();
  await expect(fichaRaiz.getByText(/0,0 de 60 h/)).toBeVisible();
});

test("el papel de mentoría a secas ya no se ofrece", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const papeles = page.locator('select[name="member_role"]').first();
  await expect(papeles.locator("option", { hasText: "coordina el proyecto" })).toHaveCount(1);
  await expect(papeles.locator("option", { hasText: "Mentoría · apoyo" })).toHaveCount(1);
  await expect(papeles.locator('option[value="mentor"]')).toHaveCount(0);
});

test("al asignar mentoría se piden las horas acordadas", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const fila = page.locator("li", { hasText: "mentor2@iwl.test" }).first();
  const papeles = fila.locator('select[name="member_role"]');

  // Con un papel que no es de mentoría no hay horas que acordar
  await expect(fila.locator('input[name="assigned_hours"]')).toHaveCount(0);

  await papeles.selectOption("mentor_principal");
  await expect(fila.locator('input[name="assigned_hours"]')).toBeVisible();
  await expect(
    fila.getByText(/Quien coordina responde del avance del proyecto/),
  ).toBeVisible();

  await papeles.selectOption("mentor_secundario");
  await expect(fila.getByText(/No punt[úu]a ni confirma hitos/)).toBeVisible();
});

test("no se ofrece borrar a quien tiene trabajo a su nombre", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const conTrabajo = page.locator("li", { hasText: "revisor@niage.test" }).first();
  await expect(
    conTrabajo.getByText("No se puede borrar: tiene trabajo a su nombre"),
  ).toBeVisible();
  await expect(conTrabajo.getByRole("button", { name: "Borrar" })).toHaveCount(0);

  // Y sí a quien no ha dejado rastro
  const sinTrabajo = page.locator("li", { hasText: "cto@marea.test" }).first();
  await expect(sinTrabajo.getByRole("button", { name: "Borrar" })).toBeVisible();
});

test("una compañía con trabajo registrado se archiva, no se borra", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const marea = page.locator("li", { hasText: "Marea Clínica" }).first();

  /*
   * Lo primero que se ofrece sigue siendo archivar, no borrar.
   *
   * Antes aquí ponía «no se puede borrar» y se acababa la conversación.
   * Ahora hay salida, pero hay que pedirla: el botón dice lo que hace y
   * lo que destruye.
   */
  await expect(
    marea.getByRole("button", { name: "Borrar con su histórico" }),
  ).toBeVisible();
  await expect(marea.getByRole("button", { name: "Archivar" })).toBeVisible();

  await marea.getByRole("button", { name: "Archivar" }).click();
  await expect(
    marea.getByText(/su equipo fundador deja de verla/),
  ).toBeVisible();
  await expect(
    marea.getByText(/El histórico se conserva entero/),
  ).toBeVisible();
});

test("archivar saca de la cartera y restaurar la devuelve", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const vega = page.locator("li", { hasText: "Vega Predictiva" }).first();
  await vega.getByRole("button", { name: "Archivar" }).click();

  const formulario = vega.locator("form", {
    has: page.locator('input[name="motivo"]'),
  });
  await formulario.locator('input[name="motivo"]').fill("Prueba de archivado");
  await formulario.getByRole("button", { name: "Archivar" }).click();

  await expect(page.getByRole("heading", { name: "Archivadas" })).toBeVisible();
  await expect(page.getByText("Prueba de archivado")).toBeVisible();

  // Sale de la cartera
  await page.goto("/cartera");
  await expect(page.getByRole("link", { name: "Vega Predictiva" })).toHaveCount(0);

  // Y vuelve al restaurarla
  await page.goto("/admin/companias");
  const archivada = page
    .locator("li", { hasText: "Vega Predictiva" })
    .filter({ hasText: "Prueba de archivado" });
  await archivada.getByRole("button", { name: "Restaurar" }).click();
  await expect(page.getByText("Prueba de archivado")).toHaveCount(0);

  await page.goto("/cartera");
  await expect(
    page.getByRole("link", { name: "Vega Predictiva" }).first(),
  ).toBeVisible();
});

test("la fundadora de una compañía archivada deja de verla", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const vega = page.locator("li", { hasText: "Vega Predictiva" }).first();
  await vega.getByRole("button", { name: "Archivar" }).click();
  await vega
    .locator("form", { has: page.locator('input[name="motivo"]') })
    .getByRole("button", { name: "Archivar" })
    .click();
  await expect(page.getByRole("heading", { name: "Archivadas" })).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await entrarComo(page, USUARIOS.fundadoraVega);

  // No tiene compañía visible, así que no llega a su proyecto
  await expect(page).toHaveURL(/sin-compania|entrar/);

  // El beforeEach de la siguiente prueba la desarchiva
});

test("la ficha de una compañía se edita desde administración", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const raiz = page.locator("li", { hasText: "Raíz Sensórica" }).first();
  await raiz.getByRole("button", { name: "Editar" }).click();

  const formulario = raiz.locator("form", {
    has: page.locator('input[name="name"]'),
  });
  await formulario.locator('input[name="sector"]').fill("Agrotecnología de precisión");
  await formulario.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Agrotecnología de precisión")).toBeVisible();

  // Se deja como estaba
  await page
    .locator("li", { hasText: "Raíz Sensórica" })
    .first()
    .getByRole("button", { name: "Editar" })
    .click();
  await page
    .locator("li", { hasText: "Raíz Sensórica" })
    .first()
    .locator("form", { has: page.locator('input[name="name"]') })
    .locator('input[name="sector"]')
    .fill("Agrotecnología");
  await page
    .locator("li", { hasText: "Raíz Sensórica" })
    .first()
    .getByRole("button", { name: "Guardar" })
    .click();
});

test("una compañía con histórico se borra, pero con todo a la vista", async ({
  page,
}) => {
  /*
   * «No está la opción de eliminar compañías.»
   *
   * Estaba, y solo en las vacías: fue una decisión deliberada —archivar
   * conserva, borrar es para lo creado por error—. Pero probando se crean
   * compañías que en cuanto tienen una hoja de ruta ya no se quitan, y
   * «no se puede» a secas es un callejón.
   *
   * La regla se queda: lo primero que se ofrece es archivar. Lo que se
   * añade es la salida, con la cuenta exacta de lo que se destruye.
   */
  const slug = `conhistorico-${Date.now()}`;
  /* Nombre único: si una pasada anterior dejó restos, un nombre compartido
     hace que el localizador acabe pulsando en la compañía equivocada */
  const nombre = `Con Histórico ${slug.slice(-6)}`;

  await entrarComo(page, USUARIOS.admin, "/admin/companias");
  await page.getByText("Dar de alta una compañía").click();
  const alta = page.locator("form", { has: page.locator('input[name="slug"]') });
  await alta.locator('input[name="name"]').fill(nombre);
  await alta.locator('input[name="slug"]').fill(slug);
  await alta.locator('select[name="stage"]').selectOption("semilla");
  await alta.locator('select[name="tech_profile"]').selectOption("software");
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/dada de alta/)).toBeVisible();

  // Se le mete algo dentro: un Anexo cuenta como histórico
  await page.goto(`/cartera/${slug}/programa`);
  await page.getByRole("button", { name: "Abrir el Anexo" }).click();

  /*
   * Se espera a que el botón desaparezca, no a un reloj.
   *
   * Leer la base justo después del clic era una carrera: la acción todavía
   * no había terminado y la compañía parecía vacía. Que el botón de abrir
   * ya no esté es la señal de que el Anexo existe.
   */
  await expect(
    page.getByRole("button", { name: "Abrir el Anexo" }),
  ).toHaveCount(0);
  await expect(page.getByText("Borrador")).toBeVisible();

  /*
   * Se vuelve pulsando, como lo haría una persona: así se comprueba el
   * camino de verdad, y no uno que el navegador puede servir de su caché.
   */
  await page.getByRole("link", { name: "Administración" }).click();
  await page.getByRole("link", { name: "Compañías y cohortes" }).click();

  /*
   * Sin recargar a mano.
   *
   * Aquí se veía «Borrar» a secas aunque la compañía ya tuviera un Anexo:
   * la pantalla venía de caché y ofrecía un borrado que la base habría
   * rechazado. Se arregló marcando la ruta como dinámica, y esta prueba es
   * la que lo sujeta: si vuelve a cachearse, falla.
   */
  const fila = page.locator("li").filter({ hasText: nombre }).first();

  await fila.getByRole("button", { name: "Borrar con su histórico" }).click();

  // Primero se recuerda lo que toca, y luego se dice qué se destruye
  await expect(page.getByText(/Lo normal/)).toBeVisible();
  await expect(page.getByText(/archivarla/)).toBeVisible();
  await expect(page.getByText(/1 Anexo/)).toBeVisible();

  /*
   * Y hay que escribir el identificador exacto.
   *
   * El formulario se localiza por su campo de confirmación, no por el
   * texto del botón: ese mismo rótulo lo llevan los botones de abrir de
   * todas las demás filas, y un `.last()` acabaría pulsando en otra
   * compañía.
   */
  const formulario = page.locator("form", {
    has: page.locator('input[name="confirmacion"]'),
  });
  const confirma = formulario.locator('input[name="confirmacion"]');

  await confirma.fill("no-es-el-slug");
  await formulario.getByRole("button", { name: /Borrar/ }).click();
  await expect(page.getByText(/escribe «/)).toBeVisible();

  await confirma.fill(slug);
  await formulario.getByRole("button", { name: /Borrar/ }).click();

  await expect(page.getByText(nombre)).toHaveCount(0);
});

/*
 * Red de seguridad.
 *
 * La prueba de arriba borra su propia compañía como último paso, así que en
 * verde no deja nada. Si se corta a mitad sí, y una compañía de prueba que
 * se queda hace que la siguiente pasada encuentre dos con el mismo nombre.
 */
test.afterAll(async () => {
  const restos = await consultar<{ slug: string }>(
    "companies",
    { slug: "like.conhistorico-%" },
    "slug",
  );
  for (const c of restos) await borrar("companies", { slug: c.slug });
});
