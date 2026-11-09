import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, consultar, entrarComo, insertar } from "./entrada";

/**
 * Las reuniones, de punta a punta, con una candidatura recién creada.
 *
 * Abre su enlace, IWL lo ve; propone dos franjas y ella ve «Reunión
 * propuesta»; se anota cómo quedó y queda en el historial.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();

test("proponer y anotar una reunión, y saber si abrió el enlace", async ({ page, browser }) => {
  const c = await insertar<{ id: string; token: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Reunión Prueba ${SELLO}`,
    contacto_nombre: "Agustina Prueba",
    contacto_email: `e2e.reunion.${SELLO}@ejemplo.test`,
    estado: "reunion",
  });

  try {
    // Ella abre su enlace, sin sesión
    const ajena = await browser.newContext();
    const suya = await ajena.newPage();
    await suya.goto(`/candidatura/${c.token}`);
    await expect(suya.getByText("En estudio").first()).toBeVisible();

    // IWL lo ve en la ficha
    await entrarComo(page, USUARIOS.equipoIwl, `/embudo/${c.id}`);
    await expect(page.getByText(/Abrió su enlace el/)).toBeVisible();

    // Propone dos franjas
    await page.getByText("Proponer reunión", { exact: true }).click();
    await page.getByLabel("Franja 1").fill("2026-12-03T10:00");
    await page.getByLabel("Franja 2").fill("2026-12-04T16:30");
    await page.getByRole("button", { name: "Proponer y abrir el correo" }).click();
    await expect(page.getByText(/sin celebrar/)).toBeVisible();
    await expect(page.getByText("· jueves, 3 de diciembre, de 10:00 a 10:45")).toBeVisible();

    // Y ella, en su enlace, ve que hay reunión propuesta
    await suya.reload();
    await expect(suya.getByText("Reunión propuesta").first()).toBeVisible();
    await ajena.close();

    // Se anota cómo quedó
    await page.getByText("Anotar esta reunión").click();
    const anotar = page.locator("form", { has: page.locator('input[name="reunion_id"][value]:not([value=""])') });
    await anotar.getByLabel("Fue el").fill("2026-12-03");
    await anotar.getByLabel("Cómo quedó").selectOption("seguir");
    await anotar.getByLabel("De IWL").fill("Rodrigo");
    await anotar.getByLabel("Qué se habló").fill("Producto claro, falta validar precio con clínicas.");
    await anotar.getByRole("button", { name: "Guardar la reunión" }).click();

    await expect(page.getByText(/Celebrada el/)).toBeVisible();
    await expect(page.getByText("Producto claro, falta validar precio con clínicas.").first()).toBeVisible();

    const eventos = await consultar<{ titulo: string }>(
      "candidatura_eventos",
      { candidatura_id: `eq.${c.id}`, tipo: "eq.reunion" },
      "titulo",
    );
    expect(eventos.map((e) => e.titulo).sort()).toEqual(["Reunión propuesta", "Reunión · Seguir"]);
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});
