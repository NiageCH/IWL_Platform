"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  ok,
  textoObligatorio,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";
import { descartarSubida, leerSubida, subidasDe } from "@/lib/subidas-servidor";

/**
 * Evidencia: lo que respalda una afirmación.
 *
 * Cada vez que alguien dice algo en la plataforma —este hito está
 * cumplido, esta dimensión es un nivel 3, esta tarea está hecha— tiene que
 * poder decir en qué se apoya. Hasta ahora solo se podía en el business
 * plan, y en el resto de pantallas había que creerse la afirmación.
 *
 * Tres formas, y las tres dejan el mismo rastro:
 *
 *   · **Subir un archivo** crea un documento en el data room de esa
 *     compañía, con las mismas reglas de acceso que el resto. No es un
 *     adjunto suelto: un contrato subido como evidencia de un hito está
 *     después en el data room, que es donde se busca.
 *   · **Elegir uno que ya está** enlaza sin duplicar. El mismo contrato
 *     puede respaldar tres cosas distintas, y subirlo tres veces es la
 *     manera de acabar con tres versiones que no coinciden.
 *   · **Pegar un enlace** para lo que vive fuera: un repositorio, un panel,
 *     un acta.
 */

// Cuánto pesa como mucho: `lib/subidas.ts`, clase «evidencia»

/** A qué se le puede colgar una evidencia */
const ENTIDADES = [
  "milestone",
  "task",
  "dd_item",
  "tech_score",
  "tech_question",
  "progress_entry",
] as const;

const esquema = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  entity: z.enum(ENTIDADES),
  entity_id: uuid,
  label: textoObligatorio(3, "Ponle un nombre a la evidencia."),
  /** Cuando se enlaza uno que ya está en el data room */
  document_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  /** Cuando es un enlace de fuera */
  url: z.string().url("Eso no parece una dirección web.").optional().or(
    z.literal("").transform(() => undefined),
  ),
});

export async function adjuntarEvidencia(formData: FormData): Promise<Resultado> {
  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  /* Solo las cadenas: el fichero va aparte y Zod no sabe leerlo */
  const texto = new FormData();
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") texto.append(k, v);
  }

  const { datos, fallo: malLeido } = validar(esquema, texto);
  if (malLeido) return malLeido;
  const [subida] = subidasDe(formData, "fichero");
  const hayFichero = Boolean(subida);

  if (!hayFichero && !datos.document_id && !datos.url) {
    return error(
      "Una evidencia es un archivo, un documento del data room o un enlace. Elige uno.",
    );
  }

  const supabase = await clienteServidor();

  let documentId = datos.document_id ?? null;

  if (subida) {
    const subido = await subirAlDataRoom(
      supabase,
      datos.company_id,
      datos.label,
      subida,
      persona.id,
    );
    if ("error" in subido) return error(subido.error);
    documentId = subido.documentId;
  }

  const { error: fallo } = await supabase.from("evidence_links").insert({
    company_id: datos.company_id,
    entity: datos.entity,
    entity_id: datos.entity_id,
    kind: documentId ? "documento" : "enlace",
    target_id: documentId,
    url: datos.url ?? null,
    label: datos.label,
    created_by: persona.id,
  });

  if (fallo) return traducirError(fallo);

  /*
   * Y queda en el registro de actividad, que es donde se mira después:
   * qué se adjuntó, a qué y quién.
   */
  await supabase.from("activity_log").insert({
    company_id: datos.company_id,
    actor_id: persona.id,
    entity: datos.entity,
    entity_id: datos.entity_id,
    action: "evidencia_adjuntada",
    detail: { label: datos.label, documento: documentId, url: datos.url ?? null },
  });

  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${datos.slug}`, "layout");

  /*
   * Sin mensaje a propósito: el acuse es la evidencia apareciendo en su
   * lista. Un mensaje aquí dejaría el panel abierto por la regla de
   * `<Formulario>`, y lo que toca es que se cierre y se vea lo adjuntado.
   */
  return ok();
}

/**
 * El archivo va al data room como un documento más.
 *
 * No a una carpeta de adjuntos aparte: lo que respalda un hito es un
 * documento de la compañía, y tenerlo en dos sitios es tenerlo en ninguno.
 * Va a la carpeta «evidencia», que es la única que no es un área de due
 * diligence.
 *
 * El fichero ya lo ha subido el navegador (`prepararSubida`), con el id del
 * documento en la ruta: `<compañía>/evidencia/<id>/<fichero>`.
 */
async function subirAlDataRoom(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  companyId: string,
  nombre: string,
  subida: { ruta: string; nombre: string },
  autorId: string,
): Promise<{ documentId: string } | { error: string }> {
  const fichero = await leerSubida(
    supabase,
    "data-room",
    "evidencia",
    subida.ruta,
    subida.nombre,
    `${companyId}/evidencia/`,
  );
  if ("error" in fichero) return fichero;
  const documentId = fichero.ruta.split("/")[2];

  const { error: falloDocumento } = await supabase.from("documents").insert({
    id: documentId,
    company_id: companyId,
    name: nombre,
    folder: "evidencia",
    created_by: autorId,
  });

  if (falloDocumento) {
    // Sin documento que lo apunte, el fichero no significa nada
    await descartarSubida("data-room", fichero.ruta);
    return { error: mensajeDe(falloDocumento) };
  }

  const { error: falloVersion } = await supabase.from("document_versions").insert({
    document_id: documentId,
    company_id: companyId,
    version: 1,
    storage_path: fichero.ruta,
    file_name: fichero.nombre,
    mime_type: fichero.tipo,
    size_bytes: fichero.tamano,
    uploaded_by: autorId,
  });

  if (falloVersion) {
    return { error: mensajeDe(falloVersion) };
  }

  return { documentId };
}

/** Quitar una evidencia que se puso donde no era */
export async function quitarEvidencia(formData: FormData): Promise<Resultado> {
  const id = formData.get("id");
  const slug = formData.get("slug");
  if (typeof id !== "string" || typeof slug !== "string") {
    return error("Falta saber qué evidencia se quita.");
  }

  const supabase = await clienteServidor();
  const { error: fallo } = await supabase.from("evidence_links").delete().eq("id", id);
  if (fallo) return traducirError(fallo);

  /*
   * El documento no se borra: sigue en el data room. Quitar una evidencia
   * es decir «esto no respalda aquello», no «este archivo no existió».
   */
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  return ok();
}

/** El texto de un fallo de la base, ya traducido */
function mensajeDe(fallo: { message: string }): string {
  const traducido = traducirError(fallo);
  return traducido.ok ? "No se ha podido guardar." : traducido.error;
}
