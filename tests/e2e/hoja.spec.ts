import { expect, test, type Page } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  crearCuenta,
  entrarComo,
  insertar,
  llamar,
  quitarFicheros,
} from "./entrada";

/**
 * La lista de entrada y la hoja de ruta (REVISION, 22 y 23 nov · bloque 5),
 * con una compañía recién nacida en entrada: una idea, que contesta su
 * «Diagnóstico» con un archivo; IWL lo verifica y genera la hoja de ruta
 * desde ahí, con los cuatro tramos y lo verificado ya cumplido.
 *
 * Todo lo que crea se borra: la compañía con sus ficheros, la candidatura
 * y la cuenta.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";

async function nacerEnEntrada(nombre: string, estadio: string) {
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre,
    contacto_nombre: "Fundadora",
    contacto_apellidos: "De Prueba",
    contacto_email: `e2e.hoja.${Date.now()}@ejemplo.test`,
    estado: "preseleccionada",
    estado_verificado: estadio,
    situacion_societaria: "sin_constituir",
  });
  const [admin] = await consultar<{ id: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "id");
  await llamar("registrar_nda_externo", {
    p_candidatura: c.id,
    p_profile: admin.id,
    p_firmado_on: "2026-11-01",
    p_documento: null,
    p_url: "https://ejemplo.test/nda.pdf",
  });
  const [con] = await consultar<{ company_id: string }>("candidaturas", { id: `eq.${c.id}` }, "company_id");
  const [co] = await consultar<{ slug: string }>("companies", { id: `eq.${con.company_id}` }, "slug");
  return { candidatura: c.id, compania: con.company_id, slug: co.slug };
}

async function contestar(page: Page, titulo: string, respuesta: "Ya lo tenemos" | "Todavía no", archivo?: string) {
  const fila = page.locator("#lista-entrada li").filter({ hasText: titulo });
  await fila.getByLabel(respuesta).check();
  if (archivo) {
    await fila.locator('input[name="evidencia"]').setInputFiles({
      name: archivo,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 evidencia de prueba"),
    });
  }
  await fila.getByRole("button", { name: "Guardar" }).click();
  return fila;
}

test("una idea contesta su diagnóstico, IWL lo verifica y la hoja de ruta sale desde ahí", async ({ page }) => {
  const nombre = `Hoja Idea ${Date.now()} ${test.info().project.name}`;
  const correo = `e2e.hoja.ella.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  const nueva = await nacerEnEntrada(nombre, "idea");
  try {
    // Su situación ya dicha: lo primero que pedía Mi compañía
    await actualizar("companies", { id: `eq.${nueva.compania}` }, { situacion_societaria: "sin_constituir" });
    const ella = await crearCuenta(correo);
    await actualizar("profiles", { id: `eq.${ella}` }, { role: "fundadora", full_name: "Fundadora" });
    await insertar("company_members", { company_id: nueva.compania, profile_id: ella, member_role: "fundadora" });

    // Ella: su lista se llama «Diagnóstico» y son los cinco hitos del tramo 1
    await entrarComo(page, correo, "/proyecto");
    const lista = page.locator("#lista-entrada");
    await expect(lista.getByRole("heading", { name: "Diagnóstico" })).toBeVisible();
    await expect(lista.locator("li")).toHaveCount(5);

    const hecho = await contestar(page, "Problema validado con entrevistas", "Ya lo tenemos", "entrevistas.pdf");
    await expect(hecho.getByText("Por verificar")).toBeVisible();
    await expect(hecho.getByRole("link", { name: "entrevistas.pdf" })).toBeVisible();
    const falta = await contestar(page, "Sociedad constituida y pacto de socias", "Todavía no");
    await expect(falta.getByText("Todavía no", { exact: true }).last()).toBeVisible();

    // IWL lo verifica desde la ficha
    await entrarComo(page, USUARIOS.equipoIwl, `/cartera/${nueva.slug}`);
    const fila = page.locator("#lista-entrada li").filter({ hasText: "Problema validado con entrevistas" });
    await fila.getByRole("button", { name: "Verificado" }).click();
    await expect(fila.getByText("Verificado", { exact: true })).toBeVisible();

    // Y genera la hoja de ruta desde ahí, en Programa
    await page.goto(`/cartera/${nueva.slug}/programa`);
    const asistente = page.locator("#asistente-hoja");
    await expect(asistente.getByText(/1 verificados, 0 «no basta», 1 «todavía no»/)).toBeVisible();
    await asistente.getByRole("button", { name: "Generar la hoja de ruta" }).click();
    await expect(asistente.getByText("Tramo 4 · De facturación a invertible")).toBeVisible();
    // La sección I del Anexo, con su plazo máximo
    await expect(page.locator("#anexo-hoja").getByText("Plazo máximo: 18 meses desde la firma")).toBeVisible();
    // Lo verificado entra cumplido
    await expect(page.locator("#anexo-hoja").getByText("✓ Problema validado con entrevistas a clientes potenciales")).toBeVisible();

    // Hecha la hoja de ruta, ella ya no cambia la lista
    await entrarComo(page, correo, "/proyecto");
    await expect(page.locator("#lista-entrada").getByText(/La hoja de ruta ya está hecha/)).toBeVisible();
    await expect(page.locator("#lista-entrada").getByRole("button", { name: "Guardar" })).toHaveCount(0);
  } finally {
    await quitarFicheros("data-room", nueva.compania);
    await borrar("candidaturas", { id: nueva.candidatura });
    await borrar("companies", { id: nueva.compania });
    await borrarCuenta(correo);
  }
});
