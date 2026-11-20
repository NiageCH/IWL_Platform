import { expect, test } from "@playwright/test";
import { USUARIOS, actualizar, borrarCuenta, crearCuenta, entrarComo } from "./entrada";

/**
 * La guía de cada rol (REVISION, 13 nov): la primera vez que alguien llega
 * a su inicio se abre sola; después está siempre en «Guía», en el menú.
 *
 * Con una cuenta de mentor recién creada, una por proyecto, que se borra
 * al acabar: es la única forma de tener a alguien que no la ha visto sin
 * tocar a nadie de la semilla.
 */

test("la primera vez se abre sola, y luego está en el menú", async ({ page }) => {
  const correo = `e2e.guia.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  try {
    const id = await crearCuenta(correo);
    await actualizar("profiles", { id: `eq.${id}` }, { role: "mentor", full_name: "Mentora de prueba" });
    await entrarComo(page, correo, "/", { guiaVista: false });
    await expect(page).toHaveURL(/\/guia\?primera=1$/);
    await expect(page.getByRole("heading", { name: "Tu guía · Mentoría" })).toBeVisible();
    await expect(page.getByText("Es la primera vez que entras")).toBeVisible();
    await expect(page.getByRole("heading", { name: "De qué dependes y quién depende de ti" })).toBeVisible();

    await page.getByRole("link", { name: "Ir a lo mío" }).click();
    await expect(page).toHaveURL(/\/cartera$/);

    // Ya vista: a `/` no la vuelve a llevar
    await page.goto("/");
    await expect(page).toHaveURL(/\/cartera$/);

    // Y está en el menú, para cuando la quiera
    await page.goto("/guia");
    await expect(page.getByText("Es la primera vez que entras")).toHaveCount(0);
    await expect(page.locator('a[href="/guia"]').first()).toBeAttached();
  } finally {
    await borrarCuenta(correo);
  }
});

test("cada rol lee la suya", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/guia");
  await expect(page.getByRole("heading", { name: "Tu guía · Dirección IWL" })).toBeVisible();
  await expect(page.getByText("Decidir la incorporación").first()).toBeVisible();
});
