import { expect, test } from "@playwright/test";
import { entrarComo } from "./entrada";

/**
 * Las cuentas de revisión aterrizan donde les toca.
 *
 * Existen para recorrer la plataforma con cada rol y comprobar que lo que
 * ve cada uno es lo que dice la tabla de visibilidad. Si una aterriza en el
 * sitio equivocado, lo que se revise con ella no vale: se estará mirando
 * otra vista.
 *
 * Esto además comprueba el paso 2 desde fuera —`inicioDe()` decide el
 * aterrizaje y `capacidades()` el esqueleto— pero por el camino que recorre
 * una persona, que es el único que cuenta.
 *
 * Las cuentas las crea `npm run cuentas:revision` y no la semilla, así que
 * la prueba se salta sola si no están: en integración continua no existen,
 * y fallar ahí sería castigar a quien no las necesita.
 */

const CUENTAS = [
  { correo: "rodrigo+rev-admin@niage.es", inicio: /\/cartera$/, ve: "Administración" },
  { correo: "rodrigo+rev-equipo@niage.es", inicio: /\/cartera$/, ve: "Embudo" },
  { correo: "rodrigo+rev-niage@niage.es", inicio: /\/cartera$/, ve: "Cartera" },
  { correo: "rodrigo+rev-mentor1@niage.es", inicio: /\/cartera$/, ve: "Cartera" },
  { correo: "rodrigo+rev-mentor2@niage.es", inicio: /\/cartera$/, ve: "Cartera" },
  { correo: "rodrigo+rev-fundadora@niage.es", inicio: /\/proyecto/, ve: "Resumen" },
  { correo: "rodrigo+rev-lector@niage.es", inicio: /\/proyecto/, ve: "Resumen" },
  { correo: "rodrigo+rev-candidata@niage.es", inicio: /\/candidatura/, ve: "" },
];

for (const cuenta of CUENTAS) {
  test(`${cuenta.correo} aterriza donde le toca`, async ({ page }) => {
    try {
      await entrarComo(page, cuenta.correo, "/");
    } catch {
      test.skip(true, "Las cuentas de revisión no están creadas en esta máquina");
      return;
    }

    await expect(page).toHaveURL(cuenta.inicio);

    if (cuenta.ve) {
      await expect(page.getByText(cuenta.ve).first()).toBeVisible();
    }
  });
}

/**
 * Y no llegan a donde no les toca.
 *
 * El aterrizaje correcto no demuestra que la puerta esté cerrada: una cosa
 * es dónde te deja al entrar y otra a dónde puedes ir escribiendo la
 * dirección.
 */
test("el mentor de revisión no entra en administración", async ({ page }) => {
  try {
    await entrarComo(page, "rodrigo+rev-mentor1@niage.es", "/");
  } catch {
    test.skip(true, "Las cuentas de revisión no están creadas en esta máquina");
    return;
  }

  await page.goto("/admin/companias");
  await expect(page).not.toHaveURL(/\/admin/);
});
