/**
 * Cómo termina una compañía en el programa (REVISION, 22 nov · bloque 8).
 * Compartido entre la base, el formulario y el Histórico.
 */
export const CIERRES = {
  graduada: { nombre: "Graduada", explicacion: "El proyecto es invertible." },
  salida: { nombre: "Finalizada · Salida", explicacion: "Termina el plazo y no es invertible." },
  baja: { nombre: "Finalizada · Baja", explicacion: "Fracasa, o IWL la da de baja." },
} as const;

export type Cierre = keyof typeof CIERRES;

export function nombreCierre(c: string | null | undefined): string {
  return c && c in CIERRES ? CIERRES[c as Cierre].nombre : "Sin cerrar";
}
