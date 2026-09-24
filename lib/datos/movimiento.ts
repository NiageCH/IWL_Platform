import { clienteServidor } from "@/lib/supabase/servidor";
import type { PuntoEvolucion } from "@/components/evolucion";

/**
 * Movimiento de una compañía: su recorrido desde la línea base.
 *
 * Las instantáneas están congeladas en la base y no se recalculan aquí. Lo que
 * se lee hoy de una medición de hace seis meses es lo que se leyó entonces,
 * que es lo único que hace comparable un antes con un después.
 */

export interface Movimiento {
  puntos: PuntoEvolucion[];
  lineaBase: { fecha: string; tecnico: number | null; preparacion: number | null } | null;
  ultimo: { fecha: string; tecnico: number | null; preparacion: number | null } | null;
  deltaTecnico: number | null;
  deltaPreparacion: number | null;
}

export async function leerMovimiento(companyId: string): Promise<Movimiento> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("readiness_snapshots")
    .select("taken_on, tech_score, preparation_score, reason")
    .eq("company_id", companyId)
    .order("taken_on");

  const puntos: PuntoEvolucion[] = (data ?? []).map((s) => ({
    fecha: s.taken_on,
    tecnico: s.tech_score === null ? null : Number(s.tech_score),
    preparacion: s.preparation_score === null ? null : Number(s.preparation_score),
    motivo: s.reason,
  }));

  if (puntos.length === 0) {
    return {
      puntos,
      lineaBase: null,
      ultimo: null,
      deltaTecnico: null,
      deltaPreparacion: null,
    };
  }

  const lineaBase = puntos[0];
  const ultimo = puntos[puntos.length - 1];

  return {
    puntos,
    lineaBase,
    ultimo,
    deltaTecnico: delta(lineaBase.tecnico, ultimo.tecnico),
    deltaPreparacion: delta(lineaBase.preparacion, ultimo.preparacion),
  };
}

/** Movimiento de toda la cartera en una sola consulta, para el dashboard */
export async function leerMovimientoCartera() {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("readiness_snapshots")
    .select("company_id, taken_on, tech_score, preparation_score")
    .order("taken_on");

  const porCompania = new Map<
    string,
    { fechas: string[]; tecnico: number[]; preparacion: number[] }
  >();

  for (const fila of data ?? []) {
    const id = fila.company_id;
    if (!porCompania.has(id)) {
      porCompania.set(id, { fechas: [], tecnico: [], preparacion: [] });
    }
    const serie = porCompania.get(id)!;
    serie.fechas.push(fila.taken_on);
    if (fila.tech_score !== null) serie.tecnico.push(Number(fila.tech_score));
    if (fila.preparation_score !== null) {
      serie.preparacion.push(Number(fila.preparation_score));
    }
  }

  const resumen = new Map<
    string,
    {
      serieTecnico: number[];
      seriePreparacion: number[];
      deltaTecnico: number | null;
      deltaPreparacion: number | null;
      desde: string | null;
    }
  >();

  for (const [id, serie] of porCompania) {
    resumen.set(id, {
      serieTecnico: serie.tecnico,
      seriePreparacion: serie.preparacion,
      deltaTecnico: delta(serie.tecnico[0], serie.tecnico[serie.tecnico.length - 1]),
      deltaPreparacion: delta(
        serie.preparacion[0],
        serie.preparacion[serie.preparacion.length - 1],
      ),
      desde: serie.fechas[0] ?? null,
    });
  }

  return resumen;
}

function delta(
  desde: number | null | undefined,
  hasta: number | null | undefined,
): number | null {
  if (desde === null || desde === undefined) return null;
  if (hasta === null || hasta === undefined) return null;
  return Math.round((hasta - desde) * 10) / 10;
}
