import type { ReactNode } from "react";
import { Marco } from "@/components/marco";

/**
 * Marco de los informes.
 *
 * Siempre en claro, sin navegación y sin barra superior. Un informe es un
 * documento, no una pantalla: lo que lo rodea en la aplicación no tiene que
 * salir en el papel, y quien lo genera puede estar en la consola oscura.
 */
export default function LayoutInforme({ children }: { children: ReactNode }) {
  return <Marco tema="claro">{children}</Marco>;
}
