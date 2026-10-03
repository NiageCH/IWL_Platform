import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  entrarComo,
} from "./entrada";

/**
 * Lo que ve quien se presentó.
 *
 * Dos puertas: el enlace privado mientras no tiene cuenta, y la sesión desde
 * que firma el NDA. Lo que se comprueba aquí, sobre todo, es **lo que no se
 * enseña**: el punto exacto del proceso interno, el equity y el motivo del
 * descarte son asunto de IWL.
 */

const BROTA = "00000000-0000-0000-0005-000000000001"; // presentada
const AMBAR = "00000000-0000-0000-0005-000000000004"; // en comité
const VELA = "00000000-0000-0000-0005-000000000006"; // descartada
const COHORTE = "00000000-0000-0000-0003-000000000001";

/** Los correos que crean estas pruebas, para limpiarlos al acabar */
const CORREOS: string[] = [];

/** El testigo de una candidatura, por fuera de la pantalla */
async function tokenDe(id: string): Promise<string> {
  const [fila] = await consultar<{ token: string }>(
    "candidaturas",
    { id: `eq.${id}` },
    "token",
  );
  return fila.token;
}

test("por el enlace privado ve su estado, sin jerga de dentro", async ({
  page,
}) => {
  await page.goto(`/candidatura/${await tokenDe(AMBAR)}`);

  await expect(
    page.getByRole("heading", { name: "Ámbar Educación" }),
  ).toBeVisible();

  /*
   * Está en comité, y se le dice «en estudio». El punto exacto no le aporta
   * nada y sí invita a interpretar silencios.
   */
  await expect(page.getByText("En estudio")).toBeVisible();
  await expect(page.getByText(/comité/i)).toHaveCount(0);

  /*
   * Y no se le pide que se presente.
   *
   * Lo hacía siempre que faltara la descripción o el punto en que están,
   * en cualquier paso. A una que ya ha pasado por una reunión y está en
   * comité, eso le dice que no hemos mirado su candidatura.
   */
  await expect(page.getByText("Cuéntanos quiénes sois")).toHaveCount(0);

  // El formulario sigue estando, por si un dato cambia, pero plegado
  await expect(page.locator('textarea[name="one_liner"]')).toBeHidden();
  await expect(page.getByText("Corregir nuestros datos")).toBeVisible();

  // Y ve lo que mandó
  await expect(page.getByText("Pitch deck")).toBeVisible();
});

test("y puede añadir lo que se le olvidó", async ({ page }) => {
  const token = await tokenDe(BROTA);
  await page.goto(`/candidatura/${token}`);

  await page.getByText("Añadir un documento").click();
  const form = page.locator("form", { has: page.locator('input[name="url"]') });
  await form.locator('input[name="titulo"]').fill("Plan financiero");
  await form.locator('input[name="url"]').fill("https://drive.test/plan-nuevo");
  await form.getByRole("button", { name: "Añadir" }).click();

  await expect(page.getByText("Añadido. Gracias.")).toBeVisible();
  await expect(page.getByText("Plan financiero")).toBeVisible();
});

test("una descartada no lee el motivo por el que se descartó", async ({
  page,
}) => {
  await page.goto(`/candidatura/${await tokenDe(VELA)}`);

  await expect(page.getByText("Proceso cerrado")).toBeVisible();

  /*
   * Y no se le reprocha un vacío que ya da igual: la caja de documentos no
   * sale si no hay nada que enseñar ni nada que hacer.
   */
  await expect(
    page.getByText("Todavía no nos has mandado ningún documento."),
  ).toHaveCount(0);

  /*
   * El motivo está escrito para decidir, no para comunicar. Se lo cuenta
   * una persona, no una pantalla.
   */
  await expect(page.getByText(/perfil técnico/i)).toHaveCount(0);
  await expect(page.getByText(/mercado bien atendido/i)).toHaveCount(0);

  // Y ya no admite material
  await expect(page.getByText("Añadir un documento")).toHaveCount(0);
});

test("un enlace inventado no dice si existe o no", async ({ page }) => {
  const respuesta = await page.goto("/candidatura/testigo-que-no-existe-aaaa");
  expect(respuesta?.status()).toBe(404);
});

test("al darle cuenta, el enlace deja de valer", async ({ page }) => {
  const token = await tokenDe(BROTA);

  await entrarComo(page, USUARIOS.admin, `/embudo/${BROTA}`);

  // El enlace se enseña para poder mandarlo a mano
  await expect(page.getByText(new RegExp(token.slice(0, 12)))).toBeVisible();

  await page
    .getByRole("button", { name: /Darle cuenta para el due diligence/ })
    .click();

  /*
   * El mensaje tiene que salir, y aquí no es un detalle: lleva la
   * contraseña y se enseña una sola vez. El formulario se monta siempre
   * precisamente para que darle la cuenta no se lleve por delante la
   * credencial antes de que nadie pueda copiarla.
   */
  await expect(page.getByText(/Acceso dado a/)).toBeVisible();
  await expect(page.getByText(/no se vuelve a enseñar/)).toBeVisible();

  // Y desde fuera, el enlace ya no abre nada
  const respuesta = await page.goto(`/candidatura/${token}`);
  expect(respuesta?.status()).toBe(404);
});

test("al entrar con su cuenta aterriza en su candidatura, no en «sin compañía»", async ({
  page,
}) => {
  /*
   * El agujero que esto cubre: se le daba cuenta al firmar el NDA, entraba,
   * y la raíz la mandaba a `/proyecto` —que es la vista de una compañía—
   * para acabar en «no tienes compañía». Verdad, pero inútil: todavía no la
   * tiene, y lo suyo estaba en otra dirección que nadie le había dicho.
   */
  // Se le da cuenta desde el embudo, que es el único camino
  await entrarComo(page, USUARIOS.admin, `/embudo/${AMBAR}`);
  await page
    .getByRole("button", { name: /Darle cuenta para el due diligence/ })
    .click();
  await expect(page.getByText(/Acceso dado a/)).toBeVisible();

  // La contraseña se enseña una vez: se saca del propio mensaje
  const mensaje = await page.getByText(/Acceso dado a/).innerText();
  const clave = mensaje.match(/contraseña es ([^\s]+)/)?.[1];
  expect(clave).toBeTruthy();

  // Y entra con ella, por la puerta de siempre
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);

  await page.locator('input[type="email"]').fill("hola@ambar.test");
  await page.locator('input[type="password"]').fill(clave!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  // Aterriza en su candidatura, con su nombre y lo que le piden
  await expect(page).toHaveURL(/\/candidatura$/);
  await expect(
    page.getByRole("heading", { name: "Ámbar Educación" }),
  ).toBeVisible();
});

test("quien se presenta por el formulario recibe su enlace", async ({
  page,
}) => {
  /*
   * Sin esto se quedaba sin forma de volver: la pantalla le decía «te
   * escribimos al correo» y no hay envío de correo montado, así que su
   * candidatura desaparecía de su vista al cerrar la pestaña.
   */
  await actualizar(
    "cohorts",
    { id: `eq.${COHORTE}` },
    { convocatoria_abierta: true, convocatoria_cierra: null },
  );

  const correo = `e2e.presenta.${Date.now()}@ejemplo.test`;
  CORREOS.push(correo);

  await page.goto("/presentarse");
  await page.locator('input[name="nombre"]').fill("Startup Que Se Presenta");
  await page.locator('input[name="contacto_nombre"]').fill("Quien Sea");
  await page.locator('input[name="contacto_email"]').fill(correo);
  /*
   * Se rellena la descripción y el punto en que están, que es lo que hace
   * que la candidatura esté completa. Sin eso, el enlace le pediría —con
   * razón— que terminara de presentarse, y entonces esta prueba no estaría
   * comprobando lo que dice comprobar.
   */
  await page
    .locator('textarea[name="one_liner"]')
    .fill("Hacemos seguimiento de cultivos.");
  await page.locator('select[name="estado_declarado"]').selectOption("mvp");
  await page.getByRole("button", { name: /Enviar la candidatura/ }).click();

  await expect(page.getByText("Recibida. Gracias.")).toBeVisible();

  // Y con su enlace a la vista, para guardarlo
  await expect(page.getByText(/Guarda esta dirección/)).toBeVisible();
  await page.getByRole("link", { name: "Abrir mi candidatura" }).click();

  await expect(
    page.getByRole("heading", { name: "Startup Que Se Presenta" }),
  ).toBeVisible();

  /*
   * Y como se presentó ella, no se le pide que se presente: se le da las
   * gracias. Es la diferencia con el camino de la invitación.
   */
  await expect(page.getByText("Recibida", { exact: true })).toBeVisible();
  await expect(page.getByText("Cuéntanos quiénes sois")).toHaveCount(0);

  /*
   * Y se cierra aquí mismo, no en el `afterAll`.
   *
   * La convocatoria es configuración compartida: mientras esté abierta,
   * cualquier otra prueba que mire el formulario público ve algo distinto.
   * Dejarlo para el `afterAll` parecía suficiente y no lo era —los ganchos
   * de un fichero no se disparan necesariamente antes de que empiece el
   * siguiente—, así que otra prueba de otro fichero encontraba la
   * convocatoria cerrada a media ejecución.
   */
  await actualizar(
    "cohorts",
    { id: `eq.${COHORTE}` },
    { convocatoria_abierta: false },
  );
});

test("a quien da de alta IWL se le pide que se presente, no se le dan las gracias", async ({
  page,
}) => {
  /*
   * El camino de la invitación: IWL conoce a alguien en un evento, la da de
   * alta con el nombre y un correo, y le manda el enlace. Ella no ha
   * mandado nada todavía, así que agradecérselo es raro y además no le dice
   * lo único que importa, que le toca a ella.
   */
  const correo = `e2e.invitada.${Date.now()}@ejemplo.test`;
  CORREOS.push(correo);

  await entrarComo(page, USUARIOS.admin, "/embudo");
  await page.getByText("Dar de alta una candidatura a mano").click();
  const alta = page.locator("form", {
    has: page.locator('select[name="cohort_id"]'),
  });
  await alta.locator('input[name="nombre"]').fill("Invitada A Dedo");
  await alta.locator('input[name="contacto_nombre"]').fill("Quien Sea");
  await alta.locator('input[name="contacto_email"]').fill(correo);
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/entra en el embudo/)).toBeVisible();

  const [fila] = await consultar<{ token: string }>(
    "candidaturas",
    { contacto_email: `eq.${correo}` },
    "token",
  );

  await page.goto(`/candidatura/${fila.token}`);

  await expect(page.getByText("Cuéntanos quiénes sois")).toBeVisible();
  await expect(page.getByText("Recibida", { exact: true })).toHaveCount(0);

  // Y tiene dónde contarlo
  const ficha = page.locator("form", {
    has: page.locator('textarea[name="one_liner"]'),
  });
  await ficha
    .locator('textarea[name="one_liner"]')
    .fill("Hacemos sensores para invernaderos.");
  await ficha.locator('select[name="estado_declarado"]').selectOption("mvp");
  await ficha.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Guardado. Gracias.")).toBeVisible();
  await expect(
    page.getByText("Hacemos sensores para invernaderos."),
  ).toBeVisible();
});

test("un porcentaje escrito a mano no tira la candidatura por tierra", async ({
  page,
}) => {
  /*
   * Lo que pasó de verdad: alguien rellenó el formulario entero, escribió
   * «50 %» donde se pide el porcentaje, y al enviar se encontró con «revisa
   * los campos marcados» —sin ninguno marcado— y el formulario en blanco.
   *
   * Tres cosas a la vez, y las tres se comprueban aquí: que un porcentaje
   * escrito como lo escribe una persona vale, que cuando algo falla se dice
   * cuál, y que lo escrito se queda donde estaba.
   */
  await actualizar(
    "cohorts",
    { id: `eq.${COHORTE}` },
    { convocatoria_abierta: true, convocatoria_cierra: null },
  );

  const correo = `e2e.porcentaje.${Date.now()}@ejemplo.test`;
  CORREOS.push(correo);

  // 1. Con el signo y el espacio puestos, entra
  await page.goto("/presentarse");
  await page.locator('input[name="nombre"]').fill("Escrito A Mano");
  await page.locator('textarea[name="one_liner"]').fill("Sensores agrícolas.");
  await page.locator('select[name="estado_declarado"]').selectOption("mvp");
  await page.locator('input[name="contacto_nombre"]').fill("Quien Sea");
  await page.locator('input[name="contacto_email"]').fill(correo);
  await page.locator('input[name="liderazgo_femenino_pct"]').fill("50 %");
  await page.locator('input[name="equipo_personas"]').fill("6");
  await page.getByRole("button", { name: /Enviar la candidatura/ }).click();

  await expect(page.getByText("Recibida. Gracias.")).toBeVisible();

  // Y llega como número, no como texto
  const [fila] = await consultar<{ liderazgo_femenino_pct: number }>(
    "candidaturas",
    { contacto_email: `eq.${correo}` },
    "liderazgo_femenino_pct",
  );
  expect(Number(fila.liderazgo_femenino_pct)).toBe(50);

  // 2. Y cuando de verdad no es un número, se dice cuál y no se borra nada
  await page.goto("/presentarse");
  await page.locator('input[name="nombre"]').fill("La Que Se Equivoca");
  await page
    .locator('textarea[name="one_liner"]')
    .fill("Una frase que costó escribir.");
  await page.locator('input[name="contacto_nombre"]').fill("Quien Sea");
  await page
    .locator('input[name="contacto_email"]')
    .fill(`e2e.mal.${Date.now()}@ejemplo.test`);
  await page.locator('input[name="liderazgo_femenino_pct"]').fill("la mitad");
  await page.getByRole("button", { name: /Enviar la candidatura/ }).click();

  // Se nombra el campo, en las palabras de la pantalla
  await expect(page.getByText(/Revisa este campo: liderazgo femenino/)).toBeVisible();
  await expect(page.getByText("Un porcentaje entre 0 y 100.")).toBeVisible();

  // Y lo demás sigue escrito: React reinicia el formulario tras cada acción
  await expect(page.locator('input[name="nombre"]')).toHaveValue(
    "La Que Se Equivoca",
  );
  await expect(page.locator('textarea[name="one_liner"]')).toHaveValue(
    "Una frase que costó escribir.",
  );

  await actualizar(
    "cohorts",
    { id: `eq.${COHORTE}` },
    { convocatoria_abierta: false },
  );
});

test.afterAll(async () => {
  /*
   * Se deja todo como estaba, por fuera del camino que se prueba. El enlace
   * que se anuló vuelve, y la cuenta que se creó se desliga: borrarla no
   * hace falta porque es la de contacto de la semilla.
   */
  await actualizar(
    "candidaturas",
    { id: `eq.${BROTA}` },
    { profile_id: null, token_anulado_at: null },
  );

  /*
   * Y la cuenta que se creó se borra entera.
   *
   * Dar acceso a una candidata crea una cuenta en `auth.users`, y la
   * semilla no la tiene: dejarla puesta —aunque sea con el rol cambiado—
   * es una persona de más en los desplegables y una fila que no debería
   * existir. Una candidata que no firma no tiene cuenta.
   */
  for (const correo of CORREOS) {
    await borrar("candidaturas", { contacto_email: correo });
  }
  await borrarCuenta("hola@brota.test");
  await borrarCuenta("hola@ambar.test");
  await actualizar(
    "candidaturas",
    { id: `eq.${AMBAR}` },
    { profile_id: null, token_anulado_at: null },
  );
  await borrar("candidatura_enlaces", {
    url: "https://drive.test/plan-nuevo",
  });
});
