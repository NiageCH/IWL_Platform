import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { BarraLateral } from "@/components/barra-lateral";
import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";
import { personaActual } from "@/lib/supabase/servidor";
import { capacidades } from "@/lib/permisos";

/**
 * La vista de una sola compañía: la de quien solo tiene la suya.
 *
 * Mismo esqueleto que la consola de IWL —barra lateral a la izquierda,
 * barra compacta en móvil— y no otro. Antes esta vista solo tenía la franja
 * de arriba, así que lo que aprendía una persona no le servía para la otra
 * pantalla: dos esqueletos para la misma plataforma.
 *
 * Va en claro porque aquí se redacta el business plan, se lee el checklist
 * y se trabaja con texto largo.
 */
export default async function LayoutProyecto({
  children,
}: {
  children: ReactNode;
}) {
  const persona = await personaActual();
  if (!persona) redirect("/entrar?siguiente=/proyecto");

  /*
   * Comprobación explícita, no solo RLS.
   *
   * Hasta ahora esta rama no miraba el rol: se apoyaba en que
   * `companiaDeLaPersona()` no encontrara compañía. Funciona, pero deja la
   * puerta abierta a que un cambio en una consulta convierta un «no tienes
   * acceso» en un «mira esto». Lo que autoriza sigue siendo la base; esto
   * es el cerrojo de arriba, que se ve y se puede probar.
   *
   * Un mentor o un revisor ya no caen aquí: tienen la cartera filtrada a
   * sus compañías, porque desde una sola nunca podían llegar a las otras.
   */
  const c = capacidades(persona.role);
  if (c.verCartera) redirect("/cartera");
  if (!c.tieneProyectoPropio) notFound();

  return (
    <Marco tema="claro">
      <div className="flex min-h-screen w-full">
        <BarraLateral />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="md:hidden">
            <BarraSuperior />
          </div>
          {children}
        </div>
      </div>
    </Marco>
  );
}
