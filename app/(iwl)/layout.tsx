import type { ReactNode } from "react";
import { BarraLateral } from "@/components/barra-lateral";
import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";

/*
 * La consola de IWL: columna oscura a la izquierda, trabajo sobre papel.
 *
 * Era oscura de arriba abajo y sobre negro puro, con una franja superior
 * fina —el patrón por defecto de cualquier panel—. Se veía como una cueva y,
 * sobre todo, plana: sin sitio por debajo, ninguna tarjeta podía levantarse.
 *
 * La columna vertical cambia el carácter más que cualquier color. Da sitio a
 * la marca arriba, a la navegación con su icono en el medio y a quién ha
 * entrado abajo, y libera el ancho entero para el contenido.
 *
 * En móvil no cabe una columna fija, así que por debajo de `lg` se esconde y
 * manda la barra compacta de arriba. Son las dos caras del mismo menú, no
 * dos menús: las dos salen de la misma lista.
 */
export default function LayoutIwl({ children }: { children: ReactNode }) {
  return (
    <Marco tema="claro">
      <div className="flex min-h-screen w-full">
        <BarraLateral />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="lg:hidden">
            <BarraSuperior />
          </div>
          {children}
        </div>
      </div>
    </Marco>
  );
}
