import { paso } from "@/lib/embudo";
import { pasoEntrada, type EstadoEntrada } from "@/lib/entrada";

/**
 * Los recorridos de la plataforma, paso a paso, en un solo sitio.
 *
 * De aquí sale la línea «Viene de: … · Después: …» de cada aviso (REVISION,
 * 18 nov): un aviso no escribe a mano de dónde viene, dice en qué paso de
 * qué recorrido está, y el texto sale de aquí. Cada paso tiene dos formas:
 * lo que hay que hacer («Confirmar su situación societaria») y cómo se dice
 * una vez hecho («Situación confirmada»), que es como se lee en «Viene de».
 *
 * El de entrada no se inventa: lo que hay que hacer en cada paso es lo que
 * dice `pasoEntrada` para cada estado de `ESTADOS_ENTRADA`, y la prueba de
 * `lib/recorridos.test.ts` comprueba que las dos listas van a la par.
 */

export type Recorrido = "embudo" | "entrada" | "reunion" | "hito" | "documento";

interface Paso {
  hacer: string;
  hecho: string;
}

/** El embudo de una candidatura, de que se presenta a la entrada */
const EMBUDO: Paso[] = [
  { hacer: "Presentarse", hecho: paso("presentada").nombre },
  { hacer: "Revisarla", hecho: paso("en_revision").nombre },
  { hacer: "Tener la reunión", hecho: paso("reunion").nombre },
  { hacer: "Pasar por comité", hecho: paso("comite").nombre },
  { hacer: "Preseleccionarla", hecho: paso("preseleccionada").nombre },
  { hacer: "Enviarle el NDA", hecho: paso("nda").nombre },
  { hacer: "Que ella firme el NDA", hecho: "NDA firmado por ella" },
  { hacer: "Contrafirmar el NDA", hecho: "NDA firmado por las dos partes" },
  { hacer: "Que diga su situación societaria", hecho: paso("entrada").nombre },
];

/**
 * La entrada de una compañía: un estado por paso, en la vía de
 * Construcción, que no pasa por el recuento de obligatorios.
 */
const BASE: EstadoEntrada = {
  via: "construccion",
  situacionDicha: false,
  situacionConfirmada: false,
  obligatoriosHechos: 0,
  obligatorios: 0,
  decision: null,
  anexo: null,
};

export const ESTADOS_ENTRADA: EstadoEntrada[] = [
  BASE,
  { ...BASE, situacionDicha: true },
  { ...BASE, situacionDicha: true, situacionConfirmada: true },
  { ...BASE, situacionDicha: true, situacionConfirmada: true, decision: "si" },
  { ...BASE, situacionDicha: true, situacionConfirmada: true, decision: "si", anexo: "propuesto" },
  { ...BASE, situacionDicha: true, situacionConfirmada: true, decision: "si", anexo: "aceptado" },
];

const HECHO_ENTRADA = [
  "Situación societaria dicha",
  "Situación confirmada",
  "Incorporación decidida",
  "Acuerdo propuesto",
  "Acuerdo aceptado por ella",
  "Acuerdo firmado",
];

const ENTRADA: Paso[] = ESTADOS_ENTRADA.map((e, i) => ({ hacer: pasoEntrada(e).texto, hecho: HECHO_ENTRADA[i] }));

/** Una reunión con una candidata, de la propuesta al acta */
const REUNION: Paso[] = [
  { hacer: "Proponer fechas", hecho: "Fechas propuestas" },
  { hacer: "Elegir una fecha", hecho: "Fecha elegida" },
  { hacer: "Celebrarla", hecho: "Reunión celebrada" },
  { hacer: "Anotarla", hecho: "Reunión anotada" },
  { hacer: paso("reunion").siguiente ?? "Llevarla a comité", hecho: paso("comite").nombre },
];

/** Un hito, de la entrega a cumplido */
const HITO: Paso[] = [
  { hacer: "Entregarlo con su evidencia", hecho: "Entregado" },
  { hacer: "Revisarlo", hecho: "Revisado" },
  { hacer: "Pasar al siguiente hito", hecho: "Cumplido" },
];

/** Un documento del due diligence, de que se pide a validado */
const DOCUMENTO: Paso[] = [
  { hacer: "Entregarlo", hecho: "Entregado" },
  { hacer: "Revisarlo", hecho: "Revisado" },
  { hacer: "Entregar el siguiente punto", hecho: "Validado" },
];

const PASOS: Record<Recorrido, Paso[]> = {
  embudo: EMBUDO,
  entrada: ENTRADA,
  reunion: REUNION,
  hito: HITO,
  documento: DOCUMENTO,
};

/** Dónde está cada paso del embudo que se cita fuera de aquí */
export const PASO_EMBUDO = { revisar: 1, comite: 3, nda: 5, contrafirmar: 7 } as const;

/** De dónde viene un paso (lo hecho antes) y qué va después (lo que habrá que hacer) */
export function traza(recorrido: Recorrido, indice: number): { vieneDe: string | null; despues: string | null } {
  const pasos = PASOS[recorrido];
  return {
    vieneDe: indice > 0 ? pasos[indice - 1].hecho : null,
    despues: indice < pasos.length - 1 ? pasos[indice + 1].hacer : null,
  };
}

/** Para las pruebas: lo que pide cada paso de un recorrido */
export function pasosDe(recorrido: Recorrido): readonly Paso[] {
  return PASOS[recorrido];
}

export const HECHOS_ENTRADA = HECHO_ENTRADA;
