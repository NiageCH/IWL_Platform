import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generarPdfActa, lineasRastroActa, parrafosDecision, type DatosActa } from "./acta-pdf";

const firma = (nombre: string, cuando: string) => ({
  nombre,
  correo: `${nombre.toLowerCase().replace(/\s+/g, ".")}@ejemplo.test`,
  cuando,
  ip: "203.0.113.9",
  navegador: "Mozilla/5.0",
});

const ACTA: DatosActa = {
  actaId: "00000000-0000-0000-0000-0000000000a1",
  candidatura: "Startup de Prueba",
  candidaturaId: "00000000-0000-0000-0000-000000000009",
  contacto: "Candidata de Prueba",
  cohorte: "Cohorte de prueba",
  fecha: "2026-11-20",
  resumen: "Equipo sólido, producto en MVP.\n\nDos clínicas pagan el piloto.",
  decision: "preseleccionada",
  via: "aceleracion",
  viaPropuesta: "construccion",
  viaMotivo: "Ya tiene dos clínicas pagando el piloto.",
  motivo: null,
  revisionOn: null,
  puedeVolver: null,
  firmas: [firma("Miembro Uno", "2026-11-20T10:00:00Z"), firma("Miembro Dos", "2026-11-20T12:00:00Z")],
  hash: "b".repeat(64),
  generado: "2026-11-20T12:00:05Z",
};

describe("la decisión", () => {
  it("preseleccionada: la vía y, si cambió, por qué", () => {
    expect(parrafosDecision(ACTA)).toEqual([
      "Vía de entrada: Aceleración.",
      "La propuesta por su estado de entrada era Construcción. Motivo del cambio: Ya tiene dos clínicas pagando el piloto.",
    ]);
  });

  it("aplazada: la fecha de revisión y el motivo", () => {
    expect(parrafosDecision({ ...ACTA, decision: "aplazada", via: null, revisionOn: "2026-12-15", motivo: "Falta tracción." })).toEqual([
      "Se revisa el 15/12/2026.",
      "Motivo: Falta tracción.",
    ]);
  });

  it("descartada: el motivo y si puede volver; el mensaje para ella no va", () => {
    const p = parrafosDecision({ ...ACTA, decision: "descartada", via: null, motivo: "Fuera del foco.", puedeVolver: true });
    expect(p).toEqual(["Motivo: Fuera del foco.", "Puede volver a presentarse en una próxima convocatoria."]);
  });
});

describe("el registro", () => {
  it("cada firma numerada, y el hash del contenido firmado", () => {
    const r = lineasRastroActa(ACTA).join("\n");
    expect(r).toContain("Firma 1 de 2");
    expect(r).toContain("Firma 2 de 2");
    expect(r).toContain(`Hash SHA-256 del contenido firmado: ${"b".repeat(64)}`);
    expect(r).not.toContain("regenerado");
  });

  it("regenerado, lo dice, y dice de dónde sale el hash", () => {
    const de = (hashDeEntonces: boolean) =>
      lineasRastroActa({ ...ACTA, regenerado: { cerradaAt: "2026-11-20T12:00:00Z", hashDeEntonces } }).join("\n");
    expect(de(true)).toMatch(/PDF regenerado.*el hash es el que se guardó entonces/);
    expect(de(false)).toMatch(/PDF regenerado.*se ha calculado al regenerar/);
  });
});

describe("el PDF", () => {
  it("con el registro en su propia última página, en las tres decisiones", async () => {
    for (const d of [
      ACTA,
      { ...ACTA, decision: "aplazada" as const, via: null, revisionOn: "2026-12-15" },
      { ...ACTA, decision: "descartada" as const, via: null, motivo: "Fuera del foco.", puedeVolver: false },
    ]) {
      const pdf = await PDFDocument.load(await generarPdfActa(d));
      expect(pdf.getPageCount()).toBe(2);
      expect(pdf.getTitle()).toBe("Acta del comité de selección · Startup de Prueba");
    }
  });
});
