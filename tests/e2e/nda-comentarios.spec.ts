import { expect, test, type Page } from "@playwright/test";
import { USUARIOS, borrar, borrarCuenta, consultar, entrarComo, insertar } from "./entrada";

/**
 * Comentar el NDA y cambiarlo solo para ella, de punta a punta, con una
 * candidatura recién creada en Preseleccionada.
 *
 * IWL le envía el NDA; ella entra, lo comenta y lo firma igualmente.
 * Dirección ve el aviso, responde y le cambia el texto: su firma se anula,
 * y al volver ve la respuesta y el NDA nuevo para firmar.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();
const PERSONA = `Comenta Prueba ${SELLO}`;
const CORREO = `e2e.nda.comenta.${SELLO}@ejemplo.test`;
const CLAVE = "la-de-comentar-2026";

async function entrarComoElla(page: Page, clave: string) {
  await page.goto("/entrar");
  await page.locator('input[type="email"]').fill(CORREO);
  await page.locator('input[type="password"]').fill(clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

async function salir(page: Page) {
  await page.getByRole("button", { name: "Salir" }).first().click();
  await page.waitForURL(/\/entrar/);
}

test("ella comenta el NDA, IWL responde y le cambia el texto, y su firma se anula", async ({ page }) => {
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `NDA Comentado ${SELLO}`,
    contacto_nombre: PERSONA,
    contacto_email: CORREO,
    estado: "preseleccionada",
  });

  try {
    await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);
    await page.getByRole("button", { name: "Enviar el NDA" }).click();
    await expect(page.getByText(/Lo verá nada más entrar, en la versión \d+, encima de su candidatura\. Puede comentarlo antes de firmar\./)).toBeVisible();
    const mensaje = await page.getByText(/NDA enviado a/).innerText();
    const temporal = mensaje.match(/contraseña es ([^\s]+)/)![1];
    await salir(page);

    // Entra, cambia la contraseña, comenta y firma
    await entrarComoElla(page, temporal);
    await expect(page).toHaveURL(/\/cambiar-contrasena/, { timeout: 15_000 });
    await page.getByLabel("Nueva contraseña").fill(CLAVE);
    await page.getByLabel("Otra vez").fill(CLAVE);
    await page.getByRole("button", { name: "Guardar y entrar" }).click();
    await expect(page.getByRole("heading", { name: "Firma el NDA" })).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Comentar el NDA").fill("La cláusula de no competencia, ¿a cuánto tiempo obliga?");
    await page.getByRole("button", { name: "Enviar el comentario" }).click();
    await expect(page.getByText("Sin responder todavía")).toBeVisible();

    await page.getByLabel("Firmas").selectOption("persona");
    await page.getByLabel("Tu DNI, NIE o pasaporte").fill("12345678Z");
    await page.getByLabel("Domicilio").fill("Calle Larios 1, 29005 Málaga");
    await page.getByLabel("Nombre y apellidos, como en tu documento").fill(PERSONA);
    await page.getByLabel("He leído el NDA y lo acepto.").check();
    await page.getByRole("button", { name: "Firmar el NDA" }).click();
    await expect(page.getByText(/Has firmado el NDA\. Falta la firma de Inception Woman Lab/)).toBeVisible();
    await expect(page.getByText("Si algo no te encaja, dínoslo. Lo vemos antes de que firme IWL.")).toBeVisible();
    await salir(page);

    // Dirección: el aviso lleva a responder
    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator("li").filter({ hasText: `${PERSONA} ha comentado el NDA` });
    await expect(aviso).toBeVisible();
    await aviso.getByRole("link", { name: "Responder" }).click();
    await expect(page).toHaveURL(new RegExp(`/embudo/${c.id}`));

    await page.getByLabel("Respuesta").fill("Doce meses. Lo dejamos escrito en el texto.");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByText("Doce meses. Lo dejamos escrito en el texto.")).toBeVisible();

    await page.getByText("Cambiar el texto solo para ella").click();
    const texto = page.getByLabel("Texto del NDA");
    await texto.fill(`${await texto.inputValue()}\n\nLa obligación de no competencia dura doce meses.`);
    await page.getByRole("button", { name: "Guardar la versión para ella" }).click();
    await expect(page.getByText(/solo para ella\. Su firma anterior queda anulada/)).toBeVisible();

    const firmas = await consultar("nda_firmas", { candidatura_id: `eq.${c.id}` }, "candidatura_id");
    expect(firmas).toEqual([]);
    await salir(page);

    // Ella: la respuesta, y el NDA nuevo para firmar
    await entrarComoElla(page, CLAVE);
    await expect(page.getByRole("heading", { name: "Firma el NDA" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Doce meses. Lo dejamos escrito en el texto.")).toBeVisible();
    await expect(page.getByText(/La obligación de no competencia dura doce meses\./)).toBeVisible();
  } finally {
    await borrar("candidaturas", { id: c.id });
    await borrarCuenta(CORREO);
  }
});
