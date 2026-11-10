/**
 * Las reuniones con una candidata: sus franjas en hora de Madrid, en qué
 * punto está cada una, el fichero de calendario y cómo se guardan sus
 * asistentes.
 *
 * La reunión se acuerda dentro de la plataforma: IWL propone franjas, ella
 * elige una o propone otras, hasta que una queda confirmada.
 *
 * Cálculo puro: lo usan las acciones y las pantallas, y se prueba solo.
 */

// `type` y no `interface`: se guardan como JSON, y una interfaz no encaja en ese tipo
export type Franja = {
  /** ISO, con su zona */
  inicio: string;
  fin: string;
};

export type EstadoReunion = "propuesta" | "contrapropuesta" | "confirmada" | "celebrada" | "cancelada";

/** Cómo se llama cada estado, junto a su `<Estado>` */
export const ROTULO_REUNION: Record<EstadoReunion, string> = {
  propuesta: "Propuesta",
  contrapropuesta: "Contrapropuesta",
  confirmada: "Confirmada",
  celebrada: "Celebrada",
  cancelada: "Cancelada",
};

/** Las franjas que todavía se pueden elegir: las que no han empezado */
export function franjasVigentes(franjas: Franja[], ahora = new Date()): Franja[] {
  return franjas.filter((f) => new Date(f.inicio) > ahora);
}

/** Propuesta o contrapropuesta con todas sus franjas pasadas: hay que proponer otras */
export function caducada(estado: string, franjas: Franja[], ahora = new Date()): boolean {
  return (estado === "propuesta" || estado === "contrapropuesta") && franjasVigentes(franjas, ahora).length === 0;
}

export const FORMATOS = {
  videollamada: "por videollamada",
  presencial: "en persona",
} as const;
export type Formato = keyof typeof FORMATOS;

/**
 * El fichero de calendario de una reunión confirmada (RFC 5545), para
 * «Añadir a mi calendario». Las horas van en UTC: cada calendario las pone
 * en la zona de quien lo abre.
 */
export function ics(d: {
  uid: string;
  franja: Franja;
  titulo: string;
  descripcion?: string | null;
  lugar?: string | null;
  ahora?: Date;
}): string {
  const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // Comas, puntos y comas y saltos se escapan; líneas de más de 75 octetos se doblan
  const texto = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const doblar = (linea: string) => {
    const partes: string[] = [];
    let resto = linea;
    while (new TextEncoder().encode(resto).length > 75) {
      let corte = 75;
      while (new TextEncoder().encode(resto.slice(0, corte)).length > 75) corte--;
      partes.push(resto.slice(0, corte));
      resto = ` ${resto.slice(corte)}`;
    }
    partes.push(resto);
    return partes.join("\r\n");
  };
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Inception Woman Lab//Plataforma//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${d.uid}@inceptionwlab.es`,
    `DTSTAMP:${utc((d.ahora ?? new Date()).toISOString())}`,
    `DTSTART:${utc(d.franja.inicio)}`,
    `DTEND:${utc(d.franja.fin)}`,
    `SUMMARY:${texto(d.titulo)}`,
    ...(d.descripcion ? [`DESCRIPTION:${texto(d.descripcion)}`] : []),
    ...(d.lugar ? [`LOCATION:${texto(d.lugar)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(doblar)
    .join("\r\n");
}

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
