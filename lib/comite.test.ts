import { describe, expect, it } from "vitest";
import { contenidoActa, mensajeDescarte } from "./comite";

describe("lo firmado de un acta", () => {
  const BASE = {
    actaId: "a",
    candidaturaId: "c",
    fecha: "2026-11-20",
    resumen: "Equipo sólido.",
    decision: "descartada" as const,
    estadio: null,
    estadioPropuesto: null,
    estadioMotivo: null,
    motivo: "Fuera del foco.",
    revisionOn: null,
    puedeVolver: true,
    miembros: ["p2", "p1"],
  };

  it("no depende del orden de los miembros: son personas, no una lista", () => {
    expect(contenidoActa(BASE)).toBe(contenidoActa({ ...BASE, miembros: ["p1", "p2"] }));
  });

  it("cambia si cambia algo de lo que se congela al firmar", () => {
    expect(contenidoActa(BASE)).not.toBe(contenidoActa({ ...BASE, motivo: "Otro." }));
    expect(contenidoActa(BASE)).not.toBe(contenidoActa({ ...BASE, puedeVolver: false }));
  });
});

describe("el mensaje de un descarte", () => {
  it("dice si puede volver, solo si puede", () => {
    expect(mensajeDescarte("Agustina Gómez", "Siren", true)).toContain("Podéis volver a presentaros");
    expect(mensajeDescarte("Agustina Gómez", "Siren", false)).not.toContain("volver a presentaros");
    expect(mensajeDescarte("Agustina Gómez", "Siren", false)).toMatch(/^Hola, Agustina:/);
  });
});
