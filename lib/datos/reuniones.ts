import { createClient } from "@supabase/supabase-js";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Asistente, Conclusion, EstadoReunion, Formato, Franja } from "@/lib/reuniones";

/** Las reuniones de una candidatura, la más reciente primero, con sus adjuntos. Para IWL */
export async function leerReuniones(candidaturaId: string) {
  const supabase = await clienteServidor();
  const [{ data: reuniones }, { data: adjuntos }, { data: personas }] = await Promise.all([
    supabase
      .from("candidatura_reuniones")
      .select(
        "id, estado, propuesta_de, propuesta_at, franjas, formato, enlace, direccion, nota, nota_candidata, personas_iwl, elegida, confirmada_at, cancelada_motivo, celebrada_on, asistentes, notas, conclusion, created_at",
      )
      .eq("candidatura_id", candidaturaId)
      .order("created_at", { ascending: false }),
    supabase
      .from("candidatura_documentos")
      .select("id, nombre, storage_path, reunion_id, bytes, created_at")
      .eq("candidatura_id", candidaturaId)
      .not("reunion_id", "is", null),
    supabase.from("profiles").select("id, full_name, last_name, email"),
  ]);

  const nombre = (id: string) => {
    const p = (personas ?? []).find((x) => x.id === id);
    return p ? [p.full_name, p.last_name].filter(Boolean).join(" ") || p.email : "—";
  };

  return (reuniones ?? []).map((r) => ({
    id: r.id,
    estado: r.estado as EstadoReunion,
    propuestaDe: r.propuesta_de as "iwl" | "candidata",
    propuestaAt: r.propuesta_at,
    franjas: (r.franjas ?? []) as unknown as Franja[],
    formato: r.formato as Formato | null,
    enlace: r.enlace,
    direccion: r.direccion,
    nota: r.nota,
    notaCandidata: r.nota_candidata,
    personasIwl: (r.personas_iwl ?? []).map(nombre),
    elegida: r.elegida as unknown as Franja | null,
    confirmadaAt: r.confirmada_at,
    canceladaMotivo: r.cancelada_motivo,
    celebradaOn: r.celebrada_on,
    asistentes: (r.asistentes ?? []) as unknown as Asistente[],
    notas: r.notas,
    conclusion: r.conclusion as Conclusion | null,
    adjuntos: (adjuntos ?? []).filter((a) => a.reunion_id === r.id),
  }));
}

export type Reunion = Awaited<ReturnType<typeof leerReuniones>>[number];

/** La reunión en juego, tal como la ve ella */
export interface ReunionDeElla {
  id: string;
  estado: EstadoReunion;
  propuesta_de: "iwl" | "candidata";
  franjas: Franja[];
  formato: Formato | null;
  enlace: string | null;
  direccion: string | null;
  nota: string | null;
  nota_candidata: string | null;
  elegida: Franja | null;
  personas_iwl: string[];
  cancelada_motivo: string | null;
}

/**
 * Su reunión en juego, o la última que hubo: por su testigo, desde el
 * enlace privado, o por su sesión. Lo decide la base (`reunion_vigente`).
 */
export async function leerReunionDeElla(token?: string): Promise<ReunionDeElla | null> {
  const supabase = token
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false },
      })
    : await clienteServidor();
  const { data } = await supabase.rpc("reunion_vigente", { p_token: token ?? undefined });
  const fila = (data as unknown as ReunionDeElla[] | null)?.[0];
  return fila ?? null;
}
