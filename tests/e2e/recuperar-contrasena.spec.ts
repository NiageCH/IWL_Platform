import { expect, test } from "@playwright/test";
import { borrarCuenta, correosRecibidos, crearCuenta } from "./entrada";

/**
 * «¿Has olvidado tu contraseña?», de punta a punta: el correo de Supabase
 * Auth, en español y con la plantilla de IWL, y el enlace que aterriza en
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
  const enlace = correo.html.match(/href="([^"]+)"/)![1].replace(/&amp;/g, "&");

  await page.goto(enlace);
  await expect(page.getByRole("heading", { name: "Elige tu nueva contraseña" })).toBeVisible();
  await page.getByLabel("Nueva contraseña").fill(NUEVA);
  await page.getByLabel("Otra vez").fill(NUEVA);
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/cambiar-contrasena"));

  // Y la nueva vale para entrar
  await page.context().clearCookies();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill(NUEVA);
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
