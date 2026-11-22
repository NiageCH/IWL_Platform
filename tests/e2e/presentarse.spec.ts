import { expect, test, type Page } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  consultar,
  correosRecibidos,
  entrarComo,
  quitarFicheros,
} from "./entrada";

/**
 * Presentarse, como lo hace una candidata (REVISION, 22 nov · bloques 2 y 3).
 *
 * Primero sus datos y el NDA, con una casilla; le llega el PDF y aterriza en
 * su enlace privado, donde presenta el proyecto. Al enviarlo, el filtro:
 * pasa, no pasa con su motivo, revisión manual o en espera de la
 * recomendación. Y en la ficha, IWL ve en qué quedó y lo resuelve a mano.
 *
 * La convocatoria es configuración compartida: se abre al empezar cada
 * prueba y se deja como estaba al terminarla. Las candidaturas que crea se
 * borran con sus ficheros.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";

async function conConvocatoria<T>(hacer: () => Promise<T>): Promise<T> {
  const [antes] = await consultar<{ convocatoria_abierta: boolean; convocatoria_cierra: string | null }>(
    "cohorts",
    { id: `eq.${COHORTE}` },
    "convocatoria_abierta,convocatoria_cierra",
  );
  await actualizar("cohorts", { id: `eq.${COHORTE}` }, { convocatoria_abierta: true, convocatoria_cierra: null });
  try {
    return await hacer();
  } finally {
    await actualizar("cohorts", { id: `eq.${COHORTE}` }, antes);
  }
}

async function limpiar(correo: string) {
  const filas = await consultar<{ id: string }>("candidaturas", { contacto_email: `eq.${correo}` }, "id");
  for (const f of filas) {
    await quitarFicheros("candidaturas", f.id);
    await borrar("candidaturas", { id: f.id });
  }
}

/** El primer paso: sus datos, el NDA completado con ellos y la casilla */
async function aceptarNda(page: Page, startup: string, correo: string) {
  await page.goto("/presentarse");
  await page.locator('input[name="startup"]').fill(startup);
  await page.locator('input[name="nombre"]').fill("Alba");
  await page.locator('input[name="apellidos"]').fill("Prueba Presentada");
  await page.locator('input[name="correo"]').fill(correo);
  await page.locator('select[name="como"]').selectOption("persona");
  await page.locator('input[name="documento"]').fill("00000000T");
  await page.locator('input[name="domicilio"]').fill("Calle de Prueba 1, Málaga");
  // El texto se completa mientras escribe: lo que lee es lo que acepta
  await expect(page.getByRole("region", { name: /Texto del NDA/ }).or(page.getByLabel(/Texto del NDA/))).toContainText(startup);
  // Dudas, antes de aceptarlo: el NDA no se comenta en la plataforma
  await expect(page.getByRole("link", { name: "iwl@inceptionwlab.es" })).toHaveAttribute("href", "mailto:iwl@inceptionwlab.es");
  await page.getByLabel("He leído el NDA y lo acepto.").check();
  await page.getByRole("button", { name: "Aceptar el NDA y seguir" }).click();
  await expect(page).toHaveURL(/\/candidatura\/[A-Za-z0-9_-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: `Presenta ${startup}` })).toBeVisible();
}

/** El segundo: el proyecto, con sus socios */
async function presentar(
  page: Page,
  { estadio, sector = "HealthTech", socios }: { estadio: string; sector?: string; socios: Array<[string, string, boolean]> },
) {
  await page.locator('textarea[name="one_liner"]').fill("Seguimiento de pacientes crónicos desde casa.");
  await page.locator('select[name="sector"]').selectOption(sector);
  if (sector === "Otro") await page.locator('input[name="sector_otro"]').fill("FinTech");
  await page.locator('select[name="estadio"]').selectOption(estadio);
  for (let i = 0; i < socios.length; i++) {
    if (i > 0) await page.getByRole("button", { name: "Añadir otro socio" }).click();
    const [nombre, pct, mujer] = socios[i];
    await page.locator('input[name="socio_nombre"]').nth(i).fill(nombre);
    await page.locator('input[name="socio_pct"]').nth(i).fill(pct);
    const casilla = page.getByRole("checkbox", { name: "Es mujer" }).nth(i);
    if (mujer) await casilla.check();
    else await casilla.uncheck();
  }
  if (estadio !== "idea") {
    await page.locator('input[name="prueba"]').setInputFiles({
      name: "prueba-mvp.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 prueba del estadio"),
    });
  }
}

test("acepta el NDA, presenta el proyecto y pasa el filtro; IWL lo ve en la ficha", async ({ page }) => {
  const correo = `e2e.presenta.pasa.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  const startup = `Pasa Prueba ${Date.now()}`;
  await conConvocatoria(async () => {
    try {
      await aceptarNda(page, startup, correo);

      // Le llega el NDA en PDF, con su enlace para seguir
      const [nda] = await correosRecibidos(correo);
      expect(nda.asunto).toBe(`Tu NDA con Inception Woman Lab · ${startup}`);
      expect(nda.adjuntos).toEqual(["NDA aceptado.pdf"]);
      expect(nda.texto).toMatch(/Presentar el proyecto: http\S+\/candidatura\/\S+/);

      // La suma se ve mientras escribe; con 33,33 + 33,33 + 33,34 cuadra
      await presentar(page, {
        estadio: "mvp_sin_piloto",
        socios: [
          ["Alba", "33,33", true],
          ["Bea", "33,33", true],
          ["Carlos", "33,34", false],
        ],
      });
      await expect(page.getByText("Suman el 100 % · en manos de mujeres, el 66,66 %")).toBeVisible();
      await page.getByRole("button", { name: "Enviar la candidatura" }).click();

      // Pasa: ve su candidatura, sin aviso de filtro
      await expect(page.getByRole("heading", { name: startup, exact: true })).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("[data-filtro]")).toHaveCount(0);

      const [c] = await consultar<{ id: string; estado: string; filtro: string }>(
        "candidaturas",
        { contacto_email: `eq.${correo}` },
        "id,estado,filtro",
      );
      expect(c).toMatchObject({ estado: "presentada", filtro: "pasa" });

      // IWL: el filtro en la ficha, con lo que lo decide
      await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);
      const filtro = page.locator("#filtro");
      await expect(filtro.getByText("Pasa el filtro")).toBeVisible();
      await expect(filtro.getByText("66,66 %")).toBeVisible();
      await expect(filtro.getByText(/Prueba del estadio · prueba-mvp\.pdf/)).toBeVisible();
    } finally {
      await limpiar(correo);
    }
  });
});

test("con la mitad del capital en manos de mujeres no pasa, y se le dice por qué", async ({ page }) => {
  const correo = `e2e.presenta.nopasa.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  const startup = `No Pasa Prueba ${Date.now()}`;
  await conConvocatoria(async () => {
    try {
      await aceptarNda(page, startup, correo);
      // Una suma que no cuadra se dice, y lo escrito se queda
      await presentar(page, { estadio: "facturando", socios: [["Alba", "50", true], ["Carlos", "40", false]] });
      await page.getByRole("button", { name: "Enviar la candidatura" }).click();
      await expect(page.getByText(/Las partes tienen que sumar el 100 %\. Ahora suman el 90 %\./).first()).toBeVisible();
      await expect(page.locator('input[name="socio_nombre"]').first()).toHaveValue("Alba");

      await page.locator('input[name="socio_pct"]').nth(1).fill("50");
      await page.locator('input[name="prueba"]').setInputFiles({
        name: "factura.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 factura"),
      });
      await page.getByRole("button", { name: "Enviar la candidatura" }).click();

      const aviso = page.locator('[data-filtro="no_pasa"]');
      await expect(aviso).toBeVisible({ timeout: 15_000 });
      await expect(aviso).toContainText("más del 50 % del capital en manos de mujeres");
      await expect(aviso).toContainText("En vuestra candidatura es el 50 %");

      const correos = await correosRecibidos(correo, { esperar: 2 });
      const motivo = correos.find((m) => m.asunto === `Tu candidatura a Inception Woman Lab · ${startup}`);
      expect(motivo?.texto).toContain("En vuestra candidatura es el 50 %");

      // Dirección la puede sacar del «no pasa», con motivo
      const [c] = await consultar<{ id: string }>("candidaturas", { contacto_email: `eq.${correo}` }, "id");
      await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);
      const filtro = page.locator("#filtro");
      await expect(filtro.getByText("No pasa el filtro")).toBeVisible();
      await filtro.getByText("Sacarla del «no pasa»").click();
      await filtro.getByLabel(/^Motivo/).fill("El pacto de socios da el control a la fundadora.");
      await filtro.getByRole("button", { name: "Pasa el filtro" }).click();
      await expect(filtro.getByText("Decidido a mano")).toBeVisible();
      await expect(filtro.locator(".estado").filter({ hasText: "Pasa el filtro" })).toBeVisible();
    } finally {
      await limpiar(correo);
    }
  });
});

test("una idea espera la recomendación, y quien recomienda la confirma desde su aviso", async ({ page }) => {
  const correo = `e2e.presenta.idea.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  const startup = `Idea Prueba ${Date.now()}`;
  const [equipo] = await consultar<{ id: string; full_name: string; last_name: string | null }>(
    "profiles",
    { email: `eq.${USUARIOS.equipoIwl}` },
    "id,full_name,last_name",
  );
  const nombreEquipo = [equipo.full_name, equipo.last_name].filter(Boolean).join(" ");
  await conConvocatoria(async () => {
    try {
      await aceptarNda(page, startup, correo);
      await presentar(page, { estadio: "idea", socios: [["Alba", "100", true]] });
      // En idea no se pide prueba: se pide quién la recomienda
      await expect(page.locator('input[name="prueba"]')).toHaveCount(0);
      await page.locator('select[name="recomendada_por"]').selectOption({ label: nombreEquipo });
      await page.getByRole("button", { name: "Enviar la candidatura" }).click();
      await expect(page.locator('[data-filtro="espera_recomendacion"]')).toBeVisible({ timeout: 15_000 });

      // A quien recomienda le llega el aviso, y lo confirma desde ahí
      const [c] = await consultar<{ id: string }>("candidaturas", { contacto_email: `eq.${correo}` }, "id");
      await entrarComo(page, USUARIOS.equipoIwl, "/cartera");
      const fila = page.locator('li[data-aviso="recomendacion_pendiente"]').filter({ hasText: startup });
      await expect(fila).toContainText("te pone como quien la recomienda");
      await fila.getByRole("link", { name: "Responder" }).click();
      await expect(page).toHaveURL(new RegExp(`/embudo/${c.id}\\?aviso=.+#filtro$`));
      await page.locator("#filtro").getByRole("button", { name: "Confirmar la recomendación" }).click();
      await expect(page.locator("#filtro").getByText("Pasa el filtro").first()).toBeVisible();
      await expect(page.locator("#filtro").getByText(/· confirmada/)).toBeVisible();
    } finally {
      await limpiar(correo);
    }
  });
});

test("un sector de fuera va a revisión manual, y el equipo la decide", async ({ page }) => {
  const correo = `e2e.presenta.manual.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  const startup = `Manual Prueba ${Date.now()}`;
  await conConvocatoria(async () => {
    try {
      await aceptarNda(page, startup, correo);
      await presentar(page, { estadio: "mvp_con_piloto", sector: "Otro", socios: [["Alba", "100", true]] });
      await page.getByRole("button", { name: "Enviar la candidatura" }).click();
      await expect(page.locator('[data-filtro="revision_manual"]')).toBeVisible({ timeout: 15_000 });

      const [c] = await consultar<{ id: string }>("candidaturas", { contacto_email: `eq.${correo}` }, "id");
      // En la lista del embudo, lo que escribió en «¿Cuál?» y que espera revisión
      await entrarComo(page, USUARIOS.equipoIwl, "/embudo");
      const fila = page.locator("li").filter({ hasText: startup });
      await expect(fila.getByText("Otro: FinTech")).toBeAttached();
      await expect(fila.getByText("Revisión manual")).toBeVisible();

      await page.goto(`/embudo/${c.id}`);
      const filtro = page.locator("#filtro");
      await expect(filtro.getByText("Otro: FinTech")).toBeVisible();
      await filtro.getByText("Decidir la revisión manual").click();
      await filtro.getByLabel(/^Motivo/).fill("Encaja: es salud financiera de clínicas pequeñas.");
      await filtro.getByRole("button", { name: "Pasa el filtro" }).click();
      await expect(filtro.getByText(/Decidido a mano por .*: Encaja/)).toBeVisible();
    } finally {
      await limpiar(correo);
    }
  });
});
