import { DECISIONES, VIAS, fechaActa, type Decision, type Via } from "@/lib/comite";
import { hora, lineasFirma, type FirmaNda } from "@/lib/firmas";
import { DocumentoIwl, type DatoRegistro } from "@/lib/pdf";

/**
 * El PDF del acta de comité, con la plantilla de documento de IWL: ficha,
 * resumen, la decisión destacada, una línea por firma y, aparte, el
 * registro de firmas con el hash del contenido firmado.
 *
 * El mensaje de un descarte no va: es comunicación con ella, no
 * deliberación del comité.
 *
 * Sin base de datos: recibe los datos y devuelve los bytes.
 */

export interface DatosActa {
  actaId: string;
  /** El nombre de la startup */
  candidatura: string;
  candidaturaId: string;
  /** La persona de contacto, con apellidos si los tiene */
  contacto: string;
  cohorte: string;
  fecha: string;
  resumen: string;
  decision: Decision;
  via: Via | null;
  viaPropuesta: Via | null;
  viaMotivo: string | null;
  motivo: string | null;
  revisionOn: string | null;
  puedeVolver: boolean | null;
  /** Cada miembro, con su firma; en el orden en que firmaron */
  firmas: FirmaNda[];
  /** SHA-256 de `contenidoActa`: lo que firmaron */
  hash: string;
  /** Si el PDF se rehace después de cerrada, cuándo se cerró y de dónde sale el hash */
  regenerado?: { cerradaAt: string; hashDeEntonces: boolean };
  /** ISO, cuándo se genera el documento */
  generado: string;
}

/** Los párrafos de la decisión, tal como van en su bloque */
export function parrafosDecision(d: DatosActa): string[] {
  const p: string[] = [];
  if (d.decision === "preseleccionada") {
    if (d.via) p.push(`Vía de entrada: ${VIAS[d.via]}.`);
    if (d.via && d.viaPropuesta && d.viaPropuesta !== d.via) {
      p.push(`La propuesta por su estado de entrada era ${VIAS[d.viaPropuesta]}. Motivo del cambio: ${d.viaMotivo ?? "—"}`);
    }
  }
  if (d.decision === "aplazada") {
    if (d.revisionOn) p.push(`Se revisa el ${fechaActa(d.revisionOn)}.`);
    if (d.motivo) p.push(`Motivo: ${d.motivo}`);
  }
  if (d.decision === "descartada") {
    if (d.motivo) p.push(`Motivo: ${d.motivo}`);
    if (d.puedeVolver !== null) {
      p.push(d.puedeVolver ? "Puede volver a presentarse en una próxima convocatoria." : "No se le propone volver a presentarse.");
    }
  }
  return p;
}

function registro(d: DatosActa): DatoRegistro[] {
  const datos: DatoRegistro[] = [
    { tipo: "dato", etiqueta: "Candidatura", valor: `${d.candidatura} (${d.candidaturaId})` },
    { tipo: "dato", etiqueta: "Acta", valor: d.actaId },
    { tipo: "dato", etiqueta: "Hash SHA-256 del contenido firmado", valor: d.hash, mono: true },
  ];
  if (d.regenerado) {
    datos.push({
      tipo: "nota",
      texto: d.regenerado.hashDeEntonces
        ? `PDF regenerado con el diseño actual. El acta se cerró el ${hora(d.regenerado.cerradaAt)} (Madrid), y el hash es el que se guardó entonces: el contenido firmado es el mismo.`
        : `PDF regenerado con el diseño actual. El acta se cerró el ${hora(d.regenerado.cerradaAt)} (Madrid), antes de que se guardara su hash: este se ha calculado al regenerar, sobre su contenido, que no se puede editar desde la primera firma.`,
    });
  }
  d.firmas.forEach((f, i) => datos.push({ tipo: "firmante", rotulo: `Firma ${i + 1} de ${d.firmas.length}`, firma: f }));
  datos.push(
    {
      tipo: "dato",
      etiqueta: "Documento generado",
      valor: `${hora(d.generado, "Europe/Madrid")} (Madrid) · ${hora(d.generado, "UTC")} (UTC)`,
    },
    { tipo: "nota", texto: "Firma electrónica simple, registrada por la plataforma de Inception Woman Lab." },
  );
  return datos;
}

/** Las líneas del registro, en texto: lo mismo que pinta la última página */
export function lineasRastroActa(d: DatosActa): string[] {
  return registro(d).flatMap((r) => {
    if (r.tipo === "dato") return [`${r.etiqueta}: ${r.valor}`];
    if (r.tipo === "firmante") return ["", ...lineasFirma(r.rotulo, r.firma)];
    return [r.texto];
  });
}

export async function generarPdfActa(d: DatosActa): Promise<Uint8Array> {
  const doc = await DocumentoIwl.crear({
    titulo: `Acta del comité de selección · ${d.candidatura}`,
    cabecera: `Acta del comité de selección · ${d.candidatura} · ${fechaActa(d.fecha)}`,
  });

  doc.titulo("Acta del comité de selección", [
    `${d.candidatura} · ${d.contacto}`,
    `${d.cohorte} · acta del ${fechaActa(d.fecha)}`,
  ]);

  doc.ficha([
    ["Fecha", fechaActa(d.fecha)],
    ["Cohorte", d.cohorte],
    ["Miembros del comité", d.firmas.map((f) => f.nombre).join(", ")],
    ["Decisión", DECISIONES[d.decision]],
  ]);

  const resumen = d.resumen.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  doc.seccion("Resumen", doc.altoInicio([{ texto: resumen[0] ?? "", negrita: false }]));
  for (const p of resumen) {
    doc.parrafo([{ texto: p, negrita: false }]);
    doc.espacio(7);
  }

  doc.espacio(8);
  doc.destacado(`Decisión: ${DECISIONES[d.decision]}`, parrafosDecision(d));

  doc.seccion("Firmas");
  doc.lineasDeFirma(
    d.firmas.map((f) => ({ nombre: f.nombre, cuando: `Firmó el ${hora(f.cuando).slice(0, 17)}` })),
  );

  doc.registro("Registro de firmas", registro(d));
  return doc.terminar();
}
