import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  correosRecibidos,
  darGuiaPorVista,
  entrarComo,
  insertar,
} from "./entrada";

/**
 * El alta paso a paso, como la vivió Rodrigo con Agustina.
 *
 * Se le da cuenta a una candidata con el NDA ya aceptado (desde el 22 nov
 * va primero, con una casilla), entra, cambia la contraseña, y dirección lo
 * ve: el aviso en su inicio, el contador en la barra y la
 * línea de pasos en la ficha. Después se deja el paso parado más de la
 * cuenta y se comprueba que se marca y que «Recordar» queda apuntado.
 *
 * Con una candidatura recién creada y no con una de la semilla: el estado
 * inicial es justo el que hay que ver.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();
const NOMBRE = `Alta Prueba ${SELLO}`;
const PERSONA = `Agustina Prueba ${SELLO}`;
const CORREO = `e2e.alta.${SELLO}@ejemplo.test`;

test("dirección ve el alta de una candidata paso a paso", async ({ page }) => {
  const candidatura = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: NOMBRE,
    contacto_nombre: PERSONA,
    contacto_email: CORREO,
    estado: "entrada",
    // Facturando: su revisión de entrada es el due diligence
    estado_verificado: "facturando",
  });
  // El NDA, aceptado con la casilla al presentarse
  await insertar("nda_firmas", {
    candidatura_id: candidatura.id,
    modo: "casilla",
    firmante_nombre: PERSONA,
    firmante_correo: CORREO,
    firmado_at: new Date().toISOString(),
  });

  try {
    // Sin cuenta: el siguiente paso es dársela, y nadie está parado
    await entrarComo(page, USUARIOS.admin, `/embudo/${candidatura.id}`);
    const fila = (paso: string) => page.locator("ol li").filter({ hasText: paso });
    await expect(fila("Cuenta creada").getByText("Por hacer")).toBeVisible();

    await page.getByRole("button", { name: "Darle cuenta", exact: true }).click();
    const mensaje = await page.getByText(/Acceso dado a/).innerText();
    const clave = mensaje.match(/contraseña es ([^\s]+)/)?.[1];
    expect(clave).toBeTruthy();

    // Ella entra y cambia la contraseña
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);
    await darGuiaPorVista(CORREO);
    await page.locator('input[type="email"]').fill(CORREO);
    await page.locator('input[type="password"]').fill(clave!);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/cambiar-contrasena/, { timeout: 15_000 });
    await page.getByLabel("Nueva contraseña", { exact: true }).fill("la-de-la-prueba-2026");
    await page.getByLabel("Otra vez", { exact: true }).fill("la-de-la-prueba-2026");
    await page.getByRole("button", { name: "Guardar y entrar" }).click();
    await expect(page).toHaveURL(/\/candidatura$/, { timeout: 15_000 });
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    /*
     * Dirección: el primer acceso ya no es un aviso —no le pide nada—
     * (REVISION, 18 nov). Se ve en «Altas en curso» y en su recorrido.
     */
    await entrarComo(page, USUARIOS.admin, "/cartera");
    await expect(page.locator("li").filter({ hasText: `${PERSONA} entró por primera vez` })).toHaveCount(0);
    const altas = page.locator("section").filter({ has: page.getByRole("heading", { name: "Altas en curso" }) });
    await expect(altas.getByText(PERSONA)).toBeVisible();

    // La ficha: los tres primeros hechos, el NDA también, y el due diligence esperándola desde hoy
    await page.goto(`/embudo/${candidatura.id}`);
    await expect(fila("Cuenta creada").getByText("Hecho")).toBeVisible();
    await expect(fila("Primer acceso").getByText("Hecho")).toBeVisible();
    await expect(fila("Contraseña cambiada").getByText("Hecho")).toBeVisible();
    // El NDA va primero, aceptado con la casilla: sin contrafirma que esperar
    await expect(fila("NDA aceptado").getByText("Hecho")).toBeVisible();
    await expect(fila("NDA firmado por IWL")).toHaveCount(0);
    await expect(fila("Due diligence entregado").getByText("En curso")).toBeVisible();
    await expect(fila("Due diligence entregado").getByText("lleva 0 días")).toBeVisible();

    /*
     * Parada doce días: vencido, y se le puede recordar. La fecha se mueve
     * por fuera, con la clave de servicio, que es la única que puede: con
     * sesión, la base no deja tocarla.
     */
    const [perfil] = await consultar<{ id: string }>("profiles", { email: `eq.${CORREO}` }, "id");
    const haceDoce = new Date(Date.now() - 12 * 86_400_000).toISOString();
    await actualizar("profiles", { id: `eq.${perfil.id}` }, { contrasena_cambiada_at: haceDoce });

    await page.reload();
    await expect(fila("Due diligence entregado").getByText("Vencido")).toBeVisible();
    await fila("Due diligence entregado").getByRole("button", { name: "Recordar" }).click();
    await expect(page.getByLabel("Texto del recordatorio")).toHaveValue(/^Hola, Agustina:/);
    await page.getByRole("button", { name: "Copiar para WhatsApp" }).click();
    await expect(page.getByText("Apuntado: recordatorio por WhatsApp.")).toBeVisible();

    // Por correo lo envía la plataforma
    await page.getByRole("button", { name: "Enviar el correo" }).click();
    await expect(page.getByText("Correo enviado, y apuntado.")).toBeVisible();
    const recordatorio = (await correosRecibidos(CORREO)).find((c) => /falta documentación del due diligence/.test(c.texto));
    expect(recordatorio?.texto).toMatch(/^Hola, Agustina: falta documentación del due diligence/);

    const apuntes = await consultar<{ id: number }>(
      "activity_log",
      { action: "eq.recordatorio", entity_id: `eq.${candidatura.id}` },
      "id",
    );
    expect(apuntes.length).toBe(2);
  } finally {
    await borrar("activity_log", { entity_id: candidatura.id });
    await borrar("candidaturas", { id: candidatura.id });
    await borrarCuenta(CORREO);
  }
});
