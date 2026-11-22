import { DESCRIPCION_ESTADIO, ESTADIOS, ORDEN_ESTADIOS } from "@/lib/estadios";
import { nombreCompleto } from "@/lib/etiquetas";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/lib/supabase/database.types";

/**
 * La hoja de ruta de un proyecto.
 *
 * IWL es una incubadora boutique: el recorrido se diseña para cada proyecto
 * según el estado en que entra. Las fases del programa son iguales para todos
 * y dicen en qué momento del contrato está la compañía; la hoja de ruta es
 * suya y dice qué se está intentando conseguir ahora mismo y con qué medios.
 */

export type EstadoEntrada = Database["public"]["Enums"]["estado_entrada"];
export type EstadoEtapa = Database["public"]["Enums"]["estado_etapa"];
export type EstadoHito = Database["public"]["Enums"]["estado_hito"];

/** Los estadios, con lo que tiene que enseñar cada uno (REVISION, 22 nov) */
export const ESTADOS_ENTRADA: { valor: EstadoEntrada; nombre: string; ayuda: string }[] = ORDEN_ESTADIOS.map((e) => ({
  valor: e,
  nombre: ESTADIOS[e],
  ayuda: `${DESCRIPCION_ESTADIO[e]}.`,
}));

export const ESTADOS_ETAPA: Record<EstadoEtapa, string> = {
  planificada: "Planificada",
  en_curso: "En curso",
  completada: "Completada",
  cancelada: "Cancelada",
};

export function nombreEstadoEntrada(valor: EstadoEntrada | null): string | null {
  return ESTADOS_ENTRADA.find((e) => e.valor === valor)?.nombre ?? null;
}

export interface HitoDeEtapa {
  id: string;
  titulo: string;
  criterio: string;
  descripcion: string | null;
  fecha: string | null;
  estado: EstadoHito;
  condicionaInvertible: boolean;
  origen: string;
  evidencia: string | null;
  completadoEl: string | null;
  /** Si al entregarlo lo tiene que validar el mentor */
  requiereValidacion: boolean;
  /** Equity que devenga al validarse, tal como se escribió */
  equityPct: number | null;
  /** Financiación directa que libera al validarse */
  financiacion: number | null;
  /** El mentor secundario o técnico al que se le encargó revisarlo */
  revisorId: string | null;
  entregadoEl: string | null;
  confirmadoEl: string | null;
}

export interface Etapa {
  id: string;
  nombre: string;
  objetivo: string;
  orden: number;
  inicio: string | null;
  fin: string | null;
  estado: EstadoEtapa;
  horasPrevistas: number | null;
  cajaPrevista: number | null;
  notas: string | null;
  hitos: HitoDeEtapa[];
  /** Horas realmente imputadas a esta etapa */
  horasImputadas: number;
  /** Lo entregado frente a lo previsto, cuando hay previsión */
  horasPct: number | null;
}

export interface HojaDeRuta {
  etapas: Etapa[];
  /** Hitos que no cuelgan de ninguna etapa: los que trae el plan técnico */
  sueltos: HitoDeEtapa[];
  estadoEntrada: EstadoEntrada | null;
  /**
   * Por dónde va el proyecto.
   *
   * No es lo mismo la etapa que alguien ha abierto que la que toca según el
   * calendario. Cuando el plan va por delante de la realidad hay que poder
   * verlo, y no dar por hecho que se está trabajando en algo solo porque las
   * fechas dicen que tocaría.
   */
  etapaActual: Etapa | null;
  /** `false` cuando la etapa actual lo es por calendario y nadie la ha abierto */
  etapaAbierta: boolean;
  hitosCumplidos: number;
  hitosTotales: number;
  horasPrevistas: number;
  horasImputadas: number;
}

function hito(fila: {
  id: string;
  title: string;
  success_criteria: string;
  description: string | null;
  due_date: string | null;
  status: EstadoHito;
  gates_investable: boolean;
  origin: string;
  evidence: string | null;
  completed_on: string | null;
  requires_validation: boolean;
  accrues_equity_pct: number | string | null;
  releases_funding: number | string | null;
  reviewer_id: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
}): HitoDeEtapa {
  return {
    id: fila.id,
    titulo: fila.title,
    criterio: fila.success_criteria,
    descripcion: fila.description,
    fecha: fila.due_date,
    estado: fila.status,
    condicionaInvertible: fila.gates_investable,
    origen: fila.origin,
    evidencia: fila.evidence,
    completadoEl: fila.completed_on,
    requiereValidacion: fila.requires_validation,
    equityPct: fila.accrues_equity_pct === null ? null : Number(fila.accrues_equity_pct),
    financiacion: fila.releases_funding === null ? null : Number(fila.releases_funding),
    revisorId: fila.reviewer_id,
    entregadoEl: fila.delivered_at,
    confirmadoEl: fila.confirmed_at,
  };
}

const CAMPOS_HITO =
  "id, title, success_criteria, description, due_date, status, gates_investable, origin, evidence, completed_on, stage_id, requires_validation, accrues_equity_pct, releases_funding, reviewer_id, delivered_at, confirmed_at";

export async function leerHojaDeRuta(
  companyId: string,
  estadoEntrada: EstadoEntrada | null,
): Promise<HojaDeRuta> {
  const supabase = await clienteServidor();

  const [{ data: etapas }, { data: hitos }, { data: horas }] = await Promise.all([
    supabase
      .from("roadmap_stages")
      .select(
        "id, name, objective, order_index, starts_on, ends_on, status, planned_hours, planned_cash, notes",
      )
      .eq("company_id", companyId)
      .order("order_index"),
    supabase
      .from("milestones")
      .select(CAMPOS_HITO)
      .eq("company_id", companyId)
      .order("due_date", { nullsFirst: false }),
    supabase
      .from("contribution_hours")
      .select("stage_id, hours")
      .eq("company_id", companyId)
      .not("stage_id", "is", null)
      // Lo anulado no es horas imputadas (REVISION, 13 nov)
      .neq("session_status", "anulada"),
  ]);

  const imputadas = new Map<string, number>();
  for (const fila of horas ?? []) {
    if (!fila.stage_id) continue;
    imputadas.set(
      fila.stage_id,
      (imputadas.get(fila.stage_id) ?? 0) + Number(fila.hours ?? 0),
    );
  }

  const porEtapa = new Map<string, HitoDeEtapa[]>();
  const sueltos: HitoDeEtapa[] = [];
  for (const fila of hitos ?? []) {
    const convertido = hito(fila);
    if (fila.stage_id) {
      const lista = porEtapa.get(fila.stage_id) ?? [];
      lista.push(convertido);
      porEtapa.set(fila.stage_id, lista);
    } else {
      sueltos.push(convertido);
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);

  const lista: Etapa[] = (etapas ?? []).map((e) => {
    const horasPrevistas = e.planned_hours === null ? null : Number(e.planned_hours);
    const horasImputadas = Math.round((imputadas.get(e.id) ?? 0) * 100) / 100;
    return {
      id: e.id,
      nombre: e.name,
      objetivo: e.objective,
      orden: e.order_index,
      inicio: e.starts_on,
      fin: e.ends_on,
      estado: e.status,
      horasPrevistas,
      cajaPrevista: e.planned_cash === null ? null : Number(e.planned_cash),
      notas: e.notes,
      hitos: porEtapa.get(e.id) ?? [],
      horasImputadas,
      horasPct:
        horasPrevistas && horasPrevistas > 0
          ? Math.round((horasImputadas / horasPrevistas) * 100)
          : null,
    };
  });

  const todos = lista.flatMap((e) => e.hitos);

  const enCurso = lista.find((e) => e.estado === "en_curso") ?? null;
  const porCalendario =
    lista.find((e) => (e.inicio ?? "9999") <= hoy && (e.fin ?? "0000") >= hoy) ??
    null;

  return {
    etapas: lista,
    sueltos,
    estadoEntrada,
    etapaActual: enCurso ?? porCalendario,
    etapaAbierta: enCurso !== null,
    hitosCumplidos: todos.filter((h) => h.estado === "cumplido").length,
    hitosTotales: todos.length,
    horasPrevistas: lista.reduce((t, e) => t + (e.horasPrevistas ?? 0), 0),
    horasImputadas: Math.round(lista.reduce((t, e) => t + e.horasImputadas, 0) * 100) / 100,
  };
}

export interface PlantillaRuta {
  id: string;
  codigo: string;
  nombre: string;
  estadoEntrada: EstadoEntrada;
  descripcion: string | null;
  meses: number | null;
  etapas: {
    id: string;
    codigo: string;
    nombre: string;
    objetivo: string;
    orden: number;
    semanas: number | null;
    horas: number | null;
    caja: number | null;
    hitos: { id: string; titulo: string; criterio: string; condicionaInvertible: boolean }[];
  }[];
}

export async function leerPlantillas(): Promise<PlantillaRuta[]> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("roadmap_templates")
    .select(
      `id, code, name, entry_state, description, duration_months,
       roadmap_template_stages (
         id, code, name, objective, order_index, planned_weeks, planned_hours, planned_cash,
         roadmap_template_milestones ( id, title, success_criteria, gates_investable, order_index )
       )`,
    )
    .eq("is_active", true)
    .order("entry_state");

  return (data ?? []).map((t) => ({
    id: t.id,
    codigo: t.code,
    nombre: t.name,
    estadoEntrada: t.entry_state,
    descripcion: t.description,
    meses: t.duration_months,
    etapas: [...(t.roadmap_template_stages ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((e) => ({
        id: e.id,
        codigo: e.code,
        nombre: e.name,
        objetivo: e.objective,
        orden: e.order_index,
        semanas: e.planned_weeks,
        horas: e.planned_hours === null ? null : Number(e.planned_hours),
        caja: e.planned_cash === null ? null : Number(e.planned_cash),
        hitos: [...(e.roadmap_template_milestones ?? [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map((m) => ({
            id: m.id,
            titulo: m.title,
            criterio: m.success_criteria,
            condicionaInvertible: m.gates_investable,
          })),
      })),
  }));
}

// -----------------------------------------------------------------------------
// Avances
// -----------------------------------------------------------------------------

export type LadoAvance = Database["public"]["Enums"]["lado_avance"];

export interface Avance {
  id: string;
  lado: LadoAvance;
  fecha: string;
  titulo: string;
  cuerpo: string | null;
  enlace: string | null;
  etapaId: string | null;
  hitoId: string | null;
  autor: string | null;
  esMio: boolean;
}

export async function leerAvances(
  companyId: string,
  quienMira: string | null,
): Promise<Avance[]> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("progress_entries")
    .select(
      "id, side, entry_date, title, body, evidence_url, stage_id, milestone_id, author_id, profiles ( full_name, last_name )",
    )
    .eq("company_id", companyId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map((a) => ({
    id: a.id,
    lado: a.side,
    fecha: a.entry_date,
    titulo: a.title,
    cuerpo: a.body,
    enlace: a.evidence_url,
    etapaId: a.stage_id,
    hitoId: a.milestone_id,
    autor: (nombreCompleto(a.profiles?.full_name, a.profiles?.last_name) || null),
    esMio: quienMira !== null && a.author_id === quienMira,
  }));
}

/** Los avances de una etapa, en orden cronológico: se lee como un relato */
export function avancesDeEtapa(avances: Avance[], etapaId: string): Avance[] {
  return avances
    .filter((a) => a.etapaId === etapaId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// -----------------------------------------------------------------------------
// El circuito de los hitos: historial, quién revisa y lo que espera revisión
// -----------------------------------------------------------------------------

export type TipoRevision = "entrega" | "validacion" | "cambios" | "nota";

export interface RevisionHito {
  id: string;
  tipo: TipoRevision;
  comentario: string | null;
  /** Lo que estaba adjunto en ese momento */
  evidencias: Array<{ label: string; url: string | null }>;
  autor: string | null;
  cuando: string;
}

/** Cada ida y vuelta de los hitos de una compañía, por hito y en orden */
export async function leerRevisionesHitos(companyId: string): Promise<Map<string, RevisionHito[]>> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("milestone_reviews")
    .select("id, milestone_id, kind, comment, evidence, author_name, created_at")
    .eq("company_id", companyId)
    .order("created_at");

  const porHito = new Map<string, RevisionHito[]>();
  for (const r of data ?? []) {
    const lista = porHito.get(r.milestone_id) ?? [];
    lista.push({
      id: r.id,
      tipo: r.kind as TipoRevision,
      comentario: r.comment,
      evidencias: Array.isArray(r.evidence)
        ? (r.evidence as Array<{ label?: string; url?: string | null }>).map((e) => ({
            label: e.label ?? "Evidencia",
            url: e.url ?? null,
          }))
        : [],
      autor: r.author_name,
      cuando: r.created_at,
    });
    porHito.set(r.milestone_id, lista);
  }
  return porHito;
}

/** Quien puede revisar un hito además de quien coordina: mentores y revisores asignados */
export interface Acompanante {
  id: string;
  nombre: string;
}

export async function leerAcompanantes(companyId: string): Promise<Acompanante[]> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("company_members")
    .select("profile_id, member_role, profiles ( full_name, last_name, email )")
    .eq("company_id", companyId)
    .in("member_role", ["mentor_secundario", "revisor_niage", "mentor"]);

  const vistos = new Set<string>();
  const salida: Acompanante[] = [];
  for (const m of data ?? []) {
    if (vistos.has(m.profile_id)) continue;
    vistos.add(m.profile_id);
    const p = m.profiles as unknown as { full_name: string | null; last_name: string | null; email: string | null } | null;
    salida.push({
      id: m.profile_id,
      nombre: nombreCompleto(p?.full_name, p?.last_name) || p?.email || "Sin nombre",
    });
  }
  return salida.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Lo que el Anexo vigente deja repartir entre los hitos marcados */
export interface RepartoAnexo {
  /** Si las marcas se pueden tocar: solo con el Anexo en borrador */
  abierto: boolean;
  hayAnexo: boolean;
  equityPactado: number | null;
  equityRepartido: number;
  financiacionPactada: number | null;
  financiacionRepartida: number;
}

export async function leerRepartoAnexo(companyId: string): Promise<RepartoAnexo> {
  const supabase = await clienteServidor();
  const [{ data: anexo }, { data: marcados }] = await Promise.all([
    supabase
      .from("annexes")
      .select("status, equity_pct, committed_cash")
      .eq("company_id", companyId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("milestones")
      .select("accrues_equity_pct, releases_funding")
      .eq("company_id", companyId)
      .or("accrues_equity_pct.not.is.null,releases_funding.not.is.null"),
  ]);
  return {
    abierto: anexo?.status === "borrador",
    hayAnexo: Boolean(anexo),
    equityPactado: anexo?.equity_pct === null || anexo?.equity_pct === undefined ? null : Number(anexo.equity_pct),
    equityRepartido: sumar((marcados ?? []).map((m) => m.accrues_equity_pct)),
    financiacionPactada:
      anexo?.committed_cash === null || anexo?.committed_cash === undefined ? null : Number(anexo.committed_cash),
    financiacionRepartida: sumar((marcados ?? []).map((m) => m.releases_funding)),
  };
}

/** Sin pasar por coma flotante: 2,5 + 0,1 tiene que dar 2,6 */
function sumar(valores: Array<number | string | null>): number {
  const centesimas = valores.reduce<number>((t, v) => t + (v === null ? 0 : Math.round(Number(v) * 100)), 0);
  return centesimas / 100;
}

export interface HitoPorRevisar {
  id: string;
  titulo: string;
  compania: string;
  slug: string;
  entregadoEl: string;
}

/**
 * Los hitos entregados que espera revisar quien mira.
 *
 * IWL, todos los que ve; un mentor, los de las compañías que coordina y
 * los que le han encargado. RLS ya le da solo sus compañías.
 */
export async function leerHitosPorRevisar(persona: { id: string; role: string }): Promise<HitoPorRevisar[]> {
  const supabase = await clienteServidor();
  const iwl = persona.role === "admin_iwl" || persona.role === "equipo_iwl";
  const [{ data: hitos }, { data: coordina }] = await Promise.all([
    supabase
      .from("milestones")
      .select("id, title, delivered_at, reviewer_id, company_id, companies ( name, slug )")
      .eq("status", "entregado")
      .order("delivered_at"),
    iwl
      ? Promise.resolve({ data: [] as Array<{ company_id: string }> })
      : supabase
          .from("company_members")
          .select("company_id")
          .eq("profile_id", persona.id)
          .eq("member_role", "mentor_principal"),
  ]);
  const suyas = new Set((coordina ?? []).map((c) => c.company_id));
  return (hitos ?? [])
    .filter((h) => iwl || suyas.has(h.company_id) || h.reviewer_id === persona.id)
    .map((h) => {
      const c = h.companies as unknown as { name: string; slug: string } | null;
      return {
        id: h.id,
        titulo: h.title,
        compania: c?.name ?? "",
        slug: c?.slug ?? "",
        entregadoEl: h.delivered_at ?? "",
      };
    });
}
