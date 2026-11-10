import { describe, expect, it } from "vitest";
import {
  describirFranja,
  franjaDesdeFormulario,
  leerAsistentes,
  caducada,
  franjasVigentes,
  ics,
} from "./reuniones";

describe("las franjas de una reunión", () => {
  it("lo escrito en el formulario es hora de Madrid, también en verano", () => {
    // Noviembre: Madrid va una hora por delante de UTC
    expect(franjaDesdeFormulario("2026-11-12T10:00", 45)).toEqual({
      inicio: "2026-11-12T09:00:00.000Z",
      fin: "2026-11-12T09:45:00.000Z",
    });
    // Julio: dos
    expect(franjaDesdeFormulario("2026-07-14T10:00", 30)?.inicio).toBe("2026-07-14T08:00:00.000Z");
  });

  it("lo que no es una fecha no es una franja", () => {
    expect(franjaDesdeFormulario("", 45)).toBeNull();
    expect(franjaDesdeFormulario("mañana", 45)).toBeNull();
  });

  it("se cuenta en hora de Madrid, con el día de la semana", () => {
    const f = franjaDesdeFormulario("2026-11-12T10:00", 45)!;
    expect(describirFranja(f)).toBe("jueves, 12 de noviembre, de 10:00 a 10:45");
  });
});

describe("en qué punto está", () => {
  const AHORA = new Date("2026-11-11T10:00:00Z");
  const pasada = { inicio: "2026-11-10T10:00:00Z", fin: "2026-11-10T10:45:00Z" };
  const futura = { inicio: "2026-11-12T10:00:00Z", fin: "2026-11-12T10:45:00Z" };

  it("una franja empezada ya no se puede elegir", () => {
    expect(franjasVigentes([pasada, futura], AHORA)).toEqual([futura]);
  });

  it("caduca cuando han pasado todas sin elegir, no antes, y una confirmada no caduca", () => {
    expect(caducada("propuesta", [pasada], AHORA)).toBe(true);
    expect(caducada("contrapropuesta", [pasada], AHORA)).toBe(true);
    expect(caducada("propuesta", [pasada, futura], AHORA)).toBe(false);
    expect(caducada("confirmada", [pasada], AHORA)).toBe(false);
  });
});

describe("el fichero de calendario", () => {
  const f = { inicio: "2026-11-12T09:00:00.000Z", fin: "2026-11-12T09:45:00.000Z" };
  const c = ics({
    uid: "r1",
    franja: f,
    titulo: "Siren · Inception Woman Lab",
    descripcion: "Videollamada, con Ana; y Luis",
    lugar: "https://meet.ejemplo.test/abc",
    ahora: new Date("2026-11-11T10:00:00Z"),
  });

  it("en UTC, con su inicio y su fin, y las líneas separadas por CRLF", () => {
    expect(c).toContain("DTSTART:20261112T090000Z\r\n");
    expect(c).toContain("DTEND:20261112T094500Z\r\n");
    expect(c.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0")).toBe(true);
    expect(c.endsWith("END:VCALENDAR")).toBe(true);
  });

  it("escapa comas y puntos y comas", () => {
    expect(c).toContain("DESCRIPTION:Videollamada\\, con Ana\\; y Luis");
  });

  it("dobla las líneas largas", () => {
    const largo = ics({ uid: "r2", franja: f, titulo: "x".repeat(200) });
    for (const linea of largo.split("\r\n")) expect(new TextEncoder().encode(linea).length).toBeLessThanOrEqual(75);
  });
});

describe("los asistentes", () => {
  it("una persona por línea, cada una con su lado", () => {
    expect(leerAsistentes("Rodrigo\n\n Luciana ", "Agustina")).toEqual([
      { nombre: "Rodrigo", de: "iwl" },
      { nombre: "Luciana", de: "iwl" },
      { nombre: "Agustina", de: "candidatura" },
    ]);
  });
});
