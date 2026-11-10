import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  generarPdfActa,
  lineasRastroActa,
  mensajeDescarte,
  textoActa,
  viaPropuesta,
  type DatosActa,
} from "./comite";

const firma = (nombre: string, cuando: string) => ({
  nombre,
  correo: `${nombre.toLowerCase()}@niage.es`,
  cuando,
  ip: "203.0.113.9",
  navegador: "Mozilla/5.0",
});

const ACTA: DatosActa = {
  candidatura: "Siren",
  candidaturaId: "00000000-0000-0000-0000-000000000009",
  fecha: "2026-11-20",
  resumen: "Equipo sólido, producto en MVP.",
  decision: "preseleccionada",
  via: "aceleracion",
  viaPropuesta: "construccion",
  viaMotivo: "Ya tiene dos clínicas pagando el piloto.",
  motivo: null,
  revisionOn: null,
  firmas: [firma("Rodrigo", "2026-11-20T10:00:00Z"), firma("Luciana", "2026-11-20T12:00:00Z")],
  generado: "2026-11-20T12:00:05Z",
};

describe("la vía que se propone", () => {
  it("idea, prototipo y MVP construyen; con clientes o facturación, aceleran", () => {
    for (const e of ["idea", "prototipo", "mvp"]) expect(viaPropuesta(e)).toBe("construccion");
    for (const e of ["primeros_clientes", "facturacion"]) expect(viaPropuesta(e)).toBe("aceleracion");
  });

  it("sin estado de entrada no se propone ninguna: se elige", () => {
    expect(viaPropuesta(null)).toBeNull();
  });
});

describe("el acta", () => {
  it("dice la decisión, la vía y, si cambió, por qué", () => {
    const t = textoActa(ACTA);
    expect(t).toContain("Decisión: Preseleccionada");
    expect(t).toContain("Vía de entrada: Aceleración");
    expect(t).toContain("Motivo del cambio: Ya tiene dos clínicas pagando el piloto.");
    expect(t).toContain("Miembros: Rodrigo, Luciana");
  });

  it("aplazada, con su fecha de revisión", () => {
    const t = textoActa({ ...ACTA, decision: "aplazada", via: null, revisionOn: "2026-12-15" });
    expect(t).toContain("Se revisa el 15/12/2026.");
  });

  it("el rastro lleva la firma de cada miembro, numerada", () => {
    const r = lineasRastroActa(ACTA).join("\n");
    expect(r).toContain("Firma 1 de 2");
    expect(r).toContain("Firma 2 de 2");
    expect(r).toContain("luciana@niage.es");
  });

  it("y sale en PDF, con el rastro en su propia página", async () => {
    const pdf = await PDFDocument.load(await generarPdfActa(ACTA));
    expect(pdf.getPageCount()).toBe(2);
  });
});

describe("el mensaje de un descarte", () => {
  it("dice si puede volver, solo si puede", () => {
    expect(mensajeDescarte("Agustina Gómez", "Siren", true)).toContain("Podéis volver a presentaros");
    expect(mensajeDescarte("Agustina Gómez", "Siren", false)).not.toContain("volver a presentaros");
    expect(mensajeDescarte("Agustina Gómez", "Siren", false)).toMatch(/^Hola, Agustina:/);
  });
});
