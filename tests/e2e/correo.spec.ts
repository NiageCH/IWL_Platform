import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, consultar, correosRecibidos, entrarComo, insertar } from "./entrada";

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
