import { redirect } from "next/navigation";
import { clienteServidor, personaActual, esIwl } from "@/lib/supabase/servidor";
import { leerCompania, type ResumenCompania } from "./compania";

/**
 * Resolución de a qué compañía corresponde cada vista.
 *
 * La vista de fundadora no lleva la compañía en la URL: se deduce de a qué
 * compañía pertenece quien ha entrado. Así no hay manera de escribir otra ruta
 * y ver otra cosa, aunque RLS ya lo impediría.
 */

export async function companiaDeLaPersona(): Promise<NonNullable<ResumenCompania>> {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");

  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("company_members")
    .select("companies ( slug )")
    .eq("profile_id", persona.id)
    .limit(1)
    .maybeSingle();

  const slug = data?.companies?.slug;

  if (!slug) {
    // Una persona de IWL sin compañía asignada va a la cartera
    if (esIwl(persona.role)) redirect("/cartera");
    redirect("/sin-compania");
  }

  const resumen = await leerCompania(slug);
  if (!resumen) redirect("/sin-compania");

  return resumen;
}

export async function companiaPorSlug(
  slug: string,
): Promise<NonNullable<ResumenCompania>> {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");

  const resumen = await leerCompania(slug);
  // Sin permiso no hay filas, así que esto cubre también el acceso indebido
  if (!resumen) redirect("/cartera");

  return resumen;
}
