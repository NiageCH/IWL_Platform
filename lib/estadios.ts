/**
 * Los estadios del proyecto (REVISION, 22 nov), que sustituyen a las vías
 * Construcción y Aceleración. Lo comparten servidor y formularios: puro,
 * sin base de datos.
 *
 * Del estadio sale todo lo que antes decidía la vía:
 *   · el programa de la Fase 3: Incubación para idea y MVP sin piloto;
 *     Aceleración para MVP con piloto y facturando;
 *   · la revisión de entrada: diagnóstico en idea, due diligence en el resto.
 */

export type Estadio = "idea" | "mvp_sin_piloto" | "mvp_con_piloto" | "facturando";

/** En el orden del camino: un estadio solo cambia hacia arriba */
export const ORDEN_ESTADIOS_TUPLA = ["idea", "mvp_sin_piloto", "mvp_con_piloto", "facturando"] as const;
export const ORDEN_ESTADIOS: Estadio[] = [...ORDEN_ESTADIOS_TUPLA];

export const ESTADIOS: Record<Estadio, string> = {
  idea: "Idea",
  mvp_sin_piloto: "MVP sin piloto",
  mvp_con_piloto: "MVP con piloto",
  facturando: "Facturando",
};

/** Lo que tiene que enseñar cada uno, para el formulario y el comité */
export const DESCRIPCION_ESTADIO: Record<Estadio, string> = {
  idea: "Todavía sin producto que alguien de fuera pueda usar",
  mvp_sin_piloto: "Un producto mínimo que funciona, sin un cliente probándolo",
  mvp_con_piloto: "Un cliente lo está probando, con un acuerdo de piloto",
  facturando: "Empresa o autónoma que ya factura",
};

export type Programa = "incubacion" | "aceleracion";

export const PROGRAMAS: Record<Programa, string> = {
  incubacion: "Incubación",
  aceleracion: "Aceleración",
};

export function programaDe(e: Estadio | null | undefined): Programa | null {
  if (!e) return null;
  return e === "idea" || e === "mvp_sin_piloto" ? "incubacion" : "aceleracion";
}

export type Revision = "diagnostico" | "due_diligence";

export const REVISIONES: Record<Revision, string> = {
  diagnostico: "Diagnóstico",
  due_diligence: "Due diligence",
};

/** La revisión de entrada: diagnóstico solo en idea; due diligence en el resto */
export function revisionDe(e: Estadio | null | undefined): Revision | null {
  if (!e) return null;
  return e === "idea" ? "diagnostico" : "due_diligence";
}

export function esEstadio(v: unknown): v is Estadio {
  return typeof v === "string" && (ORDEN_ESTADIOS as string[]).includes(v);
}

/** Los que quedan por encima, para «Cambiar el estadio» */
export function estadiosPorEncima(e: Estadio | null | undefined): Estadio[] {
  if (!e) return ORDEN_ESTADIOS;
  return ORDEN_ESTADIOS.slice(ORDEN_ESTADIOS.indexOf(e) + 1);
}

/** «Idea · Incubación», como se lee en una ficha */
export function estadioYPrograma(e: Estadio | null | undefined): string {
  if (!e) return "Sin estadio";
  return `${ESTADIOS[e]} · ${PROGRAMAS[programaDe(e)!]}`;
}
