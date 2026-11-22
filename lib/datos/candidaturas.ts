import { clienteServidor } from "@/lib/supabase/servidor";
import { nombreCompleto } from "@/lib/etiquetas";
import type { DatosFiltro } from "@/components/vistas/filtro";
import type { Filtro } from "@/lib/candidatura-nueva";
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
   * Las de demostración se ven pero no cuentan, igual que Marea en la
   * cartera. Las listas llevan todas; cada número sale de `reales`.
   */
  const reales = filas.filter((f) => !f.is_demo);
  const abierta = (f: (typeof filas)[number]) =>
    f.estado !== "firmada" && f.estado !== "descartada";

  /*
   * El reparto por paso.
   *
   * Se cuenta aquí y no con una consulta de agregado porque las filas ya
   * están pedidas: una segunda consulta para contar lo que ya tenemos en
   * memoria es un viaje de ida y vuelta por nada.
   */
  const porPaso = new Map<EstadoCandidatura, number>();
  for (const f of reales) {
    if (!f.estado) continue;
    porPaso.set(f.estado, (porPaso.get(f.estado) ?? 0) + 1);
  }

  const abiertas = filas.filter(abierta);
  const firmadas = filas.filter((f) => f.estado === "firmada");
  const descartadas = filas.filter((f) => f.estado === "descartada");

  const cuentas = {
    abiertas: reales.filter(abierta).length,
    firmadas: reales.filter((f) => f.estado === "firmada").length,
    descartadas: reales.filter((f) => f.estado === "descartada").length,
  };

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
    cuenta: reales.filter(
      (d) => d.estado === "descartada" && d.descartada_desde === p.codigo,
    ).length,
  })).filter((d) => d.cuenta > 0);

  return {
    todas: filas,
    abiertas,
    firmadas,
    descartadas,
    /** Para los números: sin las de demostración */
    cuentas,
    porPaso,
    descartesPorPaso,
    /*
     * De cada cien que se presentan, cuántas firman. Con menos de cinco
     * cerradas no se enseña: una proporción sobre tres candidaturas no es
     * una proporción, es una anécdota.
     */
    conversion:
      cuentas.firmadas + cuentas.descartadas >= 5
        ? (cuentas.firmadas / (cuentas.firmadas + cuentas.descartadas)) * 100
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

  const [enlaces, eventos, peticiones, documentos] = await Promise.all([
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
    // Lo que se le ha pedido, y cuánto ha entregado de cada cosa
    supabase
      .from("candidatura_entregas")
      .select("*")
      .eq("candidatura_id", id)
      .order("orden"),
    supabase
      .from("candidatura_documentos")
      .select("*")
      .eq("candidatura_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const listaPeticiones = peticiones.data ?? [];
  const obligatorias = listaPeticiones.filter((p) => p.obligatoria);

  return {
    candidatura,
    enlaces: enlaces.data ?? [],
    eventos: eventos.data ?? [],
    peticiones: listaPeticiones,
    documentos: documentos.data ?? [],
    /*
     * Cuánto lleva entregado de lo obligatorio. Es el número que se mira
     * mientras dura un due diligence, y por eso se calcula aquí y no en la
     * pantalla: si lo calculara cada vista, acabarían discrepando.
     */
    avance:
      obligatorias.length === 0
        ? null
        : {
            cumplidas: obligatorias.filter((p) => (p.documentos ?? 0) > 0).length,
            total: obligatorias.length,
          },
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

/**
 * El filtro de una candidatura y lo que lo decide (REVISION, 22 nov). Nulo
 * en las de antes del 22 nov, que no pasaron por él.
 */
export async function leerFiltro(id: string): Promise<DatosFiltro | null> {
  const supabase = await clienteServidor();
  const { data: c } = await supabase
    .from("candidaturas")
    .select(
      "id, filtro, filtro_motivo, sector, sector_otro, socios, liderazgo_femenino_pct, recomendacion, filtro_decision_motivo, prueba:candidatura_documentos!candidaturas_prueba_documento_id_fkey(nombre), recomienda:profiles!candidaturas_recomendada_por_fkey(id, full_name, last_name), decide:profiles!candidaturas_filtro_decidido_por_fkey(full_name, last_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c?.filtro) return null;
  const recomienda = c.recomienda as unknown as { id: string; full_name: string | null; last_name: string | null } | null;
  const decide = c.decide as unknown as { full_name: string | null; last_name: string | null } | null;
  return {
    candidaturaId: c.id,
    filtro: c.filtro as Filtro,
    motivo: c.filtro_motivo,
    sector: c.sector,
    sectorOtro: c.sector_otro,
    socios: (c.socios ?? []) as unknown as DatosFiltro["socios"],
    mujeresPct: c.liderazgo_femenino_pct === null ? null : Number(c.liderazgo_femenino_pct),
    prueba: (c.prueba as unknown as { nombre: string } | null)?.nombre ?? null,
    recomendadaPor: recomienda ? { id: recomienda.id, nombre: nombreCompleto(recomienda.full_name, recomienda.last_name) } : null,
    recomendacion: c.recomendacion,
    decision: c.filtro_decision_motivo
      ? { quien: decide ? nombreCompleto(decide.full_name, decide.last_name) || null : null, motivo: c.filtro_decision_motivo }
      : null,
  };
}
