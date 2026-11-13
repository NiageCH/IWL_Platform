import { expect, test, type Page } from "@playwright/test";
import {
  COMPANIAS,
  USUARIOS,
  actualizar,
  borrar,
  borrarCuenta,
  consultar,
  crearCuenta,
  entrarComo,
  ficherosEn,
  insertar,
  llamar,
  quitarFicherosSueltos,
  vaciarCarpeta,
} from "./entrada";

/**
 * Ficheros de verdad, por cada punto de subida (REVISION, 13 nov).
 *
 * Hasta ahora todo pasaba por una Server Action, que no admite más de 1 MB:
 * las pruebas subían ficheros de unos bytes y pasaban, y un PDF de cuentas
 * normal no habría llegado nunca. Aquí cada punto sube **5 MB**, que es lo
 * que pesa un business plan con imágenes, y se comprueba en la base que lo
 * registrado pesa eso.
 *
 * Las compañías y candidaturas se crean para la prueba y se borran al
 * acabar, con sus ficheros. Lo de la semilla que se toque se repone.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const MARCA = "Subida 5 MB";
const CINCO_MB = 5 * 1024 * 1024;

function pdf(bytes: number, nombre = "cuentas-anuales.pdf") {
  const cabecera = Buffer.from("%PDF-1.4\n");
  return { name: nombre, mimeType: "application/pdf", buffer: Buffer.concat([cabecera, Buffer.alloc(bytes - cabecera.length, 0x20)]) };
}

async function admin() {
  const [a] = await consultar<{ id: string }>("profiles", { email: `eq.${USUARIOS.admin}` }, "id");
  return a.id;
}

/** Una compañía recién nacida, en entrada, con su fundadora con cuenta */
async function companiaNueva(sello: number) {
  const nombre = `${MARCA} ${sello}`;
  const correo = `e2e.subidas.${sello}@ejemplo.test`;
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre,
    contacto_nombre: `Contacto ${nombre}`,
    contacto_email: correo,
    estado: "preseleccionada",
    via: "aceleracion",
    situacion_societaria: "sin_constituir",
  });
  await llamar("registrar_nda_externo", {
    p_candidatura: c.id,
    p_profile: await admin(),
    p_firmado_on: "2026-11-01",
    p_documento: null,
    p_url: "https://ejemplo.test/nda.pdf",
  });
  const [con] = await consultar<{ company_id: string }>("candidaturas", { id: `eq.${c.id}` }, "company_id");
  const ella = await crearCuenta(correo);
  await actualizar("profiles", { id: `eq.${ella}` }, { full_name: `Contacto ${nombre}` });
  await insertar("company_members", { company_id: con.company_id, profile_id: ella, member_role: "fundadora" });
  return { candidatura: c.id, compania: con.company_id, correo };
}

async function pesos(companyId: string) {
  const filas = await consultar<{ size_bytes: number; file_name: string }>(
    "document_versions",
    { company_id: `eq.${companyId}` },
    "size_bytes,file_name",
  );
  return filas.map((f) => Number(f.size_bytes));
}

async function esperarSubida(page: Page) {
  // La barra aparece mientras sube, y se va al acabar
  await expect(page.getByRole("progressbar")).toHaveCount(0, { timeout: 60_000 });
}

test.describe.configure({ timeout: 120_000 });

test("la fundadora sube 5 MB al data room, a un punto del checklist y como business plan", async ({ page }) => {
  const nueva = await companiaNueva(Date.now());
  try {
    await entrarComo(page, nueva.correo, "/proyecto/diligencia");

    // El formulario general del data room
    await page.getByText("Subir un documento").click();
    const general = page.locator("form", { has: page.getByRole("button", { name: /Subir al data room/ }) });
    await expect(general.getByText(/hasta 25\sMB/)).toBeVisible();
    await general.locator('input[name="name"]').fill("Cuentas anuales grandes");
    await general.locator('input[name="fichero"]').setInputFiles(pdf(CINCO_MB));
    await general.getByRole("button", { name: /Subir al data room/ }).click();
    await esperarSubida(page);
    await expect(page.getByText("Documento subido.")).toBeVisible({ timeout: 30_000 });

    // Desde la línea de un punto
    const punto = page
      .locator("li")
      .filter({ hasText: "Modelo financiero" })
      .filter({ has: page.locator("button") })
      .first();
    await punto.getByRole("button", { name: "Subir", exact: true }).click();
    await punto.locator('input[name="fichero"]').setInputFiles(pdf(CINCO_MB, "punto.pdf"));
    await punto.getByRole("button", { name: "Subir", exact: true }).last().click();
    await expect(punto.getByRole("button", { name: "Hecho" })).toBeVisible({ timeout: 60_000 });

    // El business plan ya escrito
    await page.goto("/proyecto/plan");
    await page.getByRole("button", { name: "Adjuntar el business plan" }).click();
    const plan = page.locator("form", { has: page.getByRole("button", { name: "Adjuntar" }) });
    await plan.locator('input[name="fichero"]').setInputFiles(pdf(CINCO_MB, "business-plan.pdf"));
    await plan.getByRole("button", { name: "Adjuntar" }).click();
    // Al acabar, el formulario cambia «Adjuntar» por «Hecho»
    await expect(page.getByRole("button", { name: "Hecho" })).toBeVisible({ timeout: 60_000 });

    expect(await pesos(nueva.compania)).toEqual([CINCO_MB, CINCO_MB, CINCO_MB]);
  } finally {
    await vaciarCarpeta("data-room", nueva.compania);
    await borrar("candidaturas", { id: nueva.candidatura });
    await borrar("companies", { id: nueva.compania });
    await borrarCuenta(nueva.correo);
  }
});

test("lo que pasa del límite no se sube, y se dice antes de gastar la subida", async ({ page }) => {
  const nueva = await companiaNueva(Date.now());
  try {
    await entrarComo(page, nueva.correo, "/proyecto/diligencia");
    await page.getByText("Subir un documento").click();
    const general = page.locator("form", { has: page.getByRole("button", { name: /Subir al data room/ }) });
    await general.locator('input[name="name"]').fill("Demasiado grande");
    await general.locator('input[name="fichero"]').setInputFiles(pdf(26 * 1024 * 1024, "enorme.pdf"));
    await general.getByRole("button", { name: /Subir al data room/ }).click();
    await expect(page.getByText(/enorme\.pdf pesa 26\sMB y el máximo son 25\sMB\./).first()).toBeVisible();
    expect(await pesos(nueva.compania)).toEqual([]);
  } finally {
    await borrar("candidaturas", { id: nueva.candidatura });
    await borrar("companies", { id: nueva.compania });
    await borrarCuenta(nueva.correo);
  }
});

test("IWL adjunta 5 MB como evidencia de una tarea", async ({ page }) => {
  const rotulo = `${MARCA} evidencia ${Date.now()}`;
  try {
    await entrarComo(page, USUARIOS.admin, "/cartera/marea-clinica");

    const fila = page
      .locator("li")
      .filter({ hasText: "Montar la sala de datos" })
      .filter({ has: page.locator("form, button") })
      .last();
    await fila.getByRole("button", { name: "Adjuntar evidencia" }).click();
    const alta = fila.locator("form", { has: page.locator('input[name="label"]') });
    await expect(alta.getByText(/Hasta 25\sMB/)).toBeVisible();
    await alta.locator('input[name="label"]').fill(rotulo);
    await alta.locator('input[name="fichero"]').setInputFiles(pdf(CINCO_MB, "acta.pdf"));
    await alta.getByRole("button", { name: "Adjuntar" }).click();
    await expect(fila.getByText(rotulo)).toBeVisible({ timeout: 60_000 });

    const [doc] = await consultar<{ id: string }>("documents", { company_id: `eq.${COMPANIAS.marea}`, name: `eq.${rotulo}` }, "id");
    const [version] = await consultar<{ size_bytes: number; storage_path: string }>(
      "document_versions",
      { document_id: `eq.${doc.id}` },
      "size_bytes,storage_path",
    );
    expect(Number(version.size_bytes)).toBe(CINCO_MB);
    expect(version.storage_path).toMatch(new RegExp(`^${COMPANIAS.marea}/evidencia/${doc.id}/acta\\.pdf$`));
  } finally {
    // Lo creado aquí se borra; el resto de Marea no se toca
    await borrar("evidence_links", { label: rotulo });
    const docs = await consultar<{ id: string }>("documents", { company_id: `eq.${COMPANIAS.marea}`, name: `eq.${rotulo}` }, "id");
    for (const d of docs) {
      const versiones = await consultar<{ storage_path: string }>("document_versions", { document_id: `eq.${d.id}` }, "storage_path");
      await quitarFicherosSueltos("data-room", versiones.map((v) => v.storage_path));
      await borrar("documents", { id: d.id });
    }
  }
});

test("la candidata entrega 5 MB en su due diligence", async ({ page }) => {
  const sello = Date.now();
  const correo = `e2e.candidata.subidas.${sello}@ejemplo.test`;
  const ella = await crearCuenta(correo);
  await actualizar("profiles", { id: `eq.${ella}` }, { role: "candidata", full_name: "Candidata de prueba" });
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `${MARCA} candidata ${sello}`,
    contacto_nombre: "Candidata de prueba",
    contacto_email: correo,
    estado: "entrada",
    profile_id: ella,
  });
  try {
    /*
     * La sala de datos se le abre detrás del NDA: con su firma puesta y la
     * de IWL pendiente ya puede entregar. Se prepara así para no recorrer
     * aquí la firma, que tiene su propia prueba.
     */
    await insertar("nda_firmas", {
      candidatura_id: c.id,
      firmante_id: ella,
      firmante_nombre: "Candidata de prueba",
      firmado_at: new Date().toISOString(),
    });
    await entrarComo(page, correo, "/candidatura");
    const suelto = page.locator("form", { has: page.getByRole("button", { name: "Subir", exact: true }) }).last();
    await expect(suelto.getByText(/Hasta 25\sMB/)).toBeVisible();
    await suelto.locator('input[name="documento"]').setInputFiles(pdf(CINCO_MB, "plan-financiero.pdf"));
    await suelto.getByRole("button", { name: "Subir", exact: true }).click();
    await expect(page.getByText("plan-financiero.pdf entregado. Gracias.")).toBeVisible({ timeout: 60_000 });

    const docs = await consultar<{ bytes: number; nombre: string }>(
      "candidatura_documentos",
      { candidatura_id: `eq.${c.id}` },
      "bytes,nombre",
    );
    expect(docs.map((d) => [d.nombre, Number(d.bytes)])).toEqual([["plan-financiero.pdf", CINCO_MB]]);
  } finally {
    await vaciarCarpeta("candidaturas", c.id);
    await borrar("candidaturas", { id: c.id });
    await borrarCuenta(correo);
  }
});

test("IWL anota una reunión con 5 MB adjuntos, y dirección registra un NDA firmado fuera de 5 MB", async ({ page }) => {
  const sello = Date.now();
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `${MARCA} reunión ${sello}`,
    contacto_nombre: "Contacto reunión",
    contacto_email: `e2e.reunion.${sello}@ejemplo.test`,
    estado: "preseleccionada",
    via: "aceleracion",
    situacion_societaria: "sin_constituir",
  });
  try {
    await entrarComo(page, USUARIOS.admin, `/embudo/${c.id}`);

    await page.getByText("Anotar una reunión", { exact: true }).click();
    const anotar = page.locator("form", { has: page.getByRole("button", { name: "Guardar la reunión" }) });
    await anotar.getByLabel("Fue el").fill("2026-11-10");
    await anotar.getByLabel("Cómo quedó").selectOption("seguir");
    await anotar.getByLabel("De IWL").fill("Programa IWL");
    await anotar.getByLabel("Qué se habló").fill("Revisamos el plan financiero y la presentación.");
    await anotar.locator('input[name="adjuntos"]').setInputFiles([pdf(CINCO_MB, "presentacion.pdf"), pdf(1024, "notas.pdf")]);
    await anotar.getByRole("button", { name: "Guardar la reunión" }).click();
    await expect(page.getByText(/Celebrada el/)).toBeVisible({ timeout: 60_000 });

    await page.getByText("Se firmó fuera de la plataforma").click();
    const nda = page.locator("form", { has: page.getByRole("button", { name: "Darlo por firmado" }) });
    await nda.locator('input[name="documento"]').setInputFiles(pdf(CINCO_MB, "nda-firmado.pdf"));
    await nda.getByLabel("Se firmó el").fill("2026-11-12");
    await nda.getByRole("button", { name: "Darlo por firmado" }).click();
    await expect.poll(async () => {
      const [f] = await consultar<{ documento_id: string | null }>("nda_firmas", { candidatura_id: `eq.${c.id}` }, "documento_id");
      return f?.documento_id ?? null;
    }, { timeout: 60_000 }).not.toBeNull();

    const docs = await consultar<{ bytes: number; nombre: string }>(
      "candidatura_documentos",
      { candidatura_id: `eq.${c.id}` },
      "bytes,nombre",
    );
    const porNombre = Object.fromEntries(docs.map((d) => [d.nombre, Number(d.bytes)]));
    expect(porNombre["presentacion.pdf"]).toBe(CINCO_MB);
    expect(porNombre["notas.pdf"]).toBe(1024);
    expect(porNombre["NDA firmado fuera de la plataforma · nda-firmado.pdf"]).toBe(CINCO_MB);
  } finally {
    const [con] = await consultar<{ company_id: string | null }>("candidaturas", { id: `eq.${c.id}` }, "company_id");
    await vaciarCarpeta("candidaturas", c.id);
    await borrar("candidaturas", { id: c.id });
    if (con?.company_id) await borrar("companies", { id: con.company_id });
  }
});

test("IWL adjunta un CV de 5 MB a una persona", async ({ page }) => {
  const [persona] = await consultar<{ id: string; cv_path: string | null }>(
    "profiles",
    { email: `eq.${USUARIOS.revisorVega}` },
    "id,cv_path",
  );
  const antes = new Set(await ficherosEn("personas", persona.id));
  try {
    await entrarComo(page, USUARIOS.admin, `/admin/personas/${persona.id}`);
    await page.getByRole("button", { name: persona.cv_path ? "Subir otro" : "Adjuntar un CV" }).click();
    const form = page.locator("form", { has: page.locator('input[name="cv"]') });
    await expect(form.getByText(/PDF o Word, hasta 10\sMB/)).toBeVisible();
    await form.locator('input[name="cv"]').setInputFiles(pdf(CINCO_MB, "cv.pdf"));
    await form.getByRole("button", { name: "Adjuntar" }).click();
    await expect(page.getByText("CV adjuntado.")).toBeVisible({ timeout: 60_000 });

    const [despues] = await consultar<{ cv_path: string }>("profiles", { id: `eq.${persona.id}` }, "cv_path");
    expect(despues.cv_path).toMatch(new RegExp(`^${persona.id}/\\d+\\.pdf$`));
  } finally {
    await actualizar("profiles", { id: `eq.${persona.id}` }, { cv_path: persona.cv_path });
    const nuevos = (await ficherosEn("personas", persona.id)).filter((f) => !antes.has(f));
    await quitarFicherosSueltos("personas", nuevos.map((f) => `${persona.id}/${f}`));
  }
});

test("un logo de 5 MB se rechaza antes de subir, y dice por qué", async ({ page }) => {
  await entrarComo(page, USUARIOS.admin, "/admin/companias");
  const abrir = page.getByRole("button", { name: /Poner un logo|Cambiar el logo/ }).first();
  await abrir.click();
  const form = page.locator("form", { has: page.locator('input[name="logo"]') }).first();
  await expect(form.getByText(/hasta 2\sMB/)).toBeVisible();
  await form.locator('input[name="logo"]').setInputFiles({
    name: "logo-enorme.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(CINCO_MB, 1),
  });
  await form.getByRole("button", { name: "Subir" }).click();
  await expect(page.getByText(/logo-enorme\.png pesa 5\sMB y el máximo son 2\sMB\./).first()).toBeVisible();
});
