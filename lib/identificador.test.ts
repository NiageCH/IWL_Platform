import { describe, expect, it } from "vitest";
import {
  FORMA_IDENTIFICADOR,
  identificadorDe,
  normalizarWeb,
  primeroLibre,
} from "./identificador";

describe("el identificador sale del nombre", () => {
  it("en minúsculas, sin tildes ni signos", () => {
    expect(identificadorDe("Siren")).toBe("siren");
    expect(identificadorDe("La Pepi, S.L.")).toBe("la-pepi-s-l");
    expect(identificadorDe("Ñandú Óptica")).toBe("nandu-optica");
    expect(identificadorDe("  --Marea   Clínica--  ")).toBe("marea-clinica");
  });

  it("y lo que sale lo admite la base", () => {
    for (const nombre of ["Siren", "La Pepi, S.L.", "Ñandú Óptica", "IA 4 Salud"]) {
      expect(identificadorDe(nombre)).toMatch(FORMA_IDENTIFICADOR);
    }
  });

  it("si está cogido, el siguiente número libre", () => {
    expect(primeroLibre("siren", [])).toBe("siren");
    expect(primeroLibre("siren", ["siren"])).toBe("siren-2");
    expect(primeroLibre("siren", ["siren", "siren-2", "siren-3"])).toBe("siren-4");
  });
});

describe("la web se acepta como se escriba", () => {
  /*
   * Lo que pasó: Rodrigo escribió `siren.es` en un campo que se llamaba
   * «Dirección web» y que en realidad era el identificador.
   */
  it("con o sin www y con o sin https", () => {
    expect(normalizarWeb("siren.es")).toBe("https://siren.es");
    expect(normalizarWeb("www.siren.es")).toBe("https://www.siren.es");
    expect(normalizarWeb("https://siren.es/")).toBe("https://siren.es");
    expect(normalizarWeb("HTTP://Siren.ES/equipo/")).toBe("http://siren.es/equipo");
  });

  it("vacía es que no la hay, no un error", () => {
    expect(normalizarWeb("")).toBeNull();
    expect(normalizarWeb("   ")).toBeNull();
    expect(normalizarWeb(null)).toBeNull();
  });

  it("lo que no es una web se dice, sin aceptarlo", () => {
    expect(() => normalizarWeb("siren")).toThrow(/no parece una web/);
    expect(() => normalizarWeb("siren punto es")).toThrow(/no parece una web/);
  });
});
