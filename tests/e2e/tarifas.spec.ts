import { expect, test } from "@playwright/test";
import { USUARIOS, actualizar, consultar, entrarComo } from "./entrada";

/**
 * Las tarifas de Programa (REVISION, 11 nov): la aplicada no pasa de la de
 * mercado, y la de mercado lleva su fuente, que en la nube se escribe desde
 * aquí. La tarifa es de toda la plataforma: se lee antes y se restaura en el
 * `finally`, con las cifras que tenía, sean las que sean.
 */
test("dirección no deja la aplicada por encima de la de mercado, y guarda la fuente", async ({ page }) => {
  const [antes] = await consultar<{ id: string; applied_rate: number; market_rate: number; source: string | null }>(
    "rate_cards",
    { profile_code: "eq.especialista" },
    "id,applied_rate,market_rate,source",
  );
  const mercado = Number(antes.market_rate);

  try {
    await entrarComo(page, USUARIOS.admin, "/admin/programa");
    const fila = page.locator("li", { hasText: "Especialista de materia" });
    const form = fila.locator("form");

    await form.locator('input[name="applied_rate"]').fill(String(mercado + 10));
    await form.getByRole("button", { name: "Guardar" }).click();
    await expect(fila.getByText(/no puede pasar de la de mercado/)).toBeVisible();

    await form.locator('input[name="applied_rate"]').fill(String(Number(antes.applied_rate)));
    await form.getByLabel("Fuente de la tarifa de mercado").fill("Fuente de prueba e2e");
    await form.getByRole("button", { name: "Guardar" }).click();
    await expect(fila.getByText(/Tarifa guardada/)).toBeVisible();

    const [despues] = await consultar<{ applied_rate: number; source: string }>(
      "rate_cards",
      { id: `eq.${antes.id}` },
      "applied_rate,source",
    );
    expect(Number(despues.applied_rate)).toBe(Number(antes.applied_rate));
    expect(despues.source).toBe("Fuente de prueba e2e");
  } finally {
    await actualizar(
      "rate_cards",
      { id: `eq.${antes.id}` },
      { applied_rate: antes.applied_rate, market_rate: antes.market_rate, source: antes.source },
    );
  }
});
