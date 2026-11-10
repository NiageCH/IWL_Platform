import { documentoFirmado, hora, lineasFirma, type FirmaNda } from "@/lib/pdf";

/**
 * El acta de comité: la vía que se propone, el mensaje de un descarte y el
 * PDF con la firma de cada miembro.
 *
 * Cálculo puro: sin base de datos, para usarlo igual en el formulario, en
 * la acción y en el PDF, y probarlo solo.
 */

export type Via = "aceleracion" | "construccion";
export type Decision = "preseleccionada" | "descartada" | "aplazada";

export const VIAS: Record<Via, string> = {
  aceleracion: "Aceleración",
  construccion: "Construcción",
};

export const DECISIONES: Record<Decision, string> = {
  preseleccionada: "Preseleccionada",
  descartada: "Descartada",
  aplazada: "Aplazada",
};

/**
 * La vía que sale del estado de entrada. Quien ya factura o tiene clientes
 * entra a acelerar, con due diligence; en idea, prototipo o MVP, lo
 * documental se construye dentro del programa. El comité la puede cambiar,
 * con motivo. Sin estado de entrada no se propone ninguna: se elige.
 */
export function viaPropuesta(estadoEntrada: string | null | undefined): Via | null {
  switch (estadoEntrada) {
    case "idea":
    case "prototipo":
    case "mvp":
      return "construccion";
    case "primeros_clientes":
    case "facturacion":
      return "aceleracion";
    default:
      return null;
  }
}

/**
 * El mensaje de un descarte, en la voz de IWL: claro, con el motivo si es
 * objetivo, y diciendo si se puede volver a presentar. Es un borrador: se
 * edita en el acta antes de firmarla.
 */
export function mensajeDescarte(contacto: string, startup: string, puedeVolver: boolean): string {
  const pila = contacto.split(" ")[0] || contacto;
  return (
    `Hola, ${pila}:\n\n` +
    `Gracias por presentar ${startup} a Inception Woman Lab y por el tiempo que nos habéis dedicado. ` +
    `El comité lo ha valorado con atención y esta vez no seguimos adelante.\n\n` +
    `[El motivo, si es objetivo y ayuda.]\n\n` +
    (puedeVolver
      ? "Podéis volver a presentaros en una próxima convocatoria, y nos encantará ver cómo ha avanzado el proyecto.\n\n"
      : "") +
    `Un saludo,\nEquipo de Inception Woman Lab`
  );
}

export interface DatosActa {
  candidatura: string;
  candidaturaId: string;
  fecha: string;
  resumen: string;
  decision: Decision;
  via: Via | null;
  viaPropuesta: Via | null;
  viaMotivo: string | null;
  motivo: string | null;
  revisionOn: string | null;
  firmas: FirmaNda[];
  generado: string;
}

/** El cuerpo del acta, tal como se lee en el PDF */
export function textoActa(d: DatosActa): string {
  const partes = [
    `Fecha del comité: ${d.fecha.split("-").reverse().join("/")}`,
    `Miembros: ${d.firmas.map((f) => f.nombre).join(", ")}`,
    "",
    "Resumen",
    d.resumen,
    "",
    `Decisión: ${DECISIONES[d.decision]}`,
  ];
  if (d.decision === "preseleccionada" && d.via) {
    partes.push(`Vía de entrada: ${VIAS[d.via]}`);
    if (d.viaPropuesta && d.viaPropuesta !== d.via) {
      partes.push(`La propuesta por su estado de entrada era ${VIAS[d.viaPropuesta]}. Motivo del cambio: ${d.viaMotivo ?? "—"}`);
    }
  }
  if (d.motivo) partes.push(`Motivo: ${d.motivo}`);
  if (d.decision === "aplazada" && d.revisionOn) {
    partes.push(`Se revisa el ${d.revisionOn.split("-").reverse().join("/")}.`);
  }
  return partes.join("\n");
}

export function lineasRastroActa(d: DatosActa): string[] {
  return [
    `Candidatura: ${d.candidatura} (${d.candidaturaId})`,
    "",
    ...d.firmas.flatMap((f, i) => lineasFirma(`Firma ${i + 1} de ${d.firmas.length}`, f)),
    `Documento generado: ${hora(d.generado, "Europe/Madrid")} (Madrid) · ${hora(d.generado, "UTC")} (UTC)`,
    "Firma electrónica simple, registrada por la plataforma de Inception Woman Lab.",
  ];
}

export function generarPdfActa(d: DatosActa): Promise<Uint8Array> {
  return documentoFirmado({
    titulo: "Acta de comité",
    subtitulo: d.candidatura,
    texto: textoActa(d),
    tituloRastro: "Rastro de las firmas del comité",
    rastro: lineasRastroActa(d),
  });
}
