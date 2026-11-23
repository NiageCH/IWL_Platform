import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { personaActual } from "@/lib/supabase/servidor";
import { companiaCerrada, puedeVerCompania } from "@/lib/datos/acceso";

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

  // También para IWL: una compañía cerrada ya no la lee el equipo (bloque
  // 8), y sin esto la ficha acababa redirigiendo en vez de decir 404
  if (!(await puedeVerCompania(slug))) notFound();

  // Cerrada, solo la lee dirección, y en el Histórico (bloque 8): la ficha
  // tiene botones que la base ya no acepta, así que no se abre
  const cerrada = await companiaCerrada(slug);
  if (cerrada) {
    if (persona.role === "admin_iwl") redirect(`/admin/historico#${slug}`);
    notFound();
  }

  return <>{children}</>;
}
