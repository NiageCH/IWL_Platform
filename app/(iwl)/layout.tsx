import type { ReactNode } from "react";
import { MarcoConMenu } from "@/components/marco-con-menu";

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
 * En móvil no cabe una columna fija, así que por debajo de `md` se esconde y
 * manda la barra compacta de arriba. Son las dos caras del mismo menú, no
 * dos menús: las dos salen de la misma lista.
 */
export default async function LayoutIwl({ children }: { children: ReactNode }) {
  return (
    <MarcoConMenu franjaPruebas primeraVez>
      {children}
    </MarcoConMenu>
  );
}
