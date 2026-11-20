"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Cerrar la línea «¿Es tu primera vez?».
 *
 * Cuenta como guía vista: quien la cierra ya sabe dónde está, y volver a
 * empujarla a la guía en la entrada siguiente sería insistir (REVISION,
 * 21 nov: «no vuelve a salir al cerrarla o al abrir la guía»).
 */
export async function cerrarAvisoGuia(): Promise<void> {
  await (await clienteServidor()).rpc("marcar_guia_vista");
  revalidatePath("/", "layout");
}
