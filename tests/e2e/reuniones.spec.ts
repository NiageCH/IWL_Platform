import { expect, test, type Page } from "@playwright/test";
import { USUARIOS, borrar, consultar, correosRecibidos, entrarComo, insertar } from "./entrada";
import { describirFranja, franjaDesdeFormulario } from "../../lib/reuniones";

/**
 * La reunión se acuerda en la plataforma, de punta a punta, con una
 * candidatura recién creada y sin cuenta: responde desde su enlace.
 *
 * Las fechas se calculan desde hoy: una prueba con fechas fijas deja de
 * comprobar nada el día que pasan.
 */

const COHORTE = "00000000-0000-0000-0003-000000000001";

/** Un día dentro de `dias`, a esa hora de Madrid, como lo escribe el formulario */
function local(dias: number, hora: string): string {
  const d = new Date(Date.now() + dias * 86_400_000);
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
  return `${dia}T${hora}`;
}
const dice = (l: string, min = 45) => describirFranja(franjaDesdeFormulario(l, min)!);

async function nueva(sello: string) {
  return insertar<{ id: string; token: string }>("candidaturas", {
    cohort_id: COHORTE,
    nombre: `Reunión Prueba ${sello}`,
    contacto_nombre: "Agustina",
    contacto_apellidos: "Prueba",
    contacto_email: `e2e.reunion.${sello}@ejemplo.test`,
    estado: "reunion",
  });
}

async function proponer(page: Page, fechas: [string, string]) {
  await page.getByText("Proponer reunión", { exact: true }).click();
  const form = page.locator("form", { has: page.getByRole("button", { name: "Proponer las fechas" }) });
  await form.getByLabel("Fecha 1").fill(fechas[0]);
  await form.getByLabel("Fecha 2").fill(fechas[1]);
  await form.getByRole("checkbox").first().check();
  await form.getByLabel("Enlace de la videollamada").fill("https://meet.ejemplo.test/iwl");
  await form.getByLabel("Nota para ella").fill("Media hora para conocernos y otra para el producto.");
  await form.getByRole("button", { name: "Proponer las fechas" }).click();
  // El acuse es la reunión en la lista, y el correo, en «Correos»
  await expect(page.getByText(/Esperando a que elija/)).toBeVisible();
  const correos = page.locator("section").filter({ has: page.getByRole("heading", { name: "Correos", exact: true }) });
  await expect(correos.locator("li").filter({ hasText: "Reunión propuesta" }).getByText("Enviado", { exact: true })).toBeVisible();
}

test("ella propone otras fechas, IWL acepta una, y se anota", async ({ page, browser }) => {
  const sello = `${Date.now()}`;
  const c = await nueva(sello);
  const correo = `e2e.reunion.${sello}@ejemplo.test`;
  const nuestras: [string, string] = [local(20, "10:00"), local(21, "16:30")];
  const suyas: [string, string] = [local(22, "11:00"), local(23, "12:00")];

  try {
    // Ella abre su enlace, sin sesión, y IWL lo ve
    const ajena = await browser.newContext();
    const suya = await ajena.newPage();
    await suya.goto(`/candidatura/${c.token}`);
    await entrarComo(page, USUARIOS.equipoIwl, `/embudo/${c.id}`);
    await expect(page.getByText(/Abrió su enlace el/)).toBeVisible();

    await proponer(page, nuestras);
    const [aviso] = await correosRecibidos(correo);
    expect(aviso.asunto).toMatch(/Te proponemos fecha para reunirnos/);
    expect(aviso.texto).toContain(`/candidatura/${c.token}`);
    // Con las fechas y el enlace de la videollamada, que se puede pulsar
    expect(aviso.texto).toContain(`· ${dice(nuestras[0])}`);
    expect(aviso.texto).toContain("Enlace de la videollamada:");
    // En su línea: Mailpit deja espacios al final de cada una
    expect(aviso.texto.split("\n").map((l) => l.trim())).toContain("https://meet.ejemplo.test/iwl");
    expect(aviso.html).toContain('<a href="https://meet.ejemplo.test/iwl"');

    // En su página, arriba: las franjas, y «Ninguna me va»
    await suya.reload();
    const tarjeta = suya.getByRole("region", { name: "Reunión" });
    await expect(tarjeta.getByRole("heading", { name: "Te proponemos reunirnos" })).toBeVisible();
    await expect(tarjeta.getByText(new RegExp(dice(nuestras[0]), "i"))).toBeVisible();
    await tarjeta.getByText("Ninguna me va").click();
    await tarjeta.getByLabel("Fecha 1").fill(suyas[0]);
    await tarjeta.getByLabel("Fecha 2").fill(suyas[1]);
    await tarjeta.getByLabel("Nota").fill("Por la mañana nos va mejor.");
    await tarjeta.getByRole("button", { name: "Proponer estas fechas" }).click();
    await expect(tarjeta.getByRole("heading", { name: "Has propuesto otras fechas" })).toBeVisible();

    // A quien va de IWL le llega un correo con sus fechas
    const [reunion] = await consultar<{ personas_iwl: string[] }>(
      "candidatura_reuniones",
      { candidatura_id: `eq.${c.id}` },
      "personas_iwl",
    );
    const [deIwl] = await consultar<{ email: string }>("profiles", { id: `eq.${reunion.personas_iwl[0]}` }, "email");
    const otras = (await correosRecibidos(deIwl.email, { esperar: 1 })).find((m) => m.asunto.includes(`Reunión Prueba ${sello}`));
    expect(otras?.asunto).toBe(`Agustina Prueba propone otras fechas · Reunión Prueba ${sello}`);
    expect(otras?.texto).toContain(`· ${dice(suyas[0])}`);
    expect(otras?.texto).toContain(`/embudo/${c.id}`);

    // IWL: el aviso, y acepta una de las suyas
    await entrarComo(page, USUARIOS.admin, "/cartera");
    const avisoIwl = page.locator("li").filter({ hasText: "Agustina Prueba propone otras fechas para la reunión" });
    await expect(avisoIwl).toBeVisible();
    await avisoIwl.getByRole("link", { name: "Ver la reunión" }).click();
    const bloque = page.locator("section").filter({ has: page.getByRole("heading", { name: "Reuniones", exact: true }) });
    await expect(bloque.getByText("Contrapropuesta")).toBeVisible();
    await expect(bloque.getByText("Su nota: Por la mañana nos va mejor.")).toBeVisible();
    await bloque.getByRole("button", { name: "Aceptar esta" }).first().click();
    await expect(bloque.getByText("Confirmada", { exact: true })).toBeVisible();

    // Ella: confirmada, con cuándo, cómo y el calendario
    await suya.reload();
    await expect(tarjeta.getByRole("heading", { name: "Reunión confirmada" })).toBeVisible();
    await expect(tarjeta.getByText(new RegExp(dice(suyas[0]), "i"))).toBeVisible();
    await expect(tarjeta.getByRole("link", { name: "https://meet.ejemplo.test/iwl" })).toBeVisible();
    const calendario = tarjeta.getByRole("link", { name: "Añadir a mi calendario" });
    await expect(calendario).toHaveAttribute("href", /^data:text\/calendar/);
    expect(decodeURIComponent((await calendario.getAttribute("href"))!)).toContain("DTSTART:");
    const confirmacion = (await correosRecibidos(correo, { esperar: 2 })).find((m) => /Reunión confirmada/.test(m.asunto));
    expect(confirmacion?.texto).toContain("por videollamada");
    // El botón para unirse, el enlace escrito y la invitación de calendario adjunta
    expect(confirmacion?.html).toMatch(/<a href="https:\/\/meet\.ejemplo\.test\/iwl"[^>]*>Unirse a la videollamada<\/a>/);
    expect(confirmacion?.texto).toContain("Unirse a la videollamada: https://meet.ejemplo.test/iwl");
    expect(confirmacion?.adjuntos).toEqual(["reunion-iwl.ics"]);
    await ajena.close();

    // Y se anota cómo quedó
    await bloque.getByText("Anotar esta reunión").click();
    const anotar = page.locator("form", { has: page.locator('input[name="reunion_id"][value]:not([value=""])') }).filter({
      has: page.getByRole("button", { name: "Guardar la reunión" }),
    });
    await anotar.getByLabel("Fue el").fill(suyas[0].slice(0, 10));
    await anotar.getByLabel("Cómo quedó").selectOption("seguir");
    await anotar.getByLabel("De IWL").fill("Programa IWL");
    await anotar.getByLabel("Qué se habló").fill("Producto claro, falta validar precio con clínicas.");
    await anotar.getByRole("button", { name: "Guardar la reunión" }).click();
    await expect(page.getByText(/Celebrada el/)).toBeVisible();

    const eventos = await consultar<{ titulo: string }>(
      "candidatura_eventos",
      { candidatura_id: `eq.${c.id}`, tipo: "eq.reunion" },
      "titulo",
    );
    expect(eventos.map((e) => e.titulo).sort()).toEqual([
      "Ella propone otras fechas para la reunión",
      "Reunión confirmada: IWL acepta una de sus fechas",
      "Reunión propuesta",
      "Reunión · Seguir",
    ]);
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});

test("ella elige una franja y queda confirmada; IWL la cancela con motivo", async ({ page, browser }) => {
  const sello = `${Date.now()}b`;
  const c = await nueva(sello);
  const correo = `e2e.reunion.${sello}@ejemplo.test`;
  const nuestras: [string, string] = [local(25, "09:30"), local(26, "17:00")];

  try {
    await entrarComo(page, USUARIOS.equipoIwl, `/embudo/${c.id}`);
    await proponer(page, nuestras);

    const ajena = await browser.newContext();
    const suya = await ajena.newPage();
    await suya.goto(`/candidatura/${c.token}`);
    const tarjeta = suya.getByRole("region", { name: "Reunión" });
    const fila = tarjeta.locator("li").filter({ hasText: new RegExp(dice(nuestras[1]), "i") });
    await fila.getByRole("button", { name: "Elegir esta" }).click();
    await expect(tarjeta.getByRole("heading", { name: "Reunión confirmada" })).toBeVisible();

    // A quien va de IWL le llega lo mismo que a ella, con su invitación
    const [reunion] = await consultar<{ personas_iwl: string[] }>(
      "candidatura_reuniones",
      { candidatura_id: `eq.${c.id}` },
      "personas_iwl",
    );
    const [deIwl] = await consultar<{ email: string }>("profiles", { id: `eq.${reunion.personas_iwl[0]}` }, "email");
    const suyaIwl = (await correosRecibidos(deIwl.email, { esperar: 1 })).find(
      (m) => /Reunión confirmada/.test(m.asunto) && m.asunto.includes(`Reunión Prueba ${sello}`),
    );
    expect(suyaIwl?.texto).toContain("Unirse a la videollamada: https://meet.ejemplo.test/iwl");
    expect(suyaIwl?.texto).toContain(`/embudo/${c.id}`);
    expect(suyaIwl?.adjuntos).toEqual(["reunion-iwl.ics"]);

    // IWL la ve confirmada. Cambiarla pide el motivo, y el motivo le llega
    await page.reload();
    const bloque = page.locator("section").filter({ has: page.getByRole("heading", { name: "Reuniones", exact: true }) });
    await expect(bloque.getByText("Confirmada", { exact: true })).toBeVisible();
    await bloque.getByText("Cambiar la reunión", { exact: true }).first().click();
    const cambio = page.locator("form", { has: page.getByRole("button", { name: "Cambiar la reunión" }) });
    const nuevas: [string, string] = [local(27, "10:00"), local(28, "12:30")];
    await cambio.getByLabel("Fecha 1").fill(nuevas[0]);
    await cambio.getByLabel("Fecha 2").fill(nuevas[1]);
    await cambio.getByRole("checkbox").first().check();
    await cambio.getByLabel("Enlace de la videollamada").fill("https://meet.ejemplo.test/iwl");
    // Sin motivo no sale: el navegador no deja enviarlo vacío
    await expect(cambio.getByLabel(/Por qué se cambia/)).toHaveAttribute("required", "");
    await cambio.getByLabel(/Por qué se cambia/).fill("Se nos ha juntado con el comité.");
    await cambio.getByRole("button", { name: "Cambiar la reunión" }).click();
    await expect(bloque.getByText(/Esperando a que elija/)).toBeVisible();
    const cambiada = (await correosRecibidos(correo, { esperar: 3 })).find((m) => /Hemos cambiado la reunión/.test(m.asunto));
    expect(cambiada?.texto).toContain("El motivo: Se nos ha juntado con el comité.");

    // Ella elige otra vez, y IWL la cancela
    await suya.reload();
    await tarjeta.locator("li").filter({ hasText: new RegExp(dice(nuevas[0]), "i") }).getByRole("button", { name: "Elegir esta" }).click();
    await expect(tarjeta.getByRole("heading", { name: "Reunión confirmada" })).toBeVisible();
    await page.reload();
    await expect(bloque.getByText("Confirmada", { exact: true })).toBeVisible();
    await bloque.getByText("Cancelar la reunión", { exact: true }).first().click();
    await bloque.getByLabel("Motivo").fill("La persona de IWL que iba no puede ese día.");
    await bloque.getByRole("button", { name: "Cancelar la reunión" }).click();
    await expect(bloque.getByText("Cancelada", { exact: true })).toBeVisible();

    await suya.reload();
    await expect(tarjeta.getByRole("heading", { name: "Reunión cancelada" })).toBeVisible();
    await expect(tarjeta.getByText(/La persona de IWL que iba no puede ese día\./)).toBeVisible();
    const cancelada = (await correosRecibidos(correo, { esperar: 5 })).find((m) => /Reunión cancelada/.test(m.asunto));
    expect(cancelada?.texto).toContain("La persona de IWL que iba no puede ese día.");
    await ajena.close();
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});

test("el enlace de Meet se pega como se copia, sin https, y se guarda completo", async ({ page }) => {
  const sello = `${Date.now()}`;
  const c = await nueva(sello);
  try {
    await entrarComo(page, USUARIOS.equipoIwl, `/embudo/${c.id}`);
    await page.getByText("Proponer reunión", { exact: true }).click();
    const form = page.locator("form", { has: page.getByRole("button", { name: "Proponer las fechas" }) });
    await form.getByLabel("Fecha 1").fill(local(20, "10:00"));
    await form.getByLabel("Fecha 2").fill(local(21, "16:30"));
    await form.getByRole("checkbox").first().check();

    // Lo que no es un enlace se dice, con el mensaje de la REVISION
    await form.getByLabel("Enlace de la videollamada").fill("mañana a las diez");
    await form.getByRole("button", { name: "Proponer las fechas" }).click();
    await expect(
      page.getByText("No reconozco ese enlace. Pégalo tal como lo copias de Meet, Zoom o Teams.").first(),
    ).toBeVisible();

    // Como se copia de Meet: el navegador ya no lo rechaza
    await form.getByLabel("Enlace de la videollamada").fill("meet.google.com/abc-defg-hij");
    await form.getByRole("button", { name: "Proponer las fechas" }).click();
    await expect(page.getByText(/Esperando a que elija/)).toBeVisible();

    const [reunion] = await consultar<{ enlace: string }>(
      "candidatura_reuniones",
      { candidatura_id: `eq.${c.id}` },
      "enlace",
    );
    expect(reunion.enlace).toBe("https://meet.google.com/abc-defg-hij");
  } finally {
    await borrar("candidaturas", { id: c.id });
  }
});
