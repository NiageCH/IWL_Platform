import { clienteServidor } from "@/lib/supabase/servidor";
import {
  PESOS_MADUREZ,
  calcularMadurez,
  type EntradaMadurez,
  type Madurez,
  type PesosMadurez,
} from "@/lib/scoring/madurez";
import type { ResumenCompania } from "./compania";

/**
 * Madurez de hoy y transformación desde la línea base.
 *
 * El cálculo vive en `lib/scoring`, sin tocar la base: aquí solo se reúnen
 * las entradas. Así el mismo cálculo sirve para la pantalla, para las
 * instantáneas y para cualquier informe, sin tres versiones que se separan.
 */

export interface Transformacion {
  hoy: Madurez;
  /** La misma medida el día que se congeló la línea base */
  inicio: Madurez | null;
  lineaBaseFecha: string | null;
  /** Diferencia por eje. Null cuando alguno de los dos extremos no se midió */
  deltas: { eje: string; nombre: string; inicio: number | null; hoy: number | null }[];
}

export async function leerPesosMadurez(): Promise<PesosMadurez> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "pesos_madurez")
    .maybeSingle();

  const v = data?.value as Partial<PesosMadurez> | null;
  if (!v) return PESOS_MADUREZ;

  return {
    tecnologia: Number(v.tecnologia ?? PESOS_MADUREZ.tecnologia),
    gobierno: Number(v.gobierno ?? PESOS_MADUREZ.gobierno),
    plan: Number(v.plan ?? PESOS_MADUREZ.plan),
    traccion: Number(v.traccion ?? PESOS_MADUREZ.traccion),
    solidez: Number(v.solidez ?? PESOS_MADUREZ.solidez),
  };
}

async function objetivoTraccion(etapa: string): Promise<number | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "objetivos_traccion")
    .maybeSingle();

  const v = data?.value as Record<string, number> | null;
  const objetivo = v?.[etapa];
  return typeof objetivo === "number" ? objetivo : null;
}

/**
 * Compone la entrada del cálculo con lo que hay hoy.
 *
 * Los hitos exigibles son los que ya han vencido o están en curso: medir el
 * plan contra todo el recorrido penalizaría a quien acaba de empezar.
 */
export async function componerEntradaMadurez(
  resumen: NonNullable<ResumenCompania>,
  runwayMinimo: number,
): Promise<EntradaMadurez> {
  const supabase = await clienteServidor();
  const hoy = new Date().toISOString().slice(0, 10);

  const [{ data: hitos }, objetivo] = await Promise.all([
    supabase
      .from("milestones")
      .select("status, due_date")
      .eq("company_id", resumen.compania.id),
    objetivoTraccion(resumen.compania.stage),
  ]);

  const exigibles = (hitos ?? []).filter(
    (h) =>
      h.status === "cumplido" ||
      h.status === "retrasado" ||
      h.status === "en_curso" ||
      (h.due_date !== null && h.due_date <= hoy),
  );

  const mrr = resumen.kpis.valores.mrr ?? null;

  return {
    scoreTecnico: resumen.scoreTecnico.completo ? resumen.scoreTecnico.valor : null,
    scorePreparacion:
      resumen.scorePreparacion.areas.length === 0
        ? null
        : resumen.scorePreparacion.valor,
    hitosExigibles: exigibles.length,
    hitosCumplidos: exigibles.filter((h) => h.status === "cumplido").length,
    mrr: typeof mrr === "number" ? mrr : null,
    mrrObjetivo: objetivo,
    runwayMeses: resumen.kpis.derivados.runway_meses,
    runwayMinimo,
  };
}

/**
 * La madurez de hoy y la del día que se congeló la línea base.
 *
 * La del inicio no se recalcula con los datos de hoy: se lee del contenido
 * congelado. Si se recalculara, la línea base se movería y dejaría de ser un
 * punto de partida, que es toda su razón de existir.
 */
export async function leerTransformacion(
  resumen: NonNullable<ResumenCompania>,
  runwayMinimo: number,
): Promise<Transformacion> {
  const supabase = await clienteServidor();

  const [entrada, pesos, { data: base }] = await Promise.all([
    componerEntradaMadurez(resumen, runwayMinimo),
    leerPesosMadurez(),
    supabase
      .from("baselines")
      .select("taken_on, content")
      .eq("company_id", resumen.compania.id)
      .eq("kind", "inicial")
      .order("taken_on")
      .limit(1)
      .maybeSingle(),
  ]);

  const hoy = calcularMadurez(entrada, pesos);

  const contenido = base?.content as { madurez?: EntradaMadurez } | null;
  const inicio = contenido?.madurez
    ? calcularMadurez(contenido.madurez, pesos)
    : null;

  return {
    hoy,
    inicio,
    lineaBaseFecha: base?.taken_on ?? null,
    deltas: hoy.ejes.map((e) => ({
      eje: e.eje,
      nombre: e.nombre,
      hoy: e.valor,
      inicio: inicio?.ejes.find((i) => i.eje === e.eje)?.valor ?? null,
    })),
  };
}
