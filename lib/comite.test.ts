import { describe, expect, it } from "vitest";
import { contenidoActa, mensajeDescarte, viaPropuesta } from "./comite";

describe("la vía que se propone", () => {
  it("idea, prototipo y MVP construyen; con clientes o facturación, aceleran", () => {
    for (const e of ["idea", "prototipo", "mvp"]) expect(viaPropuesta(e)).toBe("construccion");
    for (const e of ["primeros_clientes", "facturacion"]) expect(viaPropuesta(e)).toBe("aceleracion");
  });

  it("sin estado de entrada no se propone ninguna: se elige", () => {
    expect(viaPropuesta(null)).toBeNull();
  });
});

describe("lo firmado de un acta", () => {
  const BASE = {
    actaId: "a",
    candidaturaId: "c",
    fecha: "2026-11-20",
    resumen: "Equipo sólido.",
    decision: "descartada" as const,
    via: null,
    viaPropuesta: null,
    viaMotivo: null,
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
