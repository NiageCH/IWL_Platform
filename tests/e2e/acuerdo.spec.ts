import { expect, test } from "@playwright/test";
import {
  USUARIOS,
  borrar,
  borrarCuenta,
  consultar,
  correosRecibidos,
  entrarComo,
  insertar,
  llamar,
} from "./entrada";

/**
 * El Acuerdo, de punta a punta, con una compañía recién nacida en entrada
 * por la vía de Construcción.
 *
 * Dirección abre el Anexo y se lo propone; ella lo ve en Mi compañía, lo
 * comenta y lo acepta; dirección responde desde el aviso, firma el
 * Acuerdo —sin nada validado, porque es Construcción— y la pasa a
 * Aceleración con su motivo.
 *
 * La compañía se prepara por fuera, con el NDA registrado como firmado
 * fuera: lo que se prueba aquí empieza después. Por eso ella no tiene
 * cuenta, y lo primero es dársela.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now();
const NOMBRE = `Acuerdo Prueba ${SELLO}`;
const PERSONA = `Fundadora Acuerdo ${SELLO}`;
const CORREO = `e2e.acuerdo.${SELLO}@ejemplo.test`;

test("se propone el Anexo, ella lo comenta y lo acepta, y el Acuerdo la pasa a incubación", async ({ page }) => {
  const candidatura = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: NOMBRE,
    contacto_nombre: PERSONA,
    contacto_email: CORREO,
    estado: "preseleccionada",
    via: "construccion",
    situacion_societaria: "sin_constituir",
  });
  let companiaId: string | null = null;

  try {
    const [admin] = await consultar<{ id: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "id");
    await llamar("registrar_nda_externo", {
      p_candidatura: candidatura.id,
      p_profile: admin.id,
      p_firmado_on: "2026-11-01",
      p_documento: null,
      p_url: "https://ejemplo.test/nda.pdf",
    });
    const [c] = await consultar<{ company_id: string }>("candidaturas", { id: `eq.${candidatura.id}` }, "company_id");
    companiaId = c.company_id;
    const [co] = await consultar<{ slug: string }>("companies", { id: `eq.${companiaId}` }, "slug");

    await insertar("decisiones_incorporacion", {
      company_id: companiaId,
      decision: "si",
      base: "estrategica",
      motivo: "Encaja en la cohorte y el equipo está completo.",
    });

    // Dirección: abre el Anexo, lo rellena y se lo propone
    await entrarComo(page, USUARIOS.admin, `/cartera/${co.slug}/programa`);
    await expect(page.getByText(/Vía de entrada\s*Construcción/)).toBeVisible();
    await page.getByRole("button", { name: "Abrir el Anexo" }).click();
    const anexo = page.locator("form", { has: page.locator('input[name="duration_months"]') });
    await anexo.locator('input[name="duration_months"]').fill("12");
    await anexo.locator('input[name="committed_hours"]').fill("120");
    await anexo.locator('input[name="equity_pct"]').fill("3");
    await anexo.getByRole("button", { name: "Guardar el Anexo" }).click();
    await expect(page.getByText("Anexo guardado.")).toBeVisible();
    // En entrada no se firma desde el borrador
    await expect(page.getByRole("button", { name: "Firmar el Anexo" })).toHaveCount(0);

    /*
     * El NDA se firmó fuera, así que ella no tiene cuenta y no se le puede
     * proponer: se dice por qué, y «Dar acceso» está al lado. La contraseña
     * sale una sola vez y se cierra a mano.
     */
    await expect(page.getByText(/ella tiene que tener cuenta/)).toBeVisible();
    await page.getByRole("button", { name: "Dar acceso" }).click();
    const acceso = page.getByText(/Cuenta creada para .* Su contraseña es/);
    await expect(acceso).toBeVisible();
    const temporal = (await acceso.innerText()).match(/contraseña es ([^\s]+)/)![1];
    // Y le llega el correo con el enlace para elegir contraseña, nunca la contraseña
    await expect(page.getByText(/Le ha llegado un correo con un enlace para entrar y elegir su contraseña/)).toBeVisible();
    const [bienvenida] = await correosRecibidos(CORREO);
    expect(bienvenida.asunto).toMatch(/^Tu cuenta en la plataforma de IWL · /);
    expect(bienvenida.texto).not.toContain(temporal);
    await page.getByRole("button", { name: "Hecho" }).click();
    await expect(acceso).toHaveCount(0);

    await page.getByText("Proponerle el Acuerdo", { exact: true }).first().click();
    const propuesta = page.locator("form", { has: page.getByRole("button", { name: "Proponerle el Acuerdo" }) });
    await expect(propuesta.getByLabel(/Firman a título personal/)).toHaveValue(PERSONA);
    // Sin sociedad, el equity queda comprometido: proponer pide cuándo se constituye
    await propuesta.getByLabel(/Constituir la sociedad, prevista para/).fill("2027-03-01");
    await propuesta.getByRole("button", { name: "Proponerle el Acuerdo" }).click();
    await expect(page.getByText(/Propuesta de Acuerdo del .*Falta que ella la acepte/)).toBeVisible();
    await expect(page.getByText("Comprometido · se materializa al constituir")).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    // Ella entra con la contraseña que se le dio, la cambia y cae en su compañía
    await page.goto("/entrar");
    await page.locator('input[type="email"]').fill(CORREO);
    await page.locator('input[type="password"]').fill(temporal);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/cambiar-contrasena/, { timeout: 15_000 });
    await page.getByLabel("Nueva contraseña").fill("la-del-acuerdo-2026");
    await page.getByLabel("Otra vez").fill("la-del-acuerdo-2026");
    await page.getByRole("button", { name: "Guardar y entrar" }).click();
    await expect(page).toHaveURL(/\/proyecto/, { timeout: 15_000 });

    // El aviso en su resumen, la propuesta en Programa; comenta y acepta
    await expect(page.getByText("Inception Woman Lab te ha propuesto el Acuerdo.")).toBeVisible();
    await page.getByRole("link", { name: "Léelo en Programa" }).click();
    await expect(page.getByText("120 h", { exact: true })).toBeVisible();
    await expect(page.getByText(`${PERSONA} · a título personal`)).toBeVisible();
    await page.getByLabel("Comentar la propuesta").fill("¿Las 120 horas incluyen la mentoría?");
    await page.getByRole("button", { name: "Enviar el comentario" }).click();
    await expect(page.getByText("Sin responder todavía")).toBeVisible();
    await page.getByRole("button", { name: "Aceptar la propuesta" }).click();
    await expect(page.getByText(/Propuesta de Acuerdo aceptada el .*Falta firmarla/)).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).first().click();
    await page.waitForURL(/\/entrar/);

    // Dirección: responde desde el aviso y firma el Acuerdo
    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator("li").filter({ hasText: `${PERSONA} ha comentado la propuesta de Acuerdo` });
    await aviso.getByRole("link", { name: "Responder" }).click();
    await expect(page).toHaveURL(new RegExp(`/cartera/${co.slug}/programa`));
    await page.getByLabel("Respuesta").fill("Sí, incluyen la mentoría.");
    await page.getByRole("button", { name: "Responder" }).click();
    await expect(page.getByText("Sí, incluyen la mentoría.")).toBeVisible();

    await page.getByText("Firmar el Acuerdo y el Anexo").click();
    const firma = page.locator("form", { has: page.getByRole("button", { name: "Firmar el Acuerdo" }) });
    await firma.getByLabel(/Firmado el/).fill("2026-11-10");
    await firma.getByRole("button", { name: "Firmar el Acuerdo" }).click();
    /*
     * El acuse es la pantalla: la pastilla dice la fecha de la firma y el
     * formulario desaparece. Con «Firmado el» a secas encontraba el rótulo
     * del propio campo, la prueba leía la base antes de que la firma
     * llegara y el `finally` borraba la compañía por debajo de ella.
     */
    await expect(page.getByText(/^Firmado el \d/)).toBeVisible();
    await expect(firma).toHaveCount(0);

    const [despues] = await consultar<{ tramo: string; stage: string }>("companies", { id: `eq.${companiaId}` }, "tramo,stage");
    expect(despues).toEqual({ tramo: "incubacion", stage: "pre_semilla" });

    // Y empieza a facturar: dirección la pasa a Aceleración, con motivo
    await page.getByText("Pasar a Aceleración", { exact: true }).first().click();
    const via = page.locator("form", { has: page.getByRole("button", { name: "Pasar a Aceleración" }) });
    await via.getByRole("textbox", { name: /^Motivo/ }).fill("Factura cada mes desde octubre.");
    await via.getByRole("button", { name: "Pasar a Aceleración" }).click();
    await expect(page.getByText(/Pasó de Construcción a Aceleración el .*: Factura cada mes desde octubre\./)).toBeVisible();
  } finally {
    // La candidatura antes: firmada, no se queda sin compañía ni un momento
    await borrar("candidaturas", { id: candidatura.id });
    if (companiaId) await borrar("companies", { id: companiaId });
    await borrarCuenta(CORREO);
  }
});
