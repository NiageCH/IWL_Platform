import { ics } from "@/lib/reuniones";

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
  "reunion_contrapropuesta",
  "nda_enviado",
  "acceso_dado",
  "respuesta_comentario",
  "acuerdo_propuesto",
  "descarte",
  "recordatorio",
  "resumen_avisos",
  "sesion_registrada",
] as const;
export type Evento = (typeof EVENTOS)[number];

/** Para qué es cada evento, como se lee en la ficha */
export const NOMBRE_EVENTO: Record<Evento, string> = {
  enlace_candidatura: "Enlace de su candidatura",
  reunion_propuesta: "Reunión propuesta",
  reunion_confirmada: "Reunión confirmada",
  reunion_cambiada: "Reunión cambiada",
  reunion_cancelada: "Reunión cancelada",
  reunion_contrapropuesta: "Otras fechas propuestas por ella",
  nda_enviado: "NDA enviado",
  acceso_dado: "Su cuenta en la plataforma",
  respuesta_comentario: "Respuesta a su comentario",
  acuerdo_propuesto: "Acuerdo propuesto",
  descarte: "Mensaje de descarte",
  recordatorio: "Recordatorio",
  resumen_avisos: "Resumen de avisos",
  sesion_registrada: "Horas por confirmar",
};

export type DatosCorreo = Record<string, string | number | null | undefined>;

export interface Adjunto {
  nombre: string;
  tipo: string;
  /** En base64 */
  contenido: string;
}

export interface Correo {
  asunto: string;
  texto: string;
  html: string;
  adjuntos?: Adjunto[];
}

/** Un enlace dentro del texto: en HTML, `<a>`; en texto plano, la dirección en su línea */
interface Enlace {
  texto: string;
  url: string;
}

/** Un párrafo: texto, o texto con enlaces dentro */
type Parrafo = string | Array<string | Enlace>;

interface Pieza {
  asunto: string;
  parrafos: Parrafo[];
  boton?: Enlace;
  /** Lo que va después del botón: el mismo enlace escrito, por si el botón no se ve */
  trasBoton?: Parrafo[];
  adjuntos?: Adjunto[];
}

const s = (v: DatosCorreo[string]) => (v === null || v === undefined ? "" : String(v));
const pila = (nombre: string) => nombre.trim().split(/\s+/)[0] || nombre;
const saludo = (d: DatosCorreo) => (s(d.nombre) ? `Hola, ${pila(s(d.nombre))}:` : "Hola:");

// -----------------------------------------------------------------------------
// Lo que llevan los correos de reunión (REVISION, 13 nov)
//
// Los datos los prepara `datosReunion` en `lib/reuniones.ts`, y se guardan
// con el correo: al reintentar se vuelve a escribir igual, con su `.ics`.
// -----------------------------------------------------------------------------

const mapa = (direccion: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;

/** Las franjas, una por línea */
const listaFranjas = (d: DatosCorreo): Parrafo => s(d.franjas).split("\n").filter(Boolean).map((f) => `· ${f}`).join("\n");

/** Dónde: el enlace de la videollamada, o la dirección con su mapa */
function donde(d: DatosCorreo, tambienEnLaQueElijas = false): Parrafo | null {
  if (d.formato === "videollamada" && s(d.enlace_reunion)) {
    return [
      "Por videollamada. Enlace de la videollamada: ",
      { texto: s(d.enlace_reunion), url: s(d.enlace_reunion) },
      ...(tambienEnLaQueElijas ? [" Es el mismo para la fecha que elijas."] : []),
    ];
  }
  if (d.formato === "presencial" && s(d.direccion)) {
    return ["En persona, en ", { texto: s(d.direccion), url: mapa(s(d.direccion)) }, "."];
  }
  return null;
}

const quienVa = (d: DatosCorreo): Parrafo[] => (s(d.personas_iwl) ? [`De IWL estaremos: ${s(d.personas_iwl)}.`] : []);

/** Base64 de un texto en UTF-8, sin depender de Node */
function base64(texto: string): string {
  let binario = "";
  for (const b of new TextEncoder().encode(texto)) binario += String.fromCharCode(b);
  return btoa(binario);
}

/** La invitación de calendario de una reunión confirmada, con el enlace dentro */
function invitacion(d: DatosCorreo): Adjunto[] {
  if (!s(d.inicio) || !s(d.fin)) return [];
  const lugar = d.formato === "videollamada" ? s(d.enlace_reunion) : s(d.direccion);
  const descripcion = [
    d.formato === "videollamada" && s(d.enlace_reunion) ? `Enlace de la videollamada: ${s(d.enlace_reunion)}` : "",
    d.formato === "presencial" && s(d.direccion) ? `Dirección: ${s(d.direccion)}` : "",
    s(d.personas_iwl) ? `De IWL: ${s(d.personas_iwl)}` : "",
    s(d.enlace) ? `En la plataforma: ${s(d.enlace)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const contenido = ics({
    uid: s(d.reunion_id) || `${s(d.inicio)}-${s(d.startup)}`,
    franja: { inicio: s(d.inicio), fin: s(d.fin) },
    titulo: `Inception Woman Lab · ${s(d.startup)}`,
    descripcion,
    lugar: lugar || null,
  });
  return [{ nombre: "reunion-iwl.ics", tipo: "text/calendar", contenido: base64(contenido) }];
}

/** El botón de una reunión confirmada: unirse, o cómo llegar */
function botonReunion(d: DatosCorreo): Enlace | undefined {
  if (d.formato === "videollamada" && s(d.enlace_reunion)) {
    return { texto: "Unirse a la videollamada", url: s(d.enlace_reunion) };
  }
  if (d.formato === "presencial" && s(d.direccion)) {
    return { texto: "Cómo llegar", url: mapa(s(d.direccion)) };
  }
  return undefined;
}

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
      "Te proponemos estas fechas para reunirnos (hora de Madrid):",
      listaFranjas(d),
      ...[donde(d, true)].filter((p): p is Parrafo => p !== null),
      ...quienVa(d),
      ...(s(d.nota) ? [s(d.nota)] : []),
      "Elige la que te venga bien, o propón otras si ninguna te va.",
    ],
    boton: { texto: "Elegir fecha", url: s(d.enlace) },
  }),
  reunion_confirmada: (d) => ({
    asunto: `Reunión confirmada: ${s(d.cuando)} · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      `Nos vemos el ${s(d.cuando)} (hora de Madrid)${d.formato === "presencial" ? ", en persona" : d.formato === "videollamada" ? ", por videollamada" : ""}.`,
      ...quienVa(d),
      "Te adjuntamos la invitación para tu calendario, con el enlace dentro.",
    ],
    boton: botonReunion(d),
    trasBoton: [
      ...[donde(d)].filter((p): p is Parrafo => p !== null),
      ["También la tienes en la plataforma: ", { texto: "ver la reunión", url: s(d.enlace) }, "."],
    ],
    adjuntos: invitacion(d),
  }),
  /*
   * Cambiar una reunión confirmada es proponer fechas nuevas: hasta que
   * elija no hay fecha, así que no lleva invitación ni «Unirse». Esas van
   * en la confirmación que le llega al elegir.
   */
  reunion_cambiada: (d) => ({
    asunto: `Hemos cambiado la reunión · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      "Tenemos que mover la reunión que teníamos. Te proponemos fechas nuevas (hora de Madrid):",
      listaFranjas(d),
      ...(s(d.motivo) ? [`El motivo: ${s(d.motivo)}`] : []),
      ...[donde(d, true)].filter((p): p is Parrafo => p !== null),
      ...quienVa(d),
      "Elige la que te venga bien.",
    ],
    boton: { texto: "Elegir fecha", url: s(d.enlace) },
  }),
  reunion_cancelada: (d) => ({
    asunto: `Reunión cancelada · ${s(d.startup)}`,
    parrafos: [saludo(d), `Hemos cancelado la reunión del ${s(d.cuando)}.`, ...(s(d.motivo) ? [s(d.motivo)] : [])],
    boton: { texto: "Ver tu candidatura", url: s(d.enlace) },
  }),
  // A IWL, cuando ella no puede en ninguna y propone las suyas
  reunion_contrapropuesta: (d) => ({
    asunto: `${s(d.contacto) || "La candidata"} propone otras fechas · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      `${s(d.contacto) || "La candidata"}, de ${s(d.startup)}, no puede en las fechas que le propusimos y propone estas (hora de Madrid):`,
      listaFranjas(d),
      ...(s(d.nota) ? [`Su nota: ${s(d.nota)}`] : []),
    ],
    boton: { texto: "Elegir una", url: s(d.enlace) },
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
  // «Darle cuenta» sin «Enviar el NDA»: el NDA se firmó fuera
  acceso_dado: (d) => ({
    asunto: `Tu cuenta en la plataforma de IWL · ${s(d.startup)}`,
    parrafos: [
      saludo(d),
      "Ya tienes cuenta en la plataforma de Inception Woman Lab. Desde ella seguiremos lo que viene: el due diligence, el Acuerdo y el programa.",
      `Entra con este enlace y elige tu contraseña. Tu usuario es ${s(d.correo)}. El enlace vale una vez; si caduca, pídelo en la entrada, en «¿Has olvidado tu contraseña?».`,
    ],
    boton: { texto: "Entrar y elegir mi contraseña", url: s(d.enlace) },
  }),
  respuesta_comentario: (d) => ({
    asunto: `Te hemos respondido · ${s(d.sobre)}`,
    parrafos: [saludo(d), `Hemos respondido a tu comentario sobre ${s(d.sobre)}:`, s(d.respuesta)],
    boton: { texto: "Verlo en la plataforma", url: s(d.enlace) },
  }),
  sesion_registrada: (d) => ({
    asunto: `${s(d.quien)} ha registrado ${s(d.horas)} h · ¿Lo confirmas?`,
    parrafos: [
      saludo(d),
      `${s(d.quien)} ha registrado ${s(d.horas)} h de ${s(d.que)} del ${s(d.fecha)}: «${s(d.titulo)}».`,
      "Revisa el acta y confirma las horas, o di qué no cuadra. Si en 7 días no respondes, se dan por confirmadas.",
    ],
    boton: { texto: "Revisar y confirmar", url: s(d.enlace) },
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

/** Un párrafo en texto plano: cada enlace, con su dirección entera en su propia línea */
function enTexto(p: Parrafo): string {
  if (typeof p === "string") return p;
  const conSaltos = p
    .map((t) => (typeof t === "string" ? t : `${t.texto === t.url ? "" : t.texto}\n${t.url}\n`))
    .join("");
  return conSaltos
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

/** Un párrafo en HTML: los enlaces, `<a>` con el color de acento sobre papel */
function enHtml(p: Parrafo): string {
  const trozos = typeof p === "string" ? [p] : p;
  const dentro = trozos
    .map((t) =>
      typeof t === "string"
        ? escapar(t).replace(/\n/g, "<br>")
        : `<a href="${escapar(t.url)}" style="color:#c4005c;text-decoration:underline;word-break:break-all">${escapar(t.texto)}</a>`,
    )
    .join("");
  return `<p style="margin:0 0 16px">${dentro}</p>`;
}

/** El correo de un evento, en texto plano y en HTML */
export function escribirCorreo(evento: Evento, datos: DatosCorreo): Correo {
  const p = PIEZAS[evento](datos);
  const firma = "Equipo de Inception Woman Lab";
  const trasBoton = p.trasBoton ?? [];
  const texto = [
    ...p.parrafos.map(enTexto),
    ...(p.boton ? [`${p.boton.texto}: ${p.boton.url}`] : []),
    ...trasBoton.map(enTexto),
    firma,
  ].join("\n\n");

  const boton = p.boton
    ? `<p style="margin:24px 0"><a href="${escapar(p.boton.url)}" style="display:inline-block;background:#e6006e;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">${escapar(p.boton.texto)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f4f5f7"><div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Montserrat,Arial,sans-serif;font-size:15px;line-height:1.55;color:#18181b"><p style="margin:0 0 24px;font-size:11px;font-weight:600;letter-spacing:.12em;color:#18181b">INCEPTION WOMAN LAB</p>${p.parrafos.map(enHtml).join("")}${boton}${trasBoton.map(enHtml).join("")}<p style="margin:24px 0 0;color:#52525b">${firma}</p></div></body></html>`;

  return { asunto: p.asunto, texto, html, ...(p.adjuntos?.length ? { adjuntos: p.adjuntos } : {}) };
}
