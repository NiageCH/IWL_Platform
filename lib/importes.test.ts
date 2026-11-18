import { describe, expect, it } from "vitest";
import { importeEscrito } from "./importes";

describe("un importe escrito a mano", () => {
  it("el punto de los miles no es un decimal", () => {
    expect(importeEscrito("20.000")).toBe(20000);
    expect(importeEscrito("1.250.000 €")).toBe(1250000);
  });

  it("la coma es el decimal", () => {
    expect(importeEscrito("1.250,50")).toBe(1250.5);
    expect(importeEscrito("12,5")).toBe(12.5);
  });

  it("sin separadores, o con un punto decimal", () => {
    expect(importeEscrito("20000")).toBe(20000);
    expect(importeEscrito("1250.5")).toBe(1250.5);
  });

  it("vacío es sin importe, y lo que no se parece a uno es NaN", () => {
    expect(importeEscrito("")).toBeNull();
    expect(importeEscrito("  ")).toBeNull();
    expect(importeEscrito("veinte mil")).toBeNaN();
    expect(importeEscrito("20.00.0")).toBeNaN();
  });
});
