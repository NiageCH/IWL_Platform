import { describe, expect, it } from "vitest";
import { normalizarEnlace } from "./enlaces";

describe("un enlace pegado", () => {
  it("sin esquema, se le pone https", () => {
    expect(normalizarEnlace("meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
    expect(normalizarEnlace("  zoom.us/j/123456789?pwd=abc  ")).toBe("https://zoom.us/j/123456789?pwd=abc");
    expect(normalizarEnlace("siren.es")).toBe("https://siren.es");
  });

  it("con esquema, se queda como está", () => {
    expect(normalizarEnlace("https://teams.microsoft.com/l/meetup-join/19%3ameeting_x")).toBe(
      "https://teams.microsoft.com/l/meetup-join/19%3ameeting_x",
    );
    expect(normalizarEnlace("http://ejemplo.es/acta")).toBe("http://ejemplo.es/acta");
  });

  it("de una invitación entera, la primera dirección", () => {
    const invitacion = `Reunión con IWL
Unirse con Google Meet: meet.google.com/abc-defg-hij
O marca: (ES) +34 900 000 000 PIN: 123`;
    expect(normalizarEnlace(invitacion)).toBe("https://meet.google.com/abc-defg-hij");
    expect(normalizarEnlace("Entra aquí: https://zoom.us/j/987. Gracias")).toBe("https://zoom.us/j/987");
  });

  it("vacío es quitarlo; lo que no es un enlace, no vale", () => {
    expect(normalizarEnlace("")).toBe("");
    expect(normalizarEnlace(null)).toBe("");
    expect(normalizarEnlace("mañana a las diez")).toBeNull();
    expect(normalizarEnlace("meet")).toBeNull();
    expect(normalizarEnlace("javascript:alert(1)")).toBeNull();
    expect(normalizarEnlace("ftp://ejemplo.es/x")).toBeNull();
  });
});
