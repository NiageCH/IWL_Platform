import { expect, test } from "@playwright/test";
import { USUARIOS, entrarComo } from "./entrada";

/**
 * Compañías que cambiaron de identificador.
 *
 * El identificador va en la dirección, así que renombrar rompe todo enlace
 * guardado: un marcador, un correo, un documento que cita la ficha. Y lo
 * que se encontraría quien lo abriera es un 404, porque el cerrojo de la
 * ficha no distingue «no existe» de «no es para ti» —a propósito—. Sin
 * redirección no hay manera de adivinar el nombre nuevo.
 */
test("el identificador viejo de una compañía lleva al nuevo", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera");

  await page.goto("/cartera/roster");
  await expect(page).toHaveURL(/\/cartera\/siren$/);

  await page.goto("/cartera/terral-barria");
  await expect(page).toHaveURL(/\/cartera\/la-pepi$/);
});

test("la redirección conserva la subpágina", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera");

  /*
   * Lo que suele estar guardado no es la portada de la ficha sino una
   * pestaña concreta: el due diligence técnico, el plan. Llevar todo a la
   * portada sería perder justo el enlace que alguien se molestó en guardar.
   */
  await page.goto("/cartera/roster/tecnico");
  await expect(page).toHaveURL(/\/cartera\/siren\/tecnico$/);
});

test("el identificador viejo redirige también sin sesión", async ({ page }) => {
  /*
   * Antes de la guardia de sesión: si cayera después, a quien no tuviera
   * sesión lo mandaríamos a entrar y de vuelta al identificador viejo, que
   * ya no existe. Acaba en la pantalla de entrada, pero apuntando al
   * nombre nuevo.
   */
  await page.goto("/cartera/roster/plan");
  await expect(page).toHaveURL(/siguiente=%2Fcartera%2Fsiren%2Fplan/);
});
