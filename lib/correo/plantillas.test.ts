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
