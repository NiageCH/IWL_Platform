import { DocumentoIwl } from "@/lib/pdf";
import { equity, euros, fecha, numero } from "@/lib/utils";

/**
 * El Anexo de Programa en PDF, con su sección I: los tramos de la hoja de
 * ruta con sus hitos y el plazo máximo (REVISION, 23 nov).
 *
 * Se arma con lo que dice la copia de la base (`anexo_versiones`) cuando la
 * hay: un Anexo propuesto o firmado se imprime como se propuso o firmó, no
 * como esté hoy la hoja de ruta. Lo firmado queda congelado también aquí.
 */

export interface HitoPdf {
  titulo: string;
  criterio: string | null;
  fecha: string | null;
  fundamental: boolean;
  de_tramo: number | null;
  al_entrar: boolean;
}

export interface TramoPdf {
  tramo: number;
  nombre: string;
  inicio: string | null;
  fin: string | null;
  hitos: HitoPdf[];
}

export interface DatosAnexoPdf {
  compania: string;
  version: number;
  estado: string;
  /** De dónde salen las cifras: la copia firmada, la propuesta o el borrador de hoy */
  origen: "firmado" | "propuesto" | "borrador";
  firmadoEl: string | null;
  duracionMeses: number | null;
  inicio: string | null;
  fin: string | null;
  horas: number | null;
  valorHoras: number | null;
  financiacion: number | null;
  equityPct: number | null;
  otros: string | null;
  plazoMeses: number | null;
  hoja: TramoPdf[];
}

const ORIGEN: Record<DatosAnexoPdf["origen"], string> = {
  firmado: "Copia firmada: no cambia aunque cambie la hoja de ruta",
  propuesto: "Tal como se propuso",
  borrador: "Borrador: puede cambiar antes de proponerse",
};

/** La línea de un hito: fecha, título y de dónde viene */
export function lineaHito(h: HitoPdf): string {
  const marcas = [
    h.de_tramo ? `pendiente del tramo ${h.de_tramo}` : null,
    h.fundamental ? null : "propio",
  ].filter(Boolean);
  const cola = marcas.length ? ` (${marcas.join(", ")})` : "";
  if (h.al_entrar) return `${h.titulo}${cola}: cumplido al entrar`;
  return `${h.fecha ? fecha(h.fecha) : "Sin fecha"} · ${h.titulo}${cola}`;
}

export async function generarPdfAnexo(d: DatosAnexoPdf): Promise<Uint8Array> {
  const doc = await DocumentoIwl.crear({
    titulo: `Anexo de Programa · ${d.compania}`,
    cabecera: `Anexo de Programa · ${d.compania} · versión ${d.version}`,
  });

  doc.titulo("Anexo de Programa", [
    `${d.compania} · versión ${d.version}`,
    d.firmadoEl ? `Firmado el ${fecha(d.firmadoEl)}` : ORIGEN[d.origen],
  ]);

  doc.ficha([
    ["Duración", d.duracionMeses ? `${d.duracionMeses} meses` : "Sin fijar"],
    ["Del", d.inicio ? `${fecha(d.inicio)} al ${fecha(d.fin)}` : "Desde la firma"],
    ["Horas de IWL", d.horas ? `${numero(d.horas)} h${d.valorHoras ? `, valoradas en ${euros(d.valorHoras)}` : ""}` : "—"],
    ["Financiación directa", d.financiacion && d.financiacion > 0 ? euros(d.financiacion) : "Sin financiación"],
    ["Equity", equity(d.equityPct)],
  ]);

  if (d.otros) {
    doc.espacio(8);
    doc.parrafo([{ texto: d.otros, negrita: false }]);
  }

  doc.seccion("I · Hitos y calendario");
  doc.parrafo([
    {
      texto: d.plazoMeses
        ? `Plazo máximo: ${d.plazoMeses} meses desde la firma. Ningún hito va más allá. `
        : "",
      negrita: true,
    },
    {
      texto:
        "Los hitos fundamentales son los del programa; los propios, los de este proyecto. Lo verificado en la lista de entrada consta como cumplido al entrar.",
      negrita: false,
    },
  ]);

  if (!d.hoja.length) {
    doc.espacio(6);
    doc.parrafo([{ texto: "Todavía no hay hoja de ruta.", negrita: false }]);
  }
  for (const t of d.hoja) {
    doc.espacio(10);
    doc.parrafo([
      { texto: `Tramo ${t.tramo} · ${t.nombre}`, negrita: true },
      { texto: t.inicio ? `   ${fecha(t.inicio)} a ${fecha(t.fin)}` : "", negrita: false },
    ]);
    doc.espacio(3);
    t.hitos.forEach((h) => doc.lista("·", [{ texto: lineaHito(h), negrita: false }]));
  }

  return doc.terminar();
}
