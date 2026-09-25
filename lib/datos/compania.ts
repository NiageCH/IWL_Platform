import { clienteServidor } from "@/lib/supabase/servidor";
import { calcularScoreTecnico } from "@/lib/scoring/score-tecnico";
import { calcularScorePreparacion } from "@/lib/scoring/score-preparacion";
import { calcularSemaforo, evaluarInvertible } from "@/lib/scoring/invertible";
import { calcularDerivados } from "@/lib/scoring/kpi-derivados";
import { permisosDeCompania } from "./permisos";
import type {
  AreaDd,
  DimensionTecnica,
  EntradaInvertible,
  EstadoPuntoDd,
  HallazgoAbierto,
  NivelMadurez,
  Severidad,
} from "@/lib/scoring/tipos";

/**
 * Lectura de una compañía con todo lo que necesita su cabecera.
 *
 * Las consultas van con el cliente de sesión, así que Row Level Security
 * decide qué se devuelve: esta función no comprueba permisos por su cuenta
 * porque no tiene que hacerlo. Si la compañía no es visible, no hay filas.
 */

export type ResumenCompania = Awaited<ReturnType<typeof leerCompania>>;

export async function leerCompania(slug: string) {
  const supabase = await clienteServidor();

  const { data: compania } = await supabase
    .from("companies")
    .select(
      `id, name, slug, sector, one_liner, stage, tech_profile, phase_id,
       female_leadership_pct, founded_on, website,
       phases ( code, name, order_index ),
       cohorts ( name )`,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!compania) return null;

  const [dimensiones, areas, hallazgos, kpis, permisos] = await Promise.all([
    leerDimensiones(supabase, compania.id),
    leerAreas(supabase, compania.id),
    leerHallazgosAbiertos(supabase, compania.id),
    leerKpisRecientes(supabase, compania.id),
    permisosDeCompania(compania.id),
  ]);

  const scoreTecnico = calcularScoreTecnico(dimensiones);

  const pesoTecnico = await leerPesoTecnico(supabase);
  const scorePreparacion = calcularScorePreparacion(
    areas,
    scoreTecnico,
    pesoTecnico,
  );

  const entrada: EntradaInvertible = {
    scoreTecnico,
    scorePreparacion,
    hallazgosAbiertos: hallazgos,
    // Los hitos llegan con el Anexo de Programa, en fase 2
    hitos: [],
    runwayMeses: kpis.derivados.runway_meses,
  };

  return {
    compania,
    permisos,
    scoreTecnico,
    scorePreparacion,
    hallazgos,
    kpis,
    semaforo: calcularSemaforo(entrada),
    invertible: evaluarInvertible(entrada),
  };
}

type Cliente = Awaited<ReturnType<typeof clienteServidor>>;

async function leerDimensiones(
  supabase: Cliente,
  companyId: string,
): Promise<DimensionTecnica[]> {
  const { data } = await supabase
    .from("tech_score_input")
    .select("dimension_code, dimension_name, dimension_order, weight, target_level, level")
    .eq("company_id", companyId)
    .order("dimension_order");

  return (data ?? []).map((d) => ({
    codigo: d.dimension_code!,
    nombre: d.dimension_name!,
    peso: Number(d.weight ?? 0),
    objetivo: (d.target_level ?? 0) as NivelMadurez,
    nivel: d.level === null ? null : (d.level as NivelMadurez),
  }));
}

async function leerAreas(
  supabase: Cliente,
  companyId: string,
): Promise<AreaDd[]> {
  const { data } = await supabase
    .from("dd_items")
    .select("id, status, is_required, expires_on, dd_areas ( code, name, weight, order_index )")
    .eq("company_id", companyId);

  const orden = new Map<string, number>();
  const porArea = new Map<string, AreaDd>();

  for (const punto of data ?? []) {
    const area = punto.dd_areas;
    if (!area) continue;

    if (!porArea.has(area.code)) {
      orden.set(area.code, area.order_index);
      porArea.set(area.code, {
        codigo: area.code,
        nombre: area.name,
        peso: Number(area.weight),
        puntos: [],
      });
    }

    porArea.get(area.code)!.puntos.push({
      codigo: punto.id,
      estado: punto.status as EstadoPuntoDd,
      obligatorio: punto.is_required,
      caducaEl: punto.expires_on ? new Date(punto.expires_on) : null,
    });
  }

  // En el orden en que IWL revisa las áreas, no en el que llegan las filas
  return [...porArea.values()].sort(
    (a, b) => (orden.get(a.codigo) ?? 0) - (orden.get(b.codigo) ?? 0),
  );
}

async function leerHallazgosAbiertos(
  supabase: Cliente,
  companyId: string,
): Promise<HallazgoAbierto[]> {
  const [tecnicos, generales] = await Promise.all([
    supabase
      .from("tech_findings")
      .select("id, severity, title")
      .eq("company_id", companyId)
      .in("status", ["abierto", "en_curso"]),
    supabase
      .from("findings")
      .select("id, severity, title")
      .eq("company_id", companyId)
      .in("status", ["abierto", "en_curso"]),
  ]);

  return [
    ...(tecnicos.data ?? []).map((f) => ({
      id: f.id,
      severidad: f.severity as Severidad,
      titulo: f.title,
      origen: "tecnico" as const,
    })),
    ...(generales.data ?? []).map((f) => ({
      id: f.id,
      severidad: f.severity as Severidad,
      titulo: f.title,
      origen: "general" as const,
    })),
  ];
}

/**
 * Últimos dos meses de KPI y las métricas derivadas del más reciente.
 * Se calculan aquí una vez y se reparten: dashboard, plan financiero e
 * informe leen lo mismo (§11, carga única).
 */
async function leerKpisRecientes(supabase: Cliente, companyId: string) {
  const { data } = await supabase
    .from("kpi_series")
    .select("period, code, name, unit, value, target_value, direction, category")
    .eq("company_id", companyId)
    .order("period", { ascending: false })
    .limit(80);

  const filas = data ?? [];
  const periodos = [...new Set(filas.map((f) => f.period!))].sort().reverse();
  const ultimo = periodos[0] ?? null;
  const anterior = periodos[1] ?? null;

  const valoresDe = (periodo: string | null) => {
    const valores: Record<string, number | null> = {};
    if (!periodo) return valores;
    for (const fila of filas.filter((f) => f.period === periodo)) {
      valores[fila.code!] = fila.value === null ? null : Number(fila.value);
    }
    return valores;
  };

  const mes = { periodo: ultimo ?? "", valores: valoresDe(ultimo) };
  const mesAnterior = anterior
    ? { periodo: anterior, valores: valoresDe(anterior) }
    : null;

  return {
    periodo: ultimo,
    filas,
    valores: mes.valores,
    derivados: calcularDerivados(mes, mesAnterior),
  };
}

async function leerPesoTecnico(supabase: Cliente): Promise<number> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "score_preparacion_peso_tecnico")
    .maybeSingle();

  const valor = data?.value as { peso?: number } | null;
  return valor?.peso ?? 2;
}
