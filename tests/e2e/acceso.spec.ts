import { expect, test } from "@playwright/test";
import { USUARIOS, borrarCuenta, entrarComo } from "./entrada";

/**
 * Entrada con contraseña.
 *
 * Es la puerta principal desde que la plataforma sale a internet: el enlace
 * por correo obligaba a tener el envío montado antes de que nadie pudiera
 * entrar a mirar, y a que los correos fueran buzones de verdad.
 *
 * Lo que se prueba aquí es lo que pasa si algo de esto se rompe sin querer:
 * que no se pueda entrar con una contraseña que no es, que nadie se cree una
 * cuenta por su cuenta, y que quien entra pueda cambiar la suya.
 */

const CLAVE = "iwl-local-2026";

test("se entra con correo y contraseña", async ({ page }) => {
  await page.goto("/entrar");

  await page.getByLabel("Correo").fill(USUARIOS.fundadoraMarea);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/proyecto/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Marea Clínica" })).toBeVisible();
});

test("una contraseña que no es no dice si el correo existe", async ({ page }) => {
  await page.goto("/entrar");

  await page.getByLabel("Correo").fill(USUARIOS.fundadoraMarea);
  await page.getByLabel("Contraseña").fill("esta-no-es-la-buena");
  await page.getByRole("button", { name: "Entrar" }).click();

  /*
   * El mismo mensaje para un correo que no existe y para una contraseña
   * equivocada: distinguirlos le confirmaría a cualquiera qué direcciones
   * están dadas de alta.
   */
  await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
  await expect(page).toHaveURL(/\/entrar/);
});

test("tras entrar se vuelve a donde se iba", async ({ page }) => {
  await page.goto("/cartera");
  await expect(page).toHaveURL(/\/entrar\?siguiente=/);

  await page.getByLabel("Correo").fill(USUARIOS.admin);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/cartera/, { timeout: 15_000 });
});

test("nadie se crea una cuenta por su cuenta", async ({ page }) => {
  await page.goto("/entrar");

  // No hay forma de registrarse en la pantalla
  await expect(page.getByText(/crear cuenta|reg[ií]strate|sign up/i)).toHaveCount(0);

  // Y pedir un enlace para un correo no dado de alta tampoco crea nada
  await page.getByRole("button", { name: /No recuerdo mi contraseña/ }).click();
  await page.getByLabel("Correo").fill("nadie@ejemplo-inexistente.test");
  await page.getByRole("button", { name: "Enviar enlace de entrada" }).click();

  await expect(
    page.getByText(/no tiene acceso a la plataforma/),
  ).toBeVisible();
});

test("la dirección pone la contraseña al dar de alta y se enseña una vez", async ({
  page,
}) => {
  const correo = `alta.clave.${Date.now()}@iwl.test`;

  await entrarComo(page, USUARIOS.admin, "/admin/personas");
  await page.getByText("Dar de alta a una persona").click();

  const alta = page.locator("form", { has: page.locator('input[name="email"]') });
  await alta.locator('input[name="email"]').fill(correo);
  await alta.locator('input[name="full_name"]').fill("Alta con contraseña");
  await alta.locator('select[name="role"]').selectOption("mentor");
  await alta.locator('input[name="password"]').fill("tres-palabras-y-42");
  await alta.getByRole("button", { name: "Dar de alta" }).click();

  // Se enseña para poder copiarla, y se avisa de que no se repite
  await expect(page.getByText(/tres-palabras-y-42/)).toBeVisible();
  await expect(page.getByText(/no se vuelve a enseñar/)).toBeVisible();

  // Y sirve para entrar
  await page.getByRole("button", { name: "Salir" }).click();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("tres-palabras-y-42");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).not.toHaveURL(/\/entrar/);

  await borrarCuenta(correo);
});

test("sin contraseña se genera una y se enseña", async ({ page }) => {
  const correo = `alta.auto.${Date.now()}@iwl.test`;

  await entrarComo(page, USUARIOS.admin, "/admin/personas");
  await page.getByText("Dar de alta a una persona").click();

  const alta = page.locator("form", { has: page.locator('input[name="email"]') });
  await alta.locator('input[name="email"]').fill(correo);
  await alta.locator('input[name="full_name"]').fill("Alta sin contraseña");
  await alta.locator('select[name="role"]').selectOption("mentor");
  await alta.getByRole("button", { name: "Dar de alta" }).click();

  // Tres palabras y un número, para poder dictarla por teléfono
  await expect(page.getByText(/Su contraseña es «[a-z]+-[a-z]+-[a-z]+-\d+»/)).toBeVisible();

  await borrarCuenta(correo);
});

test("cada persona cambia su propia contraseña", async ({ page }) => {
  const correo = `cambio.${Date.now()}@iwl.test`;

  await entrarComo(page, USUARIOS.admin, "/admin/personas");
  await page.getByText("Dar de alta a una persona").click();
  const alta = page.locator("form", { has: page.locator('input[name="email"]') });
  await alta.locator('input[name="email"]').fill(correo);
  await alta.locator('input[name="full_name"]').fill("Cambia su clave");
  await alta.locator('select[name="role"]').selectOption("mentor");
  await alta.locator('input[name="password"]').fill("la-primera-clave-9");
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/la-primera-clave-9/)).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("la-primera-clave-9");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/entrar/);

  await page.goto("/perfil");
  await page.getByLabel("Nueva contraseña").fill("la-segunda-clave-7");
  await page.getByLabel("Otra vez").fill("la-segunda-clave-7");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText(/Contraseña cambiada/)).toBeVisible();

  // La nueva vale y la vieja ya no
  await page.getByRole("button", { name: "Salir" }).click();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("la-primera-clave-9");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();

  await page.getByLabel("Contraseña").fill("la-segunda-clave-7");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/entrar/);

  await borrarCuenta(correo);
});

test("las dos contraseñas del cambio tienen que coincidir", async ({ page }) => {
  await entrarComo(page, USUARIOS.equipoIwl, "/perfil");

  await page.getByLabel("Nueva contraseña").fill("una-clave-larga-1");
  await page.getByLabel("Otra vez").fill("otra-clave-larga-2");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();

  await expect(page.getByText("Las dos contraseñas no coinciden.")).toBeVisible();
});
