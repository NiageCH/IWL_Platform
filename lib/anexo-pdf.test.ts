import { describe, expect, it } from "vitest";
import { generarPdfAnexo, lineaHito } from "./anexo-pdf";

describe("el Anexo en PDF, con su sección I (REVISION, 23 nov)", () => {
  it("cada hito dice su fecha y de dónde viene; lo cumplido al entrar, que lo estaba", () => {
    expect(lineaHito({ titulo: "Clientes que repiten", criterio: null, fecha: "2026-11-15", fundamental: true, de_tramo: null, al_entrar: false })).toBe(
      "15 nov 2026 · Clientes que repiten",
    );
    expect(lineaHito({ titulo: "Producto ajustado", criterio: null, fecha: "2026-09-25", fundamental: true, de_tramo: 2, al_entrar: false })).toBe(
      "25 sept 2026 · Producto ajustado (pendiente del tramo 2)",
    );
    expect(lineaHito({ titulo: "Problema validado", criterio: null, fecha: null, fundamental: true, de_tramo: 1, al_entrar: true })).toBe(
      "Problema validado (pendiente del tramo 1): cumplido al entrar",
    );
    expect(lineaHito({ titulo: "Demo en feria", criterio: null, fecha: null, fundamental: false, de_tramo: null, al_entrar: false })).toBe(
      "Sin fecha · Demo en feria (propio)",
    );
  });

  it("sale un PDF", async () => {
    const pdf = await generarPdfAnexo({
      compania: "Compañía de prueba",
      version: 1,
      estado: "firmado",
      origen: "firmado",
      firmadoEl: "2026-09-01",
      duracionMeses: 5,
      inicio: "2026-09-01",
      fin: "2027-01-31",
      horas: 40,
      valorHoras: 3200,
      financiacion: 0,
      equityPct: 2,
      otros: null,
      plazoMeses: 5,
      hoja: [
        {
          tramo: 4,
          nombre: "De facturación a invertible",
          inicio: "2026-09-01",
          fin: "2027-01-31",
          hitos: [{ titulo: "Data room completo", criterio: null, fecha: "2027-01-05", fundamental: true, de_tramo: null, al_entrar: false }],
        },
      ],
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  });
});
