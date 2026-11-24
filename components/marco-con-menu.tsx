import type { ReactNode } from "react";
import { BarraLateral } from "@/components/barra-lateral";
import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";
import { FranjaModoPruebas } from "@/components/vistas/franja-modo-pruebas";
import { PrimeraVez } from "@/components/vistas/primera-vez";
import { capacidades } from "@/lib/permisos";
import { personaActual } from "@/lib/supabase/servidor";

/**
 * El marco de la aplicación con su menú: barra lateral a la izquierda y,
 * por debajo de `md`, la barra compacta de arriba. Es el mismo para IWL y
 * para la fundadora; antes cada grupo lo montaba a mano.
 *
 * Lo usan también las pantallas que viven fuera de los grupos y a las que
 * se llega desde el menú —la guía y Mi cuenta— para que abrirlas no saque
 * a nadie de su pantalla (REVISION, 24 nov): la guía pintaba su propio
 * marco con solo la barra de arriba, y el menú lateral desaparecía.
 */
export async function MarcoConMenu({
  children,
  franjaPruebas = false,
  primeraVez = false,
}: {
  children: ReactNode;
  /** La franja del modo pruebas, que ve la dirección */
  franjaPruebas?: boolean;
  /** La línea que ofrece la guía la primera vez que se entra por un aviso */
  primeraVez?: boolean;
}) {
  const persona = await personaActual();
  return (
    <Marco tema="claro">
      <div className="flex min-h-screen w-full">
        <BarraLateral />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="md:hidden">
            <BarraSuperior />
          </div>
          {franjaPruebas ? <FranjaModoPruebas rol={persona?.role} /> : null}
          {primeraVez ? <PrimeraVez vista={!persona || Boolean(persona.guia_vista_at)} rol={persona?.role} /> : null}
          {children}
        </div>
      </div>
    </Marco>
  );
}

/**
 * El marco de quien mira, para una pantalla que sirve a todos los roles.
 * Con menú quien lo tiene (IWL y fundadora); la candidata, que no tiene
 * pantallas propias más allá de su candidatura, sigue con la barra de arriba.
 */
export async function MarcoDeRol({ children }: { children: ReactNode }) {
  const persona = await personaActual();
  const c = capacidades(persona?.role);
  if (c.verCartera || c.tieneProyectoPropio) {
    return <MarcoConMenu franjaPruebas={c.verCartera}>{children}</MarcoConMenu>;
  }
  return (
    <Marco tema="claro">
      <BarraSuperior />
      {children}
    </Marco>
  );
}
