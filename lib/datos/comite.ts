import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Decision, Via } from "@/lib/comite";

/** Las personas de IWL, que son quienes pueden formar el comité */
export const leerPersonasIwl = cache(async () => {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("role", ["admin_iwl", "equipo_iwl"])
    .is("archived_at", null)
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, nombre: p.full_name ?? p.email ?? "Sin nombre" }));
});

export const leerComiteDefecto = cache(async (): Promise<string[]> => {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "comite_miembros")
    .maybeSingle();
  return Array.isArray(data?.value) ? (data.value as string[]) : [];
});

export async function leerActas(candidaturaId: string) {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("comite_actas")
    .select(
      "id, fecha, resumen, decision, via, via_propuesta, via_motivo, motivo, revision_on, puede_volver, mensaje, cerrada_at, documento_id, candidatura_documentos(nombre, storage_path, bytes, created_at), comite_firmas(profile_id, firmado_at, profiles(full_name, email))",
    )
    .eq("candidatura_id", candidaturaId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((a) => ({
    id: a.id,
    fecha: a.fecha,
    resumen: a.resumen,
    decision: a.decision as Decision,
    via: a.via as Via | null,
    viaPropuesta: a.via_propuesta as Via | null,
    viaMotivo: a.via_motivo,
    motivo: a.motivo,
    revisionOn: a.revision_on,
    puedeVolver: a.puede_volver,
    mensaje: a.mensaje,
    cerradaAt: a.cerrada_at,
    documento: a.candidatura_documentos as unknown as {
      nombre: string;
      storage_path: string;
      bytes: number | null;
      created_at: string;
    } | null,
    firmas: (a.comite_firmas as unknown as {
      profile_id: string;
      firmado_at: string | null;
      profiles: { full_name: string | null; email: string | null } | null;
    }[]).map((f) => ({
      profileId: f.profile_id,
      nombre: f.profiles?.full_name ?? f.profiles?.email ?? "—",
      firmadoAt: f.firmado_at,
    })),
  }));
}

export type Acta = Awaited<ReturnType<typeof leerActas>>[number];

/**
 * Las candidaturas aplazadas cuya fecha de revisión ha llegado, y que no
 * tienen un acta después. Es un aviso que se calcula: se va solo cuando el
 * comité vuelve a reunirse.
 */
export const leerRevisionesComite = cache(async () => {
  const supabase = await clienteServidor();
  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("comite_actas")
    .select("id, candidatura_id, revision_on, created_at, cerrada_at, candidaturas(nombre)")
    .order("created_at", { ascending: false });

  const ultima = new Map<string, NonNullable<typeof data>[number]>();
  for (const a of data ?? []) if (!ultima.has(a.candidatura_id)) ultima.set(a.candidatura_id, a);

  return [...ultima.values()]
    .filter((a) => a.cerrada_at && a.revision_on && a.revision_on <= hoy)
    .map((a) => ({
      candidaturaId: a.candidatura_id,
      nombre: (a.candidaturas as unknown as { nombre: string } | null)?.nombre ?? "",
      revisionOn: a.revision_on!,
    }));
});
