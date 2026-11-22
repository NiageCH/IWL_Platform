/**
 * El acta de comité: el estadio que confirma, el mensaje de un descarte y lo
 * que firman sus miembros. El PDF, en `lib/acta-pdf.ts`.
 *
 * Cálculo puro: sin base de datos, para usarlo igual en el formulario, en
 * la acción y en el PDF, y probarlo solo.
 */

import type { Estadio } from "@/lib/estadios";

export type Decision = "preseleccionada" | "descartada" | "aplazada";

export const DECISIONES: Record<Decision, string> = {
  preseleccionada: "Preseleccionada",
  descartada: "Descartada",
  aplazada: "Aplazada",
};

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

/**
 * Lo firmado de un acta: los campos que su guardián congela desde la primera
 * firma (`guard_acta_firmada`) y quién forma el comité, por su id —un nombre
 * puede cambiar, una persona no—. El mensaje de un descarte no entra: es
 * comunicación, no deliberación, y no va en el acta.
 *
 * El hash del acta es el SHA-256 de este texto. Se guarda al cerrarla, y al
 * regenerar su PDF se vuelve a calcular y tiene que coincidir.
 */
export interface ContenidoActa {
  actaId: string;
  candidaturaId: string;
  fecha: string;
  resumen: string;
  decision: Decision;
  /** El que confirma o fija el comité */
  estadio: Estadio | null;
  /** El que declaró ella */
  estadioPropuesto: Estadio | null;
  estadioMotivo: string | null;
  motivo: string | null;
  revisionOn: string | null;
  puedeVolver: boolean | null;
  miembros: string[];
}

export function contenidoActa(c: ContenidoActa): string {
  return [
    "Acta del comité de selección",
    `Acta: ${c.actaId}`,
    `Candidatura: ${c.candidaturaId}`,
    `Fecha: ${c.fecha}`,
    `Decisión: ${c.decision}`,
    `Estadio: ${c.estadio ?? ""}`,
    `Estadio declarado: ${c.estadioPropuesto ?? ""}`,
    `Motivo del cambio de estadio: ${c.estadioMotivo ?? ""}`,
    `Motivo: ${c.motivo ?? ""}`,
    `Revisión: ${c.revisionOn ?? ""}`,
    `Puede volver a presentarse: ${c.puedeVolver === null ? "" : c.puedeVolver ? "sí" : "no"}`,
    `Miembros: ${[...c.miembros].sort().join(", ")}`,
    "Resumen:",
    c.resumen,
  ].join("\n");
}

/** Una fecha `AAAA-MM-DD` como se lee: `DD/MM/AAAA` */
export function fechaActa(iso: string): string {
  return iso.split("-").reverse().join("/");
}
