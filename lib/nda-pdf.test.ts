import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generarPdfNda, lineasRastro, type DatosNda } from "./nda-pdf";

const DATOS: DatosNda = {
  candidatura: "Siren",
  candidaturaId: "00000000-0000-0000-0000-000000000001",
  texto: "Las partes se comprometen a guardar la confidencialidad de la información que se intercambien.",
  version: 2,
  hash: "a".repeat(64),
  ella: {
    nombre: "Agustina Gómez",
    correo: "agustina@ejemplo.test",
    cuando: "2026-11-09T09:30:00Z",
    ip: "203.0.113.7",
    navegador: "Mozilla/5.0 (iPhone)",
  },
  iwl: {
    nombre: "Rodrigo González",
    correo: "rodrigo@niage.es",
    cuando: "2026-11-09T11:00:00Z",
    ip: "198.51.100.4",
    navegador: "Mozilla/5.0 (Macintosh)",
  },
  generado: "2026-11-09T11:00:05Z",
};

describe("el rastro del NDA", () => {
  const rastro = lineasRastro(DATOS).join("\n");

  it("dice qué texto se firmó: versión y hash", () => {
    expect(rastro).toContain("versión 2");
    expect(rastro).toContain(`Hash SHA-256 del texto firmado: ${"a".repeat(64)}`);
  });

  it("cada firma con su hora de Madrid y su UTC, sin duda de zona", () => {
    // En noviembre Madrid va una hora por delante de UTC
    expect(rastro).toContain("Fecha y hora (Madrid): 09/11/2026, 10:30:00");
    expect(rastro).toContain("Fecha y hora (UTC): 09/11/2026, 09:30:00");
  });

  it("y con IP y navegador de las dos partes", () => {
    for (const dato of ["203.0.113.7", "198.51.100.4", "Mozilla/5.0 (iPhone)", "rodrigo@niage.es"]) {
      expect(rastro).toContain(dato);
    }
  });
});

describe("el PDF", () => {
  it("se genera, con el rastro en su propia última página", async () => {
    const bytes = await generarPdfNda(DATOS);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
  });

  it("un texto largo pasa de página sin romperse", async () => {
    const bytes = await generarPdfNda({ ...DATOS, texto: "Cláusula de confidencialidad. ".repeat(900) });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  });

  it("lo que Helvetica no sabe dibujar no lo rompe", async () => {
    const bytes = await generarPdfNda({ ...DATOS, texto: "Firmado con 👍 y «comillas» y ñ" });
    expect(bytes.length).toBeGreaterThan(0);
  });
});
