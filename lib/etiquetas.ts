import type { Database } from "@/lib/supabase/database.types";
import {
  euros as eurosDe,
  numero as numeroDe,
  porcentaje as porcentajeDe,
} from "@/lib/utils";

/**
 * Nombres legibles de los valores de los enums.
 *
 * Estaban repetidos en cada pantalla que los enseñaba, con el riesgo de que
 * una compañía saliera como «Serie A» en un sitio y «serie_a» en otro. En un
 * informe que sale de la plataforma eso no es un detalle.
 */

type Etapa = Database["public"]["Enums"]["company_stage"];
type Perfil = Database["public"]["Enums"]["company_tech_profile"];
type Entrada = Database["public"]["Enums"]["estado_entrada"];

export const ETAPAS: Record<Etapa, string> = {
  pre_semilla: "Pre-semilla",
  semilla: "Semilla",
  serie_a: "Serie A",
};

export const PERFILES: Record<Perfil, string> = {
  software: "Software",
  software_ia: "Software con IA",
  hardware: "Hardware",
};

export const ESTADOS_ENTRADA: Record<Entrada, string> = {
  idea: "Idea",
  prototipo: "Prototipo",
  mvp: "MVP",
  primeros_clientes: "Primeros clientes",
  facturacion: "Facturación",
};

export const SEVERIDADES = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
} as const;

/** Los cinco niveles de madurez de una dimensión técnica */
export const NIVELES = [
  "Inexistente",
  "Inicial",
  "Repetible",
  "Definido",
  "Gestionado",
] as const;

export function etapa(valor: Etapa): string {
  return ETAPAS[valor] ?? valor;
}

export function perfil(valor: Perfil): string {
  return PERFILES[valor] ?? valor;
}

export function estadoEntrada(valor: Entrada | null): string | null {
  return valor === null ? null : (ESTADOS_ENTRADA[valor] ?? valor);
}

/**
 * Un valor de KPI con su unidad.
 *
 * `unit` guarda el tipo de magnitud («moneda», «numero», «porcentaje»), no el
 * símbolo. Concatenarlo da «15.079 moneda», que es exactamente lo que salía
 * en el informe mensual antes de centralizar esto: la vista de KPI ya tenía
 * la función bien resuelta y el informe la reimplementó mal.
 */
export function valorKpi(unidad: string | null, valor: number | null): string {
  if (valor === null) return "—";
  if (unidad === "moneda") return eurosDe(valor);
  if (unidad === "porcentaje") return porcentajeDe(valor, 1);
  return numeroDe(valor, 0);
}

/**
 * La variación de un KPI entre dos meses.
 *
 * Si mejora o empeora depende de lo que persiga el indicador: en la quema
 * mensual, bajar es mejorar. Sin esa dirección, una flecha hacia abajo en
 * rojo mentiría la mitad de las veces.
 */
export function variacionKpi(
  valor: number | null,
  anterior: number | null,
  unidad: string | null,
  direccion: string | null,
): { texto: string; mejora: boolean | null } {
  if (valor === null || anterior === null) return { texto: "—", mejora: null };

  const delta = valor - anterior;
  if (delta === 0) return { texto: "sin cambio", mejora: null };

  const relativo =
    anterior === 0 ? null : Math.round((Math.abs(delta) / Math.abs(anterior)) * 100);

  return {
    texto: `${delta > 0 ? "+" : "−"}${valorKpi(unidad, Math.abs(delta))}${
      relativo === null ? "" : ` · ${relativo} %`
    }`,
    mejora: direccion === "baja" ? delta < 0 : direccion === "sube" ? delta > 0 : null,
  };
}
