import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Lectura para los informes.
 *
 * Los informes salen de la plataforma: van a un inversor, a un consejo o a un
 * expediente. Por eso leen aparte de las pantallas, aunque los datos sean los
 * mismos: una pantalla puede permitirse enseñar lo que hay y callar lo que no,
 * y un informe tiene que declarar las dos cosas.
 */

export interface HallazgoInforme {
  id: string;
  dimension: string;
  severidad: "critico" | "alto" | "medio" | "bajo";
  titulo: string;
  descripcion: string;
  evidencia: string | null;
  recomendacion: string;
  estado: string;
  notaAceptacion: string | null;
}

export interface PlanInforme {
  id: string;
  titulo: string;
  descripcion: string | null;
  responsable: string;
  esfuerzoDias: number | null;
  coste: number | null;
  trimestre: string | null;
  fecha: string | null;
  estado: string;
  hallazgoId: string | null;
}

export interface DatosTecnicos {
  hallazgos: HallazgoInforme[];
  plan: PlanInforme[];
  /** Cuándo se hizo la evaluación y quién la firma */
  evaluacion: {
    fecha: string;
    estado: string;
    publicada: string | null;
    resumen: string | null;
    fortalezas: string | null;
    revisor: string | null;
  } | null;
  sesiones: {
    fecha: string;
    minutos: number;
    asistentes: string;
    conclusiones: string | null;
  }[];
  /** Horas de revisión conjunta, que es parte de la aportación y del rigor */
  minutosSesiones: number;
  costeTotal: number;
  esfuerzoTotal: number;
}

const RESPONSABLES: Record<string, string> = {
  compania: "La compañía",
  niage: "Ingeniería Niage",
  mixto: "Conjunto",
};

export async function leerDatosTecnicos(
  companyId: string,
): Promise<DatosTecnicos> {
  const supabase = await clienteServidor();

  const [{ data: hallazgos }, { data: plan }, { data: evaluacion }, { data: sesiones }] =
    await Promise.all([
      supabase
        .from("tech_findings")
        .select(
          "id, severity, title, description, evidence, recommendation, status, acceptance_note, tech_dimensions ( name )",
        )
        .eq("company_id", companyId)
        .order("severity"),
      supabase
        .from("tech_plan_items")
        .select(
          "id, title, description, owner, effort_days, estimated_cost, quarter, due_date, status, finding_id",
        )
        .eq("company_id", companyId)
        .order("due_date", { nullsFirst: false }),
      supabase
        .from("tech_assessments")
        .select(
          "assessed_on, status, published_at, summary, strengths, profiles!tech_assessments_reviewer_id_fkey ( full_name )",
        )
        .eq("company_id", companyId)
        .order("assessed_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tech_review_sessions")
        .select("held_on, duration_min, attendees, conclusions")
        .eq("company_id", companyId)
        .order("held_on", { ascending: false }),
    ]);

  const ORDEN: Record<string, number> = { critico: 0, alto: 1, medio: 2, bajo: 3 };

  const lista: HallazgoInforme[] = (hallazgos ?? [])
    .map((h) => ({
      id: h.id,
      dimension: h.tech_dimensions?.name ?? "Sin dimensión",
      severidad: h.severity,
      titulo: h.title,
      descripcion: h.description,
      evidencia: h.evidence,
      recomendacion: h.recommendation,
      estado: h.status,
      notaAceptacion: h.acceptance_note,
    }))
    .sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);

  const items: PlanInforme[] = (plan ?? []).map((p) => ({
    id: p.id,
    titulo: p.title,
    descripcion: p.description,
    responsable: RESPONSABLES[p.owner] ?? p.owner,
    esfuerzoDias: p.effort_days === null ? null : Number(p.effort_days),
    coste: p.estimated_cost === null ? null : Number(p.estimated_cost),
    trimestre: p.quarter,
    fecha: p.due_date,
    estado: p.status,
    hallazgoId: p.finding_id,
  }));

  return {
    hallazgos: lista,
    plan: items,
    evaluacion: evaluacion
      ? {
          fecha: evaluacion.assessed_on,
          estado: evaluacion.status,
          publicada: evaluacion.published_at,
          resumen: evaluacion.summary,
          fortalezas: evaluacion.strengths,
          revisor: evaluacion.profiles?.full_name ?? null,
        }
      : null,
    sesiones: (sesiones ?? []).map((s) => ({
      fecha: s.held_on,
      minutos: s.duration_min,
      asistentes: s.attendees,
      conclusiones: s.conclusions,
    })),
    minutosSesiones: (sesiones ?? []).reduce((t, s) => t + s.duration_min, 0),
    costeTotal: items.reduce((t, p) => t + (p.coste ?? 0), 0),
    esfuerzoTotal: items.reduce((t, p) => t + (p.esfuerzoDias ?? 0), 0),
  };
}

/** Cuenta por severidad, que es lo único que sale en la versión de inversor */
export function porSeveridad(hallazgos: HallazgoInforme[]) {
  const abiertos = hallazgos.filter(
    (h) => h.estado === "abierto" || h.estado === "en_curso",
  );

  return (["critico", "alto", "medio", "bajo"] as const).map((severidad) => ({
    severidad,
    abiertos: abiertos.filter((h) => h.severidad === severidad).length,
    resueltos: hallazgos.filter(
      (h) => h.severidad === severidad && h.estado === "resuelto",
    ).length,
    aceptados: hallazgos.filter(
      (h) => h.severidad === severidad && h.estado === "aceptado",
    ).length,
  }));
}

/** Quién firma el informe, para el pie */
export async function quienGenera() {
  const supabase = await clienteServidor();
  const { data } = await supabase.auth.getUser();
  const correo = data.user?.email ?? null;

  const { data: perfil } = correo
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("email", correo)
        .maybeSingle()
    : { data: null };

  return perfil?.full_name ?? correo ?? "la plataforma";
}

// -----------------------------------------------------------------------------
// Informe mensual
// -----------------------------------------------------------------------------

export interface DatosMensuales {
  /** Primer día del mes, en AAAA-MM-DD */
  periodo: string;
  etiqueta: string;
  update: {
    estado: string;
    logros: string | null;
    bloqueos: string | null;
    peticiones: string | null;
    enviado: string | null;
  } | null;
  kpis: {
    codigo: string;
    nombre: string;
    unidad: string | null;
    valor: number | null;
    anterior: number | null;
    objetivo: number | null;
    /** Si sube es mejor, baja es mejor, o da igual */
    direccion: string | null;
  }[];
  avances: {
    id: string;
    lado: "compania" | "iwl";
    fecha: string;
    titulo: string;
    cuerpo: string | null;
    etapa: string | null;
  }[];
  hitos: {
    titulo: string;
    estado: string;
    fecha: string | null;
    etapa: string | null;
    condiciona: boolean;
  }[];
  horas: number;
  valorHoras: number;
  items: { titulo: string; tipo: string; coste: number | null }[];
}

/** El mes anterior al periodo dado, en AAAA-MM-DD */
function mesAnterior(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  const previo = mes === 1 ? { a: anio - 1, m: 12 } : { a: anio, m: mes - 1 };
  return `${previo.a}-${String(previo.m).padStart(2, "0")}-01`;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function etiquetaMes(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return `${MESES[mes - 1]} de ${anio}`;
}

/**
 * El mes de una compañía.
 *
 * Si no se pide uno concreto se coge el último con KPI cargados, que es el que
 * la fundadora querría mandar. Los avances y las horas se filtran por fecha
 * dentro del mes, no por la etapa a la que pertenecen: el informe cuenta lo
 * que pasó en esas cuatro semanas.
 */
export async function leerMes(
  companyId: string,
  periodoPedido?: string,
): Promise<DatosMensuales | null> {
  const supabase = await clienteServidor();

  let periodo = periodoPedido ?? null;

  if (!periodo) {
    const { data } = await supabase
      .from("kpi_series")
      .select("period")
      .eq("company_id", companyId)
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();
    periodo = data?.period ?? null;
  }

  if (!periodo) return null;

  const previo = mesAnterior(periodo);
  // Último día del mes: el día 0 del siguiente
  const [anio, mes] = periodo.split("-").map(Number);
  const fin = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);

  const [
    { data: series },
    { data: update },
    { data: avances },
    { data: hitos },
    { data: horas },
    { data: items },
  ] = await Promise.all([
    supabase
      .from("kpi_series")
      .select("period, code, name, unit, value, target_value, direction")
      .eq("company_id", companyId)
      .in("period", [periodo, previo]),
    supabase
      .from("monthly_updates")
      .select("status, achievements, blockers, requests, submitted_at")
      .eq("company_id", companyId)
      .eq("period", periodo)
      .maybeSingle(),
    supabase
      .from("progress_entries")
      .select("id, side, entry_date, title, body, roadmap_stages ( name )")
      .eq("company_id", companyId)
      .gte("entry_date", periodo)
      .lte("entry_date", fin)
      .order("entry_date"),
    supabase
      .from("milestones")
      .select("title, status, due_date, completed_on, gates_investable, roadmap_stages ( name )")
      .eq("company_id", companyId)
      /*
       * Los que vencían en el mes o se cerraron en el mes.
       *
       * Con `completed_on.gte.X,due_date.lte.Y` a secas, la segunda condición
       * arrastraba todo lo que había vencido alguna vez: el informe de
       * septiembre listaba hitos cerrados en abril. Cada fecha tiene que
       * quedar dentro del periodo, no solo a un lado de él.
       */
      .or(
        `and(completed_on.gte.${periodo},completed_on.lte.${fin}),` +
          `and(due_date.gte.${periodo},due_date.lte.${fin})`,
      )
      .order("due_date", { nullsFirst: false }),
    supabase
      .from("contribution_hours_valued")
      .select("hours, applied_value")
      .eq("company_id", companyId)
      .gte("worked_on", periodo)
      .lte("worked_on", fin),
    supabase
      .from("contribution_items")
      .select("title, kind, amount")
      .eq("company_id", companyId)
      .gte("occurred_on", periodo)
      .lte("occurred_on", fin),
  ]);

  const deMes = (p: string) => (series ?? []).filter((f) => f.period === p);
  const actuales = deMes(periodo);
  const previos = deMes(previo);

  return {
    periodo,
    etiqueta: etiquetaMes(periodo),
    update: update
      ? {
          estado: update.status,
          logros: update.achievements,
          bloqueos: update.blockers,
          peticiones: update.requests,
          enviado: update.submitted_at,
        }
      : null,
    kpis: actuales.map((k) => ({
      codigo: k.code!,
      nombre: k.name!,
      unidad: k.unit,
      valor: k.value === null ? null : Number(k.value),
      anterior: (() => {
        const antes = previos.find((p) => p.code === k.code);
        return antes?.value == null ? null : Number(antes.value);
      })(),
      objetivo: k.target_value === null ? null : Number(k.target_value),
      direccion: k.direction,
    })),
    avances: (avances ?? []).map((a) => ({
      id: a.id,
      lado: a.side,
      fecha: a.entry_date,
      titulo: a.title,
      cuerpo: a.body,
      etapa: a.roadmap_stages?.name ?? null,
    })),
    hitos: (hitos ?? []).map((h) => ({
      titulo: h.title,
      estado: h.status,
      fecha: h.completed_on ?? h.due_date,
      etapa: h.roadmap_stages?.name ?? null,
      condiciona: h.gates_investable,
    })),
    horas: (horas ?? []).reduce((t, h) => t + Number(h.hours ?? 0), 0),
    valorHoras: (horas ?? []).reduce((t, h) => t + Number(h.applied_value ?? 0), 0),
    items: (items ?? []).map((i) => ({
      titulo: i.title,
      tipo: i.kind,
      coste: i.amount === null ? null : Number(i.amount),
    })),
  };
}
