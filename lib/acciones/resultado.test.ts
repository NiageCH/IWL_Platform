import { describe, expect, it } from "vitest";
import { uuid, textoObligatorio, textoOpcional } from "./resultado";

describe("uuid", () => {
  /**
   * Zod valida los UUID según el RFC, con su versión y su variante. Postgres
   * no: acepta cualquier hexadecimal con el formato 8-4-4-4-12. La validación
   * de entrada no puede ser más estricta que la columna.
   */
  it("acepta los identificadores legibles de los datos semilla", () => {
    expect(uuid.safeParse("00000000-0000-0000-0005-000000000001").success).toBe(true);
    expect(uuid.safeParse("00000000-0000-0000-0004-000000000001").success).toBe(true);
  });

  it("acepta un UUID v4 normal", () => {
    expect(uuid.safeParse("210cf378-ac13-48b1-9efd-e48405c00e1d").success).toBe(true);
  });

  it("acepta un UUID v7, que Zod rechazaría por versión", () => {
    expect(uuid.safeParse("018f6d1a-3c2b-7a4e-9f10-2b3c4d5e6f70").success).toBe(true);
  });

  it("rechaza lo que no tiene forma de identificador", () => {
    expect(uuid.safeParse("").success).toBe(false);
    expect(uuid.safeParse("1234").success).toBe(false);
    expect(uuid.safeParse("no-es-un-uuid-nada-de-nada-aqui").success).toBe(false);
    expect(uuid.safeParse("00000000-0000-0000-0005-00000000000g").success).toBe(false);
  });
});

describe("textoObligatorio", () => {
  it("recorta antes de medir", () => {
    expect(textoObligatorio(3).safeParse("   ab   ").success).toBe(false);
    expect(textoObligatorio(3).safeParse("   abc   ").success).toBe(true);
  });
});

describe("textoOpcional", () => {
  it("convierte la cadena vacía en null", () => {
    expect(textoOpcional.parse("")).toBeNull();
    expect(textoOpcional.parse("   ")).toBeNull();
    expect(textoOpcional.parse(" hola ")).toBe("hola");
  });
});
