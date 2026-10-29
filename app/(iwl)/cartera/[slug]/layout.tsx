import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { personaActual } from "@/lib/supabase/servidor";
import { capacidades } from "@/lib/permisos";
import { puedeVerCompania } from "@/lib/datos/acceso";

/**
 * El cerrojo de arriba de la ficha de una compañía.
 *
 * Estas rutas no miraban el rol: se apoyaban en que RLS no devolviera
 * filas y en que `companiaPorSlug()` redirigiera al no encontrar nada.
 * Funciona, y sigue siendo quien autoriza de verdad. Pero una comprobación
 * que solo existe como efecto secundario de una consulta es una que nadie
 * puede leer ni probar: basta con que alguien añada una lectura que no pase
 * por RLS para que la puerta quede abierta sin que falle nada.
 *
 * Aquí se dice en voz alta: o eres de IWL, o estás asignado a esta
 * compañía. Si no, **404 y no 403**: decir «no tienes permiso» confirma que
 * esa compañía existe, y la lista de quién está en la cohorte no es pública.
 */
export default async function LayoutCompania({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");

  const { slug } = await params;
  const c = capacidades(persona.role);

  if (!c.verTodaLaCartera && !(await puedeVerCompania(slug))) notFound();

  return <>{children}</>;
}
