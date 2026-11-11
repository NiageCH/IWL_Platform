import { describe, expect, it } from "vitest";
import {
  baseSugerida,
  estadoEquity,
  estadoTope,
  fueraDeHorquilla,
  horquillaDe,
  mensajeNoIncorporada,
  pasoEntrada,
  siguientePasoEntrada,
  textoHorquilla,
} from "./entrada";

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

describe("Construcción: no se trabaja sin Acuerdo", () => {
  it("la horquilla vacía no se comprueba; fuera de ella, sí", () => {
    expect(horquillaDe({}, "construccion")).toBeNull();
    const h = horquillaDe({ construccion: { min: 8, max: 12 } }, "construccion");
    expect(h).toEqual({ min: 8, max: 12 });
    expect(fueraDeHorquilla(10, h)).toBe(false);
    expect(fueraDeHorquilla(5, h)).toBe(true);
    expect(fueraDeHorquilla(5, null)).toBe(false);
    expect(textoHorquilla(h!)).toBe("entre el 8\u00a0% y el 12\u00a0%");
    // Con decimales, tal cual y con coma
    expect(textoHorquilla({ min: 7.5, max: null })).toBe("desde el 7,5\u00a0%");
  });

  it("sin sociedad el equity está comprometido; constituida, materializado", () => {
    expect(estadoEquity("sin_constituir", null)).toBe("comprometido");
    expect(estadoEquity("en_constitucion", null)).toBe("comprometido");
    expect(estadoEquity("constituida", "2027-01-15")).toBe("materializado");
    expect(estadoEquity("constituida", null)).toBeNull();
  });

  it("el tope: atención al llegar, vencido a la semana, y solo en Construcción", () => {
    expect(estadoTope("construccion", 13, 14)).toBeNull();
    expect(estadoTope("construccion", 14, 14)).toBe("atencion");
    expect(estadoTope("construccion", 21, 14)).toBe("vencido");
    expect(estadoTope("aceleracion", 40, 14)).toBeNull();
  });
});
