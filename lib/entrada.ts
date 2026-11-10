import type { Via } from "@/lib/comite";

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
 * La base normal de cada vía: en Aceleración se decide con el due
 * diligence; en Construcción no lo hay todavía, así que es estratégica.
 * Las dos valen en cualquier vía, con su motivo.
 */
export function baseSugerida(via: Via | null | undefined): BaseIncorporacion {
  return via === "aceleracion" ? "due_diligence" : "estrategica";
}

/** El siguiente paso, en palabras de ella, según la vía */
export function siguientePasoEntrada(via: Via | null | undefined): string {
  return via === "aceleracion"
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
