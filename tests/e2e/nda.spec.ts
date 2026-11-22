import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, entrarComo, insertar } from "./entrada";

/**
 * El NDA en la ficha de una candidatura: lo que dice cuando la plantilla no
 * vale para firmar.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();
const PERSONA = `Firmante Prueba ${SELLO}`;

/*
 * Firmar el NDA con cuenta y contrafirmarlo era el proceso de antes del
 * 22 nov. Ahora el NDA se acepta al presentarse, con una casilla, y eso se
 * prueba en `presentarse.spec.ts`.
 */

test("con una plantilla con huecos, la ficha dice cuál falla y enlaza a Programa", async ({ page }) => {
  const candidatura = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `NDA Huecos ${SELLO}`,
    contacto_nombre: PERSONA,
    contacto_email: `e2e.nda.huecos.${SELLO}@ejemplo.test`,
    estado: "preseleccionada",
  });
  try {
    // Una versión solo suya, con un hueco: la genérica no se toca en pruebas
    await insertar("nda_plantillas", {
      texto: `Firmado en [CIUDAD] con {{startup}}.${" Texto de prueba, que no es un NDA.".repeat(8)}`,
      version: 0,
      hash: "",
      candidatura_id: candidatura.id,
    });
    await entrarComo(page, USUARIOS.admin, `/embudo/${candidatura.id}`);
    const bloque = page.locator("section").filter({ has: page.getByRole("heading", { name: "NDA", exact: true }) });
    await expect(bloque.getByText("Plantilla con huecos")).toBeVisible();
    await expect(bloque.getByText(/La plantilla tiene huecos sin marcador: \[CIUDAD\]/)).toBeVisible();
    await expect(bloque.getByText("Todavía no hay texto del NDA")).toHaveCount(0);
    await bloque.getByRole("link", { name: /Ir a la plantilla/ }).click();
    await expect(page).toHaveURL(/\/admin\/programa/);
  } finally {
    await borrar("candidaturas", { id: candidatura.id });
  }
});
