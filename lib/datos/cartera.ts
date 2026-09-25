import { clienteServidor } from "@/lib/supabase/servidor";
import { leerCompania, type ResumenCompania } from "./compania";
import { leerMovimientoCartera } from "./movimiento";
import {
  embudo,
  evolucionCohorte,
  hallazgosPorSeveridad,
  leerBandas,
  lecturaDeCohorte,
  mapaIntervencion,
  radaresCohorte,
  runwayCohorte,
} from "./cohorte";

/**
 * Cartera completa para el dashboard de IWL (§4.7).
 *
 * Se resuelve compañía a compañía con `leerCompania` para que los scores del
 * listado y los de la ficha salgan del mismo cálculo. Con tres o treinta
 * compañías es asumible; si la cohorte crece mucho, esto pasa a una vista
 * materializada y se calcula en base.
 */
export async function leerCartera() {
  const supabase = await clienteServidor();

  const { data: filas } = await supabase
    .from("companies")
    .select("slug, cohorts ( name, investable_target )")
    .order("name");

  const [resumenes, movimientos, bandas] = await Promise.all([
    Promise.all((filas ?? []).map((f) => leerCompania(f.slug))),
    leerMovimientoCartera(),
    leerBandas(),
  ]);

  const companias = resumenes
    .filter((r): r is NonNullable<ResumenCompania> => r !== null)
    .map((r) => ({
      ...r,
      updateAlDia: updateAlDia(r),
      movimiento: movimientos.get(r.compania.id) ?? null,
    }));

  const cohorte = filas?.[0]?.cohorts ?? null;
  const mapa = mapaIntervencion(companias);

  // Compromiso de IWL por compañía: horas y caja entregadas sobre
  // comprometidas. Es el panel que el documento de aportación pide en el
  // dashboard de cohorte (§9), y funciona en los dos sentidos.
  const { data: compromisos } = await supabase
    .from("commitment_counter")
    .select("*")
    .not("annex_id", "is", null);

  // Las instantáneas en crudo, para la media de la cohorte en el tiempo
  const { data: instantaneas } = await supabase
    .from("readiness_snapshots")
    .select("company_id, taken_on, preparation_score")
    .order("taken_on");

  return {
    companias,
    cohorte,
    bandas,
    mapa,
    tramos: embudo(companias, bandas),
    evolucion: evolucionCohorte(instantaneas ?? []),
    severidades: hallazgosPorSeveridad(companias),
    radares: radaresCohorte(companias),
    runway: runwayCohorte(companias),
    compromisos: (compromisos ?? [])
      .map((c) => {
        const compania = companias.find((x) => x.compania.id === c.company_id);
        return {
          nombre: compania?.compania.name ?? "",
          slug: compania?.compania.slug ?? "",
          horasComprometidas: Number(c.committed_hours ?? 0),
          horasEntregadas: Number(c.delivered_hours ?? 0),
          horasPct: c.hours_pct === null ? null : Number(c.hours_pct),
          cajaComprometida: Number(c.committed_cash ?? 0),
          cajaDesembolsada: Number(c.disbursed_cash ?? 0),
          cajaPct: c.cash_pct === null ? null : Number(c.cash_pct),
        };
      })
      .filter((c) => c.slug !== ""),
    lectura: lecturaDeCohorte(
      companias,
      movimientos,
      mapa,
      cohorte?.investable_target ?? null,
    ),
  };
}

/** Si el update del mes anterior ya está entregado */
function updateAlDia(resumen: NonNullable<ResumenCompania>): boolean {
  if (!resumen.kpis.periodo) return false;

  const ahora = new Date();
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const esperado = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;

  return resumen.kpis.periodo.slice(0, 7) >= esperado;
}
