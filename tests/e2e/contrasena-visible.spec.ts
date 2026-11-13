import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Ver la contraseña mientras se escribe (REVISION, 13 nov).
 *
 * Oculta por defecto; el ojo la enseña y la vuelve a ocultar sin enviar el
 * formulario; en «nueva» y «otra vez» el mismo ojo enseña las dos; y al
 * enviar, vuelve a ocultarse. El cambio de contraseña se envía con las dos
 * distintas a propósito: así se comprueba que se oculta sin cambiar la
 * contraseña de nadie.
 */

test("al entrar, el ojo enseña y oculta la contraseña sin enviar nada", async ({ page }) => {
  await page.goto("/entrar");
  const clave = page.getByLabel("Contraseña", { exact: true });
  await clave.fill("una-clave-de-prueba");
  await expect(clave).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(clave).toHaveAttribute("type", "text");
  await expect(page).toHaveURL(/\/entrar/);

  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  await expect(clave).toHaveAttribute("type", "password");
});

test("en Mi cuenta, un solo ojo enseña las dos, y al enviar se ocultan", async ({ page }) => {
  await entrarComo(page, USUARIOS.revisorVega, "/perfil");
  const nueva = page.getByLabel("Nueva contraseña", { exact: true });
  const otra = page.getByLabel("Otra vez", { exact: true });
  await nueva.fill("una-contrasena-larga-1");
  await otra.fill("una-contrasena-larga-2");

  // Un solo ojo: el de la repetida sigue al de la nueva
  await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toHaveCount(1);
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(nueva).toHaveAttribute("type", "text");
  await expect(otra).toHaveAttribute("type", "text");

  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText(/no coinciden/i).first()).toBeVisible();
  await expect(nueva).toHaveAttribute("type", "password");
  await expect(otra).toHaveAttribute("type", "password");
});
