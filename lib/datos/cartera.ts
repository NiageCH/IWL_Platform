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
