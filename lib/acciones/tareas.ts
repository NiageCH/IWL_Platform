"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  fechaOpcional,
  idOpcional,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

/**
 * Tareas de un proyecto.
 *
 * La tabla, las políticas y el disparador que decide quién puede asignar a
 * quién llevaban escritos desde septiembre; lo que faltaba era por dónde
 * llamarlos. Es la cuarta acción de la familia «existe y no tiene botón»,
 * y la más cara: un módulo entero que solo vivía en la base.
 *
 * Aquí no se vuelve a comprobar quién asigna a quién. Lo hace un disparador
 * —`app.guard_asignacion_tarea`— y repetirlo en la acción sería tener la
 * regla en dos sitios que pueden discrepar.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/admin", "layout");
}

const ESTADOS = ["pendiente", "en_curso", "hecha", "descartada"] as const;

const esquemaTarea = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  title: textoObligatorio(3, "¿Qué hay que hacer? Ponlo en una frase."),
  description: textoOpcional,
  owner_id: idOpcional,
  due_date: fechaOpcional,
});

export async function crearTarea(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaTarea, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const { slug, ...tarea } = datos;
  const supabase = await clienteServidor();

  const { error: falloBase } = await supabase.from("tasks").insert({
    ...tarea,
    created_by: persona.id,
  });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok(
    tarea.owner_id ? "Tarea asignada." : "Tarea creada, sin nadie asignado.",
  );
}

const esquemaEstado = z.object({
  slug: textoObligatorio(),
  id: uuid,
  status: z.enum(ESTADOS),
});

export async function cambiarEstadoTarea(
  formData: FormData,
): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEstado, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("tasks")
    .update({ status: datos.status })
    .eq("id", datos.id)
    .select("id");

  if (falloBase) return traducirError(falloBase);

  /*
   * Cero filas sin error es lo que devuelve un `update` que la política no
   * deja pasar. Decirlo importa: si no, la pantalla se queda como estaba y
   * parece que no se pulsó.
   */
  if (!data || data.length === 0) {
    return error("No te deja mover esa tarea: no es tuya ni llevas el proyecto.");
  }

  refrescar(datos.slug);

  /*
   * Sin mensaje: el desplegable ya enseña el estado nuevo, que es el acuse
   * más directo posible. Un aviso debajo de cada fila sería ruido en una
   * lista de quince.
   */
  return ok();
}

const esquemaAsignar = z.object({
  slug: textoObligatorio(),
  id: uuid,
  owner_id: idOpcional,
});

export async function reasignarTarea(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaAsignar, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("tasks")
    .update({ owner_id: datos.owner_id })
    .eq("id", datos.id)
    .select("id");

  if (falloBase) return traducirError(falloBase);
  if (!data || data.length === 0) {
    return error("No te deja reasignar esa tarea.");
  }

  refrescar(datos.slug);
  return ok();
}
