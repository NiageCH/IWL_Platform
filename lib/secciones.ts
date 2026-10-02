/**
 * Las secciones de navegación y el tono de su icono.
 *
 * Vive aquí y no junto a `<NavSecciones>` porque ese fichero es `"use
 * client"`, y **de un módulo de cliente no se puede llamar a una función
 * desde el servidor**: Next lo rechaza en ejecución, no al compilar, así
 * que la pantalla se cae con un error de servidor y el tipado no avisa.
 *
 * El mismo fichero ya documentaba esa frontera para los componentes. La
 * lección es que vale igual para una función suelta.
 */
export const NOMBRES_SECCION = [
  "cartera",
  "embudo",
  "comparativa",
  "administracion",
  "resumen",
  "ruta",
  "programa",
  "aportacion",
  "tecnico",
  "diligencia",
  "plan",
  "kpi",
  "companias",
  "personas",
  "evaluacion",
  "umbrales",
] as const;

export type NombreIcono = (typeof NOMBRES_SECCION)[number];

/**
 * El tono de cada icono de sección.
 *
 * Decorativo y nada más: el rótulo va siempre al lado, así que quien no
 * distinga el tono lee exactamente lo mismo. Está para que una fila de ocho
 * secciones no sea una fila de ocho grises.
 *
 * Los tonos se repiten —hay cuatro y más secciones— y no pasa nada: no
 * codifican una categoría, solo rompen el monocromo.
 */
const TONOS: Record<NombreIcono, string> = {
  cartera: "var(--color-acento-texto)",
  embudo: "var(--color-cielo)",
  comparativa: "var(--color-lila)",
  administracion: "var(--color-menta)",
  resumen: "var(--color-acento-texto)",
  ruta: "var(--color-cielo)",
  programa: "var(--color-lila)",
  aportacion: "var(--color-menta)",
  tecnico: "var(--color-cielo)",
  diligencia: "var(--color-durazno)",
  plan: "var(--color-lila)",
  kpi: "var(--color-menta)",
  companias: "var(--color-cielo)",
  personas: "var(--color-lila)",
  evaluacion: "var(--color-durazno)",
  umbrales: "var(--color-menta)",
};

export function tonoSeccion(icono: NombreIcono): string {
  return TONOS[icono];
}
