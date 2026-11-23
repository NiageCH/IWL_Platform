/**
 * La hoja de ruta en cuatro tramos (REVISION, 22 y 23 nov · bloque 5), lo
 * que comparten pantallas y pruebas. Puro: sin base de datos.
 *
 * La base guarda lo mismo (`app.tramo_de_entrada`, `app.plazo_maximo_meses`,
 * y la duración de cada tramo en la plantilla). Aquí se dice en palabras y
 * se calcula lo que solo sirve para pintar: el plazo que queda, si el tramo
 * va con retraso y «dónde estamos».
 */
import type { Estadio } from "@/lib/estadios";

export type NumeroTramo = 1 | 2 | 3 | 4;

export const TRAMOS: Record<NumeroTramo, { nombre: string; meses: number }> = {
  1: { nombre: "De idea a MVP", meses: 6 },
  2: { nombre: "De MVP a piloto", meses: 4 },
  3: { nombre: "De piloto a facturación", meses: 3 },
  4: { nombre: "De facturación a invertible", meses: 5 },
};

export function tramoDeEntrada(e: Estadio): NumeroTramo {
  return ({ idea: 1, mvp_sin_piloto: 2, mvp_con_piloto: 3, facturando: 4 } as const)[e];
}

/** El plazo máximo desde la firma: la suma de su tramo de entrada y los siguientes */
export function plazoMaximoMeses(e: Estadio): number {
  const desde = tramoDeEntrada(e);
  return ([1, 2, 3, 4] as NumeroTramo[]).filter((t) => t >= desde).reduce((s, t) => s + TRAMOS[t].meses, 0);
}

/** Los tramos de los que sale su lista: en idea, el 1; en el resto, los anteriores a su entrada */
export function tramosDeLaLista(e: Estadio): NumeroTramo[] {
  const desde = tramoDeEntrada(e);
  return desde === 1 ? [1] : ([1, 2, 3] as NumeroTramo[]).filter((t) => t < desde);
}

/** Cómo se llama la lista en pantalla: no son sinónimos (REVISION, 22 nov) */
export function nombreLista(e: Estadio): string {
  return e === "idea" ? "Diagnóstico" : "Lo que ya tenéis";
}

function sumarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1 + meses, d));
  return f.toISOString().slice(0, 10);
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

/** El plazo: cuándo vence, y cuánto queda o cuánto hace que venció */
/**
 * El último día del plazo: la firma más sus meses, menos uno. Es la misma
 * cuenta que `app.fin_del_plazo`, que es la que manda al guardar un hito.
 */
export function finDelPlazo(desde: string, e: Estadio): string {
  const f = new Date(`${sumarMeses(desde, plazoMaximoMeses(e))}T00:00:00Z`);
  f.setUTCDate(f.getUTCDate() - 1);
  return f.toISOString().slice(0, 10);
}

export function plazo(
  firma: string,
  e: Estadio,
  hoy: string,
): { vence: string; meses: number; dias: number; vencido: boolean } {
  const meses = plazoMaximoMeses(e);
  const vence = finDelPlazo(firma, e);
  const dias = diasEntre(hoy, vence);
  return { vence, meses, dias, vencido: dias < 0 };
}

/** «Quedan 7 meses», «quedan 12 días», «venció hace 3 días» */
export function textoPlazo(p: { dias: number; vencido: boolean }): string {
  if (p.vencido) return `El plazo venció hace ${-p.dias === 1 ? "1 día" : `${-p.dias} días`}`;
  if (p.dias >= 60) return `Quedan ${Math.round(p.dias / 30.4)} meses de plazo`;
  return `Quedan ${p.dias === 1 ? "1 día" : `${p.dias} días`} de plazo`;
}

/**
 * Si el tramo actual va con retraso respecto a su duración: ha pasado su
 * fecha de fin y no está cerrado. Las semanas de retraso, redondeadas.
 */
export function retrasoTramo(t: { fin: string | null; cerrado: boolean }, hoy: string): number | null {
  if (!t.fin || t.cerrado || hoy <= t.fin) return null;
  return Math.max(1, Math.round(diasEntre(t.fin, hoy) / 7));
}

export interface HitoResumido {
  titulo: string;
  estado: string;
  fecha: string | null;
  /** Verificado en la lista de entrada: ya estaba hecho, no es avance del programa */
  alEntrar?: boolean;
}

/**
 * «Dónde estamos», en una frase: cuántos hitos del tramo actual están
 * cumplidos y cuál es el siguiente, con su fecha.
 */
/**
 * La cuenta de un tramo: lo cumplido al entrar, lo pendiente y lo hecho de
 * lo pendiente. Una sola función para el asistente y el seguimiento, que
 * tienen que decir lo mismo de la misma compañía (REVISION, 23 nov).
 */
export function cuentaTramo<H extends HitoResumido>(hitos: H[]) {
  const pendientes = hitos.filter((h) => !h.alEntrar);
  return {
    alEntrar: hitos.length - pendientes.length,
    pendientes,
    hechos: pendientes.filter((h) => h.estado === "cumplido").length,
  };
}

export function dondeEstamos(hitos: HitoResumido[]): string {
  if (!hitos.length) return "Este tramo todavía no tiene hitos.";
  // Lo verificado al entrar no es avance en el programa: va aparte
  // (REVISION, 23 nov). «9 de 15 cumplidos» mezclaba las dos cosas.
  const { alEntrar, pendientes, hechos } = cuentaTramo(hitos);
  const siguiente = pendientes
    .filter((h) => h.estado !== "cumplido")
    .sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"))[0];
  const base = alEntrar
    ? `${alEntrar} ${alEntrar === 1 ? "cumplido" : "cumplidos"} al entrar · ${hechos} de ${pendientes.length} pendientes ${hechos === 1 ? "hecho" : "hechos"}.`
    : `${hechos} de ${pendientes.length} hitos de este tramo cumplidos.`;
  if (!siguiente) return `${base} Falta que se cierre.`;
  return `${base} Siguiente: «${siguiente.titulo}»${siguiente.fecha ? `, para el ${fechaCorta(siguiente.fecha)}` : ""}.`;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
function fechaCorta(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
}
