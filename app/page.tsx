import { redirect } from "next/navigation";
import { personaActual } from "@/lib/supabase/servidor";
import { inicioDe } from "@/lib/permisos";

/**
 * Raíz. Lleva a cada persona a su vista.
 *
 * IWL a la cartera, una candidata a su candidatura y el resto a su proyecto.
 * No hay portada común porque no hay nada que las tres vean igual.
 *
 * Lo de la candidata no estaba y era un agujero en el flujo: se le daba
 * cuenta al firmar el NDA, entraba, y aterrizaba en «no tienes compañía»
 * —que es verdad, todavía no la tiene— sin forma de llegar a lo suyo salvo
 * escribiendo la dirección a mano.
 */
export default async function Inicio() {
  const persona = await personaActual();

  if (!persona) redirect("/entrar");
  /*
   * A dónde va cada quien lo decide `lib/permisos.ts`, no esta cadena.
   *
   * Eran tres condiciones escritas aquí, y había que acordarse de tocarlas
   * al añadir un rol. Un mentor caía en `/proyecto` por descarte.
   */
  redirect(inicioDe(persona.role));
}
