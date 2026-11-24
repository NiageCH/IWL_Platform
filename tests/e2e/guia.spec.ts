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

/**
 * La primera entrada por el enlace de un aviso va a lo suyo, con una
 * línea arriba que lleva a la guía (REVISION, 21 nov). Cerrada, no vuelve,
 * y cuenta como vista: a `/` ya no la lleva a la guía.
 */
test("entrando por un aviso, una línea lleva a la guía y se cierra", async ({ page }) => {
  const correo = `e2e.guia.aviso.${Date.now()}.${test.info().project.name}@ejemplo.test`;
  try {
    const id = await crearCuenta(correo);
    await actualizar("profiles", { id: `eq.${id}` }, { role: "mentor", full_name: "Mentora de prueba" });
    await entrarComo(page, correo, "/cartera", { guiaVista: false });
    await expect(page).toHaveURL(/\/cartera$/);
    const linea = page.locator("[data-primera-vez]");
    await expect(linea.getByText("¿Es tu primera vez? Tu guía te explica cómo funciona.")).toBeVisible();
    await expect(linea.getByRole("link", { name: "Abrir la guía" })).toHaveAttribute("href", "/guia");

    await linea.getByRole("button", { name: "Cerrar el aviso de la guía" }).click();
    await expect(linea).toHaveCount(0);
    await page.reload();
    await expect(page.locator("[data-primera-vez]")).toHaveCount(0);
    await page.goto("/");
    await expect(page).toHaveURL(/\/cartera$/);
  } finally {
    await borrarCuenta(correo);
  }
});

test("cada rol lee la suya", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/guia");
  await expect(page.getByRole("heading", { name: "Tu guía · Dirección IWL" })).toBeVisible();
  await expect(page.getByText("Decidir la incorporación").first()).toBeVisible();
});

/**
 * Los siete roles, sobre la compilación de producción (REVISION, 23 nov ·
 * urgente). En producción la de dirección salió vacía y aquí todo pasaba:
 * la guía se leía del disco, y en local el disco siempre está. Ahora va
 * dentro del código; esto comprueba que cada rol abre la suya, y que no
 * sale ni «no hemos podido cargar» ni «no tiene guía».
 */
const TITULOS: Record<string, string> = {
  admin_iwl: "Tu guía · Dirección IWL",
  equipo_iwl: "Tu guía · Equipo IWL",
  mentor: "Tu guía · Mentoría",
  revisor_niage: "Tu guía · Ingeniería Niage",
  fundadora: "Tu guía · Equipo fundador",
  lector_externo: "Tu guía · Acceso de lectura",
  candidata: "Tu guía · Candidatura",
};

for (const [rol, titulo] of Object.entries(TITULOS)) {
  test(`${rol} abre su guía`, async ({ page }) => {
    const correo = `e2e.guia.${rol}.${Date.now()}.${test.info().project.name}@ejemplo.test`;
    try {
      const id = await crearCuenta(correo);
      await actualizar("profiles", { id: `eq.${id}` }, { role: rol, full_name: "Persona de prueba" });
      await entrarComo(page, correo, "/guia");
      await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();
      await expect(page.getByText("No hemos podido cargar la guía")).toHaveCount(0);
      await expect(page.getByText("no tiene guía")).toHaveCount(0);
    } finally {
      await borrarCuenta(correo);
    }
  });
}

/**
 * La guía se abre dentro del marco del rol (REVISION, 24 nov): con su menú
 * lateral y «Guía» marcada. Antes pintaba su propio marco, con solo la
 * barra de arriba, y el menú desaparecía. Mi cuenta, igual.
 */
test("la guía y Mi cuenta se abren dentro del marco de cada rol", async ({ page }) => {
  test.skip(test.info().project.name.startsWith("movil"), "En móvil el menú lateral no se ve");
  for (const [quien, inicio] of [
    [USUARIOS.admin, "Cartera"],
    [USUARIOS.fundadoraMarea, "Mi compañía"],
  ] as const) {
    await entrarComo(page, quien, "/guia");
    const lateral = page.locator(".barra-lateral");
    await expect(lateral.getByRole("link", { name: new RegExp(`^${inicio}`) })).toBeVisible();
    await expect(lateral.getByRole("link", { name: "Guía" })).toHaveAttribute("aria-current", "page");
    await page.goto("/perfil");
    await expect(page.locator(".barra-lateral").getByRole("link", { name: new RegExp(`^${inicio}`) })).toBeVisible();
  }
});
