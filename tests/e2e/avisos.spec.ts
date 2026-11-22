import { expect, test, type Page } from "@playwright/test";
import { COMPANIAS, USUARIOS, actualizar, borrar, consultar, entrarComo, insertar, llamar } from "./entrada";

/**
 * Avisos: cada uno lleva al botón exacto, caduca cuando ya no toca y dice
 * qué viene después (REVISION, 18 nov). El inventario, en `docs/AVISOS.md`.
 *
 * Los tipos que ya recorren otras pruebas de punta a punta se comprueban
 * allí, con este mismo patrón:
 *   · NDA firmado y situación dicha, en `nda.spec.ts`;
 *   · comentario al NDA, en `nda-comentarios.spec.ts`;
 *   · comentario al Acuerdo, en `acuerdo.spec.ts`;
 *   · otras fechas, en `reuniones.spec.ts`.
 * Aquí, los demás. Cada uno pulsa el aviso y comprueba que la franja «Has
 * venido a» y el botón de la acción se ven sin desplazarse. Después hace la
 * acción y comprueba que el aviso se va y que la franja dice qué sigue.
 *
 * El estado de partida se prepara por fuera —una reunión de ayer, un hito
 * entregado— y se borra al acabar.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";
const SELLO = Date.now().toString(36);
const MENTOR_MAREA = "mentor@iwl.test";

async function idDe(email: string) {
  const [p] = await consultar<{ id: string }>("profiles", { email: `eq.${email}` }, "id");
  return p.id;
}

/** Una fecha en el formato del campo de fecha y hora, a N días de hoy */
function local(dias: number, hora: string) {
  const d = new Date(Date.now() + dias * 86_400_000);
  return `${d.toISOString().slice(0, 10)}T${hora}`;
}

async function franjaALaVista(page: Page, verbo: string) {
  const franja = page.getByRole("region", { name: "Has venido a" });
  await expect(franja).toBeInViewport();
  await expect(franja.getByRole("button", { name: verbo, exact: true })).toBeInViewport();
  return franja;
}

async function candidatura(nombre: string) {
  return insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre,
    contacto_nombre: "Tarula",
    contacto_apellidos: "Prueba",
    contacto_email: `e2e.avisos.${SELLO}.${Math.random().toString(36).slice(2, 7)}@ejemplo.test`,
    estado: "reunion",
  });
}

test("tras una reunión confirmada, «ha elegido fecha» no es aviso y al día siguiente toca anotarla", async ({ page }) => {
  const nombre = `Avisos Anotar ${SELLO}`;
  const c = await candidatura(nombre);
  try {
    const ayer = new Date(Date.now() - 86_400_000);
    ayer.setUTCHours(9, 0, 0, 0);
    const franja = { inicio: ayer.toISOString(), fin: new Date(ayer.getTime() + 3_600_000).toISOString() };
    await insertar("candidatura_reuniones", {
      candidatura_id: c.id,
      estado: "confirmada",
      franjas: [franja],
      elegida: franja,
      propuesta_por: await idDe(USUARIOS.admin),
      formato: "videollamada",
      enlace: "https://meet.ejemplo.test/anotar",
    });
    await llamar("avisar_reuniones_por_anotar", {});

    await entrarComo(page, USUARIOS.admin, "/cartera");
    await expect(page.locator('li[data-aviso="reunion_elegida"]')).toHaveCount(0);
    const aviso = page.locator('li[data-aviso="reunion_anotar"]').filter({ hasText: nombre });
    await expect(aviso).toContainText(`con ${nombre} ya pasó`);
    await expect(aviso).toContainText("Te toca: anotarla");
    await expect(aviso).toContainText("Viene de: Reunión celebrada");
    await aviso.getByRole("link", { name: "Anotar" }).click();
    await expect(page).toHaveURL(new RegExp(`/embudo/${c.id}\\?aviso=[0-9a-f-]+#reunion$`));

    const arriba = await franjaALaVista(page, "Anotar");
    await expect(arriba).toContainText(`anotar la reunión del`);
    await arriba.getByRole("button", { name: "Anotar", exact: true }).click();

    const bloque = page.locator("#reunion");
    await bloque.getByText("Anotar esta reunión").click();
    const anotar = bloque.locator("form", { has: page.getByRole("button", { name: "Guardar la reunión" }) }).first();
    await anotar.getByLabel("Fue el").fill(franja.inicio.slice(0, 10));
    await anotar.getByLabel("Cómo quedó").selectOption("seguir");
    await anotar.getByLabel("De IWL").fill("Dirección IWL");
    await anotar.getByLabel("Qué se habló").fill("Buena reunión; a comité.");
    await anotar.getByRole("button", { name: "Guardar la reunión" }).click();

    await expect(page.getByRole("region", { name: "Hecho" })).toContainText("Siguiente: llevarla a comité · lo hace IWL");
    await page.goto("/cartera");
    await expect(page.locator('li[data-aviso="reunion_anotar"]').filter({ hasText: nombre })).toHaveCount(0);
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});

test("si pasan todas las fechas sin elegir, el aviso es proponer otras; al proponerlas, se va", async ({ page }) => {
  const nombre = `Avisos Sin fecha ${SELLO}`;
  const c = await candidatura(nombre);
  try {
    const pasada = new Date(Date.now() - 2 * 86_400_000).toISOString();
    await insertar("candidatura_reuniones", {
      candidatura_id: c.id,
      estado: "propuesta",
      franjas: [{ inicio: pasada, fin: pasada }],
      propuesta_por: await idDe(USUARIOS.admin),
      formato: "videollamada",
      enlace: "https://meet.ejemplo.test/sinfecha",
    });
    await llamar("avisar_reuniones_caducadas", {});

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator('li[data-aviso="reunion_caducada"]').filter({ hasText: nombre });
    await expect(aviso).toContainText("Te toca: proponer otras");
    await aviso.getByRole("link", { name: "Proponer fechas" }).click();
    const arriba = await franjaALaVista(page, "Proponer fechas");
    await arriba.getByRole("button", { name: "Proponer fechas", exact: true }).click();

    const bloque = page.locator("#reunion");
    await bloque.getByText("Proponer otras fechas", { exact: true }).click();
    const form = bloque.locator("form", { has: page.getByRole("button", { name: "Proponer las fechas" }) });
    await form.getByLabel("Fecha 1").fill(local(9, "10:00"));
    await form.getByLabel("Fecha 2").fill(local(10, "16:30"));
    await form.getByLabel("Dirección IWL de Prueba").check();
    await form.getByLabel("Enlace de la videollamada").fill("https://meet.ejemplo.test/nueva");
    await form.getByRole("button", { name: "Proponer las fechas" }).click();

    await expect(page.getByRole("region", { name: "Hecho" })).toContainText("Siguiente: elegir una fecha · lo hace ella");
    await page.goto("/cartera");
    await expect(page.locator('li[data-aviso="reunion_caducada"]').filter({ hasText: nombre })).toHaveCount(0);
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});

test("un hito sin revisar lleva a dirección a su hito; al validarlo, se va", async ({ page }) => {
  const titulo = `Hito sin revisar ${SELLO}`;
  const id = crypto.randomUUID();
  // La evidencia primero: sin ella la base no deja entregarlo
  await insertar("evidence_links", {
    company_id: COMPANIAS.marea,
    entity: "milestone",
    entity_id: id,
    kind: "enlace",
    url: "https://ejemplo.test/sin-revisar",
    label: "Entregable sin revisar",
  });
  try {
    await insertar("milestones", {
      id,
      company_id: COMPANIAS.marea,
      title: titulo,
      success_criteria: "Que la prueba pase.",
      status: "entregado",
    });
    // Los siete días los cuenta el cron (probado en tests/rls/hitos.test.ts); aquí, el aviso que deja
    await insertar("avisos", { tipo: "hito_sin_revisar", company_id: COMPANIAS.marea, milestone_id: id });

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator('li[data-aviso="hito_sin_revisar"]').filter({ hasText: titulo });
    await expect(aviso).toContainText("lleva más de 7 días entregado sin revisar");
    await aviso.getByRole("link", { name: "Revisar" }).click();
    await expect(page).toHaveURL(new RegExp(`/ruta\\?aviso=[0-9a-f-]+#hito-${id}$`));

    const arriba = await franjaALaVista(page, "Revisar");
    await arriba.getByRole("button", { name: "Revisar", exact: true }).click();
    const hito = page.locator(`#hito-${id}`);
    await expect(hito).toBeInViewport();
    await hito.getByRole("button", { name: `Validar «${titulo}»` }).click();
    await hito.getByRole("button", { name: "Validar el hito" }).click();

    await expect(page.getByRole("region", { name: "Hecho" })).toContainText("Siguiente: pasar al siguiente hito · lo hace ella");
    await page.goto("/cartera");
    await expect(page.locator('li[data-aviso="hito_sin_revisar"]').filter({ hasText: titulo })).toHaveCount(0);
  } finally {
    await borrar("milestones", { id });
    await borrar("evidence_links", { entity_id: id });
  }
});

test("el cambio de estadio pide al mentor revisar lo que pasa a por entregar; «Revisado» lo cierra", async ({ page }) => {
  const mentor = await idDe(MENTOR_MAREA);
  const aviso = await insertar<{ id: string }>("avisos", {
    tipo: "cambio_estadio",
    company_id: COMPANIAS.marea,
    para: mentor,
    profile_id: await idDe(USUARIOS.admin),
  });
  try {
    await entrarComo(page, MENTOR_MAREA, "/cartera");
    const fila = page.locator('li[data-aviso="cambio_estadio"]');
    await expect(fila).toContainText("cambió de estadio");
    await fila.getByRole("link", { name: "Revisar" }).click();
    await expect(page).toHaveURL(/\/diligencia\?aviso=[0-9a-f-]+#puntos$/);

    const arriba = await franjaALaVista(page, "Revisar");
    await expect(arriba.getByRole("button", { name: "Revisado" })).toBeInViewport();
    await arriba.getByRole("button", { name: "Revisado" }).click();
    await expect(page.getByRole("region", { name: "Hecho" })).toBeVisible();
    await page.goto("/cartera");
    await expect(page.locator('li[data-aviso="cambio_estadio"]')).toHaveCount(0);
  } finally {
    await borrar("avisos", { id: aviso.id });
  }
});

test("una candidatura aplazada vuelve a comité en su fecha; con el acta nueva, el aviso se va", async ({ page }) => {
  const nombre = `Avisos Comité ${SELLO}`;
  const c = await candidatura(nombre);
  try {
    await actualizar("candidaturas", { id: `eq.${c.id}` }, { estado: "comite" });
    await insertar("comite_actas", {
      candidatura_id: c.id,
      resumen: "Aplazada para ver la tracción de diciembre.",
      decision: "aplazada",
      revision_on: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
      cerrada_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    });

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator('li[data-aviso="comite_revision"]').filter({ hasText: nombre });
    await expect(aviso).toContainText("Te toca: volver a mirarla");
    await aviso.getByRole("link", { name: "Redactar el acta" }).click();
    await expect(page).toHaveURL(new RegExp(`/embudo/${c.id}\\?aviso=comite#comite$`));
    await franjaALaVista(page, "Redactar el acta");
    await expect(page.locator("#comite.destino-aviso")).toBeVisible();

    // El acta nueva —sin fecha de revisión— la saca de la lista
    await insertar("comite_actas", { candidatura_id: c.id, resumen: "Ahora sí.", decision: "descartada", motivo: "Fuera de la tesis." });
    await page.reload();
    await expect(page.getByRole("region", { name: "Hecho" })).toContainText("Ya no está pendiente de comité");
    await page.goto("/cartera");
    await expect(page.locator('li[data-aviso="comite_revision"]').filter({ hasText: nombre })).toHaveCount(0);
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});

/*
 * Los que faltaban (REVISION, 19 nov). La propuesta de Acuerdo aceptada se
 * recorre en `acuerdo.spec.ts`, y «Decidir la incorporación» en
 * `en-entrada.spec.ts`; aquí, los demás.
 */

test("una candidatura nueva avisa a dirección y al equipo; al pasarla a revisión, se va", async ({ page, browser }) => {
  const nombre = `Avisos Nueva ${SELLO}`;
  const c = await insertar<{ id: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre,
    contacto_nombre: "Nueva",
    contacto_apellidos: "Prueba",
    contacto_email: `e2e.avisos.nueva.${SELLO}@ejemplo.test`,
    estado: "presentada",
  });
  const equipo = await browser.newPage();
  try {
    // El equipo también la ve, en sus avisos
    await entrarComo(equipo, USUARIOS.equipoIwl, "/cartera");
    await expect(equipo.locator('li[data-aviso="candidatura_nueva"]').filter({ hasText: nombre })).toContainText(
      "Te toca: revisarla",
    );

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator('li[data-aviso="candidatura_nueva"]').filter({ hasText: nombre });
    await expect(aviso).toContainText(`Nueva Prueba presentó ${nombre}`);
    await expect(aviso).toContainText("Viene de: Filtro pasado");
    await aviso.getByRole("link", { name: "Abrir" }).click();
    await expect(page).toHaveURL(new RegExp(`/embudo/${c.id}\\?aviso=[0-9a-f-]+#pasos$`));

    const arriba = await franjaALaVista(page, "Pasar a en revisión");
    await arriba.getByRole("button", { name: "Pasar a en revisión" }).click();
    await expect(page.getByRole("region", { name: "Hecho" })).toContainText("Siguiente: tener la reunión · lo hace IWL");

    await equipo.reload();
    await expect(equipo.locator('li[data-aviso="candidatura_nueva"]').filter({ hasText: nombre })).toHaveCount(0);
  } finally {
    await equipo.close();
    await borrar("candidaturas", { id: c.id });
  }
});

test("un acta pide la firma a cada miembro que falta; al firmar, se va el suyo y no el de los demás", async ({ page }) => {
  const nombre = `Avisos Acta ${SELLO}`;
  const c = await candidatura(nombre);
  try {
    await actualizar("candidaturas", { id: `eq.${c.id}` }, { estado: "comite" });
    const acta = await insertar<{ id: string }>("comite_actas", {
      candidatura_id: c.id,
      resumen: "Aplazada hasta ver las primeras ventas.",
      decision: "aplazada",
      revision_on: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    });
    const [admin, equipo] = [await idDe(USUARIOS.admin), await idDe(USUARIOS.equipoIwl)];
    await insertar("comite_firmas", { acta_id: acta.id, profile_id: admin });
    await insertar("comite_firmas", { acta_id: acta.id, profile_id: equipo });

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator('li[data-aviso="acta_por_firmar"]').filter({ hasText: nombre });
    await expect(aviso).toContainText(`El acta de comité de ${nombre} espera tu firma`);
    await aviso.getByRole("link", { name: "Firmar el acta" }).click();
    await expect(page).toHaveURL(new RegExp(`/embudo/${c.id}\\?aviso=[0-9a-f-]+#comite$`));

    const arriba = await franjaALaVista(page, "Firmar el acta");
    await arriba.getByRole("button", { name: "Firmar el acta", exact: true }).click();
    await expect(page.getByRole("region", { name: "Hecho" })).toContainText("Siguiente: preseleccionarla");

    const abiertos = await consultar<{ para: string }>(
      "avisos",
      { acta_id: `eq.${acta.id}`, cerrado_at: "is.null" },
      "para",
    );
    expect(abiertos).toEqual([{ para: equipo }]);
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});

test("un documento entregado pide revisarlo; validarlo o pedir cambios lo cierra", async ({ page }) => {
  const [area] = await consultar<{ id: string }>("dd_areas", { is_active: "eq.true", order: "order_index" }, "id");
  const titulo = `Documento de prueba ${SELLO}`;
  const otro = `Otro documento ${SELLO}`;
  const ids: string[] = [];
  for (const t of [titulo, otro]) {
    const p = await insertar<{ id: string }>("dd_items", { company_id: COMPANIAS.marea, area_id: area.id, title: t, status: "pendiente" });
    ids.push(p.id);
  }
  try {
    // Ella lo sube: el punto pasa a revisión (aquí, por fuera)
    await actualizar("dd_items", { id: `in.(${ids.join(",")})` }, { status: "en_revision" });

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator('li[data-aviso="documento_entregado"]').filter({ hasText: titulo });
    await expect(aviso).toContainText(`entregó «${titulo}»`);
    await expect(aviso).toContainText("Te toca: revisarlo");
    await aviso.getByRole("link", { name: "Revisar" }).click();
    await expect(page).toHaveURL(new RegExp(`/diligencia\\?aviso=[0-9a-f-]+#punto-${ids[0]}$`));

    const arriba = await franjaALaVista(page, "Validar");
    await expect(page.locator(`#punto-${ids[0]}.destino-aviso`)).toBeVisible();
    await arriba.getByRole("button", { name: "Validar", exact: true }).click();
    await expect(page.getByRole("region", { name: "Hecho" })).toContainText("Siguiente: entregar el siguiente punto · lo hace ella");

    // El otro: pedir cambios, diciendo cuáles
    await page.goto("/cartera");
    await page.locator('li[data-aviso="documento_entregado"]').filter({ hasText: otro }).getByRole("link", { name: "Revisar" }).click();
    const franja = await franjaALaVista(page, "Validar");
    await franja.getByRole("button", { name: "Pedir cambios" }).click();
    await franja.getByLabel("Qué tiene que cambiar").fill("Falta la página de firmas.");
    await franja.getByRole("button", { name: "Pedir cambios" }).click();
    await expect(page.getByRole("region", { name: "Hecho" })).toBeVisible();

    const estados = await consultar<{ title: string; status: string; notes: string | null }>(
      "dd_items",
      { id: `in.(${ids.join(",")})`, order: "title" },
      "title,status,notes",
    );
    expect(estados).toEqual([
      { title: titulo, status: "validado", notes: null },
      { title: otro, status: "pendiente", notes: "Falta la página de firmas." },
    ]);
    await page.goto("/cartera");
    await expect(page.locator('li[data-aviso="documento_entregado"]').filter({ hasText: SELLO })).toHaveCount(0);
  } finally {
    for (const id of ids) await borrar("dd_items", { id });
  }
});

test("los correos sin enviar son un solo aviso; al reintentarlos y salir todos, se va", async ({ page }) => {
  const destinatarios = [1, 2].map((n) => `e2e.correos.${n}.${SELLO}@ejemplo.test`);
  const ids: string[] = [];
  for (const d of destinatarios) {
    const f = await insertar<{ id: string }>("correos", {
      evento: "recordatorio",
      destinatario: d,
      asunto: "Prueba de reintento",
      datos: { nombre: "Prueba", paso: "decir su situación", enlace: "http://localhost:3100/entrar" },
      estado: "sin_enviar",
      error: "Sin proveedor",
      intentos: 1,
    });
    ids.push(f.id);
  }
  let avisoId = "";
  try {
    const abiertos = await consultar<{ id: string }>("avisos", { tipo: "eq.correos_sin_enviar", cerrado_at: "is.null" }, "id");
    expect(abiertos).toHaveLength(1);
    avisoId = abiertos[0].id;

    await entrarComo(page, USUARIOS.admin, "/cartera");
    const aviso = page.locator('li[data-aviso="correos_sin_enviar"]');
    await expect(aviso).toHaveCount(1);
    await expect(aviso).toContainText(/\d+ correos sin enviar desde el/);
    await aviso.getByRole("link", { name: "Reintentar" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/correos\\?aviso=${avisoId}#correos$`));

    const franja = page.getByRole("region", { name: "Has venido a" });
    await expect(franja).toBeInViewport();
    const boton = franja.getByRole("button", { name: /^Reintentar los \d+$/ });
    await expect(boton).toBeInViewport();
    await expect(page.locator("#correos").getByText(destinatarios[0], { exact: false })).toBeVisible();
    await boton.click();

    // En local salen por Mailpit: no queda ninguno y el aviso se cierra solo
    await expect(page.getByRole("region", { name: "Hecho" })).toBeVisible({ timeout: 15_000 });
    const [cerrado] = await consultar<{ cerrado_at: string | null }>("avisos", { id: `eq.${avisoId}` }, "cerrado_at");
    expect(cerrado.cerrado_at).not.toBeNull();
  } finally {
    for (const id of ids) await borrar("correos", { id });
    if (avisoId) await borrar("avisos", { id: avisoId });
  }
});
