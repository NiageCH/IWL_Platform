import { expect, test } from "@playwright/test";
import { USUARIOS, actualizar, borrar, consultar, entrarComo } from "./entrada";

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
   * Y la cuenta que se creó vuelve a su rol.
   *
   * La primera versión solo desligaba la candidatura y dejaba el perfil
   * como `candidata` para siempre: basura que se acumula pasada a pasada y
   * que un día hace fallar a otra prueba por un motivo que no tiene nada
   * que ver.
   */
  await actualizar(
    "profiles",
    { email: "eq.hola@brota.test" },
    { role: "fundadora" },
  );
  await borrar("candidatura_enlaces", {
    url: "https://drive.test/plan-nuevo",
  });
});
