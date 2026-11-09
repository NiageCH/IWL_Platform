import { describe, expect, it } from "vitest";
import {
  camposSocietarios,
  describirSituacion,
  equityPendiente,
  exigir,
  leerFirmantes,
  paraGuardar,
} from "./societario";

const validar = (datos: Record<string, unknown>) =>
  camposSocietarios.superRefine(exigir).safeParse(datos);

describe("la situación societaria", () => {
  it("se enseña como dato", () => {
    expect(describirSituacion({ situacion_societaria: "sin_constituir" })).toBe("Sin sociedad constituida");
    expect(
      describirSituacion({ situacion_societaria: "en_constitucion", constitucion_prevista: "2027-01-15" }),
    ).toMatch(/^Sociedad en constitución · prevista el 15 ene/);
    expect(
      describirSituacion({ situacion_societaria: "constituida", forma_juridica: "sl", denominacion_social: "Siren Tech" }),
    ).toBe("SL · Siren Tech");
    expect(describirSituacion({ situacion_societaria: null })).toBeNull();
  });

  it("constituida por el hito, sin datos todavía, lo dice", () => {
    expect(describirSituacion({ situacion_societaria: "constituida" })).toBe(
      "Sociedad constituida · faltan sus datos",
    );
  });

  it("el equity está pendiente mientras no hay sociedad", () => {
    expect(equityPendiente("sin_constituir")).toBe(true);
    expect(equityPendiente("en_constitucion")).toBe(true);
    expect(equityPendiente("constituida")).toBe(false);
    expect(equityPendiente(null)).toBe(false);
  });
});

describe("lo que exige cada situación", () => {
  it("sin sociedad no pide nada más", () => {
    expect(validar({ situacion_societaria: "sin_constituir" }).success).toBe(true);
  });

  it("en constitución pide la fecha prevista", () => {
    const r = validar({ situacion_societaria: "en_constitucion" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["constitucion_prevista"]);
  });

  it("constituida pide forma, denominación y CIF, cada uno en su campo", () => {
    const r = validar({ situacion_societaria: "constituida" });
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual(["cif", "denominacion_social", "forma_juridica"]);
  });

  it("y lo que no corresponde se guarda en blanco", () => {
    const r = validar({
      situacion_societaria: "sin_constituir",
      constitucion_prevista: "2027-01-15",
      denominacion_social: "Restos de antes",
    });
    expect(paraGuardar(r.data!)).toMatchObject({ constitucion_prevista: null, denominacion_social: null });
  });
});

describe("quién firma", () => {
  it("sin sociedad, las fundadoras a título personal, una por línea", () => {
    expect(leerFirmantes("sin_constituir", "Agustina Gómez\n\n  Camila Aguado ", "Nadie")).toEqual([
      { nombre: "Agustina Gómez", calidad: "personal" },
      { nombre: "Camila Aguado", calidad: "personal" },
    ]);
  });

  it("con sociedad, quien la representa, y además quien firme en persona", () => {
    expect(leerFirmantes("constituida", "Agustina Gómez", "Ana Pérez")).toEqual([
      { nombre: "Ana Pérez", calidad: "representante" },
      { nombre: "Agustina Gómez", calidad: "personal" },
    ]);
  });
});
