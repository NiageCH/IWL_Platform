import { clienteServidor } from "@/lib/supabase/servidor";
import { leerCompania, type ResumenCompania } from "./compania";

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

  const resumenes = await Promise.all(
    (filas ?? []).map((f) => leerCompania(f.slug)),
  );

  const companias = resumenes
    .filter((r): r is NonNullable<ResumenCompania> => r !== null)
    .map((r) => ({ ...r, updateAlDia: updateAlDia(r) }));

  return {
    companias,
    cohorte: filas?.[0]?.cohorts ?? null,
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
