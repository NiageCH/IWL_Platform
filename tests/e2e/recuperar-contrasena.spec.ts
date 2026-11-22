import { expect, test } from "@playwright/test";
import { borrarCuenta, correosRecibidos, crearCuenta } from "./entrada";

/**
 * «¿Has olvidado tu contraseña?», de punta a punta: el correo, que sale por
 * la plataforma con el texto de la plantilla de IWL, y el enlace que aterriza en
 * «Elige tu nueva contraseña». Con una cuenta recién creada, sin marca de
 * contraseña temporal: la de quien ya entraba y la ha olvidado.
 */

const SELLO = Date.now();
const CORREO = `e2e.recuperar.${SELLO}@ejemplo.test`;
const NUEVA = `recuperada-${SELLO}`;

test.afterAll(async () => {
  await borrarCuenta(CORREO);
});

test("quien olvida su contraseña pide un enlace, elige otra y entra con ella", async ({ page }) => {
  await crearCuenta(CORREO);

  await page.goto("/entrar");
  await page.getByRole("button", { name: "¿Has olvidado tu contraseña?" }).click();
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByText(/Si hay una cuenta con .* te hemos mandado un enlace/)).toBeVisible();

  const [correo] = await correosRecibidos(CORREO);
  expect(correo.asunto).toBe("Elige tu nueva contraseña de la plataforma de IWL");
  expect(correo.html).toContain("INCEPTION WOMAN LAB");
  expect(correo.html).toContain("Elegir mi contraseña");
  const enlace = new URL(correo.html.match(/href="([^"]+)"/)![1].replace(/&amp;/g, "&"));

  /*
   * El enlace lo compone ahora la plataforma (sale por `notificar`, por el
   * modo pruebas), así que vuelve a la dirección pública, no al servidor de
   * las pruebas. Se le cambia el destino conservando a dónde lleva, y el
   * primer salto se da desde aquí, como en `entrarComo`.
   */
  const vuelta = new URL(enlace.searchParams.get("redirect_to")!);
  expect(vuelta.searchParams.get("siguiente")).toBe("/cambiar-contrasena?recuperar=1");
  const base = process.env.BASE_URL ?? "http://localhost:3100";
  enlace.searchParams.set("redirect_to", `${base}${vuelta.pathname}${vuelta.search}`);
  const salto = await fetch(enlace.toString(), { redirect: "manual" });
  await page.goto(salto.headers.get("location")!);
  await expect(page.getByRole("heading", { name: "Elige tu nueva contraseña" })).toBeVisible();
  await page.getByLabel("Nueva contraseña", { exact: true }).fill(NUEVA);
  await page.getByLabel("Otra vez", { exact: true }).fill(NUEVA);
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/cambiar-contrasena"));

  // Y la nueva vale para entrar
  await page.context().clearCookies();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña", { exact: true }).fill(NUEVA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
});

test("a un correo sin cuenta se le dice lo mismo, y no se manda nada", async ({ page }) => {
  const nadie = `e2e.nadie.${SELLO}@ejemplo.test`;
  await page.goto("/entrar");
  await page.getByRole("button", { name: "¿Has olvidado tu contraseña?" }).click();
  await page.getByLabel("Correo").fill(nadie);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByText(/Si hay una cuenta con .* te hemos mandado un enlace/)).toBeVisible();
  expect(await correosRecibidos(nadie)).toEqual([]);
});

test("sin venir del enlace ni tener la marca, «Elige tu contraseña» no se abre", async ({ page }) => {
  await page.goto("/cambiar-contrasena");
  await page.waitForURL(/\/entrar/);
});
