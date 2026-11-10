import { expect, test } from "@playwright/test";
import { USUARIOS, borrar, consultar, entrarComo, insertar, quitarFicheros } from "./entrada";

/**
 * El acta de comité, de punta a punta, con una candidatura recién creada.
 *
 * Está en MVP, así que la vía propuesta es Construcción. Dirección redacta
 * el acta, la firma —es el único miembro—, y con esa firma se cierra: la
 * candidatura pasa a Preseleccionada con su vía, y el PDF va al expediente.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();

test("se redacta el acta, se firma y la decisión se aplica", async ({ page }) => {
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Comité Prueba ${SELLO}`,
    contacto_nombre: "Agustina Prueba",
    contacto_email: `e2e.comite.${SELLO}@ejemplo.test`,
    estado: "comite",
    estado_declarado: "mvp",
  });
  const [admin] = await consultar<{ full_name: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "full_name");

  try {
    await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);
    await page.getByText("Redactar el acta de comité").click();
    const acta = page.locator("form", { has: page.locator('textarea[name="resumen"]') });

    await acta.getByLabel("Decisión").selectOption("preseleccionada");
    // La vía sale propuesta por su estado de entrada
    await expect(acta.getByText("Por su estado de entrada: Construcción")).toBeVisible();
    await expect(acta.getByLabel("Vía de entrada")).toHaveValue("construccion");

    await acta.getByLabel(admin.full_name, { exact: true }).check();
    await acta.getByLabel("Resumen").fill("Equipo sólido y problema claro. Producto en MVP, sin facturar.");
    await acta.getByRole("button", { name: "Guardar el acta para firmar" }).click();

    await expect(page.getByText("0 de 1 firmas")).toBeVisible();
    await page.getByRole("button", { name: "Firmar el acta" }).click();
    await expect(page.getByText("Firmada por todos")).toBeVisible({ timeout: 15_000 });

    const [despues] = await consultar<{ estado: string; via: string }>(
      "candidaturas",
      { id: `eq.${c.id}` },
      "estado, via",
    );
    expect(despues).toEqual({ estado: "preseleccionada", via: "construccion" });

    const [cerrada] = await consultar<{ documento_id: string | null; cerrada_at: string | null; contenido_hash: string | null }>(
      "comite_actas",
      { candidatura_id: `eq.${c.id}` },
      "documento_id, cerrada_at, contenido_hash",
    );
    expect(cerrada.cerrada_at).toBeTruthy();
    expect(cerrada.documento_id).toBeTruthy();
    // Al cerrarla se guarda el hash de lo firmado
    expect(cerrada.contenido_hash).toMatch(/^[0-9a-f]{64}$/);
    await expect(page.getByText(/Acta de comité del/).first()).toBeVisible();

    // Dirección la regenera: PDF nuevo, el de antes se queda, el hash no cambia
    await page.getByRole("button", { name: "Regenerar el PDF" }).click();
    await expect(page.getByText("PDF regenerado. El de antes sigue en el expediente.")).toBeVisible({ timeout: 15_000 });
    const [rehecha] = await consultar<{ documento_id: string; contenido_hash: string }>(
      "comite_actas",
      { candidatura_id: `eq.${c.id}` },
      "documento_id, contenido_hash",
    );
    expect(rehecha.contenido_hash).toBe(cerrada.contenido_hash);
    expect(rehecha.documento_id).not.toBe(cerrada.documento_id);
    const docs = await consultar("candidatura_documentos", { candidatura_id: `eq.${c.id}`, nombre: "like.Acta de comité*" }, "id");
    expect(docs.length).toBe(2);
  } finally {
    await quitarFicheros("candidaturas", c.id);
    await borrar("candidaturas", { id: c.id });
  }
});
