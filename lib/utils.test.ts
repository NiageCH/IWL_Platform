import { describe, expect, it } from "vitest";
import { cifraEquity, equity, euros, numero, porcentaje } from "./utils";

describe("euros", () => {
  /**
   * El español escribe 9000 sin punto, pero en una columna donde conviven
   * 9.000 y 37.600 eso hace que dos cifras del mismo tipo se lean distinto.
   * En una tabla financiera manda la legibilidad de la columna.
   */
  it("agrupa también los números de cuatro dígitos", () => {
    // Intl separa la cifra del símbolo con espacio duro, no con uno normal
    expect(euros(9000)).toBe("9.000\u00a0€");
    expect(euros(37600)).toBe("37.600\u00a0€");
  });

  it("sin valor, un guion y no un cero", () => {
    expect(euros(null)).toBe("—");
    expect(euros(undefined)).toBe("—");
    // Cero es un dato: no se esconde
    expect(euros(0)).toBe("0\u00a0€");
  });
});

describe("numero", () => {
  it("respeta los decimales pedidos", () => {
    expect(numero(1234.56, 1)).toBe("1.234,6");
    expect(numero(1234.56, 0)).toBe("1.235");
  });
});

describe("porcentaje", () => {
  it("escribe el símbolo separado con espacio duro", () => {
    expect(porcentaje(32.8)).toBe("32,8\u00a0%");
  });
});

describe("equity", () => {
  /** Es una cifra contractual: se enseña tal como se escribió (REVISION, 11 nov) */
  it("no se redondea nunca, con coma y sin ceros de relleno", () => {
    expect(equity(7.5)).toBe("7,5\u00a0%");
    expect(equity(12.25)).toBe("12,25\u00a0%");
    expect(equity(10)).toBe("10\u00a0%");
    expect(equity(0.5)).toBe("0,5\u00a0%");
    // Postgres devuelve numeric como texto a veces
    expect(equity("7.50")).toBe("7,5\u00a0%");
  });

  it("sin dato, una raya; y el cero es un cero", () => {
    expect(equity(null)).toBe("—");
    expect(equity(undefined)).toBe("—");
    expect(equity(0)).toBe("0\u00a0%");
  });

  it("para un campo de formulario, la cifra sola, con coma", () => {
    expect(cifraEquity(7.5)).toBe("7,5");
    expect(cifraEquity(null)).toBe("");
  });
});
