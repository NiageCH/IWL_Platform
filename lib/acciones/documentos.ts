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
  type Resultado,
} from "./resultado";

/**
 * Subida de documentos al data room (§4.3).
 *
 * El fichero va a Storage, en un bucket privado, bajo una ruta que empieza por
 * el id de la compañía: `<company_id>/<area>/<fichero>`. Esa primera carpeta es
 * lo que permite aplicar a los ficheros el mismo aislamiento que a las filas,
 * con las políticas de `storage.objects`.
 *
 * En la base quedan los metadatos y la versión; el contenido nunca.
 */

const TAMANO_MAXIMO = 25 * 1024 * 1024;

/** Tipos que tienen sentido en un data room */
const TIPOS = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/msword",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

const esquema = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  area_id: uuid,
  name: textoObligatorio(3, "Ponle un nombre al documento."),
  dd_item_id: idOpcional,
  expires_on: fechaOpcional,
  description: textoOpcional,
});

export async function subirDocumento(formData: FormData): Promise<Resultado> {
  const bruto = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  );
  const parseo = esquema.safeParse(bruto);

  if (!parseo.success) {
    const campos: Record<string, string> = {};
    for (const p of parseo.error.issues) {
      const campo = p.path.join(".");
      if (campo && !campos[campo]) campos[campo] = p.message;
    }
    return error("Revisa los campos marcados.", campos);
  }

  const datos = parseo.data;
  const fichero = formData.get("fichero");

  if (!(fichero instanceof File) || fichero.size === 0) {
    return error("Elige un fichero.", { fichero: "Falta el fichero." });
  }

  if (fichero.size > TAMANO_MAXIMO) {
    return error("El fichero pasa de 25 MB.", {
      fichero: "Como mucho 25 MB por documento.",
    });
  }

  if (fichero.type && !TIPOS.has(fichero.type)) {
    return error("Ese tipo de fichero no se admite en el data room.", {
      fichero: "Se admiten PDF, hojas de cálculo, documentos, CSV e imágenes.",
    });
  }

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();

  const { data: area } = await supabase
    .from("dd_areas")
    .select("code")
    .eq("id", datos.area_id)
    .maybeSingle();

  if (!area) return error("Esa área de due diligence no existe.");

  // El documento primero, para tener su id en la ruta del fichero
  const { data: documento, error: falloDocumento } = await supabase
    .from("documents")
    .insert({
      company_id: datos.company_id,
      area_id: datos.area_id,
      name: datos.name,
      description: datos.description,
      folder: area.code,
      expires_on: datos.expires_on,
      created_by: persona.id,
    })
    .select("id")
    .single();

  if (falloDocumento) return traducirError(falloDocumento);

  const ruta = `${datos.company_id}/${area.code}/${documento.id}/${sanear(fichero.name)}`;

  const { error: falloSubida } = await supabase.storage
    .from("data-room")
    .upload(ruta, fichero, { contentType: fichero.type || undefined });

  if (falloSubida) {
    // Sin fichero, el metadato no significa nada: se deshace
    await supabase.from("documents").delete().eq("id", documento.id);
    return error(`No se ha podido subir el fichero: ${falloSubida.message}`);
  }

  const { error: falloVersion } = await supabase.from("document_versions").insert({
    document_id: documento.id,
    company_id: datos.company_id,
    version: 1,
    storage_path: ruta,
    file_name: fichero.name,
    mime_type: fichero.type || null,
    size_bytes: fichero.size,
    uploaded_by: persona.id,
  });

  if (falloVersion) return traducirError(falloVersion);

  // Enlazar con su punto del checklist y darlo por entregado
  if (datos.dd_item_id) {
    await supabase
      .from("dd_items")
      .update({
        document_id: documento.id,
        status: "entregado",
        expires_on: datos.expires_on,
      })
      .eq("id", datos.dd_item_id);
  }

  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${datos.slug}`, "layout");
  revalidatePath("/cartera");

  return ok("Documento subido.");
}

/**
 * Enlace temporal para consultar un documento.
 *
 * El bucket es privado: no hay URL pública. Se firma un enlace corto y se deja
 * constancia del acceso en el registro (§4.3).
 */
export async function enlaceDocumento(documentId: string): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const persona = await personaActual();
  if (!persona) return { ok: false, error: "Tu sesión ha caducado." };

  const supabase = await clienteServidor();

  const { data: version } = await supabase
    .from("document_versions")
    .select("storage_path, company_id")
    .eq("document_id", documentId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!version) return { ok: false, error: "Ese documento no tiene fichero." };

  const { data, error: fallo } = await supabase.storage
    .from("data-room")
    .createSignedUrl(version.storage_path, 60);

  if (fallo || !data) {
    return { ok: false, error: "No se ha podido abrir el documento." };
  }

  await supabase.from("document_access_log").insert({
    document_id: documentId,
    company_id: version.company_id,
    profile_id: persona.id,
    action: "consulta",
  });

  return { ok: true, url: data.signedUrl };
}

/** Nombre de fichero seguro para una ruta de Storage */
function sanear(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}
