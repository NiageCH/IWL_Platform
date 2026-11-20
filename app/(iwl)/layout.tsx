import type { ReactNode } from "react";
import { BarraLateral } from "@/components/barra-lateral";
import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";
import { PrimeraVez } from "@/components/vistas/primera-vez";
import { personaActual } from "@/lib/supabase/servidor";

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
  const persona = await personaActual();
  return (
    <Marco tema="claro">
      <div className="flex min-h-screen w-full">
        <BarraLateral />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="md:hidden">
            <BarraSuperior />
          </div>
          <PrimeraVez vista={!persona || Boolean(persona.guia_vista_at)} />
          {children}
        </div>
      </div>
    </Marco>
  );
}
