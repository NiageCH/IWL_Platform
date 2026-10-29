import { firmarLogos } from "./logos";
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
    /*
     * Las archivadas no salen en la cartera.
     *
     * Siguen siendo visibles para IWL —el histórico de una compañía que pasó
     * por el programa es lo que justifica la participación— pero la cartera
     * es la lista de proyectos vivos. Una que terminó el programa hace dos años
     * arrastrando el score de su último mes ensucia todas las medias.
     */
    .is("archived_at", null)
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

  /*
   * Lo que se enseña y lo que cuenta no son la misma lista.
   *
   * Una compañía de demostración se ve en la cartera —para eso está— pero no
   * entra en ningún agregado. Está construida para recorrer todos los
   * estados, así que tiene por diseño hallazgos críticos, hitos vencidos y un
   * update sin entregar: justo los datos que más deforman una media. El
   * número que IWL mira para decidir no puede llevar dentro un proyecto que
   * no existe.
   *
   * `companias` sigue siendo todo, porque el listado las enseña. `reales` es
   * lo que alimenta medias, embudo, radares, runway, compromiso y lectura.
   */
  const reales = companias.filter((c) => !c.compania.is_demo);
  const idsReales = new Set(reales.map((c) => c.compania.id));

  const mapa = mapaIntervencion(reales);

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

  /*
   * Los logos, firmados de una vez. El bucket es privado y una dirección
   * firmada caduca, así que se piden al leer la pantalla y no se guardan.
   */
  const logos = await firmarLogos(
    companias.map((c) => c.compania.logo_path),
  );

  return {
    companias,
    /*
     * Las que cuentan. La comparativa las pide por su nombre para no tener
     * que acordarse de filtrar: una pantalla que recibe «todas» y debe usar
     * «las reales» acaba usando todas el día que alguien la toca.
     */
    reales,
    logos,
    cohorte,
    bandas,
    mapa,
    tramos: embudo(reales, bandas),
    evolucion: evolucionCohorte(
      (instantaneas ?? []).filter((i) => idsReales.has(i.company_id)),
    ),
    severidades: hallazgosPorSeveridad(reales),
    // El radar lleva el logo, que ya está firmado unas líneas más arriba
    radares: radaresCohorte(reales).map((r) => ({
      ...r,
      logo: logos.get(
        reales.find((c) => c.compania.slug === r.slug)?.compania.logo_path ??
          "",
      ),
    })),
    runway: runwayCohorte(reales),
    compromisos: (compromisos ?? [])
      .map((c) => {
        const compania = reales.find((x) => x.compania.id === c.company_id);
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
      reales,
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
