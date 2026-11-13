"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  fechaOpcional,
  idOpcional,
  mensajeDeCampos,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  type Resultado,
} from "./resultado";
import { descartarSubida, leerSubida, subidasDe } from "@/lib/subidas-servidor";

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

// Qué tipos y cuánto pesan: `lib/subidas.ts`, clase «documento»

const esquema = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  area_id: uuid,
  name: textoObligatorio(3, "Ponle un nombre al documento."),
  dd_item_id: idOpcional,
  expires_on: fechaOpcional,
  description: textoOpcional,
  /* «business_plan» cuando el documento ES el business plan, y la pantalla
     del plan lo enseña arriba. Vacío para el resto del data room */
  kind: z.enum(["business_plan"]).optional(),
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
    return error(mensajeDeCampos(campos), campos);
  }

  const datos = parseo.data;
  const [subida] = subidasDe(formData, "fichero");
  if (!subida) return error("Elige un fichero.", { fichero: "Falta el fichero." });

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();

  const { data: area } = await supabase
    .from("dd_areas")
    .select("code")
    .eq("id", datos.area_id)
    .maybeSingle();

  if (!area) return error("Esa área de due diligence no existe.");

  // El fichero ya está en Storage: lo subió el navegador (`prepararSubida`)
  const fichero = await leerSubida(
    supabase,
    "data-room",
    "documento",
    subida.ruta,
    subida.nombre,
    `${datos.company_id}/${area.code}/`,
  );
  if ("error" in fichero) return error(fichero.error, { fichero: fichero.error });

  // La ruta lleva el id que tendrá el documento: `<compañía>/<área>/<id>/<fichero>`
  const documentoId = fichero.ruta.split("/")[2];

  /*
   * Si ya había uno de este tipo, se va: «el business plan» es singular, y
   * subir uno nuevo es reemplazar, no acumular. El índice único lo impide,
   * así que sin esto la segunda subida daría un error de base en bruto.
   */
  if (datos.kind) {
    await supabase
      .from("documents")
      .delete()
      .eq("company_id", datos.company_id)
      .eq("kind", datos.kind);
  }

  const { error: falloDocumento } = await supabase.from("documents").insert({
    id: documentoId,
    company_id: datos.company_id,
    area_id: datos.area_id,
    name: datos.name,
    description: datos.description,
    folder: area.code,
    expires_on: datos.expires_on,
    kind: datos.kind ?? null,
    created_by: persona.id,
  });

  if (falloDocumento) {
    // Sin documento que lo apunte, el fichero no significa nada
    await descartarSubida("data-room", fichero.ruta);
    return traducirError(falloDocumento);
  }

  const { error: falloVersion } = await supabase.from("document_versions").insert({
    document_id: documentoId,
    company_id: datos.company_id,
    version: 1,
    storage_path: fichero.ruta,
    file_name: fichero.nombre,
    mime_type: fichero.tipo,
    size_bytes: fichero.tamano,
    uploaded_by: persona.id,
  });

  if (falloVersion) return traducirError(falloVersion);

  /*
   * Enlazar con su punto del checklist y pasarlo a revisión.
   *
   * No a «entregado»: entregar y que alguien lo mire son dos cosas, y la
   * segunda es la que le interesa saber a quien ha subido el fichero. Desde
   * «en revisión» solo lo mueve IWL, y eso lo impone la base.
   */
  if (datos.dd_item_id) {
    await supabase
      .from("dd_items")
      .update({
        document_id: documentoId,
        status: "en_revision",
        expires_on: datos.expires_on,
      })
      .eq("id", datos.dd_item_id);
  }

  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${datos.slug}`, "layout");
  revalidatePath("/cartera");
  // Y administración, que enseña si una compañía se puede borrar
  revalidatePath("/admin", "layout");

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
