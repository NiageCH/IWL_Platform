import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...clases: ClassValue[]) {
  return twMerge(clsx(clases));
}

/** Formato de cifras en euros, sin decimales salvo que importen */
export function euros(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function numero(valor: number | null | undefined, decimales = 0): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

export function porcentaje(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined) return "—";
  return `${numero(valor, decimales)} %`;
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
