import { redirect } from "next/navigation";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { inicioDe } from "@/lib/permisos";
import { hayGuia } from "@/lib/datos/guia";

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
   * La primera vez, la guía de su rol (REVISION, 13 nov). Aquí, que es a
   * donde se llega al entrar sin destino; quien llega por el enlace de un
   * aviso va a lo suyo, y la guía le espera para la siguiente vez.
   */
  const { data: vista } = await (await clienteServidor())
    .from("profiles")
    .select("guia_vista_at")
    .eq("id", persona.id)
    .single();
  if (vista && !vista.guia_vista_at && hayGuia(persona.role)) redirect("/guia?primera=1");

  /*
   * A dónde va cada quien lo decide `lib/permisos.ts`, no esta cadena.
   *
   * Eran tres condiciones escritas aquí, y había que acordarse de tocarlas
   * al añadir un rol. Un mentor caía en `/proyecto` por descarte.
   */
  redirect(inicioDe(persona.role));
}
