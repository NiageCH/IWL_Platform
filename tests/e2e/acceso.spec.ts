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

test("la dirección restablece la contraseña de alguien que ya entró", async ({
  page,
}) => {
  /*
   * El camino que faltaba, y donde estaba el fallo: no dar de alta con
   * contraseña —eso ya se probaba— sino restablecérsela a quien lleva
   * tiempo dentro y se ha quedado fuera.
   *
   * El panel se cerraba solo al guardar y se llevaba el acuse y la
   * contraseña recién generada. Quedaba una cuenta con una contraseña que
   * no sabía nadie, y en pantalla parecía que no había pasado nada.
   */
  const correo = `reset.${Date.now()}@iwl.test`;

  await entrarComo(page, USUARIOS.admin, "/admin/personas");
  await page.getByText("Dar de alta a una persona").click();
  const alta = page.locator("form", { has: page.locator('input[name="email"]') });
  await alta.locator('input[name="email"]').fill(correo);
  await alta.locator('input[name="full_name"]').fill("Se queda fuera");
  await alta.locator('select[name="role"]').selectOption("mentor");
  await alta.locator('input[name="password"]').fill("la-de-siempre-77");
  await alta.getByRole("button", { name: "Dar de alta" }).click();
  await expect(page.getByText(/la-de-siempre-77/)).toBeVisible();

  // Entra una vez: a partir de aquí ya no es un alta, es un restablecimiento
  await page.getByRole("button", { name: "Salir" }).click();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("la-de-siempre-77");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
  await page.getByRole("button", { name: "Salir" }).click();

  // Y la dirección se la restablece
  await entrarComo(page, USUARIOS.admin, "/admin/personas");
  const fila = page.locator("li").filter({ hasText: correo }).last();

  // El verbo cambia: ya no se «pone», se «restablece»
  await fila.getByRole("button", { name: "Restablecer contraseña" }).click();
  await fila.getByRole("button", { name: "Generar" }).click();

  const campo = fila.locator('input[name="password"]');
  const nueva = await campo.inputValue();
  expect(nueva).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d+$/);

  await fila.getByRole("button", { name: "Guardar contraseña" }).click();

  /*
   * Lo que no puede pasar: que el panel se cierre y se lleve las dos cosas
   * que hacen falta para que esto sirva de algo.
   */
  await expect(page.getByText(/Contraseña puesta para/)).toBeVisible();
  await expect(campo).toHaveValue(nueva);
  await expect(fila.getByRole("button", { name: "Hecho" })).toBeVisible();

  // Y la contraseña nueva entra
  await page.getByRole("button", { name: "Salir" }).click();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(nueva);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/entrar/);

  await borrarCuenta(correo);
});

test("la dirección no se restablece su propia contraseña desde el panel", async ({
  page,
}) => {
  /*
   * Por qué no se deja, que no es por purismo.
   *
   * El panel va con la clave de servicio, y cambiar así una contraseña
   * invalida las sesiones de esa persona. Si esa persona eres tú, el
   * servidor te echa en el mismo instante en que se guarda: la contraseña
   * nueva queda puesta y no llega a enseñarse. Te quedas fuera de tu propia
   * cuenta con una clave que no sabe nadie —y si eres la única dirección,
   * no hay quien te la vuelva a poner.
   *
   * En Mi cuenta va por el cliente de sesión, que la renueva sin tirarte.
   */
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  const mia = page.locator("li").filter({ hasText: USUARIOS.admin }).first();

  await expect(
    mia.getByRole("button", { name: /contraseña/ }),
  ).toHaveCount(0);

  // Y en su lugar se dice dónde sí
  const salida = mia.getByRole("link", { name: /Mi cuenta/ });
  await expect(salida).toBeVisible();
  await salida.click();
  await expect(page).toHaveURL(/\/perfil/);
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
