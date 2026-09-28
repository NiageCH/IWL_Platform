import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, borrarCuenta, entrarComo } from "./entrada";

/**
 * Montar el equipo de un proyecto y saber quién es cada quien.
 *
 * Estas pruebas usan solo personas del seed versionado. El equipo real de
 * IWL vive en `supabase/seed/local/`, que no está en el repositorio, así que
 * una prueba que lo diera por presente fallaría en cualquier otra máquina.
 */

test("el equipo del proyecto se monta desde la ficha de la compañía", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  /*
   * Se localiza por su enlace y no por el texto suelto.
   *
   * «Vega Predictiva» aparece en más sitios de la página, y un filtro por
   * texto puede acabar señalando la ficha de otra compañía: la primera
   * versión de esta prueba asignó la mentoría a Raíz sin que se notara.
   */
  const vega = page.locator("li").filter({
    has: page.getByRole("link", { name: "Vega Predictiva", exact: true }),
  });

  await vega.getByText("Añadir a alguien al equipo del proyecto").click();

  /*
   * Dentro de la ficha estos campos son únicos, así que no hace falta
   * apuntar al formulario: encadenar filtros sobre filtros daba un locator
   * que ni Playwright resolvía.
   */
  const alta = vega;

  // Se elige por nombre, con su cargo al lado
  const quien = alta.locator('select[name="profile_id"]');
  await expect(quien.locator("option")).not.toHaveCount(1);

  await quien.selectOption({ label: "Mentoría comercial" });
  await alta.locator('select[name="member_role"]').selectOption("mentor_principal");

  // Al elegir mentoría se piden las horas acordadas
  await expect(alta.locator('input[name="assigned_hours"]')).toBeVisible();
  await alta.locator('input[name="assigned_hours"]').fill("80");
  await alta.locator('input[name="title"]').fill("Coordinación del proyecto");

  await alta.getByRole("button", { name: "Añadir al equipo" }).click();

  /*
   * Se busca en la lista del equipo y no en el li entero: el nombre está
   * también en las opciones del desplegable de añadir, que sigue en la
   * página, y un texto que aparece dos veces no comprueba nada.
   */
  const fila = page
    .locator("li")
    .filter({
      has: page.getByRole("link", { name: "Vega Predictiva", exact: true }),
    })
    .locator("li", { hasText: "Mentoría comercial" });

  await expect(fila.getByText("Coordina", { exact: true })).toBeVisible();
  await expect(fila.getByText(/de 80 h/)).toBeVisible();
});

test("al elegir a alguien se ve en qué entra y cuánto lleva encima", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");

  const vega = page.locator("li").filter({
    has: page.getByRole("link", { name: "Vega Predictiva", exact: true }),
  });
  await vega.getByText("Añadir a alguien al equipo del proyecto").click();

  await vega
    .locator('select[name="profile_id"]')
    .selectOption({ label: "Mentoría producto" });

  // Lleva dos proyectos: ponerla en el tercero no es lo mismo que en el primero
  await expect(vega.getByText(/Lleva 2 proyectos/)).toBeVisible();
  await expect(vega.getByText(/horas comprometidas en total/)).toBeVisible();
});

/*
 * El correo lleva marca de tiempo.
 *
 * Dar de alta dos veces el mismo correo falla, y estas pruebas no pueden
 * borrar una cuenta de `auth.users` al terminar. Un correo distinto en cada
 * pasada es lo que las hace repetibles.
 */
const CORREO = `prueba.perfil.${Date.now()}@iwl.test`;
const CORREGIDO = `perfil.corregido.${Date.now()}@iwl.test`;

test("el cargo y las áreas se cargan al dar de alta y se ven después", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  await page.getByText("Dar de alta a una persona").click();

  const alta = page.locator("form", { has: page.locator('input[name="email"]') });
  await alta.locator('input[name="email"]').fill(CORREO);
  await alta.locator('input[name="full_name"]').fill("Persona de prueba");
  await alta.locator('select[name="role"]').selectOption("mentor");
  await alta.locator('input[name="job_title"]').fill("Directora de algo");
  await alta.locator('input[name="expertise"]').fill("Fondeo, Legal, Impacto social");
  await alta.getByRole("button", { name: "Dar de alta" }).click();

  const ficha = page.locator("li", { hasText: CORREO }).first();
  await expect(ficha.getByText("Directora de algo")).toBeVisible();
  await expect(ficha.getByText("Fondeo")).toBeVisible();
  await expect(ficha.getByText("Impacto social")).toBeVisible();
});

test("el correo se corrige mientras esa persona no haya entrado", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/admin/personas");

  // Recién dada de alta: nunca ha entrado
  const nueva = page.locator("li", { hasText: CORREO }).first();
  await nueva.getByText("Corregir el correo").click();

  const formulario = nueva.locator("form", {
    has: page.locator('input[name="email"]'),
  });
  await formulario.locator('input[name="email"]').fill(CORREGIDO);
  await formulario.getByRole("button", { name: "Corregir" }).click();

  await expect(page.getByText(CORREGIDO)).toBeVisible();

  /*
   * Y a quien sí ha entrado se le explica por qué no.
   *
   * Se comprueba sobre la propia cuenta con la que se está mirando: es la
   * única de la que se sabe con certeza que ha entrado, porque acaba de
   * hacerlo en esta misma prueba. Cualquier otra depende de lo que haya
   * pasado antes en la base.
   */
  const conAcceso = page.locator("li", { hasText: "admin@iwl.test" }).first();
  await expect(
    conAcceso.getByText("El correo ya no se cambia: ha entrado con él"),
  ).toBeVisible();
});

test.afterAll(async () => {
  // Solo lo que crearon estas pruebas: Vega no lleva mentoría en el seed
  await borrar("company_members", {
    company_id: "00000000-0000-0000-0004-000000000002",
    member_role: "mentor_principal",
  });

  // Y la cuenta de prueba, con las dos direcciones por las que ha pasado
  await borrarCuenta(CORREO);
  await borrarCuenta(CORREGIDO);
});
