import { expect, test } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, entrarComo, insertar } from "./entrada";

/**
 * Lo que le toca a ella y se calcula (REVISION, 20 nov): un hito que vence
 * en una semana sale en su «Te toca» con «Entregar»; vencido, sale también
 * al mentor principal.
 *
 * Dos hitos de Marea, recién creados por la prueba y quitados al acabar.
 * Las fechas van contra hoy, así que no dependen de la semilla.
 */

const MENTOR_MAREA = "mentor@iwl.test";
const SELLO = Date.now().toString(36);

function dentroDe(dias: number) {
  return new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);
}

test("un hito que vence sale en su «Te toca»; vencido, también al mentor principal", async ({ page }) => {
  const cerca = { id: crypto.randomUUID(), titulo: `Hito que vence ${SELLO} ${test.info().project.name}` };
  const pasado = { id: crypto.randomUUID(), titulo: `Hito vencido ${SELLO} ${test.info().project.name}` };
  try {
    for (const [h, dias] of [[cerca, 3], [pasado, -3]] as const) {
      await insertar("milestones", {
        id: h.id,
        company_id: COMPANIAS.marea,
        title: h.titulo,
        success_criteria: "Que la prueba pase.",
        due_date: dentroDe(dias),
      });
    }

    await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");
    const bloque = page.locator("section", { has: page.getByRole("heading", { name: "Te toca" }) });
    const vence = bloque.locator('li[data-aviso="hito_por_vencer"]').filter({ hasText: cerca.titulo });
    await expect(vence).toContainText(`«${cerca.titulo}» vence el`);
    await expect(vence).toContainText("Te toca: entregarlo con su evidencia");
    const vencido = bloque.locator('li[data-aviso="hito_vencido"]').filter({ hasText: pasado.titulo });
    await expect(vencido).toContainText("venció el");
    await expect(vencido).toContainText("Vencido");

    await vence.getByRole("link", { name: "Entregar" }).click();
    await expect(page).toHaveURL(new RegExp(`/proyecto/ruta#hito-${cerca.id}$`));
    await expect(page.locator(`#hito-${cerca.id}`)).toBeInViewport();

    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);
    await entrarComo(page, MENTOR_MAREA, "/cartera");
    const suyo = page.locator('li[data-aviso="hito_vencido"]').filter({ hasText: pasado.titulo });
    await expect(suyo).toContainText("sin entregar");
    await expect(suyo.getByRole("link", { name: "Ver el hito" })).toHaveAttribute("href", `/cartera/marea-clinica/ruta#hito-${pasado.id}`);
    // El que aún no ha vencido es cosa de ella
    await expect(page.locator("li[data-aviso]").filter({ hasText: cerca.titulo })).toHaveCount(0);
  } finally {
    await borrar("milestones", { id: cerca.id });
    await borrar("milestones", { id: pasado.id });
  }
});
