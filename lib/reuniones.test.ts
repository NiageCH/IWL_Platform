import { describe, expect, it } from "vitest";
import {
  describirFranja,
  franjaDesdeFormulario,
  leerAsistentes,
  textoPropuestaReunion,
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

describe("el correo de la propuesta", () => {
  it("le habla por su nombre y numera las franjas", () => {
    const franjas = [
      franjaDesdeFormulario("2026-11-12T10:00", 45)!,
      franjaDesdeFormulario("2026-11-13T16:30", 45)!,
    ];
    const { asunto, cuerpo } = textoPropuestaReunion("Agustina Gómez", "Siren", franjas);
    expect(asunto).toContain("Siren");
    expect(cuerpo).toMatch(/^Hola, Agustina:/);
    expect(cuerpo).toContain("1. jueves, 12 de noviembre, de 10:00 a 10:45");
    expect(cuerpo).toContain("2. viernes, 13 de noviembre, de 16:30 a 17:15");
    expect(cuerpo).toContain("en hora de Madrid");
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
