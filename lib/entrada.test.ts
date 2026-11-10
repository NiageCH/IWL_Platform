import { describe, expect, it } from "vitest";
import { baseSugerida, mensajeNoIncorporada, pasoEntrada, siguientePasoEntrada } from "./entrada";

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

describe("el paso de una compañía en entrada", () => {
  const base = {
    via: "aceleracion" as const,
    situacionDicha: true,
    situacionConfirmada: true,
    obligatoriosHechos: 3,
    obligatorios: 10,
    decision: null,
    anexo: null,
  };

  it("va por orden: situación, confirmación, due diligence, decisión", () => {
    expect(pasoEntrada({ ...base, situacionDicha: false })).toEqual({ texto: "Falta que diga su situación societaria", quien: "ella" });
    expect(pasoEntrada({ ...base, situacionConfirmada: false }).quien).toBe("iwl");
    expect(pasoEntrada(base)).toEqual({ texto: "Due diligence: 3 de 10 obligatorios", quien: "ella" });
    expect(pasoEntrada({ ...base, obligatoriosHechos: 10 })).toEqual({ texto: "Decidir la incorporación", quien: "direccion" });
  });

  it("en Construcción no espera al due diligence", () => {
    expect(pasoEntrada({ ...base, via: "construccion" })).toEqual({ texto: "Decidir la incorporación", quien: "direccion" });
  });

  it("después de decidir, el Acuerdo: proponer, esperar su aceptación y firmar", () => {
    const si = { ...base, decision: "si" as const };
    expect(pasoEntrada(si).texto).toBe("Proponerle el Acuerdo");
    expect(pasoEntrada({ ...si, anexo: "borrador" }).quien).toBe("iwl");
    expect(pasoEntrada({ ...si, anexo: "comentado" }).quien).toBe("ella");
    expect(pasoEntrada({ ...si, anexo: "aceptado" }).texto).toBe("Firmar el Acuerdo");
  });
});
