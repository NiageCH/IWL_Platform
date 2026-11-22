/**
 * El modo pruebas del correo (REVISION, 21 nov), sin base de datos: qué
 * dirección se retiene. Lo usa el envío y lo prueba `modo-pruebas.test.ts`.
 */

export interface ModoPruebas {
  activo: boolean;
  dominios: string[];
  quitadoPor?: string | null;
  quitadoAt?: string | null;
}

export const DOMINIOS_POR_DEFECTO = ["inceptionwlab.es", "niage.es"];

/** Lo que haya en `platform_settings`; sin fila, activo: mejor retener de más */
export function leerAjusteModoPruebas(valor: unknown): ModoPruebas {
  const v = (valor ?? {}) as { activo?: unknown; dominios?: unknown; quitado_por?: unknown; quitado_at?: unknown };
  const dominios = Array.isArray(v.dominios)
    ? v.dominios.map((d) => normalizarDominio(String(d))).filter(Boolean)
    : DOMINIOS_POR_DEFECTO;
  return {
    activo: v.activo === undefined ? true : v.activo === true,
    dominios,
    quitadoPor: typeof v.quitado_por === "string" ? v.quitado_por : null,
    quitadoAt: typeof v.quitado_at === "string" ? v.quitado_at : null,
  };
}

/** «@Niage.es », «niage.es» y «NIAGE.ES» son el mismo dominio */
export function normalizarDominio(d: string): string {
  return d.trim().toLowerCase().replace(/^@/, "");
}

/**
 * Si un correo a esta dirección se queda retenido. Solo vale el dominio
 * exacto: «otro.niage.es» o «niage.es.falso.com» no pasan.
 */
export function seRetiene(direccion: string, modo: ModoPruebas): boolean {
  if (!modo.activo) return false;
  const dominio = normalizarDominio(direccion.split("@").pop() ?? "");
  return !modo.dominios.includes(dominio);
}

/** Los dominios como los escribe dirección: separados por comas, espacios o líneas */
export function dominiosDeTexto(texto: string): string[] {
  return [...new Set(texto.split(/[\s,;]+/).map(normalizarDominio).filter(Boolean))];
}
