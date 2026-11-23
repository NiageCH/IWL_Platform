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

/** Los hitos de la hoja de ruta que condicionan invertible, y cuántos faltan */
export type HitosParaGraduar = { marcados: number; pendientes: number };

/**
 * Por qué no se puede graduar todavía, o null si se puede (REVISION, 23
 * nov · invertible decidido). La misma regla que `app.guard_graduada`.
 */
export function motivoNoGradua(h: HitosParaGraduar | null): string | null {
  if (!h) return null;
  if (h.marcados === 0) return "Su hoja de ruta no tiene hitos que condicionen invertible: no se puede graduar.";
  if (h.pendientes > 0) {
    return `Faltan ${h.pendientes} ${h.pendientes === 1 ? "hito" : "hitos"} para poder graduarla.`;
  }
  return null;
}
