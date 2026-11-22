import { describe, expect, it } from "vitest";
import { leerPct, pctMujeres, sumaCuadra, sumaSocios } from "./candidatura-nueva";

describe("los socios de una candidatura (REVISION, 22 nov)", () => {
  const socios = [
    { nombre: "A", pct: 33.33, mujer: true },
    { nombre: "B", pct: 33.33, mujer: true },
    { nombre: "C", pct: 33.34, mujer: false },
  ];

  it("suman y dicen cuánto está en manos de mujeres", () => {
    expect(sumaSocios(socios)).toBe(100);
    expect(sumaCuadra(socios)).toBe(true);
    expect(pctMujeres(socios)).toBe(66.66);
  });

  it("una suma que no da 100 no cuadra", () => {
    expect(sumaCuadra([{ nombre: "A", pct: 60, mujer: true }])).toBe(false);
  });

  it("lee el porcentaje como se escribe", () => {
    expect(leerPct("12,5")).toBe(12.5);
    expect(leerPct("40 %")).toBe(40);
    expect(leerPct("")).toBeNull();
    expect(leerPct("mucho")).toBeNull();
  });
});
