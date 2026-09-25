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

export const ESTADOS_ENTRADA: { valor: EstadoEntrada; nombre: string; ayuda: string }[] = [
  { valor: "idea", nombre: "Idea", ayuda: "Tesis y equipo, sin construir." },
  { valor: "prototipo", nombre: "Prototipo", ayuda: "Algo que se enseña, todavía no se usa." },
  { valor: "mvp", nombre: "MVP", ayuda: "En manos de usuarios reales." },
  {
    valor: "primeros_clientes",
    nombre: "Primeros clientes",
    ayuda: "Alguien paga, sin recurrencia demostrada.",
  },
  { valor: "facturacion", nombre: "Facturación", ayuda: "Ingreso recurrente." },
];

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
  };
}

const CAMPOS_HITO =
  "id, title, success_criteria, description, due_date, status, gates_investable, origin, evidence, completed_on, stage_id";

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
      .not("stage_id", "is", null),
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
      "id, side, entry_date, title, body, evidence_url, stage_id, milestone_id, author_id, profiles ( full_name )",
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
    autor: a.profiles?.full_name ?? null,
    esMio: quienMira !== null && a.author_id === quienMira,
  }));
}

/** Los avances de una etapa, en orden cronológico: se lee como un relato */
export function avancesDeEtapa(avances: Avance[], etapaId: string): Avance[] {
  return avances
    .filter((a) => a.etapaId === etapaId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
