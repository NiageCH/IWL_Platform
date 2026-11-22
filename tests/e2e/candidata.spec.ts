import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  entrarComo,
  insertar,
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

/**
 * Una candidatura recién creada en Preseleccionada, que es desde donde se
 * envía el NDA. Las de la semilla están antes del comité, y moverlas
 * dejaría sus cambios de paso en el historial.
 */
async function preseleccionada(sufijo: string) {
  const correo = `e2e.envio.${sufijo}.${Date.now()}@ejemplo.test`;
  CORREOS.push(correo);
  const c = await insertar<{ id: string; token: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Envío NDA ${sufijo} ${Date.now()}`,
    contacto_nombre: "Candidata Envío",
    contacto_email: correo,
    estado: "preseleccionada",
  });
  return { ...c, correo };
}

test("antes del comité no se le da cuenta, ni hay NDA que enviar", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, `/embudo/${BROTA}`);
  await expect(page.getByText(/La cuenta se le da cuando el comité la preselecciona y entra/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar el NDA" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Darle cuenta/ })).toHaveCount(0);
});

/*
 * Sin NDA después de la preselección (REVISION, 22 nov): el NDA se acepta
 * al presentarse, y preseleccionar ya crea la compañía. La que llega aquí
 * preseleccionada es una dada de alta a mano, sin NDA.
 */
test("preseleccionada sin NDA no se le envía: se registra el firmado fuera", async ({ page }) => {
  const c = await preseleccionada("sin-nda");
  await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);
  await expect(page.getByText(/Preseleccionada sin NDA aceptado: se dio de alta a mano/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar el NDA" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Darle cuenta/ })).toHaveCount(0);
});

// Presentarse por el formulario —NDA, proyecto y filtro— se prueba en `presentarse.spec.ts`

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
  await alta.locator('input[name="contacto_apellidos"]').fill("De Prueba");
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
  await ficha.locator('select[name="estado_declarado"]').selectOption("mvp_sin_piloto");
  await ficha.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Guardado. Gracias.")).toBeVisible();
  await expect(
    page.getByText("Hacemos sensores para invernaderos."),
  ).toBeVisible();
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
    await borrarCuenta(correo);
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
