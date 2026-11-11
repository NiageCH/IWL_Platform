import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, borrarCuenta, consultar, correosRecibidos, entrarComo, insertar } from "./entrada";

/**
 * El correo de la plataforma, por lo que no cubre ningún flujo: un envío
 * que quedó sin salir se reintenta desde la ficha, y la ruta del resumen
 * diario no hace nada sin su secreto.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";

test("un correo sin enviar se reintenta desde la ficha, y sale", async ({ page }) => {
  const sello = Date.now();
  const correo = `e2e.reintento.${sello}@ejemplo.test`;
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Correo Prueba ${sello}`,
    contacto_nombre: "Quien Sea",
    contacto_email: correo,
    estado: "presentada",
  });
  try {
    // Como si el proveedor hubiera fallado: apuntado, sin enviar
    await insertar("correos", {
      evento: "recordatorio",
      destinatario: correo,
      candidatura_id: c.id,
      asunto: "Un recordatorio de prueba",
      datos: { asunto: "Un recordatorio de prueba", cuerpo: "Hola, Quien: esto es una prueba." },
      estado: "sin_enviar",
      error: "El proveedor no respondió.",
      intentos: 1,
    });

    await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);
    const bloque = page.locator("section").filter({ has: page.getByRole("heading", { name: "Correos", exact: true }) });
    await expect(bloque.getByText("1 sin enviar")).toBeVisible();
    await expect(bloque.getByText("Sin enviar", { exact: true })).toBeVisible();
    await expect(bloque.getByText("El proveedor no respondió.")).toBeVisible();

    await bloque.getByRole("button", { name: "Reintentar" }).click();
    await expect(bloque.getByText("Enviado", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(bloque.getByText("2 intentos", { exact: false })).toBeVisible();

    const [recibido] = await correosRecibidos(correo);
    expect(recibido.asunto).toBe("Un recordatorio de prueba");
    const [fila] = await consultar<{ estado: string; proveedor_id: string | null }>(
      "correos",
      { candidatura_id: `eq.${c.id}` },
      "estado, proveedor_id",
    );
    expect(fila.estado).toBe("enviado");
    expect(fila.proveedor_id).toBeTruthy();
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});

test("el resumen diario no hace nada sin el secreto del cron", async ({ request }) => {
  const r = await request.get("/api/cron/resumen-avisos");
  expect(r.status()).toBe(401);
});

/**
 * Darle cuenta con el NDA firmado fuera (REVISION, 11 nov): le llega el
 * correo con un enlace para elegir su contraseña, como el del NDA. Nunca la
 * contraseña.
 */
test("darle cuenta para el due diligence le manda el enlace para elegir contraseña", async ({ page }) => {
  const sello = `${Date.now()}a`;
  const correo = `e2e.acceso.${sello}@ejemplo.test`;
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Acceso Prueba ${sello}`,
    contacto_nombre: "Alba",
    contacto_apellidos: "Prueba",
    contacto_email: correo,
    estado: "entrada",
  });
  try {
    await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);
    await page.getByRole("button", { name: "Darle cuenta para el due diligence" }).click();
    await expect(page.getByText(/Le ha llegado un correo con un enlace para entrar y elegir su contraseña/)).toBeVisible();
    const temporal = (await page.getByRole("textbox", { name: /Su acceso/ }).inputValue()).match(/· Contraseña: (\S+)/)?.[1];

    const [aviso] = await correosRecibidos(correo);
    expect(aviso.asunto).toBe(`Tu cuenta en la plataforma de IWL · Acceso Prueba ${sello}`);
    expect(aviso.texto).toContain("Hola, Alba:");
    expect(aviso.texto).toContain(`Tu usuario es ${correo}`);
    expect(aviso.texto).toMatch(/Entrar y elegir mi contraseña: http\S+\/auth\/v1\/verify/);
    if (temporal) expect(aviso.texto).not.toContain(temporal);

    // Y en «Correos», enviado
    const bloque = page.locator("section").filter({ has: page.getByRole("heading", { name: "Correos", exact: true }) });
    await page.getByRole("button", { name: "Hecho" }).click();
    await page.reload();
    await expect(bloque.locator("li").filter({ hasText: "Su cuenta en la plataforma" }).getByText("Enviado", { exact: true })).toBeVisible();
  } finally {
    const [cand] = await consultar<{ profile_id: string | null }>("candidaturas", { id: `eq.${c.id}` }, "profile_id");
    await borrar("candidaturas", { id: c.id });
    if (cand?.profile_id) await borrarCuenta(correo);
  }
});
