import { expect, test } from "@playwright/test";
import sharp from "sharp";
import {
  USUARIOS,
  actualizar,
  consultar,
  descargarFichero,
  entrarComo,
  ficherosEn,
  quitarFicherosSueltos,
} from "./entrada";

/**
 * Mi cuenta: la foto y el LinkedIn (REVISION, 13 nov).
 *
 * Con una cuenta de la semilla que nadie más toca en la suite. Lo que había
 * antes —foto y LinkedIn— se lee y se repone en el `finally`, y se borran
 * solo los ficheros que ha subido la prueba.
 */
test("cada cual pone su foto, que se guarda cuadrada y reducida, y su LinkedIn", async ({ page }, info) => {
  const [persona] = await consultar<{
    id: string;
    last_name: string | null;
    photo_path: string | null;
    linkedin_url: string | null;
  }>("profiles", { email: `eq.${USUARIOS.revisorVega}` }, "id,last_name,photo_path,linkedin_url");
  const ficherosAntes = new Set(await ficherosEn("fotos", persona.id));

  // Apaisada y más grande de lo que se guarda: hay que recortar y reducir
  const original = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: "#4a6b8a" },
  })
    .png()
    .toBuffer();

  try {
    await entrarComo(page, USUARIOS.revisorVega, "/perfil");

    await page.locator('input[name="foto"]').setInputFiles({
      name: "retrato.png",
      mimeType: "image/png",
      buffer: original,
    });
    await page.getByRole("button", { name: "Guardar la foto" }).click();
    await expect(page.getByText("Foto guardada.")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('img[data-avatar="foto"]').first()).toBeVisible();

    const [despues] = await consultar<{ photo_path: string }>("profiles", { id: `eq.${persona.id}` }, "photo_path");
    expect(despues.photo_path).toMatch(new RegExp(`^${persona.id}/.+\\.webp$`));
    const guardada = await sharp(await descargarFichero("fotos", despues.photo_path)).metadata();
    expect([guardada.format, guardada.width, guardada.height]).toEqual(["webp", 256, 256]);

    // En la barra lateral, que solo aparece a partir de 768 px
    if (info.project.name.startsWith("escritorio")) {
      await page.goto("/");
      await expect(page.locator('a[href="/perfil"] img[data-avatar="foto"]')).toBeVisible();
      await page.goto("/perfil");
    }

    // LinkedIn: lo que no es un perfil se dice; lo pegado con adornos se limpia.
    // Los apellidos son obligatorios en el mismo formulario, y esta cuenta
    // de la semilla no los tiene.
    await page.locator('input[name="last_name"]').fill(persona.last_name || "Prueba");
    const campo = page.locator('input[name="linkedin_url"]');
    await campo.fill("https://www.linkedin.com/company/iwl");
    await page.getByRole("button", { name: "Guardar mis datos" }).click();
    await expect(page.getByText(/Tiene que ser tu perfil de LinkedIn/).first()).toBeVisible();

    await campo.fill("es.linkedin.com/in/revisora-prueba/?utm_source=share");
    await page.getByRole("button", { name: "Guardar mis datos" }).click();
    await expect(page.getByText("Guardado.")).toBeVisible();
    const [conLinkedin] = await consultar<{ linkedin_url: string }>("profiles", { id: `eq.${persona.id}` }, "linkedin_url");
    expect(conLinkedin.linkedin_url).toBe("https://www.linkedin.com/in/revisora-prueba");

    // Quitarla vuelve a las iniciales
    await page.getByRole("button", { name: "Quitar la foto y volver a las iniciales" }).click();
    await expect(page.getByText(/Foto quitada/)).toBeVisible();
    await expect(page.locator('img[data-avatar="foto"]')).toHaveCount(0);
    expect(await ficherosEn("fotos", persona.id)).toEqual([...ficherosAntes]);
  } finally {
    await actualizar(
      "profiles",
      { id: `eq.${persona.id}` },
      { photo_path: persona.photo_path, linkedin_url: persona.linkedin_url, last_name: persona.last_name },
    );
    const sobrantes = (await ficherosEn("fotos", persona.id)).filter((f) => !ficherosAntes.has(f));
    await quitarFicherosSueltos("fotos", sobrantes.map((f) => `${persona.id}/${f}`));
  }
});

test("dirección ve la foto y el LinkedIn en la ficha de la persona", async ({ page }) => {
  const [persona] = await consultar<{ id: string; full_name: string; linkedin_url: string | null }>(
    "profiles",
    { email: `eq.${USUARIOS.revisorVega}` },
    "id,full_name,linkedin_url",
  );
  try {
    await actualizar("profiles", { id: `eq.${persona.id}` }, { linkedin_url: "https://www.linkedin.com/in/revisora-prueba" });
    await entrarComo(page, USUARIOS.admin, `/admin/personas/${persona.id}`);
    const enlace = page.getByRole("link", { name: /^LinkedIn de / });
    await expect(enlace).toHaveAttribute("href", "https://www.linkedin.com/in/revisora-prueba");
    await expect(enlace).toHaveAttribute("rel", /noopener/);
  } finally {
    await actualizar("profiles", { id: `eq.${persona.id}` }, { linkedin_url: persona.linkedin_url });
  }
});
