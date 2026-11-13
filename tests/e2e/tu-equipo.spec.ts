import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  crearCuenta,
  entrarComo,
  insertar,
  llamar,
} from "./entrada";

/**
 * «Tu equipo IWL», en el Resumen de la fundadora (REVISION, 13 nov).
 *
 * Con Marea, que tiene mentora principal y revisora de Niage en la semilla,
 * y con una compañía recién nacida, que todavía no tiene a nadie: lo que ve
 * una compañía nueva es justo lo que hay que comprobar.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";

test("la fundadora ve a su equipo IWL, con su papel, su LinkedIn y su correo", async ({ page }) => {
  const [mentora] = await consultar<{ id: string; email: string; linkedin_url: string | null }>(
    "profiles",
    { email: "eq.mentor@iwl.test" },
    "id,email,linkedin_url",
  );
  try {
    await actualizar("profiles", { id: `eq.${mentora.id}` }, { linkedin_url: "https://www.linkedin.com/in/mentora-prueba" });
    await entrarComo(page, USUARIOS.fundadoraMarea, "/proyecto");

    const bloque = page.locator("section, div").filter({ has: page.getByRole("heading", { name: "Tu equipo IWL" }) }).last();
    await expect(bloque.getByText(/^Mentoría principal/).first()).toBeVisible();
    await expect(bloque.getByText(/Mentoría técnica · Niage/).first()).toBeVisible();
    await expect(bloque.getByText("Te asignaremos mentor")).toHaveCount(0);

    const fila = bloque.locator("li").filter({ has: page.locator(`a[href="mailto:${mentora.email}"]`) });
    await expect(fila.getByText(/^Mentoría principal/)).toBeVisible();
    await expect(fila.getByRole("link", { name: /^LinkedIn de / })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/mentora-prueba",
    );
    await expect(fila.getByRole("link", { name: /^Escribir a / })).toHaveAttribute("href", `mailto:${mentora.email}`);
  } finally {
    await actualizar("profiles", { id: `eq.${mentora.id}` }, { linkedin_url: mentora.linkedin_url });
  }
});

test("sin mentor asignado todavía, se le dice cuándo lo tendrá", async ({ page }) => {
  const sello = Date.now();
  const correo = `e2e.tu-equipo.${sello}@ejemplo.test`;
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Equipo nuevo ${sello}`,
    contacto_nombre: "Contacto equipo",
    contacto_email: correo,
    estado: "preseleccionada",
    via: "aceleracion",
    situacion_societaria: "sin_constituir",
  });
  let compania: string | null = null;
  try {
    const [admin] = await consultar<{ id: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "id");
    await llamar("registrar_nda_externo", {
      p_candidatura: c.id,
      p_profile: admin.id,
      p_firmado_on: "2026-11-01",
      p_documento: null,
      p_url: "https://ejemplo.test/nda.pdf",
    });
    const [con] = await consultar<{ company_id: string }>("candidaturas", { id: `eq.${c.id}` }, "company_id");
    compania = con.company_id;
    const ella = await crearCuenta(correo);
    await insertar("company_members", { company_id: compania, profile_id: ella, member_role: "fundadora" });

    await entrarComo(page, correo, "/proyecto");
    await expect(page.getByRole("heading", { name: "Tu equipo IWL" })).toBeVisible();
    await expect(page.getByText("Te asignaremos mentor en cuanto firmemos el Acuerdo.")).toBeVisible();
  } finally {
    await borrar("candidaturas", { id: c.id });
    if (compania) await borrar("companies", { id: compania });
    await borrarCuenta(correo);
  }
});
