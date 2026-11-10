import { expect, test } from "@playwright/test";
import { USUARIOS, actualizar, consultar, entrarComo } from "./entrada";

/**
 * Los ajustes nuevos de Programa: el tope de la entrada en Construcción, la
 * horquilla de equity por vía y el lugar de firma del NDA.
 *
 * Son de toda la plataforma: se leen antes y se restauran en el `finally`,
 * por fuera del camino que se prueba, para que otra prueba no los herede.
 */

const CLAVES = ["entrada_tope_construccion_dias", "equity_horquilla", "nda_lugar"];

test("dirección fija el tope, la horquilla y el lugar del NDA", async ({ page }) => {
  const antes = await consultar<{ key: string; value: unknown }>(
    "platform_settings",
    { key: `in.(${CLAVES.join(",")})` },
    "key,value",
  );

  try {
    await entrarComo(page, USUARIOS.admin, "/admin/programa");

    const tope = page.locator("form", { has: page.getByRole("button", { name: "Guardar el tope" }) });
    await tope.getByLabel("Días en entrada antes de avisar").fill("21");
    await tope.getByRole("button", { name: "Guardar el tope" }).click();
    await expect(page.getByText(/avisará a los 21 días en entrada sin Acuerdo/)).toBeVisible();

    const horquilla = page.locator("form", { has: page.getByRole("button", { name: "Guardar la horquilla" }) });
    const construccion = horquilla.locator("fieldset", { hasText: "Construcción" });
    await construccion.getByLabel("Desde (%)").fill("12");
    await construccion.getByLabel("Hasta (%)").fill("8");
    await horquilla.getByRole("button", { name: "Guardar la horquilla" }).click();
    await expect(horquilla.getByText("El máximo no puede ser menor que el mínimo.")).toBeVisible();
    await construccion.getByLabel("Hasta (%)").fill("15 %");
    await horquilla.getByRole("button", { name: "Guardar la horquilla" }).click();
    await expect(page.getByText(/Guardada\. Al proponer un Anexo se enseña como referencia/)).toBeVisible();

    const lugar = page.locator("form", { has: page.getByRole("button", { name: "Guardar el lugar" }) });
    await lugar.getByLabel("Lugar de firma").fill("Sevilla");
    await lugar.getByRole("button", { name: "Guardar el lugar" }).click();
    await expect(page.getByText(/Los NDA que se firmen desde ahora dirán «Sevilla»/)).toBeVisible();

    const despues = await consultar<{ key: string; value: unknown }>(
      "platform_settings",
      { key: `in.(${CLAVES.join(",")})` },
      "key,value",
    );
    const valor = (k: string) => despues.find((d) => d.key === k)?.value;
    expect(valor("entrada_tope_construccion_dias")).toBe(21);
    expect(valor("equity_horquilla")).toEqual({
      aceleracion: { min: null, max: null },
      construccion: { min: 12, max: 15 },
    });
    expect(valor("nda_lugar")).toBe("Sevilla");
  } finally {
    for (const a of antes) {
      await actualizar("platform_settings", { key: `eq.${a.key}` }, { value: a.value });
    }
  }
});
