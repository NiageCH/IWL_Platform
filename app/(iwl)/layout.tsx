import type { ReactNode } from "react";
import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";

/*
 * La consola de IWL, sobre papel.
 *
 * Era oscura de arriba abajo y sobre negro puro: se veía como una cueva y,
 * sobre todo, plana, porque sin sitio por debajo ninguna tarjeta podía
 * levantarse. Ahora lo oscuro se concentra en la barra —la franja de la
 * marca, que se pinta sola— y el área de trabajo es clara, como la de la
 * compañía. Aquí se leen tablas largas y se repasan fichas: eso es papel.
 */
export default function LayoutIwl({ children }: { children: ReactNode }) {
  return (
    <Marco tema="claro">
      <BarraSuperior />
      {children}
    </Marco>
  );
}
