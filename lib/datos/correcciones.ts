import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Los meses ya cargados, con lo que se puede corregir y lo que no.
 *
 * Un mes se corrige mientras IWL no lo haya revisado. Revisado, hace falta
 * que lo reabran: lo impone un disparador, y esto es solo para que la
 * pantalla no ofrezca lo que la base va a rechazar.
 */

export interface ValorDelMes {
  companyKpiId: string;
  codigo: string;
  nombre: string;
  unidad: string;
  valor: number | null;
}

export interface MesCargado {
  periodo: string;
  /** El update de ese mes, si lo hay */
  updateId: string | null;
  estado: string | null;
  revisado: boolean;
  valores: ValorDelMes[];
}

export interface Correccion {
  id: string;
  periodo: string;
  nombre: string;
  anterior: number | null;
  nuevo: number | null;
  quien: string | null;
  cuando: string;
}

export async function leerMesesCargados(
  companyId: string,
): Promise<MesCargado[]> {
  const supabase = await clienteServidor();

  const [{ data: valores }, { data: updates }] = await Promise.all([
    supabase
      .from("kpi_values")
      .select(
        "company_kpi_id, period, value, company_kpis ( kpi_definitions ( code, name, unit ), custom_name, custom_unit )",
      )
      .eq("company_id", companyId)
      .order("period", { ascending: false }),
    supabase
      .from("monthly_updates")
      .select("id, period, status")
      .eq("company_id", companyId),
  ]);

  const porPeriodo = new Map<string, MesCargado>();

  for (const v of valores ?? []) {
    const periodo = v.period.slice(0, 7);
    const def = v.company_kpis?.kpi_definitions;

    /*
     * Los técnicos no se corrigen a mano: salen del análisis del
     * repositorio, así que escribirlos encima mentiría sobre su origen.
     */
    if (!def?.code) continue;

    if (!porPeriodo.has(periodo)) {
      const u = (updates ?? []).find((x) => x.period.slice(0, 7) === periodo);
      porPeriodo.set(periodo, {
        periodo,
        updateId: u?.id ?? null,
        estado: u?.status ?? null,
        revisado: u?.status === "revisado",
        valores: [],
      });
    }

    porPeriodo.get(periodo)!.valores.push({
      companyKpiId: v.company_kpi_id,
      codigo: def.code,
      nombre: def.name ?? v.company_kpis?.custom_name ?? def.code,
      unidad: def.unit ?? v.company_kpis?.custom_unit ?? "numero",
      valor: v.value === null ? null : Number(v.value),
    });
  }

  return [...porPeriodo.values()];
}

/** Las correcciones hechas, lo más reciente arriba */
export async function leerCorrecciones(
  companyId: string,
): Promise<Correccion[]> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("kpi_value_history")
    .select(
      "id, period, valor_anterior, valor_nuevo, changed_at, profiles:changed_by ( full_name ), company_kpis ( kpi_definitions ( name ), custom_name )",
    )
    .eq("company_id", companyId)
    .order("changed_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((c) => ({
    id: c.id,
    periodo: c.period.slice(0, 7),
    nombre:
      c.company_kpis?.kpi_definitions?.name ??
      c.company_kpis?.custom_name ??
      "KPI",
    anterior: c.valor_anterior === null ? null : Number(c.valor_anterior),
    nuevo: c.valor_nuevo === null ? null : Number(c.valor_nuevo),
    quien: c.profiles?.full_name ?? null,
    cuando: c.changed_at,
  }));
}
