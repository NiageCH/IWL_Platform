import { describe, expect, it } from "vitest";
import { avancePendiente, hitoQueVence, nombreMes } from "./le-toca";

describe("el avance del mes", () => {
  const base = { diaAviso: 25, diaLimite: 10, cargados: new Set<string>(), desde: "2026-09-15" };

  it("desde el día de aviso pide el de este mes", () => {
    expect(avancePendiente({ ...base, hoy: "2026-11-25" })).toEqual({ mes: "2026-11", estado: "atencion" });
  });

  it("antes del día de aviso pide el del mes anterior, si falta", () => {
    expect(avancePendiente({ ...base, hoy: "2026-11-20" })).toEqual({ mes: "2026-10", estado: "vencido" });
    expect(avancePendiente({ ...base, hoy: "2026-12-05" })).toEqual({ mes: "2026-11", estado: "atencion" });
  });

  it("pasado el día límite del mes siguiente, vencido", () => {
    expect(avancePendiente({ ...base, hoy: "2026-12-11" })).toEqual({ mes: "2026-11", estado: "vencido" });
  });

  it("cargado, no pide nada", () => {
    expect(avancePendiente({ ...base, hoy: "2026-11-26", cargados: new Set(["2026-11"]) })).toBeNull();
  });

  it("nada antes de que empiece el programa", () => {
    expect(avancePendiente({ ...base, hoy: "2026-09-20", desde: "2026-09-15" })).toBeNull();
  });

  it("cruza el año", () => {
    expect(avancePendiente({ ...base, hoy: "2027-01-03" })).toEqual({ mes: "2026-12", estado: "atencion" });
  });

  it("dice el mes por su nombre", () => {
    expect(nombreMes("2026-11")).toBe("noviembre");
  });
});

describe("un hito que vence", () => {
  const hoy = "2026-11-20";
  it("siete días antes, atención", () => {
    expect(hitoQueVence({ estado: "pendiente", fecha: "2026-11-27" }, hoy)).toBe("atencion");
    expect(hitoQueVence({ estado: "en_curso", fecha: "2026-11-28" }, hoy)).toBeNull();
  });
  it("pasada la fecha, vencido", () => {
    expect(hitoQueVence({ estado: "en_curso", fecha: "2026-11-19" }, hoy)).toBe("vencido");
  });
  it("entregado o cumplido, nada", () => {
    expect(hitoQueVence({ estado: "entregado", fecha: "2026-11-19" }, hoy)).toBeNull();
    expect(hitoQueVence({ estado: "cumplido", fecha: "2026-11-19" }, hoy)).toBeNull();
  });
});
