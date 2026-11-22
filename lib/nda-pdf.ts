import { hora, lineasFirma, type FirmaNda } from "@/lib/firmas";
import { DocumentoIwl, MM, type DatoRegistro } from "@/lib/pdf";
import { interpretarNda, tituloDe, type Pieza } from "@/lib/nda-formato";

export { lineasFirma, type FirmaNda };

/**
 * El PDF del NDA firmado, con la plantilla de documento de IWL (`lib/pdf`):
 * el texto que se firmó, pintado según sus marcas, y en la última página el
 * registro de las dos firmas.
 *
 * El registro es lo que hace que una firma electrónica simple sirva de
 * algo: quién firmó, con qué correo, cuándo —en hora de Madrid y en UTC,
 * para que no haya duda de zona—, desde qué IP y con qué navegador, sobre
 * qué versión del texto y con qué hash. El hash permite demostrar qué texto
 * exacto se firmó aunque la plantilla cambie después.
 *
 * Sin base de datos: recibe los datos y devuelve los bytes. Así se prueba
 * solo, y el registro se puede leer sin abrir el PDF (`lineasRastro`).
 */

export interface DatosNda {
  candidatura: string;
  candidaturaId: string;
  /** El texto completado, con sus marcas: el que se firmó */
  texto: string;
  version: string | number;
  /** El hash del texto que firmaron las dos partes: el mismo */
  hash: string;
  ella: FirmaNda;
  /**
   * La contrafirma de IWL. Sin ella es un NDA aceptado con la casilla, el
   * primer paso desde el 22 nov: una sola aceptación, la de ella.
   */
  iwl?: FirmaNda | null;
  /**
   * Lo que identifica a quien acepta con la casilla, para el registro: su
   * documento y, si acepta por una sociedad, cuál (REVISION, 22 nov).
   */
  identidad?: { documento?: string | null; sociedad?: string | null; nif?: string | null } | null;
  /** ISO, cuándo se genera el documento */
  generado: string;
}

/** La última de las dos firmas, que da la fecha de efecto */
function ultimaFirma(d: DatosNda): string {
  if (!d.iwl) return d.ella.cuando;
  return new Date(d.ella.cuando) > new Date(d.iwl.cuando) ? d.ella.cuando : d.iwl.cuando;
}

function registro(d: DatosNda): DatoRegistro[] {
  if (!d.iwl) return registroAceptado(d);
  const iwl = d.iwl;
  return [
    { tipo: "dato", etiqueta: "Candidatura", valor: `${d.candidatura} (${d.candidaturaId})` },
    { tipo: "dato", etiqueta: "Plantilla del NDA", valor: `versión ${d.version}` },
    { tipo: "dato", etiqueta: "Hash SHA-256 del texto firmado por las dos partes", valor: d.hash, mono: true },
    // La fecha de efecto es la de la última firma: aquí, no en el texto
    {
      tipo: "dato",
      etiqueta: "Fecha de efecto, la de la última firma",
      valor: `${hora(ultimaFirma(d), "Europe/Madrid")} (Madrid)`,
    },
    { tipo: "firmante", rotulo: "Firma de la candidata", firma: d.ella },
    { tipo: "firmante", rotulo: "Contrafirma de Inception Woman Lab", firma: iwl },
    {
      tipo: "dato",
      etiqueta: "Documento generado",
      valor: `${hora(d.generado, "Europe/Madrid")} (Madrid) · ${hora(d.generado, "UTC")} (UTC)`,
    },
    { tipo: "nota", texto: "Firma electrónica simple, registrada por la plataforma de Inception Woman Lab." },
  ];
}

/** El registro de un NDA aceptado con la casilla: una sola aceptación, la de ella */
function registroAceptado(d: DatosNda): DatoRegistro[] {
  return [
    { tipo: "dato", etiqueta: "Candidatura", valor: `${d.candidatura} (${d.candidaturaId})` },
    { tipo: "dato", etiqueta: "Plantilla del NDA", valor: `versión ${d.version}` },
    { tipo: "dato", etiqueta: "Hash SHA-256 del texto aceptado", valor: d.hash, mono: true },
    {
      tipo: "dato",
      etiqueta: "Fecha de efecto, la de la aceptación",
      valor: `${hora(d.ella.cuando, "Europe/Madrid")} (Madrid)`,
    },
    ...(d.identidad?.documento
      ? [{ tipo: "dato" as const, etiqueta: "Documento de identidad", valor: d.identidad.documento }]
      : []),
    ...(d.identidad?.sociedad
      ? [{ tipo: "dato" as const, etiqueta: "En nombre de", valor: d.identidad.nif ? `${d.identidad.sociedad} (NIF ${d.identidad.nif})` : d.identidad.sociedad }]
      : []),
    { tipo: "firmante", rotulo: "Aceptación de la candidata, con casilla electrónica", firma: d.ella },
    {
      tipo: "dato",
      etiqueta: "Documento generado",
      valor: `${hora(d.generado, "Europe/Madrid")} (Madrid) · ${hora(d.generado, "UTC")} (UTC)`,
    },
    {
      tipo: "nota",
      texto: "Aceptado con casilla electrónica antes de presentar el proyecto, y registrado por la plataforma de Inception Woman Lab.",
    },
  ];
}

/** Las líneas del registro, en texto: lo mismo que pinta la última página */
export function lineasRastro(d: DatosNda): string[] {
  return registro(d).flatMap((r) => {
    if (r.tipo === "dato") return [`${r.etiqueta}: ${r.valor}`];
    if (r.tipo === "firmante") return ["", ...lineasFirma(r.rotulo, r.firma)];
    return [r.texto];
  });
}

/**
 * Lo mínimo que tiene que ir con un rótulo: las dos primeras líneas de lo
 * que le sigue, o el bloque de firmas entero. Un rótulo encadenado —una
 * sección y su primera cláusula— suma lo del siguiente.
 */
function altoMinimo(doc: DocumentoIwl, piezas: Pieza[], i: number): number {
  const p = piezas[i];
  if (!p) return 0;
  switch (p.tipo) {
    case "parrafo":
      return doc.altoInicio(p.tramos);
    case "expositivo":
      return doc.altoInicio(p.tramos, { sangria: 10 * MM });
    case "lista":
      return doc.altoInicio(p.tramos, { sangria: 12 * MM });
    case "firmas":
      return doc.altoFirmas(p.bloques);
    case "seccion":
      return 14 + doc.altoSeccion() + altoMinimo(doc, piezas, i + 1);
    case "clausula":
      return 12 + doc.altoClausula(p.titulo) + altoMinimo(doc, piezas, i + 1);
    case "titulo":
      return 0;
  }
}

export async function generarPdfNda(d: DatosNda): Promise<Uint8Array> {
  const piezas = interpretarNda(d.texto);
  const titulo = tituloDe(piezas) ?? "Acuerdo de confidencialidad";
  const doc = await DocumentoIwl.crear({
    titulo: `${titulo} · ${d.candidatura}`,
    cabecera: `${titulo} · versión ${d.version}`,
  });

  piezas.forEach((p, i) => {
    switch (p.tipo) {
      case "titulo":
        doc.titulo(p.texto);
        return;
      case "seccion":
        doc.seccion(p.texto, altoMinimo(doc, piezas, i + 1));
        return;
      case "clausula":
        doc.clausula(p.numero, p.titulo, altoMinimo(doc, piezas, i + 1));
        return;
      case "parrafo":
        doc.parrafo(p.tramos);
        doc.espacio(7);
        return;
      case "expositivo":
        doc.expositivo(p.numero, p.tramos);
        doc.espacio(7);
        return;
      case "lista":
        doc.lista(p.letra, p.tramos);
        doc.espacio(5);
        return;
      case "firmas":
        doc.firmas(p.bloques);
        return;
    }
  });

  doc.registro(d.iwl ? "Registro de firmas" : "Registro de la aceptación", registro(d));
  return doc.terminar();
}
