import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...clases: ClassValue[]) {
  return twMerge(clsx(clases));
}

/**
 * Cifras en euros.
 *
 * `useGrouping: "always"` fuerza el separador también en los números de
 * cuatro dígitos. El español los escribe sin punto —9000, no 9.000— pero en
 * una tabla financiera eso hace que 9000 y 37.600 se lean con formatos
 * distintos en la misma columna. Aquí manda la legibilidad de la columna.
 */
export function euros(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    useGrouping: "always",
  }).format(valor);
}

export function numero(valor: number | null | undefined, decimales = 0): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: "always",
  }).format(valor);
}

export function porcentaje(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined) return "—";
  // Espacio duro antes del símbolo, como ya hace Intl con el euro: evita que
  // el % se quede solo al final de una línea
  return `${numero(valor, decimales)}\u00a0%`;
}

export function fecha(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
