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
 * «En entrada», al lado de la cartera, con dos compañías recién nacidas:
 * una de Aceleración, con su fundadora con cuenta, y una de Construcción.
 *
 * Cada una sale con su vía y su paso; la de Aceleración, con el avance del
 * due diligence, «Validar» y «Recordar»; la de Construcción, con su
 * diagnóstico. Ninguna sale en la lista de la cartera, y quien no es de IWL no ve
 * el bloque.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();
const ACEL = `Entrada Acel ${SELLO}`;
const CONS = `Entrada Cons ${SELLO}`;
const CORREO = `e2e.entrada.${SELLO}@ejemplo.test`;

async function nacer(nombre: string, via: string, correo: string) {
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre,
    contacto_nombre: `Contacto ${nombre}`,
    contacto_email: correo,
    estado: "preseleccionada",
    via,
    situacion_societaria: "sin_constituir",
  });
  const [admin] = await consultar<{ id: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "id");
  await llamar("registrar_nda_externo", {
    p_candidatura: c.id,
    p_profile: admin.id,
    p_firmado_on: "2026-11-01",
    p_documento: null,
    p_url: "https://ejemplo.test/nda.pdf",
  });
  const [con] = await consultar<{ company_id: string }>("candidaturas", { id: `eq.${c.id}` }, "company_id");
  const [co] = await consultar<{ slug: string }>("companies", { id: `eq.${con.company_id}` }, "slug");
  return { candidatura: c.id, compania: con.company_id, slug: co.slug };
}

test("«En entrada» enseña cada compañía con su vía, su paso y lo que le toca, fuera de la cartera", async ({ page }) => {
  const creadas: { candidatura: string; compania: string; slug: string }[] = [];
  try {
    const acel = await nacer(ACEL, "aceleracion", CORREO);
    creadas.push(acel);
    const cons = await nacer(CONS, "construccion", `e2e.entrada.cons.${SELLO}@ejemplo.test`);
    creadas.push(cons);

    const ella = await crearCuenta(CORREO);
    await actualizar("profiles", { id: `eq.${ella}` }, { full_name: `Contacto ${ACEL}` });
    await insertar("company_members", { company_id: acel.compania, profile_id: ella, member_role: "fundadora" });

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const bloque = page.locator("section", { has: page.getByRole("heading", { name: "En entrada", exact: true }) });
    await expect(bloque).toBeVisible();

    // Aceleración: su paso, el avance del due diligence, Validar y Recordar
    const filaAcel = bloque.locator("li").filter({ hasText: ACEL });
    await expect(filaAcel.getByText("Aceleración", { exact: true })).toBeVisible();
    await expect(filaAcel.getByText(/Confirmar su situación societaria/)).toBeVisible();
    await expect(filaAcel.getByText(/Due diligence: 0 de \d+ obligatorios validados/)).toBeVisible();
    await expect(filaAcel.getByRole("link", { name: "Validar" })).toHaveAttribute("href", `/cartera/${acel.slug}/diligencia`);
    await expect(filaAcel.getByRole("button", { name: "Recordar" })).toBeVisible();

    // Construcción: el diagnóstico, sin due diligence
    const filaCons = bloque.locator("li").filter({ hasText: CONS });
    await expect(filaCons.getByText("Construcción", { exact: true })).toBeVisible();
    await expect(filaCons.getByText("Diagnóstico:")).toBeVisible();
    await expect(filaCons.getByText(/Due diligence:/)).toHaveCount(0);

    // Confirmada la situación, en Construcción le toca a dirección decidir
    await actualizar("companies", { id: `eq.${cons.compania}` }, { situacion_confirmada_at: new Date().toISOString() });
    await page.reload();
    await expect(
      bloque.locator("li").filter({ hasText: CONS }).getByText(/Decidir la incorporación · le toca a dirección/),
    ).toBeVisible();

    /*
     * Fuera de la cartera: ningún bloque lleva a ellas salvo «En entrada» y,
     * para la que tiene cuenta, «Altas en curso», que sigue su primer acceso.
     */
    const restoDeLaCartera = page.locator("main section", {
      hasNot: page.getByRole("heading", { name: /^(En entrada|Altas en curso)$/ }),
    });
    for (const slug of [acel.slug, cons.slug]) {
      await expect(restoDeLaCartera.locator(`a[href="/cartera/${slug}"]`)).toHaveCount(0);
      await expect(bloque.locator(`a[href="/cartera/${slug}"]`)).toHaveCount(1);
    }

    // Quien no es de IWL no ve el bloque: un revisor de Niage, que también aterriza en la cartera
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);
    await entrarComo(page, USUARIOS.revisorMarea, "/cartera");
    await expect(page.getByRole("heading", { name: "En entrada", exact: true })).toHaveCount(0);
  } finally {
    for (const c of creadas) {
      await borrar("candidaturas", { id: c.candidatura });
      await borrar("companies", { id: c.compania });
    }
    await borrarCuenta(CORREO);
  }
});
