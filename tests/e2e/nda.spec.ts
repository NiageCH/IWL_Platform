import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  correosRecibidos,
  consultar,
  entrarComo,
  insertar,
  quitarFicheros,
} from "./entrada";

/**
 * El NDA, firmado dentro de la plataforma por las dos partes.
 *
 * Con una candidatura recién creada: se le da cuenta, entra y no ve más
 * que el NDA; lo firma, dirección lo contrafirma desde el aviso, y queda
 * el rastro en la base y el PDF en su data room. Con las dos firmas nace
 * su compañía en entrada: ella entra en Mi compañía y dice su situación,
 * dirección la confirma y decide que no se incorpora. La plantilla es la
 * de prueba de la semilla local, que dice que no es un NDA.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();
const NOMBRE = `NDA Prueba ${SELLO}`;
const PERSONA = `Firmante Prueba ${SELLO}`;
const CORREO = `e2e.nda.${SELLO}@ejemplo.test`;

async function entrarComoElla(page: import("@playwright/test").Page, clave: string) {
  await page.goto("/entrar");
  await page.locator('input[type="email"]').fill(CORREO);
  await page.locator('input[type="password"]').fill(clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("la candidata firma el NDA, IWL lo contrafirma, y nace su compañía en entrada", async ({ page }) => {
  let companiaId: string | null = null;
  const candidatura = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: NOMBRE,
    contacto_nombre: PERSONA,
    contacto_email: CORREO,
    estado: "preseleccionada",
  });

  try {
    await entrarComo(page, USUARIOS.admin, `/embudo/${candidatura.id}`);
    await page.getByRole("button", { name: "Enviar el NDA" }).click();
    const mensaje = await page.getByText(/NDA enviado a/).innerText();
    const temporal = mensaje.match(/contraseña es ([^\s]+)/)![1];
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    // Entra, cambia la contraseña y no ve más que el NDA
    await entrarComoElla(page, temporal);
    await expect(page).toHaveURL(/\/cambiar-contrasena/, { timeout: 15_000 });
    await page.getByLabel("Nueva contraseña").fill("la-de-la-firma-2026");
    await page.getByLabel("Otra vez").fill("la-de-la-firma-2026");
    await page.getByRole("button", { name: "Guardar y entrar" }).click();
    await expect(page).toHaveURL(/\/candidatura$/, { timeout: 15_000 });

    await expect(page.getByRole("heading", { name: "Firma el NDA" })).toBeVisible();
    await expect(page.getByText("TEXTO DE PRUEBA. NO ES UN NDA.")).toBeVisible();
    // Con su formato, el mismo que el PDF: título, cláusulas con su número, negrita, firmas
    const nda = page.getByLabel(/^Texto del NDA, versión/);
    await expect(nda.getByRole("heading", { name: "Acuerdo de confidencialidad de prueba", level: 3 })).toBeVisible();
    await expect(nda.getByRole("heading", { name: /^01\s*Objeto de la prueba$/ })).toBeVisible();
    await expect(nda.locator("strong", { hasText: "no tomar este texto por un acuerdo de verdad" })).toBeVisible();
    await expect(nda.getByText("::: firma")).toHaveCount(0);
    await expect(nda.getByText("Cargo: En nombre propio")).toBeVisible();
    await expect(page.getByText("Documentación del due diligence")).toHaveCount(0);
    // Y debajo, su candidatura entera: el NDA protege lo que viene, no lo que ya mandó
    await expect(page.getByRole("heading", { name: NOMBRE, level: 1 })).toBeVisible();

    /*
     * Sus datos para el NDA, y el texto se completa mientras escribe: lo que
     * ve es lo que firma. Mientras falte algo, no se puede firmar.
     */
    await expect(page.getByRole("button", { name: "Firmar el NDA" })).toBeDisabled();
    // Su nombre completo, de entrada el de la candidatura: lo confirma o lo corrige
    await expect(page.getByLabel("Nombre y apellidos, como en tu documento")).toHaveValue(PERSONA);
    await page.getByLabel("Firmas").selectOption("persona");
    await expect(page.getByText(`Entre Inception Woman Lab y ${PERSONA}, de ${NOMBRE}, con documento {{documento}}`)).toBeVisible();
    await page.getByLabel("Tu DNI, NIE o pasaporte").fill("12345678Z");
    await page.getByLabel("Domicilio").fill("Calle Larios 1, 29005 Málaga");
    await expect(
      page.getByText(`Entre Inception Woman Lab y ${PERSONA}, de ${NOMBRE}, con documento 12345678Z y domicilio en Calle Larios 1, 29005 Málaga.`),
    ).toBeVisible();
    await expect(page.getByText(/En Málaga, con efecto desde la fecha de la última de las firmas del registro de firmas\./)).toBeVisible();

    // Sin la casilla no firma
    await page.getByLabel("Nombre y apellidos, como en tu documento").fill(PERSONA);
    await page.getByRole("button", { name: "Firmar el NDA" }).click();
    await expect(page.getByRole("heading", { name: "Firma el NDA" })).toBeVisible();

    await page.getByLabel("He leído el NDA y lo acepto.").check();
    await page.getByRole("button", { name: "Firmar el NDA" }).click();
    await expect(page.getByText(/Has firmado el NDA\. Falta la firma de Inception Woman Lab/)).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    /*
     * Dirección: el aviso, y firma ahí mismo. Sin apellidos en su perfil no
     * puede —se firma con el nombre completo—: se le dice dónde ponerlos.
     */
    await actualizar("profiles", { email: `eq.${USUARIOS.admin}` }, { last_name: null });
    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator("li").filter({ hasText: `${PERSONA} ha firmado el NDA` });
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole("button", { name: "Firmar por IWL" })).toHaveCount(0);
    await aviso.getByRole("link", { name: "Añádelos en Mi cuenta" }).click();
    await expect(page).toHaveURL(/\/perfil$/);
    await page.getByLabel("Apellidos").fill("de Prueba");
    await page.getByRole("button", { name: "Guardar mis datos" }).click();
    await expect(page.getByText("Guardado.")).toBeVisible();
    await page.goto("/cartera");
    await aviso.getByRole("button", { name: "Firmar por IWL" }).click();
    await expect(aviso).toHaveCount(0, { timeout: 15_000 });

    // El rastro, en la base
    const [firma] = await consultar<{
      firmante_nombre: string;
      firmado_ip: string | null;
      firmado_ua: string | null;
      texto_hash: string;
      texto_version: string;
      texto_firmado: string;
      contrafirmante_nombre: string;
      contrafirmado_ua: string | null;
      documento_id: string | null;
    }>("nda_firmas", { candidatura_id: `eq.${candidatura.id}` });
    expect(firma.firmante_nombre).toBe(PERSONA);
    expect(firma.texto_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(firma.texto_version).toBe("1");
    // Lo firmado es su texto completado, el mismo para las dos partes
    expect(firma.texto_firmado).toMatch(/con documento 12345678Z/);
    // Por IWL, con nombre y apellidos
    expect(firma.contrafirmante_nombre).toBe("Dirección IWL de Prueba");
    expect(firma.firmado_ua).toBeTruthy();
    expect(firma.contrafirmado_ua).toBeTruthy();
    expect(firma.documento_id).toBeTruthy();

    // Con las dos firmas nace la compañía, en entrada
    const [c] = await consultar<{ estado: string; company_id: string | null }>(
      "candidaturas",
      { id: `eq.${candidatura.id}` },
      "estado,company_id",
    );
    expect(c.estado).toBe("entrada");
    expect(c.company_id).toBeTruthy();
    companiaId = c.company_id;

    // La ficha lo dice, con el PDF a mano y el camino a la compañía
    await page.goto(`/embudo/${candidatura.id}`);
    await expect(page.getByRole("button", { name: "Abrir el NDA firmado" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ya es compañía, en entrada" })).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    // Ella: la misma cuenta, ahora en su compañía, y lo primero es la situación
    await entrarComoElla(page, "la-de-la-firma-2026");
    await expect(page).toHaveURL(/\/proyecto/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "¿Desde dónde partís?" })).toBeVisible();
    await page.getByLabel("Situación societaria").selectOption("sin_constituir");
    await page.getByRole("button", { name: "Guardar la situación" }).click();
    await expect(page.getByRole("heading", { name: "En entrada" })).toBeVisible();
    await expect(page.getByText("Por confirmar", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    // Dirección: el aviso lleva a confirmarla, y decide que no se incorpora
    await entrarComo(page, USUARIOS.admin, "/cartera");
    const dicha = page.locator("li").filter({ hasText: `${PERSONA} ha dicho la situación societaria` });
    await expect(dicha).toBeVisible();
    await dicha.getByRole("link", { name: "Confirmarla" }).click();
    await expect(page.getByRole("heading", { name: "En entrada" })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar la situación" }).click();
    await expect(page.getByText("Confirmada", { exact: true })).toBeVisible();

    await page.getByText("Decidir la incorporación").click();
    const decidir = page.locator("form", { has: page.getByRole("button", { name: "Guardar la decisión" }) });
    await decidir.getByLabel("Decisión").selectOption("no");
    await decidir.getByRole("textbox", { name: /^Motivo/ }).fill("El proyecto ha cambiado de foco y ya no encaja en la cohorte.");
    await expect(decidir.getByLabel("Mensaje para ella")).toHaveValue(/^Hola, Firmante:/);
    await decidir.getByRole("button", { name: "Guardar la decisión" }).click();
    await expect(page.getByRole("heading", { name: "No incorporada" })).toBeVisible();
    // El mensaje lo envía la plataforma, una sola vez
    await page.getByRole("button", { name: "Enviarle el mensaje" }).click();
    await expect(page.getByText(`Enviado a ${CORREO}.`)).toBeVisible();
    const recibidos = await correosRecibidos(CORREO, { esperar: 2 });
    const descarte = recibidos.find((c) => c.asunto === `${NOMBRE} · Inception Woman Lab`);
    expect(descarte?.texto).toMatch(/^Hola, Firmante:/);
    await page.getByRole("button", { name: "Enviarle el mensaje" }).click();
    await expect(page.getByText(/Ya se le envió el /)).toBeVisible();
  } finally {
    await actualizar("profiles", { email: `eq.${USUARIOS.admin}` }, { last_name: "de Prueba" });
    if (companiaId) await borrar("companies", { id: companiaId });
    await quitarFicheros("candidaturas", candidatura.id);
    await borrar("candidaturas", { id: candidatura.id });
    await borrarCuenta(CORREO);
  }
});

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
