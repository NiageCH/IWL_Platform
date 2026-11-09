import { clienteServidor } from "@/lib/supabase/servidor";
import type { Asistente, Conclusion, Franja } from "@/lib/reuniones";

/** Las reuniones de una candidatura, la más reciente primero, con sus adjuntos */
export async function leerReuniones(candidaturaId: string) {
  const supabase = await clienteServidor();
  const [{ data: reuniones }, { data: adjuntos }] = await Promise.all([
    supabase
      .from("candidatura_reuniones")
      .select("id, propuesta_at, franjas, celebrada_on, asistentes, notas, conclusion, created_at")
      .eq("candidatura_id", candidaturaId)
      .order("created_at", { ascending: false }),
    supabase
      .from("candidatura_documentos")
      .select("id, nombre, storage_path, reunion_id, bytes, created_at")
      .eq("candidatura_id", candidaturaId)
      .not("reunion_id", "is", null),
  ]);

  return (reuniones ?? []).map((r) => ({
    id: r.id,
    propuestaAt: r.propuesta_at,
    franjas: (r.franjas ?? []) as unknown as Franja[],
    celebradaOn: r.celebrada_on,
    asistentes: (r.asistentes ?? []) as unknown as Asistente[],
    notas: r.notas,
    conclusion: r.conclusion as Conclusion | null,
    adjuntos: (adjuntos ?? []).filter((a) => a.reunion_id === r.id),
  }));
}

export type Reunion = Awaited<ReturnType<typeof leerReuniones>>[number];
