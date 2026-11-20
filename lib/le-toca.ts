/**
 * Lo que le toca a ella y se calcula, sin guardarse (REVISION, 20 nov):
 * el avance del mes y los hitos que vencen. Sin base de datos ni React,
 * para poder probarlo con cualquier fecha.
 */

import { DIAS_DE_AVISO } from "@/lib/estados";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function nombreMes(mes: string): string {
  return MESES[Number(mes.slice(5, 7)) - 1] ?? mes;
}

function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * El avance que se le pide, si se le pide alguno.
 *
 * Desde el día `diaAviso` de un mes se le pide el de ese mes; antes de ese
 * día, el del mes anterior, si no lo cargó. Vence el día `diaLimite` del
 * mes siguiente. Nada antes del mes en que empezó el programa.
 */
export function avancePendiente({
  hoy,
  diaAviso,
  diaLimite,
  cargados,
  desde,
}: {
  hoy: string;
  diaAviso: number;
  diaLimite: number;
  /** Los meses con el avance entregado, como «2026-11» */
  cargados: Set<string>;
  /** El mes en que empezó: firmó el Acuerdo */
  desde: string;
}): { mes: string; estado: "atencion" | "vencido" } | null {
  const esteMes = hoy.slice(0, 7);
  const mes = Number(hoy.slice(8, 10)) >= diaAviso ? esteMes : mesAnterior(esteMes);
  if (mes < desde.slice(0, 7) || cargados.has(mes)) return null;
  const limite = `${mesSiguiente(mes)}-${String(Math.min(diaLimite, 28)).padStart(2, "0")}`;
  return { mes, estado: hoy > limite ? "vencido" : "atencion" };
}

/**
 * Un hito que vence: a siete días de su fecha, si no está entregado ni
 * cumplido. Pasada la fecha, vencido.
 */
export function hitoQueVence(
  h: { estado: string; fecha: string | null },
  hoy: string,
): "atencion" | "vencido" | null {
  if (!h.fecha || ["entregado", "cumplido"].includes(h.estado)) return null;
  if (h.fecha < hoy || h.estado === "retrasado") return "vencido";
  const dias = (Date.parse(`${h.fecha}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000;
  return dias <= DIAS_DE_AVISO ? "atencion" : null;
}

/**
 * De lo calculado, lo que el resumen diario todavía no ha contado: lo que
 * aparece y lo que pasa a vencido (REVISION, 21 nov: «no todos los
 * pendientes cada mañana»). `contados` lleva `clave|estado`. Un hito que
 * salió en atención vuelve a salir al vencer; nunca dos veces igual.
 */
export function nuevosParaResumen<T extends { clave: string; estado: "atencion" | "vencido" }>(
  calculados: T[],
  contados: Set<string>,
): T[] {
  return calculados.filter((c) => !contados.has(`${c.clave}|${c.estado}`));
}
