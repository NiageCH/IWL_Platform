import { clienteServidor } from "@/lib/supabase/servidor";
import { PASOS_ABIERTOS, type EstadoCandidatura } from "@/lib/embudo";

/**
 * El embudo de selección.
 *
 * Quién ve qué lo decide RLS: estas tablas solo las lee IWL. Aquí no hay
 * ninguna comprobación de permisos, igual que en el resto de `lib/datos`.
 */

export async function leerEmbudo() {
  const supabase = await clienteServidor();

  const { data: candidaturas } = await supabase
    .from("embudo_candidaturas")
    .select("*")
    .order("updated_at", { ascending: false });

  const filas = candidaturas ?? [];

  /*
   * El reparto por paso.
   *
   * Se cuenta aquí y no con una consulta de agregado porque las filas ya
   * están pedidas: una segunda consulta para contar lo que ya tenemos en
   * memoria es un viaje de ida y vuelta por nada.
   */
  const porPaso = new Map<EstadoCandidatura, number>();
  for (const f of filas) {
    if (!f.estado) continue;
    porPaso.set(f.estado, (porPaso.get(f.estado) ?? 0) + 1);
  }

  const abiertas = filas.filter(
    (f) => f.estado !== "firmada" && f.estado !== "descartada",
  );
  const firmadas = filas.filter((f) => f.estado === "firmada");
  const descartadas = filas.filter((f) => f.estado === "descartada");

  /*
   * Dónde se cae la gente.
   *
   * Es la pregunta que de verdad cambia un proceso: si la mitad se descarta
   * antes del comité, el problema está en lo que se pide al presentarse, no
   * en el comité.
   */
  const descartesPorPaso = PASOS_ABIERTOS.map((p) => ({
    paso: p.codigo,
    nombre: p.nombre,
    cuenta: descartadas.filter((d) => d.descartada_desde === p.codigo).length,
  })).filter((d) => d.cuenta > 0);

  return {
    todas: filas,
    abiertas,
    firmadas,
    descartadas,
    porPaso,
    descartesPorPaso,
    /*
     * De cada cien que se presentan, cuántas firman. Con menos de cinco
     * cerradas no se enseña: una proporción sobre tres candidaturas no es
     * una proporción, es una anécdota.
     */
    conversion:
      firmadas.length + descartadas.length >= 5
        ? (firmadas.length / (firmadas.length + descartadas.length)) * 100
        : null,
  };
}

export async function leerCandidatura(id: string) {
  const supabase = await clienteServidor();

  const { data: candidatura } = await supabase
    .from("embudo_candidaturas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!candidatura) return null;

  const [enlaces, eventos] = await Promise.all([
    supabase
      .from("candidatura_enlaces")
      .select("*")
      .eq("candidatura_id", id)
      .order("created_at"),
    supabase
      .from("candidatura_eventos")
      .select("*")
      .eq("candidatura_id", id)
      .order("ocurrido_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  return {
    candidatura,
    enlaces: enlaces.data ?? [],
    eventos: eventos.data ?? [],
  };
}

/** Las cohortes a las que se puede adscribir una candidatura */
export async function leerCohortes() {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("cohorts")
    .select("id, name, convocatoria_abierta, convocatoria_cierra")
    .order("start_date", { ascending: false });
  return data ?? [];
}
