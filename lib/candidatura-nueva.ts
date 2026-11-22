/**
 * La candidatura nueva (REVISION, 22 nov · bloque 3), lo que comparten el
 * formulario y la acción. El filtro de verdad lo aplica la base
 * (`app.filtro_candidatura`); esto solo ayuda a rellenarla: la suma de los
 * socios y la parte en manos de mujeres, mientras se escribe.
 */

/** Los sectores de la tesis; «Otro» va a revisión manual */
export const SECTORES_TESIS = ["HealthTech", "AgroTech", "RetailTech", "EdTech"] as const;
export const SECTORES = [...SECTORES_TESIS, "Otro"] as const;
export type Sector = (typeof SECTORES)[number];

export interface Socio {
  nombre: string;
  pct: number;
  mujer: boolean;
}

/** «12,5» o «12.5»; vacío o sin sentido, nulo */
export function leerPct(texto: string): number | null {
  const n = Number(texto.trim().replace("%", "").replace(",", ".").trim());
  return texto.trim() && Number.isFinite(n) ? n : null;
}

export function sumaSocios(socios: Socio[]): number {
  return Math.round(socios.reduce((s, x) => s + (Number.isFinite(x.pct) ? x.pct : 0), 0) * 100) / 100;
}

export function pctMujeres(socios: Socio[]): number {
  return sumaSocios(socios.filter((s) => s.mujer));
}

/** La suma cuadra con un margen de céntimas, como en la base */
export function sumaCuadra(socios: Socio[]): boolean {
  return Math.abs(sumaSocios(socios) - 100) <= 0.01;
}

export type Filtro = "pasa" | "no_pasa" | "revision_manual" | "espera_recomendacion";

export const FILTROS: Record<Filtro, string> = {
  pasa: "Pasa el filtro",
  no_pasa: "No pasa el filtro",
  revision_manual: "Revisión manual",
  espera_recomendacion: "Esperando la recomendación",
};
