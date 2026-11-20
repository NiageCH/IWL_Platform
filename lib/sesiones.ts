/**
 * Las sesiones y sus horas, sin base de datos ni React (REVISION, 13 nov).
 *
 * Lo comparten la pantalla de Sesiones, la Aportación y los informes: las
 * horas entregadas se separan en confirmadas, por confirmar y en
 * discusión, y el cumplimiento del Anexo se mide con las confirmadas.
 */

export type EstadoSesion =
  | "por_confirmar"
  | "en_discusion"
  | "en_direccion"
  | "confirmada"
  | "confirmada_plazo"
  | "confirmada_direccion"
  | "confirmada_previa"
  | "anulada";

/** Cómo se dice cada estado, en la pastilla */
export const NOMBRE_ESTADO_SESION: Record<EstadoSesion, string> = {
  por_confirmar: "Por confirmar",
  en_discusion: "No cuadra · en discusión",
  en_direccion: "En dirección",
  confirmada: "Confirmada",
  confirmada_plazo: "Confirmada por plazo",
  confirmada_direccion: "Cerrada por dirección",
  confirmada_previa: "Confirmada (antes del 13 nov)",
  anulada: "Anulada",
};

export const MODALIDADES: Record<string, string> = {
  presencial: "Presencial",
  videollamada: "Videollamada",
  telefono: "Teléfono",
};

/** Días que tiene ella para responder antes de que se confirme sola */
export const DIAS_PARA_CONFIRMAR = 7;

export type GrupoHoras = "confirmadas" | "porConfirmar" | "enDiscusion" | "anuladas";

export function grupoDe(estado: EstadoSesion): GrupoHoras {
  if (estado === "anulada") return "anuladas";
  if (estado === "por_confirmar") return "porConfirmar";
  if (estado === "en_discusion" || estado === "en_direccion") return "enDiscusion";
  return "confirmadas";
}

export type RecuentoHoras = Record<GrupoHoras, number>;

export const RECUENTO_VACIO: RecuentoHoras = { confirmadas: 0, porConfirmar: 0, enDiscusion: 0, anuladas: 0 };

/** Suma en centésimas, para que 0,1 + 0,2 sea 0,3 */
export function sumarPorEstado(sesiones: Array<{ estado: EstadoSesion; horas: number }>): RecuentoHoras {
  const centesimas: RecuentoHoras = { ...RECUENTO_VACIO };
  for (const s of sesiones) centesimas[grupoDe(s.estado)] += Math.round(s.horas * 100);
  return {
    confirmadas: centesimas.confirmadas / 100,
    porConfirmar: centesimas.porConfirmar / 100,
    enDiscusion: centesimas.enDiscusion / 100,
    anuladas: centesimas.anuladas / 100,
  };
}

/** Cuándo se confirma sola, si nadie responde */
export function confirmaSolaEl(pendienteDesde: string): Date {
  return new Date(new Date(pendienteDesde).getTime() + DIAS_PARA_CONFIRMAR * 86_400_000);
}

/** Cómo se llama cada apartado del acta en su historia de versiones */
export const APARTADOS_ACTA: Record<string, string> = {
  held_on: "fecha",
  duration_minutes: "duración",
  modality: "modalidad",
  attendees_company: "quién estuvo",
  title: "título",
  subject_id: "materia",
  pillar_id: "pilar",
  worked: "qué se trabajó",
  deliverable_url: "entregable",
};

/** Lo que dice cada paso de su historia */
export function textoEvento(tipo: string, detalle: Record<string, unknown>): string {
  const n = (v: unknown) => String(v).replace(".", ",");
  switch (tipo) {
    case "registrada":
      return `La registró${detalle.horas != null ? `, con ${n(detalle.horas)} h` : ""}`;
    case "confirmada":
      return "La confirmó";
    case "no_cuadra":
      return "Dijo que no cuadra";
    case "comentario":
      return "Comentó";
    case "correccion":
      return `Corrigió las horas de ${detalle.persona ?? "una persona"}: de ${n(detalle.antes)} h a ${n(detalle.despues)} h`;
    case "mantenida":
      return "Mantuvo las horas";
    case "a_direccion":
      return "La llevó a dirección";
    case "decision":
      return "Dirección decidió y la cerró";
    case "confirmada_plazo":
      return "Confirmada por plazo";
    case "anulada":
      return "La anuló";
    case "migrada":
      return "Confirmada (antes del 13 nov)";
    case "acta":
      return "Cambió el acta";
    case "version_acta": {
      const campos = Array.isArray(detalle.campos) ? (detalle.campos as string[]) : [];
      const horas = Array.isArray(detalle.horas) ? detalle.horas.length : 0;
      const partes = campos.map((c) => APARTADOS_ACTA[c] ?? c);
      if (horas) partes.push("las horas");
      const que = partes.length ? `: ${partes.join(", ")}` : "";
      return `${detalle.confirmada ? "Corrigió el acta confirmada" : "Editó el acta"}${que}${detalle.reabierta ? ". Vuelve a esperar su confirmación" : ""}`;
    }
    default:
      return tipo;
  }
}
