import { expect, test, type Page } from "@playwright/test";
import { COMPANIAS, USUARIOS, borrar, consultar, entrarComo, insertar } from "./entrada";

/**
 * Hitos: ella entrega con evidencia, el mentor valida (REVISION, 13 y 18 nov).
 *
 * El circuito entero, con un hito creado para la prueba en Marea —sin
 * etapa, así que sale en «Hitos fuera del plan»—: ella adjunta un enlace y
 * entrega; el mentor que coordina Marea lo ve en su cartera, pide cambios;
 * ella lee el comentario y vuelve a entregar; él valida.
 *
 * Se borra al acabar: primero el hito y después su evidencia, que mientras
 * el hito está cumplido no se deja quitar.
 */

const MENTOR_MAREA = "mentor@iwl.test";

function elHito(page: Page, id: string) {
  return page.locator(`#hito-${id}`);
}

test("ella entrega con un enlace; el mentor pide cambios y después lo valida", async ({ browser }) => {
  const titulo = `Hito de prueba ${Date.now()}`;
  const fila = await insertar<{ id: string }>("milestones", {
    company_id: COMPANIAS.marea,
    title: titulo,
    success_criteria: "Que la prueba de interfaz pase.",
    status: "en_curso",
  });
  const id = fila.id;

  const ella = await (await browser.newContext()).newPage();
  const mentor = await (await browser.newContext()).newPage();
  try {
    // ---- Ella entrega ------------------------------------------------------
    await entrarComo(ella, USUARIOS.fundadoraMarea, `/proyecto/ruta#hito-${id}`);
    const suyo = elHito(ella, id);
    await suyo.getByRole("button", { name: `Entregar «${titulo}»` }).click();
    // Sin evidencia no se puede
    await expect(suyo.getByRole("button", { name: "Entregar el hito" })).toBeDisabled();

    await suyo.getByRole("button", { name: "Adjuntar evidencia" }).click();
    await suyo.getByRole("tab", { name: "Un enlace" }).click();
    await suyo.getByLabel("Qué es").fill("Informe de entrevistas");
    await suyo.getByLabel("La dirección").fill("docs.ejemplo.test/entrevistas");
    await suyo.getByRole("button", { name: "Adjuntar", exact: true }).click();
    await expect(suyo.getByRole("link", { name: "Informe de entrevistas" })).toBeVisible();

    await suyo.getByLabel("Nota para quien revisa").fill("Las veinte, con notas.");
    await suyo.getByRole("button", { name: "Entregar el hito" }).click();
    await expect(suyo.getByText("Entregado · por revisar")).toBeVisible();
    await expect(suyo.getByRole("button", { name: /Entregar/ })).toHaveCount(0);

    // ---- El mentor lo ve en su cartera y pide cambios ----------------------
    await entrarComo(mentor, MENTOR_MAREA, "/cartera");
    const porRevisar = mentor.locator("section").filter({ has: mentor.getByRole("heading", { name: "Hitos por revisar" }) });
    await expect(porRevisar.getByText(titulo)).toBeVisible();
    await porRevisar.locator("li").filter({ hasText: titulo }).getByRole("link", { name: "Revisar" }).click();
    await expect(mentor).toHaveURL(new RegExp(`/ruta#hito-${id}`));

    const delMentor = elHito(mentor, id);
    await expect(delMentor.getByRole("link", { name: "Informe de entrevistas" })).toBeVisible();
    await delMentor.getByRole("button", { name: "Pedir cambios" }).click();
    await delMentor.getByLabel(/Qué hay que cambiar/).fill("Falta el resumen de conclusiones.");
    await delMentor.getByRole("button", { name: "Pedir cambios" }).click();
    await expect(delMentor.getByRole("button", { name: `Validar «${titulo}»` })).toHaveCount(0);

    // ---- Ella lee el comentario y vuelve a entregar -------------------------
    await ella.reload();
    await expect(suyo.getByText("Falta el resumen de conclusiones.").first()).toBeVisible();
    await suyo.getByRole("button", { name: `Entregar «${titulo}»` }).click();
    await suyo.getByRole("button", { name: "Entregar el hito" }).click();
    await expect(suyo.getByText("Entregado · por revisar")).toBeVisible();

    // ---- Él valida -----------------------------------------------------------
    await mentor.reload();
    await delMentor.getByRole("button", { name: `Validar «${titulo}»` }).click();
    await delMentor.getByRole("button", { name: "Validar el hito" }).click();
    // Quien coordina lo ve en su selector, que puede reabrirlo
    await expect(delMentor.locator("select[name=status]")).toHaveValue("cumplido");

    const [hecho] = await consultar<{ status: string; confirmed_by: string | null }>(
      "milestones",
      { id: `eq.${id}` },
      "status,confirmed_by",
    );
    expect(hecho.status).toBe("cumplido");
    expect(hecho.confirmed_by).not.toBeNull();

    // Ella lo ve cumplido, con su historial
    await ella.reload();
    await expect(suyo.getByText("Cumplido", { exact: true })).toBeVisible();
    await suyo.getByText(/Historial y ajustes/).click();
    await expect(suyo.getByText(/Validado el/)).toBeVisible();
  } finally {
    await ella.context().close();
    await mentor.context().close();
    await borrar("milestones", { id });
    await borrar("evidence_links", { entity_id: id });
  }
});
