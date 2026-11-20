import { describe, expect, it } from "vitest";
import { EVENTOS, NOMBRE_EVENTO, escribirCorreo } from "./plantillas";
import { partirRemitente } from "./proveedores";

describe("las plantillas", () => {
  it("cada evento tiene asunto, texto plano y HTML, y un nombre para la ficha", () => {
    for (const e of EVENTOS) {
      const c = escribirCorreo(e, { nombre: "Ana Prueba", startup: "Startup", enlace: "https://x.test/a", cuantos: 2 });
      expect(c.asunto.length).toBeGreaterThan(5);
      expect(c.texto).toMatch(/Equipo de Inception Woman Lab$/);
      expect(c.html).toMatch(/^<!doctype html>/);
      expect(NOMBRE_EVENTO[e]).toBeTruthy();
    }
  });

  it("saluda por el nombre de pila, y el botón va también en el texto plano", () => {
    const c = escribirCorreo("enlace_candidatura", { nombre: "Ana Prueba", startup: "Siren", enlace: "https://x.test/c/1" });
    expect(c.texto).toMatch(/^Hola, Ana:/);
    expect(c.texto).toContain("Ver mi candidatura: https://x.test/c/1");
    expect(c.html).toContain('href="https://x.test/c/1"');
  });

  it("lo que escribe alguien no se cuela como HTML", () => {
    const c = escribirCorreo("respuesta_comentario", { nombre: "Ana", sobre: "el NDA", respuesta: "<script>x</script>", enlace: "e" });
    expect(c.html).not.toContain("<script>");
    expect(c.html).toContain("&lt;script&gt;");
  });

  it("el NDA lleva un enlace para elegir contraseña, nunca una contraseña", () => {
    const c = escribirCorreo("nda_enviado", { nombre: "Ana", startup: "Siren", correo: "ana@x.test", enlace: "https://x.test/r" });
    expect(c.texto).toContain("Entrar y elegir mi contraseña: https://x.test/r");
    expect(c.texto).not.toMatch(/Contraseña:/);
  });

  it("darle cuenta sin el NDA también lleva el enlace, nunca la contraseña", () => {
    const c = escribirCorreo("acceso_dado", { nombre: "Ana Prueba", startup: "Siren", correo: "ana@x.test", enlace: "https://x.test/r" });
    expect(c.asunto).toBe("Tu cuenta en la plataforma de IWL · Siren");
    expect(c.texto).toContain("Hola, Ana:");
    expect(c.texto).toContain("Tu usuario es ana@x.test");
    expect(c.texto).toContain("Entrar y elegir mi contraseña: https://x.test/r");
    expect(c.texto).not.toMatch(/Contraseña:/);
  });

  it("el descarte va tal cual lo escribió IWL, sin botón", () => {
    const c = escribirCorreo("descarte", { startup: "Siren", mensaje: "Hola, Ana:\n\nEsta vez no.\n\nUn saludo" });
    expect(c.asunto).toBe("Siren · Inception Woman Lab");
    expect(c.texto.startsWith("Hola, Ana:\n\nEsta vez no.")).toBe(true);
    expect(c.html).not.toContain("<a href");
  });

  it("el resumen cuenta bien uno y varios", () => {
    expect(escribirCorreo("resumen_avisos", { cuantos: 1, lista: "· a", enlace: "e" }).asunto).toBe("1 aviso abierto en la plataforma");
    expect(escribirCorreo("resumen_avisos", { cuantos: 3, lista: "· a", enlace: "e" }).asunto).toBe("3 avisos abiertos en la plataforma");
  });

  it("lo calculado va aparte, y solo, si no hay avisos abiertos (REVISION, 21 nov)", () => {
    const solo = escribirCorreo("resumen_avisos", { cuantos: 0, nuevos: 2, lista_nuevos: "· x\n· y", enlace: "e" });
    expect(solo.asunto).toBe("2 cosas nuevas que te tocan en la plataforma");
    expect(solo.texto).toContain("Desde ayer:");
    expect(solo.texto).not.toContain("avisos abiertos");
    const los2 = escribirCorreo("resumen_avisos", { cuantos: 1, lista: "· a", nuevos: 1, lista_nuevos: "· x", enlace: "e" });
    expect(los2.asunto).toBe("1 aviso abierto en la plataforma");
    expect(los2.texto).toContain("Y desde ayer:");
  });
});

describe("los correos de reunión (REVISION, 13 nov)", () => {
  const MEET = "https://meet.google.com/abc-defg-hij";
  const PLATAFORMA = "https://plataforma.test/candidatura/xyz";
  const base = {
    nombre: "Ana Prueba",
    startup: "Siren",
    enlace: PLATAFORMA,
    reunion_id: "r1",
    franjas: "lunes, 17 de noviembre, de 10:00 a 10:45\nmartes, 18 de noviembre, de 16:30 a 17:15",
    formato: "videollamada",
    enlace_reunion: MEET,
    personas_iwl: "Laura Gómez, Marta Ruiz",
  };
  const conFecha = {
    ...base,
    cuando: "lunes, 17 de noviembre, de 10:00 a 10:45",
    inicio: "2026-11-17T09:00:00.000Z",
    fin: "2026-11-17T09:45:00.000Z",
  };

  /** El enlace, como `<a href>` en el HTML y entero, en su línea, en el texto */
  function enlaceEnLosDos(c: { html: string; texto: string }, url: string) {
    expect(c.html).toContain(`<a href="${url.replace(/&/g, "&amp;")}"`);
    expect(c.texto.split("\n")).toContain(url);
  }

  it("la propuesta lleva las fechas, una por línea, el enlace, quién va y «Elegir fecha»", () => {
    const c = escribirCorreo("reunion_propuesta", base);
    expect(c.texto).toContain("· lunes, 17 de noviembre, de 10:00 a 10:45\n· martes, 18 de noviembre, de 16:30 a 17:15");
    expect(c.texto).toContain("Enlace de la videollamada:");
    enlaceEnLosDos(c, MEET);
    expect(c.texto).toContain("De IWL estaremos: Laura Gómez, Marta Ruiz.");
    expect(c.texto).toContain(`Elegir fecha: ${PLATAFORMA}`);
    expect(c.html).toContain(`href="${PLATAFORMA}"`);
    expect(c.adjuntos).toBeUndefined();
  });

  it("en persona, la dirección enlaza a Google Maps", () => {
    const c = escribirCorreo("reunion_propuesta", { ...base, formato: "presencial", enlace_reunion: null, direccion: "Calle Larios 1, Málaga" });
    const mapa = "https://www.google.com/maps/search/?api=1&query=Calle%20Larios%201%2C%20M%C3%A1laga";
    enlaceEnLosDos(c, mapa);
    expect(c.texto).not.toContain("videollamada");
  });

  it("la confirmada: «Unirse a la videollamada», el enlace escrito debajo y el .ics con el enlace dentro", () => {
    const c = escribirCorreo("reunion_confirmada", conFecha);
    expect(c.html).toMatch(/<a href="https:\/\/meet\.google\.com\/abc-defg-hij"[^>]*>Unirse a la videollamada<\/a>/);
    expect(c.texto).toContain(`Unirse a la videollamada: ${MEET}`);
    // Escrito también después del botón, por si el botón no se ve
    expect(c.html.indexOf("Unirse a la videollamada")).toBeLessThan(c.html.lastIndexOf(`>${MEET}</a>`));
    enlaceEnLosDos(c, PLATAFORMA);

    expect(c.adjuntos).toHaveLength(1);
    const [adjunto] = c.adjuntos!;
    expect(adjunto).toMatchObject({ nombre: "reunion-iwl.ics", tipo: "text/calendar" });
    const ics = new TextDecoder().decode(Uint8Array.from(atob(adjunto.contenido), (x) => x.charCodeAt(0)));
    expect(ics).toContain("DTSTART:20261117T090000Z");
    // La línea se dobla a 75 octetos: se compara sin los dobleces
    const desplegado = ics.replace(/\r\n /g, "");
    expect(desplegado).toContain(`LOCATION:${MEET}`);
    expect(desplegado).toContain(`DESCRIPTION:Enlace de la videollamada: ${MEET}`);
  });

  it("confirmada en persona: «Cómo llegar»", () => {
    const c = escribirCorreo("reunion_confirmada", { ...conFecha, formato: "presencial", enlace_reunion: null, direccion: "Calle Larios 1" });
    expect(c.html).toMatch(/>Cómo llegar<\/a>/);
    expect(c.texto).toContain("Cómo llegar: https://www.google.com/maps/search/?api=1&query=Calle%20Larios%201");
  });

  it("la cambiada: las fechas nuevas, el motivo y el enlace, sin invitación hasta que elija", () => {
    const c = escribirCorreo("reunion_cambiada", { ...base, motivo: "Coincide con el comité." });
    expect(c.texto).toContain("El motivo: Coincide con el comité.");
    expect(c.texto).toContain("· martes, 18 de noviembre");
    enlaceEnLosDos(c, MEET);
    expect(c.adjuntos).toBeUndefined();
  });

  it("a IWL, cuando ella propone otras: sus fechas, su nota y el enlace a la ficha", () => {
    const c = escribirCorreo("reunion_contrapropuesta", {
      ...base,
      nombre: "Laura Gómez",
      contacto: "Ana Prueba",
      nota: "Por la mañana nos va mejor.",
      enlace: "https://plataforma.test/embudo/c1",
    });
    expect(c.asunto).toBe("Ana Prueba propone otras fechas · Siren");
    expect(c.texto).toMatch(/^Hola, Laura:/);
    expect(c.texto).toContain("Su nota: Por la mañana nos va mejor.");
    expect(c.texto).toContain("Elegir una: https://plataforma.test/embudo/c1");
  });

  it("un enlace con & no se rompe en el HTML", () => {
    const zoom = "https://zoom.us/j/123?pwd=a&b=c";
    const c = escribirCorreo("reunion_propuesta", { ...base, enlace_reunion: zoom });
    expect(c.html).toContain('href="https://zoom.us/j/123?pwd=a&amp;b=c"');
    expect(c.texto.split("\n")).toContain(zoom);
  });
});

describe("el remitente", () => {
  it("«Nombre <correo>» en sus dos partes", () => {
    expect(partirRemitente("Inception Woman Lab <plataforma@inceptionwlab.es>")).toEqual({
      nombre: "Inception Woman Lab",
      correo: "plataforma@inceptionwlab.es",
    });
    expect(partirRemitente("a@b.es")).toEqual({ nombre: null, correo: "a@b.es" });
  });
});
