import { expect, test, type Page } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, consultar, entrarComo, quitarSesiones } from "./entrada";

/**
 * Sesiones con acta y horas confirmadas por ella (REVISION, 13 nov), de
 * punta a punta en la interfaz:
 *   · el mentor registra la sesión, con su acta y sus horas;
 *   · a ella le llega el aviso en su inicio; lo pulsa, llega a la sesión
 *     con la franja «Has venido a» y confirma;
 *   · otra sesión: dice que no cuadra; al mentor le llega el aviso, corrige
 *     las horas, queda la cifra de antes, y vuelve a ella.
 *
 * En Marea, donde el mentor de producto coordina. Lo que se crea se quita al
 * acabar.
 */

const MENTOR = "mentor@iwl.test";
const SELLO = Date.now().toString(36);
const creadas: string[] = [];
const titulos: string[] = [];

/** Único por proyecto: cada prueba corre en escritorio, Safari y móvil */
function tituloDe(base: string) {
  const t = `${base} ${SELLO} ${test.info().project.name}`;
  titulos.push(t);
  return t;
}

async function registrar(page: Page, titulo: string, horas: string) {
  await page.goto("/cartera/marea-clinica/sesiones");
  await page.getByRole("button", { name: "Registrar una sesión o un trabajo" }).click();
  await page.getByLabel("Duración, en minutos").fill("60");
  await page.getByLabel("Modalidad").selectOption("videollamada");
  await page.getByLabel("De qué fue, en una línea").fill(titulo);
  await page.getByLabel("Materia").selectOption({ index: 1 });
  await page.getByLabel("Acta: qué se trabajó").fill("Repasamos los precios y el embudo de ventas del trimestre.");
  await page.getByLabel("Horas 1").fill(horas);
  await page.getByLabel("Acuerdo 1").fill("Preparar tres escenarios de precio");
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  const [s] = await consultar<{ id: string }>("work_sessions", { title: `eq.${titulo}` }, "id");
  creadas.push(s.id);
  return s.id;
}

test.afterAll(async () => {
  await quitarSesiones(creadas);
  for (const titulo of titulos) {
    const correos = await consultar<{ id: string }>(
      "correos",
      { evento: "eq.sesion_registrada", company_id: `eq.${COMPANIAS.marea}`, "datos->>titulo": `eq.${titulo}` },
      "id",
    );
    for (const c of correos) await borrar("correos", { id: c.id });
  }
});

test("el mentor registra una sesión y ella, desde su aviso, confirma las horas", async ({ page }) => {
  const titulo = tituloDe("Precios");
  await entrarComo(page, MENTOR, "/cartera/marea-clinica/sesiones");
  const id = await registrar(page, titulo, "1,5");
  const tarjeta = page.locator(`#sesion-${id}`);
  await expect(tarjeta).toContainText("Por confirmar");
  await expect(tarjeta).toContainText("Preparar tres escenarios de precio");
  await expect(tarjeta).toContainText("1,5 h");

  // Y le ha salido el correo
  const correos = await consultar("correos", { evento: "eq.sesion_registrada", "datos->>titulo": `eq.${titulo}` }, "id");
  expect(correos.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);

  await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");
  const bloque = page.locator("section", { has: page.getByRole("heading", { name: "Te toca" }) });
  const aviso = bloque.locator('li[data-aviso="sesion_por_confirmar"]', { has: page.locator(`a[href*="#sesion-${id}"]`) });
  await expect(aviso).toContainText("ha registrado 1,5 h de sesión");
  await expect(aviso).toContainText("Te toca: confirmarlas o decir qué no cuadra");
  await aviso.getByRole("link", { name: "Revisar" }).click();
  await expect(page).toHaveURL(new RegExp(`/proyecto/sesiones\\?aviso=[0-9a-f-]+#sesion-${id}$`));

  const franja = page.getByRole("region", { name: "Has venido a" });
  await expect(franja).toContainText(`confirmar las horas de «${titulo}»`);
  await expect(franja.getByRole("button", { name: "Revisar" })).toBeInViewport();

  const suya = page.locator(`#sesion-${id}`);
  await suya.getByRole("button", { name: "Confirmar", exact: true }).click();
  await suya.getByLabel("Comentario (opcional)").fill("Muy útil, gracias.");
  await suya.getByRole("button", { name: "Confirmar las horas" }).click();
  await expect(suya).toContainText("Confirmada");
  await expect(page.getByRole("region", { name: "Hecho" })).toBeVisible();
  await expect(suya.getByText("Muy útil, gracias.")).toBeAttached();
});

test("si no cuadra, al mentor le llega el aviso; corrige con motivo y vuelve a ella", async ({ page }) => {
  const titulo = tituloDe("Embudo");
  await entrarComo(page, MENTOR, "/cartera/marea-clinica/sesiones");
  const id = await registrar(page, titulo, "2");
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);

  await entrarComo(page, USUARIOS.fundadoraMarea, `/proyecto/sesiones#sesion-${id}`);
  const suya = page.locator(`#sesion-${id}`);
  await suya.getByRole("button", { name: "No cuadra" }).click();
  await suya.getByLabel("Qué no cuadra").fill("Fue 1 h, no 2.");
  await suya.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(suya).toContainText("No cuadra · en discusión");
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);

  await entrarComo(page, MENTOR, "/cartera");
  const aviso = page.locator('li[data-aviso="sesion_no_cuadra"]', { has: page.locator(`a[href*="#sesion-${id}"]`) });
  await expect(aviso).toContainText(`dice que no cuadran las horas de «${titulo}»`);
  await aviso.getByRole("link", { name: "Responder" }).click();
  await expect(page.getByRole("region", { name: "Has venido a" })).toBeInViewport();

  const tarjeta = page.locator(`#sesion-${id}`);
  await expect(tarjeta.getByText("Fue 1 h, no 2.")).toBeVisible();
  await tarjeta.getByRole("button", { name: "Corregir las horas" }).click();
  await tarjeta.getByLabel("Horas, corregidas").fill("1");
  await tarjeta.getByLabel("Por qué cambian").fill("Tiene razón: acabamos antes.");
  await tarjeta.getByRole("button", { name: "Corregir", exact: true }).click();
  await expect(tarjeta).toContainText("Por confirmar");
  await tarjeta.getByText(/^Historia/).click();
  await expect(tarjeta).toContainText("corrigió las horas de");
  await expect(tarjeta).toContainText("de 2 h a 1 h");
});
