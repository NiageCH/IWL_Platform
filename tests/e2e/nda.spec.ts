import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  borrar,
  borrarCuenta,
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
 * el rastro en la base y el PDF en su data room. La plantilla es la de
 * prueba de la semilla local, que dice que no es un NDA.
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

test("la candidata firma el NDA, IWL lo contrafirma, y queda el PDF con su rastro", async ({ page }) => {
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

    await expect(page.getByRole("heading", { name: "Antes de seguir, el NDA" })).toBeVisible();
    await expect(page.getByText("TEXTO DE PRUEBA. NO ES UN NDA.")).toBeVisible();
    await expect(page.getByText("Documentación del due diligence")).toHaveCount(0);

    // Sin la casilla no firma
    await page.getByLabel("Tu nombre completo").fill(PERSONA);
    await page.getByRole("button", { name: "Firmar el NDA" }).click();
    await expect(page.getByRole("heading", { name: "Antes de seguir, el NDA" })).toBeVisible();

    await page.getByLabel("He leído el NDA y lo acepto.").check();
    await page.getByRole("button", { name: "Firmar el NDA" }).click();
    await expect(page.getByText(/Has firmado el NDA\. Falta la firma de Inception Woman Lab/)).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    // Dirección: el aviso, y firma ahí mismo
    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator("li").filter({ hasText: `${PERSONA} ha firmado el NDA` });
    await expect(aviso).toBeVisible();
    await aviso.getByRole("button", { name: "Firmar por IWL" }).click();
    await expect(aviso).toHaveCount(0, { timeout: 15_000 });

    // El rastro, en la base
    const [firma] = await consultar<{
      firmante_nombre: string;
      firmado_ip: string | null;
      firmado_ua: string | null;
      texto_hash: string;
      texto_version: string;
      contrafirmante_nombre: string;
      contrafirmado_ua: string | null;
      documento_id: string | null;
    }>("nda_firmas", { candidatura_id: `eq.${candidatura.id}` });
    expect(firma.firmante_nombre).toBe(PERSONA);
    expect(firma.texto_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(firma.texto_version).toBe("1");
    expect(firma.firmado_ua).toBeTruthy();
    expect(firma.contrafirmado_ua).toBeTruthy();
    expect(firma.documento_id).toBeTruthy();

    const [c] = await consultar<{ estado: string }>("candidaturas", { id: `eq.${candidatura.id}` }, "estado");
    expect(c.estado).toBe("nda");

    // La ficha lo dice, con el PDF a mano
    await page.goto(`/embudo/${candidatura.id}`);
    await expect(page.getByRole("button", { name: "Abrir el NDA firmado" })).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    // Y ella: ya puede empezar
    await entrarComoElla(page, "la-de-la-firma-2026");
    await expect(page).toHaveURL(/\/candidatura$/, { timeout: 15_000 });
    await expect(page.getByText(/IWL ha firmado el NDA\. Ya puedes empezar el due diligence/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir el NDA firmado" })).toBeVisible();
  } finally {
    await quitarFicheros("candidaturas", candidatura.id);
    await borrar("candidaturas", { id: candidatura.id });
    await borrarCuenta(CORREO);
  }
});
