import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  correosRecibidos,
  crearCuenta,
  entrarComo,
  insertar,
} from "./entrada";

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
    await page.getByRole("button", { name: "Darle cuenta", exact: true }).click();
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

/**
 * El modo pruebas (REVISION, 21 nov). En local está apagado, para que las
 * demás pruebas lean sus correos; aquí se enciende y se deja como estaba,
 * por fuera del camino que se prueba.
 */
async function conModoPruebas<T>(hacer: () => Promise<T>): Promise<T> {
  const [antes] = await consultar<{ value: unknown }>("platform_settings", { key: "eq.correo_modo_pruebas" }, "value");
  await actualizar(
    "platform_settings",
    { key: "eq.correo_modo_pruebas" },
    { value: { activo: true, dominios: ["inceptionwlab.es", "niage.es"] } },
  );
  try {
    return await hacer();
  } finally {
    await actualizar("platform_settings", { key: "eq.correo_modo_pruebas" }, { value: antes.value });
  }
}

test("en modo pruebas, un correo de fuera queda retenido y se lee en Correos", async ({ page }) => {
  const correo = `e2e.retenido.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  await conModoPruebas(async () => {
    try {
      await crearCuenta(correo);

      // «¿Has olvidado tu contraseña?» también respeta la lista
      await page.goto("/entrar");
      await page.getByRole("button", { name: "¿Has olvidado tu contraseña?" }).click();
      await page.getByLabel("Correo").fill(correo);
      await page.getByRole("button", { name: "Enviarme el enlace" }).click();
      await expect(page.getByText(/Si hay una cuenta con .* te hemos mandado un enlace/)).toBeVisible();
      await expect
        .poll(async () => (await consultar<{ estado: string }>("correos", { destinatario: `eq.${correo}` }, "estado"))[0]?.estado)
        .toBe("retenido");
      expect(await correosRecibidos(correo)).toEqual([]);

      // Dirección ve la franja y el retenido, y lo lee como si hubiera llegado
      await entrarComo(page, USUARIOS.admin, "/admin/correos");
      await expect(page.locator("[data-modo-pruebas]")).toContainText(
        "Modo pruebas: los correos solo salen a @inceptionwlab.es y @niage.es.",
      );
      const fila = page.getByRole("list", { name: "Retenidos" }).getByRole("listitem").filter({ hasText: correo });
      await expect(fila.getByText("Retenido: modo pruebas")).toBeVisible();
      await fila.getByText("Ver el correo").click();
      await expect(fila.getByText("Elige tu nueva contraseña de la plataforma de IWL")).toBeVisible();
      await expect(fila.getByText(/Has pedido poner una contraseña nueva/)).toBeVisible();
      await expect(fila.getByRole("button", { name: "Reintentar" })).toHaveCount(0);
    } finally {
      await borrar("correos", { destinatario: correo });
      await borrarCuenta(correo);
    }
  });
});

test("quitar el modo pruebas pide escribir ACTIVAR CORREOS", async ({ page }) => {
  await conModoPruebas(async () => {
    await entrarComo(page, USUARIOS.admin, "/admin/programa");
    const bloque = page.locator("#modo-pruebas");
    await bloque.getByText("Quitar el modo pruebas").first().click();
    await bloque.getByLabel(/Escribe ACTIVAR CORREOS/).fill("activar");
    await bloque.getByRole("button", { name: "Quitar el modo pruebas" }).click();
    await expect(bloque.getByText("Para quitarlo, escribe ACTIVAR CORREOS tal cual.")).toBeVisible();

    await bloque.getByLabel(/Escribe ACTIVAR CORREOS/).fill("ACTIVAR CORREOS");
    await bloque.getByRole("button", { name: "Quitar el modo pruebas" }).click();
    await expect(bloque.getByText(/Los correos salen a todo el mundo\. Lo quitó/)).toBeVisible();
    await expect(page.locator("[data-modo-pruebas]")).toHaveCount(0);

    await bloque.getByRole("button", { name: "Volver al modo pruebas" }).click();
    await expect(bloque.getByRole("button", { name: "Guardar los dominios" })).toBeVisible();
  });
  // Lo que dejó en el registro, fuera
  const [admin] = await consultar<{ id: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "id");
  await borrar("activity_log", { action: "modo_pruebas_quitado", actor_id: admin.id });
});
