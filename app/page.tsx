import { redirect } from "next/navigation";
import { personaActual, esIwl } from "@/lib/supabase/servidor";

/**
 * Raíz. Lleva a cada persona a su vista: IWL a la cartera, el resto a su
 * proyecto. No hay una portada común porque no hay nada que ambas vean igual.
 */
export default async function Inicio() {
  const persona = await personaActual();

  if (!persona) redirect("/entrar");
  if (esIwl(persona.role)) redirect("/cartera");
  redirect("/proyecto");
}
