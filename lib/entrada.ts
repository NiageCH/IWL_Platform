import { revisionDe, type Estadio } from "@/lib/estadios";
import { equity } from "@/lib/utils";

/**
 * La compañía en entrada: entre el NDA firmado por las dos partes y el
 * Acuerdo. Lo compartido entre el servidor y los formularios.
 */

export type DecisionIncorporacion = "si" | "no";
export type BaseIncorporacion = "due_diligence" | "estrategica";

export const BASES: Record<BaseIncorporacion, string> = {
  due_diligence: "Due diligence",
  estrategica: "Estratégica",
};

/**
 * La base normal de cada estadio: con due diligence se decide con él; en
 * idea, que va con diagnóstico, es estratégica. Las dos valen en cualquier
 * estadio, con su motivo.
 */
export function baseSugerida(estadio: Estadio | null | undefined): BaseIncorporacion {
  return revisionDe(estadio) === "due_diligence" ? "due_diligence" : "estrategica";
}

/** El siguiente paso, en palabras de ella, según su revisión de entrada */
export function siguientePasoEntrada(estadio: Estadio | null | undefined): string {
  return revisionDe(estadio) === "due_diligence"
    ? "Ahora, el due diligence: en «Due diligence» tienes lo que te pedimos. Con lo obligatorio validado, IWL decide la incorporación y te propone el Acuerdo."
    : "Ahora, un diagnóstico corto con IWL: una reunión, tu ficha y tu situación societaria. Lo documental se construye con nosotras dentro del programa; no tienes que entregar nada para entrar.";
}

/** El mensaje para ella si no se incorpora, en la voz de IWL y para editar */
export function mensajeNoIncorporada(contacto: string, startup: string): string {
  const pila = contacto.split(" ")[0] || contacto;
  return (
    `Hola, ${pila}:\n\n` +
    `Gracias por el trabajo de estas semanas con ${startup}. Lo hemos analizado con calma y ` +
    `esta vez no seguimos adelante con la incorporación al programa.\n\n` +
    `[El motivo, si es objetivo y ayuda.]\n\n` +
    `Lo que nos has compartido se queda guardado y bajo el NDA que firmamos.\n\n` +
    `Un saludo,\nEquipo de Inception Woman Lab`
  );
}

/** Lo que hace falta saber de una compañía en entrada para decir su paso */
export interface EstadoEntrada {
  estadio: Estadio | null;
  situacionDicha: boolean;
  situacionConfirmada: boolean;
  /** Puntos obligatorios del due diligence: validados (o que no aplican) y total */
  obligatoriosHechos: number;
  obligatorios: number;
  decision: DecisionIncorporacion | null;
  /** El estado del último Anexo, si hay */
  anexo: string | null;
}

export type QuienMueve = "ella" | "iwl" | "direccion";

/**
 * El paso en que está una compañía en entrada, y a quién le toca moverlo.
 *
 * En el orden del recorrido: situación, due diligence (no en idea),
 * decisión, propuesta, aceptación y firma. La lista «En entrada» enseña
 * esto en cada fila, y el contador de dirección cuenta las que esperan a
 * dirección.
 */
export function pasoEntrada(e: EstadoEntrada): { texto: string; quien: QuienMueve } {
  if (!e.situacionDicha) return { texto: "Falta que diga su situación societaria", quien: "ella" };
  if (!e.situacionConfirmada) return { texto: "Confirmar su situación societaria", quien: "iwl" };

  if (!e.decision) {
    if (revisionDe(e.estadio) === "due_diligence" && e.obligatoriosHechos < e.obligatorios) {
      return { texto: `Due diligence: ${e.obligatoriosHechos} de ${e.obligatorios} obligatorios`, quien: "ella" };
    }
    return { texto: "Decidir la incorporación", quien: "direccion" };
  }

  if (!e.anexo || e.anexo === "borrador") return { texto: "Proponerle el Acuerdo", quien: "iwl" };
  if (e.anexo === "propuesto" || e.anexo === "comentado") {
    return { texto: "Esperando que acepte la propuesta de Acuerdo", quien: "ella" };
  }
  if (e.anexo === "aceptado") return { texto: "Firmar el Acuerdo", quien: "iwl" };
  return { texto: "Acuerdo firmado", quien: "iwl" };
}

/** La horquilla de equity de un estadio: vacía, no se comprueba */
export interface Horquilla {
  min: number | null;
  max: number | null;
}

/** Lee la horquilla de un estadio del ajuste `equity_horquilla`, sin suponer nada */
export function horquillaDe(ajuste: unknown, estadio: Estadio | null | undefined): Horquilla | null {
  if (!estadio || !ajuste || typeof ajuste !== "object") return null;
  const h = (ajuste as Record<string, { min?: unknown; max?: unknown } | undefined>)[estadio];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const min = num(h?.min);
  const max = num(h?.max);
  return min === null && max === null ? null : { min, max };
}

export function fueraDeHorquilla(equity: number | null, h: Horquilla | null): boolean {
  if (equity === null || !h) return false;
  return (h.min !== null && equity < h.min) || (h.max !== null && equity > h.max);
}

export function textoHorquilla(h: Horquilla): string {
  if (h.min !== null && h.max !== null) return `entre el ${equity(h.min)} y el ${equity(h.max)}`;
  if (h.min !== null) return `desde el ${equity(h.min)}`;
  return `hasta el ${equity(h.max)}`;
}

/**
 * Sin sociedad, el equity está comprometido y se materializa al
 * constituirla. Con sociedad desde el principio, no hay nada que contar.
 */
export function estadoEquity(
  situacion: string | null | undefined,
  materializadoOn: string | null | undefined,
): "comprometido" | "materializado" | null {
  if (materializadoOn) return "materializado";
  if (situacion === "sin_constituir" || situacion === "en_constitucion") return "comprometido";
  return null;
}

/**
 * El tope del tramo de entrada con diagnóstico (idea): al llegar, atención;
 * a la semana, vencido. Con due diligence no hay tope: el due diligence ya
 * avisa.
 */
export function estadoTope(
  estadio: Estadio | null | undefined,
  dias: number,
  tope: number,
): "atencion" | "vencido" | null {
  if (revisionDe(estadio) !== "diagnostico" || tope <= 0) return null;
  if (dias >= tope + 7) return "vencido";
  if (dias >= tope) return "atencion";
  return null;
}
