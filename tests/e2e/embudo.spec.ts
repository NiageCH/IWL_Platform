import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  consultar,
  entrarComo,
} from "./entrada";

/**
 * El embudo de selección, de punta a punta.
 *
 * El recorrido que hace una candidatura es el producto: presentarse, pasar
 * por los pasos, y acabar firmando o descartada. Cada tramo toca una pieza
 * distinta —el formulario público, la vista del embudo, el disparador que
 * escribe el histórico, la función que crea la compañía— y que funcione uno
 * no dice nada de los demás.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const DUNA = "00000000-0000-0000-0005-000000000003";
const SELLO = Date.now();
const CORREO = `e2e.candidatura.${SELLO}@ejemplo.test`;
const STARTUP = `Prueba Embudo ${SELLO}`;
const SLUG = `prueba-embudo-${SELLO}`;

test("el equipo de IWL ve el embudo con su reparto por paso", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/embudo");

  await expect(page.getByRole("heading", { name: "Embudo" })).toBeVisible();

  // El recorrido, con los pasos de la semilla
  await expect(page.getByText("Brota Analítica")).toBeVisible();
  await expect(page.getByText("Risco Energía")).toBeVisible();

  /*
   * Y la descartada, con el motivo a la vista. Que se vea por qué se cayó
   * cada una es la mitad de para qué sirve guardarlas.
   */
  await expect(page.getByText("Vela Fintech")).toBeVisible();
  await expect(page.getByText(/mercado bien atendido/i).first()).toBeVisible();
});

test("una fundadora no llega al embudo", async ({ page }) => {
  await entrarComo(page, USUARIOS.fundadoraMarea, "/embudo");

  // La echa a su proyecto: el embudo es de IWL
  await expect(page).not.toHaveURL(/\/embudo/);
});

test("una candidatura recorre el embudo y acaba siendo compañía", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/embudo");

  // Alta a mano, que es lo que se usa para lo que llega por otro camino
  await page.getByText("Dar de alta una candidatura a mano").click();
  const alta = page.locator("form", {
    has: page.locator('select[name="cohort_id"]'),
  });
  await alta.locator('input[name="nombre"]').fill(STARTUP);
  await alta.locator('input[name="contacto_nombre"]').fill("Fundadora Prueba");
  await alta.locator('input[name="contacto_email"]').fill(CORREO);
  await alta.getByRole("button", { name: "Dar de alta" }).click();

  await expect(page.getByText(`${STARTUP} entra en el embudo.`)).toBeVisible();

  // Se entra en su ficha
  await page.getByRole("link", { name: STARTUP, exact: true }).first().click();
  await expect(page.getByRole("heading", { name: STARTUP })).toBeVisible();

  /*
   * Y se avanza paso a paso. Se usa el botón del siguiente paso, que es el
   * camino de un clic, hasta llegar a acuerdo.
   */
  for (const paso of [
    "en revisión",
    "reunión",
    "comité",
    "preseleccionada",
    "nda firmado",
    "due diligence",
    "acuerdo propuesto",
  ]) {
    await page
      .getByRole("button", { name: new RegExp(`Pasar a ${paso}`, "i") })
      .click();
    await expect(page.getByText("Movida.")).toBeVisible();
  }

  // El histórico lo ha ido escribiendo la base, no la pantalla
  await expect(page.getByText("Cambio de paso").first()).toBeVisible();

  // Y se firma, que es lo que crea la compañía
  await page.getByText("Firmar el acuerdo y crear la compañía").click();
  const firma = page.locator("form", { has: page.locator('input[name="slug"]') });
  await firma.locator('input[name="slug"]').fill(SLUG);
  await firma.getByRole("button", { name: /Firmar y crear/ }).click();

  /*
   * Lo que se comprueba es el resultado, no un mensaje de éxito.
   *
   * Firmar hace que la candidatura pase a `firmada`, y el panel de firmar
   * solo se enseña a las que no lo están: la acción se lleva por delante su
   * propio acuse. El acuse de verdad es la pantalla, que ahora dice que
   * firmó y enlaza con su ficha.
   */
  await expect(
    page.getByRole("heading", { name: "Firmada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ver su ficha en la cartera/ }),
  ).toBeVisible();

  // Y existe de verdad
  await page.goto(`/cartera/${SLUG}`);
  await expect(page.getByRole("heading", { name: STARTUP })).toBeVisible();
});

test("descartar pide el motivo y guarda desde dónde se cayó", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/embudo");

  // Duna está en reunión en la semilla
  await page.getByRole("link", { name: "Duna Logística" }).first().click();

  await page.getByText("Descartar esta candidatura").click();
  const descarte = page.locator("form", {
    has: page.locator('textarea[name="motivo"]'),
  });

  /*
   * Sin motivo no deja. Lo para el navegador, porque el campo es
   * obligatorio, así que no llega a haber mensaje del servidor: lo que se
   * comprueba es que no pasa nada, que es justo lo que tiene que pasar.
   *
   * El servidor también lo exige —el esquema pide tres caracteres—, y eso
   * no se puede comprobar desde aquí sin saltarse el formulario.
   */
  await descarte.getByRole("button", { name: "Descartar" }).click();

  const bloqueado = await descarte
    .locator('textarea[name="motivo"]')
    .evaluate((e: HTMLTextAreaElement) => e.validity.valueMissing);
  expect(bloqueado).toBe(true);
  await expect(page.getByText("Descartada, con su motivo.")).toHaveCount(0);

  await descarte
    .locator('textarea[name="motivo"]')
    .fill("Sin validación con clientes todavía. Se le invita a volver.");
  await descarte.getByRole("button", { name: "Descartar" }).click();

  /*
   * Otra vez el resultado y no el mensaje: descartar hace que el panel de
   * descartar deje de enseñarse, y se lleva su acuse con él. Lo que confirma
   * que ha funcionado es la pantalla, que ahora dice desde dónde se cayó.
   */
  await expect(
    page.getByRole("heading", { name: "Descartada", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Se cayó en reunión/i)).toBeVisible();
  // Sale dos veces: en el bloque de descarte y en el histórico que escribe
  // el disparador, que es justo lo que se quiere
  await expect(page.getByText(/Sin validación con clientes/).first()).toBeVisible();

  // Y reabrirla la devuelve donde estaba, no al principio
  await page.getByRole("button", { name: /Reabrir/ }).click();

  /*
   * Y lo mismo: reabrir quita el bloque de descarte, que es donde vive el
   * botón y su mensaje. Lo que confirma que ha ido bien es que vuelve a
   * haber recorrido, y que el siguiente paso que ofrece es comité —no
   * presentada—, que es la gracia de reabrir donde se quedó.
   */
  await expect(
    page.getByRole("button", { name: /Pasar a comité/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Descartada", exact: true }),
  ).toHaveCount(0);
});

test.afterAll(async () => {
  /*
   * Se deja todo como estaba, y por fuera del camino que se prueba.
   *
   * La candidatura primero y la compañía después, no al revés.
   *
   * Borrar la compañía deja `company_id` en nulo —así está la clave ajena—,
   * y entonces la candidatura sigue siendo `firmada` sin compañía, que es
   * justo lo que prohíbe el constraint `firmada_tiene_compania`. El borrado
   * fallaba por una regla que está bien puesta.
   *
   * Y Duna vuelve a reunión con sus campos de descarte limpios: la primera
   * versión solo borraba los eventos, así que la segunda pasada la
   * encontraba descartada y no había panel de descartar que pulsar.
   */
  await borrar("candidaturas", { contacto_email: CORREO });
  await borrar("companies", { slug: SLUG });

  await actualizar(
    "candidaturas",
    { id: `eq.${DUNA}` },
    {
      estado: "reunion",
      descartada_desde: null,
      descartada_motivo: null,
      descartada_at: null,
      descartada_por: null,
    },
  );

  await borrar("candidatura_eventos", {
    candidatura_id: DUNA,
    tipo: "cambio_estado",
  });
});

test("la convocatoria se abre y se cierra desde el embudo", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/embudo");

  await page.getByText("Abrir o cerrar la convocatoria").click();
  const form = page.locator("form", {
    has: page.locator('select[name="abierta"]'),
  });

  await form.locator('select[name="cohort_id"]').selectOption(COHORTE);
  await form.locator('select[name="abierta"]').selectOption("true");
  await form.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Convocatoria abierta.")).toBeVisible();

  /*
   * Y se comprueba en la base, no solo el mensaje. Son dos cosas distintas:
   * el mensaje dice que la acción terminó bien, la fila dice que la
   * convocatoria quedó abierta.
   *
   * Con `poll` y no con una lectura directa. El mensaje aparece en cuanto
   * la acción devuelve, pero la fila tarda un instante más en verse desde
   * otra conexión, y leer de inmediato era una carrera: el fichero pasaba
   * cuando se ejecutaba solo —porque la fila ya estaba abierta de la pasada
   * anterior— y fallaba en cuanto algo la dejaba cerrada antes.
   */
  await expect
    .poll(
      async () => {
        const [c] = await consultar<{ convocatoria_abierta: boolean }>(
          "cohorts",
          { id: `eq.${COHORTE}` },
          "convocatoria_abierta",
        );
        return c.convocatoria_abierta;
      },
      { timeout: 10_000 },
    )
    .toBe(true);

  /*
   * Y la dirección donde se presenta la gente está a la vista.
   *
   * Rodrigo abrió la convocatoria y no encontró por dónde entrar al
   * formulario: la ruta solo existía en el código. Es el enlace que se
   * reparte por correo o en LinkedIn, así que tiene que verse y poder
   * copiarse desde donde se abre la convocatoria.
   */
  await expect(page.getByText("Reparte esta dirección")).toBeVisible();
  await expect(
    page.getByText(/\/presentarse$/).first(),
  ).toBeVisible();

  // Con la convocatoria abierta, el formulario público admite candidaturas
  await page.goto("/presentarse");
  await expect(
    page.getByRole("heading", { name: "Presenta tu startup" }),
  ).toBeVisible();
  await expect(page.locator('input[name="nombre"]')).toBeVisible();
});
