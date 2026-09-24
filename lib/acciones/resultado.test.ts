import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  fechaOpcional,
  idOpcional,
  textoObligatorio,
  textoOpcional,
  uuid,
} from "./resultado";

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

  /**
   * Un formulario que no incluye el campo es lo normal: el estado de un punto
   * se cambia desde una lista, sin tocar la nota. Si el esquema exigiera la
   * clave, esa acción fallaría entera con un «revisa los campos marcados» que
   * no señala ningún campo.
   */
  it("acepta que el campo no venga en el formulario", () => {
    expect(textoOpcional.parse(undefined)).toBeNull();
    expect(textoOpcional.parse(null)).toBeNull();

    const conCampoAusente = z
      .object({ nota: textoOpcional, otro: textoObligatorio() })
      .safeParse({ otro: "algo" });

    expect(conCampoAusente.success).toBe(true);
    expect(conCampoAusente.success && conCampoAusente.data.nota).toBeNull();
  });
});

describe("idOpcional", () => {
  it("acepta vacío, ausente y un identificador válido", () => {
    expect(idOpcional.parse("")).toBeNull();
    expect(idOpcional.parse(undefined)).toBeNull();
    expect(idOpcional.parse("00000000-0000-0000-0004-000000000001")).toBe(
      "00000000-0000-0000-0004-000000000001",
    );
  });

  it("rechaza algo que no es un identificador", () => {
    expect(idOpcional.safeParse("abc").success).toBe(false);
  });
});

describe("fechaOpcional", () => {
  it("acepta vacío, ausente y una fecha", () => {
    expect(fechaOpcional.parse("")).toBeNull();
    expect(fechaOpcional.parse(undefined)).toBeNull();
    expect(fechaOpcional.parse("2026-12-31")).toBe("2026-12-31");
  });

  it("rechaza una fecha mal escrita", () => {
    expect(fechaOpcional.safeParse("31/12/2026").success).toBe(false);
  });
});
