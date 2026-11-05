import { clienteServidor } from "@/lib/supabase/servidor";
import type {
  DocumentoElegible,
  EvidenciaAdjunta,
} from "@/components/formularios/evidencia";

/**
 * Lo que respalda cada cosa de una pantalla.
 *
 * Se lee de una vez para toda la lista y no una consulta por fila: una
 * checklist de veintinueve puntos con una consulta cada uno son veintinueve
 * viajes para enseñar, casi siempre, que no hay nada adjunto.
 */
export async function leerEvidencias(
  companyId: string,
  entidad: string,
): Promise<Map<string, EvidenciaAdjunta[]>> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("evidence_links")
    .select("id, entity_id, label, target_id, url, created_at, profiles:created_by ( full_name )")
    .eq("company_id", companyId)
    .eq("entity", entidad)
    .order("created_at");

  const porEntidad = new Map<string, EvidenciaAdjunta[]>();

  for (const fila of data ?? []) {
    if (!fila.entity_id) continue;
    const suyas = porEntidad.get(fila.entity_id) ?? [];
    suyas.push({
      id: fila.id,
      label: fila.label,
      documentId: fila.target_id,
      url: fila.url,
      cuando: fila.created_at,
      quien: fila.profiles?.full_name ?? null,
    });
    porEntidad.set(fila.entity_id, suyas);
  }

  return porEntidad;
}

/**
 * Los documentos que ya están en el data room y se pueden enlazar.
 *
 * Solo los que tienen fichero de verdad: una ficha sin versión no se puede
 * abrir, y ofrecerla como evidencia es ofrecer un enlace roto.
 */
export async function leerDocumentosElegibles(
  companyId: string,
): Promise<DocumentoElegible[]> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("documents")
    .select("id, name, folder, document_versions ( id )")
    .eq("company_id", companyId)
    .order("name");

  return (data ?? [])
    .filter((d) => (d.document_versions ?? []).length > 0)
    .map((d) => ({ id: d.id, nombre: d.name, carpeta: d.folder }));
}

/**
 * Quién ha abierto los documentos de una compañía.
 *
 * Decisión de Rodrigo del 5 de noviembre: la fundadora lo ve en su propio
 * data room. Saber quién ha mirado tu información es parte de confiar en
 * quien la guarda, y hasta ahora se anotaba y no lo veía nadie.
 */
export async function leerAperturas(companyId: string): Promise<
  Array<{ id: number; documento: string; quien: string; cuando: string }>
> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("document_access_log")
    .select("id, created_at, documents ( name ), profiles:profile_id ( full_name )")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((a) => ({
    id: a.id,
    documento: a.documents?.name ?? "Un documento borrado",
    quien: a.profiles?.full_name ?? "Alguien",
    cuando: a.created_at,
  }));
}
