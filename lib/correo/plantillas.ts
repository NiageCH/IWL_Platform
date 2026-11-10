/**
 * Las plantillas de los correos de la plataforma, en la voz de IWL: texto
 * corto, un botón con el enlace y la misma cosa en texto plano.
 *
 * Puro: sin envío ni base de datos, para probar cada plantilla sola. Solo
 * transaccional —algo que ha pasado y la persona necesita saber—; nada de
 * boletines.
 */

export const EVENTOS = [
  "enlace_candidatura",
  "reunion_propuesta",
  "reunion_confirmada",
  "reunion_cambiada",
  "reunion_cancelada",
  "nda_enviado",
  "respuesta_comentario",
  "acuerdo_propuesto",
  "descarte",
  "recordatorio",
  "resumen_avisos",
] as const;
export type Evento = (typeof EVENTOS)[number];

/** Para qué es cada evento, como se lee en la ficha */
export const NOMBRE_EVENTO: Record<Evento, string> = {
  enlace_candidatura: "Enlace de su candidatura",
  reunion_propuesta: "Reunión propuesta",
  reunion_confirmada: "Reunión confirmada",
  reunion_cambiada: "Reunión cambiada",
  reunion_cancelada: "Reunión cancelada",
  nda_enviado: "NDA enviado",
  respuesta_comentario: "Respuesta a su comentario",
  acuerdo_propuesto: "Acuerdo propuesto",
  descarte: "Mensaje de descarte",
  recordatorio: "Recordatorio",
  resumen_avisos: "Resumen de avisos",
};

export type DatosCorreo = Record<string, string | number | null | undefined>;

export interface Correo {
  asunto: string;
  texto: string;
  html: string;
}

interface Pieza {
  asunto: string;
  /** Párrafos, en texto plano */
  parrafos: string[];
  boton?: { texto: string; url: string };
}

const s = (v: DatosCorreo[string]) => (v === null || v === undefined ? "" : String(v));
const pila = (nombre: string) => nombre.trim().split(/\s+/)[0] || nombre;
const saludo = (d: DatosCorreo) => (s(d.nombre) ? `Hola, ${pila(s(d.nombre))}:` : "Hola:");

const PIEZAS: Record<Evento, (d: DatosCorreo) => Pieza> = {
  enlace_candidatura: (d) => ({
    asunto: `Hemos recibido tu candidatura · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      `Gracias por presentar ${s(d.startup)} a Inception Woman Lab. Tu candidatura está recibida.`,
      "Desde este enlace privado puedes verla y añadir documentos mientras la revisamos. Guárdalo: es solo tuyo.",
    ],
    boton: { texto: "Ver mi candidatura", url: s(d.enlace) },
  }),
  reunion_propuesta: (d) => ({
    asunto: `Te proponemos fecha para reunirnos · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      "Te proponemos varias fechas para reunirnos. Elige la que te venga bien, o propón otras si ninguna te va.",
      ...(s(d.nota) ? [s(d.nota)] : []),
    ],
    boton: { texto: "Elegir fecha", url: s(d.enlace) },
  }),
  reunion_confirmada: (d) => ({
    asunto: `Reunión confirmada: ${s(d.cuando)} · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      `Nos vemos el ${s(d.cuando)} (hora de Madrid), ${s(d.formato)}.`,
      ...(s(d.lugar) ? [s(d.lugar)] : []),
      "Desde la plataforma puedes añadirla a tu calendario.",
    ],
    boton: { texto: "Ver la reunión", url: s(d.enlace) },
  }),
  reunion_cambiada: (d) => ({
    asunto: `Hemos cambiado la reunión · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      "Tenemos que mover la reunión que teníamos. Te proponemos fechas nuevas: elige la que te venga bien.",
      ...(s(d.motivo) ? [s(d.motivo)] : []),
    ],
    boton: { texto: "Elegir fecha", url: s(d.enlace) },
  }),
  reunion_cancelada: (d) => ({
    asunto: `Reunión cancelada · ${s(d.startup)}`,
    parrafos: [saludo(d), `Hemos cancelado la reunión del ${s(d.cuando)}.`, ...(s(d.motivo) ? [s(d.motivo)] : [])],
    boton: { texto: "Ver tu candidatura", url: s(d.enlace) },
  }),
  nda_enviado: (d) => ({
    asunto: `Tu acuerdo de confidencialidad, listo para firmar · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      "Antes de compartir información confidencial, en las dos direcciones, firmamos un acuerdo de confidencialidad. Ya lo tienes en la plataforma.",
      `Entra con este enlace, elige tu contraseña y lo verás nada más entrar. Tu usuario es ${s(d.correo)}. El enlace vale una vez; si caduca, pídenos otro.`,
    ],
    boton: { texto: "Entrar y elegir mi contraseña", url: s(d.enlace) },
  }),
  respuesta_comentario: (d) => ({
    asunto: `Te hemos respondido · ${s(d.sobre)}`,
    parrafos: [saludo(d), `Hemos respondido a tu comentario sobre ${s(d.sobre)}:`, s(d.respuesta)],
    boton: { texto: "Verlo en la plataforma", url: s(d.enlace) },
  }),
  acuerdo_propuesto: (d) => ({
    asunto: `Tu propuesta de Acuerdo · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      `Te hemos propuesto el Acuerdo de ${s(d.startup)}. Léelo con calma: puedes comentarlo antes de aceptarlo.`,
    ],
    boton: { texto: "Ver la propuesta", url: s(d.enlace) },
  }),
  // El mensaje ya lo ha escrito IWL: va tal cual, sin botón
  descarte: (d) => ({
    asunto: `${s(d.startup)} · Inception Woman Lab`,
    parrafos: s(d.mensaje).split(/\n\s*\n/),
  }),
  recordatorio: (d) => ({
    asunto: s(d.asunto) || "Un recordatorio de Inception Woman Lab",
    parrafos: s(d.cuerpo).split(/\n\s*\n/),
    boton: s(d.enlace) ? { texto: "Entrar en la plataforma", url: s(d.enlace) } : undefined,
  }),
  resumen_avisos: (d) => ({
    asunto: `${s(d.cuantos)} ${Number(d.cuantos) === 1 ? "aviso abierto" : "avisos abiertos"} en la plataforma`,
    parrafos: [
      saludo(d),
      `Tienes ${s(d.cuantos)} ${Number(d.cuantos) === 1 ? "aviso abierto" : "avisos abiertos"}:`,
      s(d.lista),
      "Este resumen llega una vez al día mientras tengas alguno. Puedes dejar de recibirlo en Mi cuenta.",
    ],
    boton: { texto: "Ver los avisos", url: s(d.enlace) },
  }),
};

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** El correo de un evento, en texto plano y en HTML */
export function escribirCorreo(evento: Evento, datos: DatosCorreo): Correo {
  const p = PIEZAS[evento](datos);
  const firma = "Equipo de Inception Woman Lab";
  const texto = [
    ...p.parrafos,
    ...(p.boton ? [`${p.boton.texto}: ${p.boton.url}`] : []),
    firma,
  ].join("\n\n");

  const parrafos = p.parrafos
    .map((t) => `<p style="margin:0 0 16px">${escapar(t).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const boton = p.boton
    ? `<p style="margin:24px 0"><a href="${escapar(p.boton.url)}" style="display:inline-block;background:#e6006e;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${escapar(p.boton.texto)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f5f7"><div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Montserrat,Arial,sans-serif;font-size:15px;line-height:1.55;color:#18181b"><p style="margin:0 0 24px;font-size:11px;font-weight:600;letter-spacing:.12em;color:#18181b">INCEPTION WOMAN LAB</p>${parrafos}${boton}<p style="margin:24px 0 0;color:#52525b">${firma}</p></div></body></html>`;

  return { asunto: p.asunto, texto, html };
}
