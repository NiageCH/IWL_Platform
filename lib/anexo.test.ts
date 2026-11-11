import { describe, expect, it } from "vitest";
import { finAnexo, tarifaAnexo, valorHoras } from "./anexo";

describe("el valor de las horas", () => {
  it("horas por tarifa, al céntimo", () => {
    expect(valorHoras(350, 75)).toBe(26250);
    expect(valorHoras(12.5, 80.333)).toBe(1004.16);
  });
  it("sin horas o sin tarifa, no hay valor calculado", () => {
    expect(valorHoras(null, 75)).toBeNull();
    expect(valorHoras(350, null)).toBeNull();
  });
});

describe("cuándo termina el Anexo", () => {
  it("la víspera del mismo día, tantos meses después", () => {
    expect(finAnexo("2026-03-09", 9)).toBe("2026-12-08");
    expect(finAnexo("2026-01-01", 12)).toBe("2026-12-31");
  });
  it("cruza el año", () => {
    expect(finAnexo("2026-11-15", 6)).toBe("2027-05-14");
  });
  it("si ese día no existe, el último del mes", () => {
    expect(finAnexo("2026-01-31", 1)).toBe("2026-02-28");
    expect(finAnexo("2027-12-31", 2)).toBe("2028-02-29");
  });
  it("el día 1 acaba el último del mes anterior", () => {
    expect(finAnexo("2026-03-01", 1)).toBe("2026-03-31");
  });
  it("sin inicio o sin duración, no hay fin", () => {
    expect(finAnexo(null, 9)).toBeNull();
    expect(finAnexo("2026-03-09", null)).toBeNull();
    expect(finAnexo("2026-03-09", 0)).toBeNull();
  });
});

describe("la tarifa del ajuste", () => {
  it("solo vale un número positivo", () => {
    expect(tarifaAnexo({ euros_hora: 75 })).toBe(75);
    expect(tarifaAnexo({ euros_hora: null })).toBeNull();
    expect(tarifaAnexo(null)).toBeNull();
    expect(tarifaAnexo({ euros_hora: 0 })).toBeNull();
    expect(tarifaAnexo({ euros_hora: "75" })).toBeNull();
  });
});
