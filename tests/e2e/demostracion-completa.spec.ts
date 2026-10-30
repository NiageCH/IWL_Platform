import { expect, test, type Page } from "@playwright/test";
import { USUARIOS, consultar, entrarComo } from "./entrada";

/**
 * La demostración recorre cada estado.
 *
 * Marea Clínica está marcada como demostración y su trabajo es enseñar
 * cada estado al menos una vez: lo que no se puede ver no se puede
 * revisar. Esto comprueba que lo sigue haciendo, que es la clase de cosa
 * que se rompe sin que nadie se entere —basta con que alguien valide un
 * punto del checklist para que el rojo desaparezca de la pantalla—.
 *
 * Se salta donde no esté cargada. La demostración completa vive en
 * `supabase/seed/local/40_demostracion.sql`, que no se versiona: en una
 * máquina recién clonada no hay nada que comprobar, y fallar ahí sería
 * fallar por no tener datos que el repositorio no trae.
 */

const MARCA = "Carta de intenciones de un inversor ancla";

let hayDemo = false;

test.beforeAll(async () => {
  const filas = await consultar<{ id: string }>(
    "milestones",
    { title: `eq.${MARCA}` },
    "id",
  );
  hayDemo = filas.length > 0;
});

test.beforeEach(() => {
  test.skip(
    !hayDemo,
    "La demostración completa no está cargada en esta máquina: " +
      "está en supabase/seed/local/40_demostracion.sql, que no se versiona.",
  );
});

/** Qué estados se ven en una pantalla, leídos de las pastillas */
async function estadosDe(page: Page): Promise<Set<string>> {
  const clases = await page
    .locator(".estado, .nodo-estado, .segmento")
    .evaluateAll((nodos) =>
      nodos.flatMap((n) =>
        [...n.classList].filter((c) => c.startsWith("es-")),
      ),
    );
  return new Set(clases);
}

const CINCO = ["es-hecho", "es-curso", "es-pendiente", "es-atencion", "es-vencido"];

test("la ficha entera recorre los cinco estados", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

  const vistos = new Set<string>();
  for (const seccion of ["", "/ruta", "/diligencia", "/kpi", "/aportacion"]) {
    await page.goto(`/cartera/marea-clinica${seccion}`);
    for (const e of await estadosDe(page)) vistos.add(e);
  }

  expect([...CINCO].filter((e) => !vistos.has(e))).toEqual([]);
});

test("el due diligence tiene un punto en cada uno de sus cinco estados", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/diligencia");

  /*
   * Por el valor del control, no por el texto de la pantalla: para quien
   * puede validar, el estado vive dentro del desplegable, y `getByText`
   * encuentra ahí las cinco opciones de cada fila aunque solo una esté
   * puesta.
   */
  const puestos = await page
    .locator("select[name='status']")
    .evaluateAll((selects) =>
      selects.map((s) => (s as HTMLSelectElement).value),
    );

  for (const estado of [
    "validado",
    "entregado",
    "en_revision",
    "bloqueante",
    "pendiente",
  ]) {
    expect(
      puestos,
      `Falta un punto «${estado}» en el due diligence de la demostración`,
    ).toContain(estado);
  }

  // Y el documento que fue válido y dejó de serlo
  await expect(page.getByText(/Caducado el/).first()).toBeVisible();
});

test("la hoja de ruta tiene hitos en los cuatro estados", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/ruta");

  const puestos = await page
    .locator("select[name='status']")
    .evaluateAll((selects) =>
      selects.map((s) => (s as HTMLSelectElement).value),
    );

  for (const estado of ["cumplido", "en_curso", "pendiente", "retrasado"]) {
    expect(
      puestos,
      `Falta un hito «${estado}» en la demostración`,
    ).toContain(estado);
  }
});

test("el técnico tiene las cuatro severidades y un hallazgo resuelto", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/tecnico");

  // En las pastillas de estado, no en las opciones de un desplegable
  const pastillas = await page.locator(".estado").allInnerTexts();

  for (const palabra of ["Crítico", "Alto", "Medio", "Bajo", "Resuelto"]) {
    expect(
      pastillas,
      `Falta un hallazgo «${palabra}» en la demostración`,
    ).toContain(palabra);
  }
});

test("hay un mes vencido sin entregar y un mes corregido con su rastro", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/kpi");

  // El mes que venció sin entregarse: borrador y fuera de plazo
  const updates = page
    .locator("section")
    .filter({ hasText: "Updates mensuales" })
    .first();
  await expect(updates.locator(".es-vencido").first()).toBeVisible();

  // Y la corrección, con lo que decía antes y lo que dice ahora
  const historial = page
    .locator("details")
    .filter({ hasText: "Historial de correcciones" })
    .first();
  await historial.locator("summary").click();
  await expect(historial.getByText(/13\.?518.*→.*13\.?900/)).toBeVisible();
});

test("las introducciones recorren sus cinco estados y una lleva comisión", async ({
  page,
}) => {
  await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica/aportacion");

  const pastillas = await page.locator(".estado").allInnerTexts();

  for (const palabra of [
    "Presentada",
    "Reunión celebrada",
    "En negociación",
    "Cerrada",
    "Descartada",
  ]) {
    expect(
      pastillas,
      `Falta una introducción «${palabra}»`,
    ).toContain(palabra);
  }

  await expect(page.getByText("Genera comisión").first()).toBeVisible();

  // Y el desembolso que nadie ha justificado todavía
  await expect(page.getByText(/sin justificante/).first()).toBeVisible();
});
