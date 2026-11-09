/**
 * Las reuniones con una candidata: el texto con que se proponen y la forma
 * en que se guardan sus asistentes.
 *
 * Sin proveedor de correo, «Proponer reunión» abre un correo ya redactado
 * en el programa de quien lo envía. El texto lo escribe una persona a otra:
 * para qué es la reunión, las franjas en hora de Madrid —para que no haya
 * duda de zona— y qué hacer para elegir una.
 *
 * Cálculo puro: lo usan la acción y el formulario, y se prueba solo.
 */

// `type` y no `interface`: se guardan como JSON, y una interfaz no encaja en ese tipo
export type Franja = {
  /** ISO, con su zona */
  inicio: string;
  fin: string;
};

export type Conclusion = "seguir" | "no_seguir" | "pendiente";

export const CONCLUSIONES: Record<Conclusion, string> = {
  seguir: "Seguir",
  no_seguir: "No seguir",
  pendiente: "Pendiente",
};

export type Asistente = {
  nombre: string;
  de: "iwl" | "candidatura";
};

const MADRID = "Europe/Madrid";

/** «martes 12 de noviembre, de 10:00 a 10:45» */
export function describirFranja(f: Franja): string {
  const dia = new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(f.inicio));
  const hora = (iso: string) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: MADRID,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  return `${dia}, de ${hora(f.inicio)} a ${hora(f.fin)}`;
}

export function textoPropuestaReunion(
  contacto: string,
  startup: string,
  franjas: Franja[],
): { asunto: string; cuerpo: string } {
  const pila = contacto.split(" ")[0] || contacto;
  const lista = franjas.map((f, i) => `  ${i + 1}. ${describirFranja(f)}`).join("\n");
  return {
    asunto: `${startup} · una conversación con Inception Woman Lab`,
    cuerpo:
      `Hola, ${pila}:\n\n` +
      `Hemos leído vuestra candidatura y nos gustaría conoceros para hablar de ${startup}. ` +
      `Te propongo estas franjas, en hora de Madrid:\n\n${lista}\n\n` +
      `Dime cuál os va mejor, o si ninguna os encaja, y buscamos otra.\n\n` +
      `Un saludo,\nEquipo de Inception Woman Lab`,
  };
}

/**
 * Los asistentes llegan en dos campos, uno por parte, con una persona por
 * línea. Se guardan juntos, cada uno con su lado.
 */
export function leerAsistentes(deIwl: string | null, deCandidatura: string | null): Asistente[] {
  const lineas = (texto: string | null) =>
    (texto ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  return [
    ...lineas(deIwl).map((nombre) => ({ nombre, de: "iwl" as const })),
    ...lineas(deCandidatura).map((nombre) => ({ nombre, de: "candidatura" as const })),
  ];
}

/**
 * Una franja de un campo `datetime-local` —sin zona, en hora de quien lo
 * rellena, que es Madrid— y una duración en minutos.
 */
export function franjaDesdeFormulario(local: string, minutos: number): Franja | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  const inicio = new Date(`${local.slice(0, 16)}:00${desfaseMadrid(local)}`);
  if (Number.isNaN(inicio.getTime())) return null;
  const fin = new Date(inicio.getTime() + minutos * 60_000);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

/** El desfase de Madrid ese día: +01:00 en invierno, +02:00 en verano */
function desfaseMadrid(local: string): string {
  const aprox = new Date(`${local.slice(0, 16)}:00Z`);
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: MADRID,
    timeZoneName: "shortOffset",
  }).formatToParts(aprox);
  const zona = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = zona.match(/GMT([+-])(\d{1,2})/);
  if (!m) return "+01:00";
  return `${m[1]}${m[2].padStart(2, "0")}:00`;
}
