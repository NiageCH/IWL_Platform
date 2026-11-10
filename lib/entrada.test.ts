import { describe, expect, it } from "vitest";
import { baseSugerida, mensajeNoIncorporada, siguientePasoEntrada } from "./entrada";

describe("la compañía en entrada", () => {
  it("la base sugerida sale de la vía; sin vía, estratégica", () => {
    expect(baseSugerida("aceleracion")).toBe("due_diligence");
    expect(baseSugerida("construccion")).toBe("estrategica");
    expect(baseSugerida(null)).toBe("estrategica");
  });

  it("el siguiente paso dice qué hacer en cada vía", () => {
    expect(siguientePasoEntrada("aceleracion")).toMatch(/due diligence/);
    expect(siguientePasoEntrada("construccion")).toMatch(/no tienes que entregar nada/);
  });

  it("el mensaje de no incorporarla le habla por su nombre y deja hueco para el motivo", () => {
    const m = mensajeNoIncorporada("Lucía Pérez", "Siren");
    expect(m).toMatch(/^Hola, Lucía:/);
    expect(m).toMatch(/con Siren/);
    expect(m).toMatch(/\[El motivo/);
    expect(m).not.toMatch(/!/);
  });
});
