"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

/**
 * Acciones del business plan vivo (§4.2).
 *
 * El versionado no se hace aquí: lo lleva la base en un trigger, para que
 * ninguna vía de escritura pueda saltárselo.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
}

const esquemaSeccion = z.object({
  slug: textoObligatorio(),
  id: uuid,
  content: textoOpcional,
  status: z.enum(["borrador", "en_revision", "validada"]),
});

export async function guardarSeccion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaSeccion, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("bp_sections")
    .update({ content: datos.content, status: datos.status })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok("Sección guardada.");
}

const esquemaHipotesis = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  section_id: uuid,
  statement: textoObligatorio(10, "Enuncia la hipótesis en una frase."),
  validation_criteria: textoOpcional,
  status: z.enum(["sin_contrastar", "en_contraste", "confirmada", "refutada"]),
});

export async function guardarHipotesis(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaHipotesis, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { slug, ...hipotesis } = datos;

  const { error: falloBase } = await supabase.from("hypotheses").insert(hipotesis);
  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Hipótesis añadida.");
}

const esquemaComentario = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  entity: z.enum(["bp_section", "dd_item", "tech_finding"]),
  entity_id: uuid,
  body: textoObligatorio(2, "Escribe el comentario."),
});

/** Comenta cualquiera que vea la compañía: es la conversación del programa */
export async function comentar(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaComentario, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { slug, ...comentario } = datos;

  const { error: falloBase } = await supabase
    .from("comments")
    .insert({ ...comentario, author_id: persona.id });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok();
}
