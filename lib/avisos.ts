import { PASO_EMBUDO, traza, type Recorrido } from "@/lib/recorridos";
import { fecha } from "@/lib/utils";

/**
 * Los avisos, uno por tipo, en un solo sitio (REVISION, 18 nov).
 *
 * Un aviso es una acción pendiente de quien lo ve, y dice tres cosas:
 *   · qué pasó, con el dato y la fecha;
 *   · qué te toca;
 *   · un botón con ese verbo, que lleva al sitio exacto.
 *
 * El destino lleva `?aviso=<id>` y un ancla: la página pinta arriba la
 * franja «Has venido a: …» con la acción ahí mismo (`<FranjaAviso>`), y el
 * bloque del ancla queda resaltado. El inventario, con quién recibe cada
 * uno y cuándo se cierra, está en `docs/AVISOS.md`.
 *
 * Lo usan la cartera, el resumen diario por correo y la franja: los tres
 * dicen lo mismo con las mismas palabras.
 */

export type TipoAviso =
  | "nda_firmado"
  | "situacion_dicha"
  | "anexo_comentario"
  | "cambio_estadio"
  | "reunion_contrapropuesta"
  | "reunion_caducada"
  | "reunion_anotar"
  | "hito_entregado"
  | "hito_sin_revisar"
  | "candidatura_nueva"
  | "recomendacion_pendiente"
  | "tramo_cerrado"
  | "tramo_cerrado_ella"
  | "listo_para_invertible"
  | "plazo_vencido"
  | "acta_por_firmar"
  | "anexo_aceptado"
  | "documento_entregado"
  | "correos_sin_enviar"
  | "sesion_por_confirmar"
  | "sesion_no_cuadra"
  | "sesion_en_direccion"
  // Ya no se crean (no piden nada); pueden quedar en el historial
  | "primer_acceso"
  | "reunion_elegida";

/** Lo que hace falta de un aviso para decirlo */
export interface DatosAviso {
  id: string;
  tipo: TipoAviso;
  created_at: string;
  /** Quien lo provocó: ella, la fundadora */
  persona: string;
  /** La compañía o la candidatura */
  donde: string | null;
  candidaturaId: string | null;
  companiaSlug: string | null;
  hito: { id: string; titulo: string } | null;
  /** La situación societaria dicha, en palabras */
  situacion: string | null;
  reunion: { inicio: string | null; franjas: number } | null;
  /** El acta de comité que falta por firmar */
  actaId?: string | null;
  /** El punto del due diligence entregado */
  punto?: { id: string; titulo: string } | null;
  /** Cuántos correos siguen sin enviar */
  cuantos?: number;
  /** La sesión de la que hablan sus horas */
  sesion?: { id: string; fecha: string; tipo: "sesion" | "trabajo"; titulo: string; horas: number } | null;
}

export interface AvisoPresentado {
  /** Qué pasó: «Alba dijo su situación: sin constituir, el 10 nov» */
  paso: string;
  /** Qué te toca: «Confirmarla» */
  toca: string;
  /** El verbo del botón */
  verbo: string;
  /** A dónde lleva, con `?aviso=` y el ancla */
  href: string;
  /** El bloque que se resalta al llegar */
  ancla: string;
  /** «Has venido a: confirmar la situación societaria de Porongo» */
  hasVenidoA: string;
  vieneDe: string | null;
  despues: string | null;
}

/** A dónde lleva un aviso de hito: a su hoja de ruta, con el hito a la vista */
export function enlaceHito(slug: string, hitoId: string, avisoId?: string): string {
  return `/cartera/${slug}/ruta${avisoId ? `?aviso=${avisoId}` : ""}#hito-${hitoId}`;
}

function horasDichas(h: number | null | undefined): string {
  return `${String(h ?? 0).replace(".", ",")} h`;
}

function dia(cuando: string | null | undefined): string {
  return cuando ? fecha(cuando) : "hace poco";
}

/** El recorrido y el paso que pide cada tipo, para «Viene de · Después» */
const PASO_DEL_RECORRIDO: Partial<Record<TipoAviso, [Recorrido, number]>> = {
  candidatura_nueva: ["embudo", PASO_EMBUDO.revisar],
  acta_por_firmar: ["embudo", PASO_EMBUDO.comite],
  // Del NDA de antes del 22 nov, que ya no está en el recorrido: sin «Viene de»
  recomendacion_pendiente: ["embudo", PASO_EMBUDO.filtro],
  situacion_dicha: ["entrada", 1],
  anexo_comentario: ["entrada", 4],
  anexo_aceptado: ["entrada", 5],
  reunion_contrapropuesta: ["reunion", 1],
  reunion_caducada: ["reunion", 0],
  reunion_anotar: ["reunion", 3],
  hito_entregado: ["hito", 1],
  hito_sin_revisar: ["hito", 1],
  documento_entregado: ["documento", 1],
};

export function presentarAviso(a: DatosAviso): AvisoPresentado {
  const [recorrido, indice] = PASO_DEL_RECORRIDO[a.tipo] ?? [null, 0];
  const { vieneDe, despues } = recorrido ? traza(recorrido, indice) : { vieneDe: null, despues: null };
  const quien = a.persona;
  const sitio = a.donde ?? "la compañía";
  const conAviso = (ruta: string, ancla: string) => `${ruta}?aviso=${a.id}#${ancla}`;
  const embudo = (ancla: string) => conAviso(`/embudo/${a.candidaturaId ?? ""}`, ancla);
  const ficha = (sub: string, ancla: string) =>
    conAviso(`/cartera/${a.companiaSlug ?? ""}${sub}`, ancla);
  const base = { vieneDe, despues };

  switch (a.tipo) {
    case "nda_firmado":
      return {
        ...base,
        paso: `${quien} firmó el NDA el ${dia(a.created_at)}`,
        toca: "Contrafirmarlo",
        verbo: "Contrafirmar",
        href: embudo("nda"),
        ancla: "nda",
        hasVenidoA: `contrafirmar el NDA de ${sitio}`,
      };
    case "situacion_dicha":
      return {
        ...base,
        paso: `${quien} dijo su situación${a.situacion ? `: ${a.situacion.toLowerCase()}` : ""}, el ${dia(a.created_at)}`,
        toca: "Confirmarla",
        verbo: "Confirmar",
        href: ficha("", "situacion"),
        ancla: "situacion",
        hasVenidoA: `confirmar la situación societaria de ${sitio}`,
      };
    case "anexo_comentario":
      return {
        ...base,
        paso: `${quien} comentó la propuesta de Acuerdo el ${dia(a.created_at)}`,
        toca: "Responderle",
        verbo: "Responder",
        href: ficha("/programa", "anexo"),
        ancla: "anexo",
        hasVenidoA: `responder al comentario de ${quien} sobre el Acuerdo de ${sitio}`,
      };
    // La hoja de ruta en cuatro tramos (REVISION, 23 nov)
    case "tramo_cerrado":
      return {
        ...base,
        paso: `${sitio} cerró un tramo de su hoja de ruta el ${dia(a.created_at)}`,
        toca: "Ver cómo sigue",
        verbo: "Ver",
        href: ficha("/ruta", "seguimiento"),
        ancla: "seguimiento",
        hasVenidoA: `ver cómo sigue la hoja de ruta de ${sitio}`,
      };
    case "tramo_cerrado_ella":
      return {
        ...base,
        paso: `Habéis cerrado un tramo de vuestra hoja de ruta el ${dia(a.created_at)}`,
        toca: "Ver el siguiente",
        verbo: "Ver",
        href: conAviso("/proyecto/ruta", "seguimiento"),
        ancla: "seguimiento",
        hasVenidoA: "ver el tramo que empieza",
      };
    case "listo_para_invertible":
      return {
        ...base,
        // El texto, de la REVISION del 23 nov (invertible decidido)
        paso: `${sitio} cerró el tramo 4 el ${dia(a.created_at)}. Lista para graduar: confirma si es invertible`,
        toca: "Lista para graduar: confirma si es invertible",
        verbo: "Confirmar",
        // Si lo es, se gradúa: el cierre, en su ficha (bloque 8)
        href: ficha("", "cierre"),
        ancla: "cierre",
        hasVenidoA: `confirmar si ${sitio} es invertible y graduarla`,
      };
    case "plazo_vencido":
      return {
        ...base,
        paso: `A ${sitio} se le ha acabado el plazo máximo de su hoja de ruta`,
        toca: "Decidir el cierre",
        verbo: "Revisar",
        href: ficha("", "cierre"),
        ancla: "cierre",
        hasVenidoA: `decidir qué se hace con ${sitio}, que ha agotado su plazo`,
      };
    case "cambio_estadio":
      return {
        ...base,
        paso: `${sitio} cambió de estadio el ${dia(a.created_at)}`,
        toca: "Revisar lo que pasa a por entregar",
        verbo: "Revisar",
        href: ficha("/diligencia", "puntos"),
        ancla: "puntos",
        hasVenidoA: `revisar lo que ${sitio} tiene que entregar ahora`,
      };
    case "reunion_contrapropuesta":
      return {
        ...base,
        paso: `${quien} propone otras fechas${a.reunion?.franjas ? ` (${a.reunion.franjas})` : ""}, el ${dia(a.created_at)}`,
        toca: "Aceptar una o proponer otras",
        verbo: "Elegir fecha",
        href: embudo("reunion"),
        ancla: "reunion",
        hasVenidoA: `elegir fecha para la reunión con ${sitio}`,
      };
    case "reunion_caducada":
      return {
        ...base,
        paso: `Pasaron todas las fechas de la reunión con ${quien} sin elegir ninguna`,
        toca: "Proponer otras",
        verbo: "Proponer fechas",
        href: embudo("reunion"),
        ancla: "reunion",
        hasVenidoA: `proponer otras fechas a ${sitio}`,
      };
    case "reunion_anotar":
      return {
        ...base,
        paso: `La reunión del ${dia(a.reunion?.inicio)} con ${sitio} ya pasó`,
        toca: "Anotarla",
        verbo: "Anotar",
        href: embudo("reunion"),
        ancla: "reunion",
        hasVenidoA: `anotar la reunión del ${dia(a.reunion?.inicio)} con ${sitio}`,
      };
    case "hito_entregado":
      return {
        ...base,
        paso: `${quien} entregó el hito «${a.hito?.titulo ?? "sin nombre"}» el ${dia(a.created_at)}`,
        toca: "Revisarlo",
        verbo: "Revisar",
        href: enlaceHito(a.companiaSlug ?? "", a.hito?.id ?? "", a.id),
        ancla: `hito-${a.hito?.id ?? ""}`,
        hasVenidoA: `revisar el hito «${a.hito?.titulo ?? ""}» de ${sitio}`,
      };
    case "hito_sin_revisar":
      return {
        ...base,
        paso: `El hito «${a.hito?.titulo ?? "sin nombre"}» lleva más de 7 días entregado sin revisar`,
        toca: "Revisarlo",
        verbo: "Revisar",
        href: enlaceHito(a.companiaSlug ?? "", a.hito?.id ?? "", a.id),
        ancla: `hito-${a.hito?.id ?? ""}`,
        hasVenidoA: `revisar el hito «${a.hito?.titulo ?? ""}» de ${sitio}`,
      };
    case "candidatura_nueva":
      return {
        ...base,
        paso: `${quien} presentó ${sitio} el ${dia(a.created_at)}`,
        toca: "Revisarla",
        verbo: "Abrir",
        href: embudo("pasos"),
        ancla: "pasos",
        hasVenidoA: `revisar la candidatura de ${sitio}`,
      };
    case "recomendacion_pendiente":
      return {
        ...base,
        paso: `${sitio} se presenta como idea y te pone como quien la recomienda, el ${dia(a.created_at)}`,
        toca: "Confirmar la recomendación o decir que no",
        verbo: "Responder",
        href: embudo("filtro"),
        ancla: "filtro",
        hasVenidoA: `confirmar si recomiendas ${sitio}`,
      };
    case "acta_por_firmar":
      return {
        ...base,
        paso: `El acta de comité de ${sitio} espera tu firma desde el ${dia(a.created_at)}`,
        toca: "Firmarla",
        verbo: "Firmar el acta",
        href: embudo("comite"),
        ancla: "comite",
        hasVenidoA: `firmar el acta de comité de ${sitio}`,
      };
    case "anexo_aceptado":
      return {
        ...base,
        paso: `${quien} aceptó la propuesta de Acuerdo el ${dia(a.created_at)}`,
        toca: "Firmar el Acuerdo",
        verbo: "Firmar",
        href: ficha("/programa", "anexo"),
        ancla: "anexo",
        hasVenidoA: `firmar el Acuerdo con ${sitio}`,
      };
    case "documento_entregado": {
      const titulo = a.punto?.titulo ?? "un documento";
      const ancla = `punto-${a.punto?.id ?? ""}`;
      return {
        ...base,
        paso: `${quien} entregó «${titulo}» el ${dia(a.created_at)}`,
        toca: "Revisarlo",
        verbo: "Revisar",
        href: ficha("/diligencia", ancla),
        ancla,
        hasVenidoA: `revisar «${titulo}» de ${sitio}`,
      };
    }
    case "correos_sin_enviar": {
      const n = a.cuantos ?? 0;
      return {
        ...base,
        paso: `${n === 1 ? "1 correo sin enviar" : `${n} correos sin enviar`} desde el ${dia(a.created_at)}`,
        toca: n === 1 ? "Reintentarlo" : "Reintentarlos",
        verbo: "Reintentar",
        href: conAviso("/admin/correos", "correos"),
        ancla: "correos",
        hasVenidoA: n === 1 ? "reintentar el correo que no salió" : `reintentar los ${n} correos que no salieron`,
      };
    }
    case "sesion_por_confirmar": {
      const ses = a.sesion;
      const ancla = `sesion-${ses?.id ?? ""}`;
      return {
        ...base,
        paso: `${quien} ha registrado ${horasDichas(ses?.horas)} de ${ses?.tipo === "trabajo" ? "trabajo" : "sesión"} del ${dia(ses?.fecha)}`,
        toca: "Confirmarlas o decir qué no cuadra",
        verbo: "Revisar",
        href: conAviso("/proyecto/sesiones", ancla),
        ancla,
        hasVenidoA: `confirmar las horas de «${ses?.titulo ?? "la sesión"}»`,
      };
    }
    case "sesion_no_cuadra": {
      const ses = a.sesion;
      const ancla = `sesion-${ses?.id ?? ""}`;
      return {
        ...base,
        paso: `${quien} dice que no cuadran las horas de «${ses?.titulo ?? "una sesión"}», del ${dia(ses?.fecha)}`,
        toca: "Responder: corregirlas o mantenerlas",
        verbo: "Responder",
        href: ficha("/sesiones", ancla),
        ancla,
        hasVenidoA: `responder sobre las horas de «${ses?.titulo ?? "la sesión"}» con ${sitio}`,
      };
    }
    case "sesion_en_direccion": {
      const ses = a.sesion;
      const ancla = `sesion-${ses?.id ?? ""}`;
      return {
        ...base,
        paso: `Las horas de «${ses?.titulo ?? "una sesión"}» con ${sitio} no cuadran y han llegado a dirección`,
        toca: "Decidir y cerrar",
        verbo: "Decidir",
        href: ficha("/sesiones", ancla),
        ancla,
        hasVenidoA: `decidir las horas de «${ses?.titulo ?? "la sesión"}» con ${sitio}`,
      };
    }
    case "primer_acceso":
      return {
        ...base,
        paso: `${quien} entró por primera vez el ${dia(a.created_at)}`,
        toca: "Nada",
        verbo: "Ver",
        href: a.candidaturaId ? `/embudo/${a.candidaturaId}` : "/cartera",
        ancla: "",
        hasVenidoA: "",
      };
    case "reunion_elegida":
      return {
        ...base,
        paso: `${quien} eligió fecha para la reunión`,
        toca: "Nada",
        verbo: "Ver",
        href: a.candidaturaId ? `/embudo/${a.candidaturaId}#reunion` : "/cartera",
        ancla: "reunion",
        hasVenidoA: "",
      };
  }
}

/** La línea del correo diario: lo mismo que en la cartera */
export function lineaAviso(a: DatosAviso): string {
  const p = presentarAviso(a);
  return `${p.paso}. Te toca: ${p.toca.toLowerCase()}.`;
}
