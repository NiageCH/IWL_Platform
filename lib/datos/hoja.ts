import { clienteServidor } from "@/lib/supabase/servidor";
import { firmarRutasDe } from "@/lib/datos/logos";
import type { Estadio } from "@/lib/estadios";
import { nombreLista, tramosDeLaLista, type NumeroTramo } from "@/lib/tramos";

/**
 * Lo del bloque 5 (REVISION, 22 y 23 nov) que no estaba en `lib/datos/ruta`:
 * la lista de entrada («Diagnóstico» en idea, «Lo que ya tenéis» en el
 * resto) y lo que pinta el seguimiento por tramos. Con la sesión: manda RLS.
 */

export interface ItemLista {
  /** El hito fundamental de la plantilla */
  hitoId: string;
  tramo: NumeroTramo;
  titulo: string;
  checkId: string | null;
  respuesta: "si" | "no" | null;
  evidencia: { nombre: string; url: string | null; ruta: string } | null;
  verificacion: "verificado" | "no_basta" | null;
  comentario: string | null;
}

export interface ListaEntrada {
  estadio: Estadio;
  nombre: string;
  items: ItemLista[];
  /** Ya hay hoja de ruta: la lista queda como estaba, solo para leer */
  hayHoja: boolean;
}

export async function leerListaEntrada(companyId: string): Promise<ListaEntrada | null> {
  const supabase = await clienteServidor();
  const { data: co } = await supabase.from("companies").select("entry_state").eq("id", companyId).maybeSingle();
  const estadio = co?.entry_state as Estadio | null;
  if (!estadio) return null;

  const tramos = tramosDeLaLista(estadio);
  const [{ data: hitos }, { data: respuestas }, { count }] = await Promise.all([
    supabase
      .from("roadmap_template_milestones")
      .select("id, title, order_index, roadmap_template_stages!inner(tramo, roadmap_templates!inner(code))")
      .eq("fundamental", true)
      .eq("roadmap_template_stages.roadmap_templates.code", "hoja_iwl")
      .in("roadmap_template_stages.tramo", tramos),
    supabase
      .from("entry_checks")
      .select("id, template_milestone_id, answer, evidence_path, evidence_name, verification, review_comment")
      .eq("company_id", companyId),
    supabase.from("roadmap_stages").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  const rutas = (respuestas ?? []).map((r) => r.evidence_path).filter((r): r is string => Boolean(r));
  const urls = rutas.length ? await firmarRutasDe("data-room", rutas) : new Map<string, string>();
  const porHito = new Map((respuestas ?? []).map((r) => [r.template_milestone_id, r]));

  const items = (hitos ?? [])
    .map((h) => {
      const tramo = (h.roadmap_template_stages as unknown as { tramo: NumeroTramo }).tramo;
      const r = porHito.get(h.id);
      return {
        hitoId: h.id,
        tramo,
        orden: h.order_index,
        titulo: h.title,
        checkId: r?.id ?? null,
        respuesta: (r?.answer ?? null) as ItemLista["respuesta"],
        evidencia: r?.evidence_path
          ? { nombre: r.evidence_name ?? "Archivo", url: urls.get(r.evidence_path) ?? null, ruta: r.evidence_path }
          : null,
        verificacion: (r?.verification ?? null) as ItemLista["verificacion"],
        comentario: r?.review_comment ?? null,
      };
    })
    .sort((a, b) => a.tramo - b.tramo || a.orden - b.orden)
    .map((i) => ({
      hitoId: i.hitoId,
      tramo: i.tramo,
      titulo: i.titulo,
      checkId: i.checkId,
      respuesta: i.respuesta,
      evidencia: i.evidencia,
      verificacion: i.verificacion,
      comentario: i.comentario,
    }));

  return { estadio, nombre: nombreLista(estadio), items, hayHoja: (count ?? 0) > 0 };
}

/** Cómo va la lista: lo que falta contestar, lo que espera al mentor y lo verificado */
export function resumenLista(items: ItemLista[]) {
  return {
    sinContestar: items.filter((i) => !i.respuesta).length,
    porVerificar: items.filter((i) => i.respuesta === "si" && !i.verificacion).length,
    verificados: items.filter((i) => i.verificacion === "verificado").length,
    noBasta: items.filter((i) => i.verificacion === "no_basta").length,
    todaviaNo: items.filter((i) => i.respuesta === "no").length,
  };
}

export interface TramoSeguimiento {
  id: string;
  tramo: NumeroTramo;
  nombre: string;
  inicio: string | null;
  fin: string | null;
  estado: string;
  cerrado: boolean;
  hitos: Array<{
    id: string;
    titulo: string;
    estado: string;
    fecha: string | null;
    fundamental: boolean;
    deTramo: number | null;
  }>;
}

export interface Seguimiento {
  estadio: Estadio | null;
  /** La firma del Acuerdo: desde ahí cuenta el plazo. Sin firmar, es un borrador */
  firma: string | null;
  tramos: TramoSeguimiento[];
}

export async function leerSeguimiento(companyId: string): Promise<Seguimiento> {
  const supabase = await clienteServidor();
  const [{ data: co }, { data: etapas }, { data: anexo }] = await Promise.all([
    supabase.from("companies").select("entry_state").eq("id", companyId).maybeSingle(),
    supabase
      .from("roadmap_stages")
      .select("id, tramo, name, starts_on, ends_on, status, closed_at, order_index, milestones(id, title, status, due_date, fundamental, from_tramo)")
      .eq("company_id", companyId)
      .not("tramo", "is", null)
      .order("order_index"),
    supabase
      .from("annexes")
      .select("signed_on")
      .eq("company_id", companyId)
      .in("status", ["firmado", "cerrado"])
      .order("version")
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    estadio: (co?.entry_state ?? null) as Estadio | null,
    firma: anexo?.signed_on ?? null,
    tramos: (etapas ?? []).map((e) => ({
      id: e.id,
      tramo: e.tramo as NumeroTramo,
      nombre: e.name,
      inicio: e.starts_on,
      fin: e.ends_on,
      estado: e.status,
      cerrado: Boolean(e.closed_at) || e.status === "completada",
      hitos: ((e.milestones ?? []) as Array<{
        id: string;
        title: string;
        status: string;
        due_date: string | null;
        fundamental: boolean;
        from_tramo: number | null;
      }>)
        .map((m) => ({
          id: m.id,
          titulo: m.title,
          estado: m.status,
          fecha: m.due_date,
          fundamental: m.fundamental,
          deTramo: m.from_tramo,
        }))
        .sort((a, b) => (a.deTramo ?? 9) - (b.deTramo ?? 9) || (a.fecha ?? "").localeCompare(b.fecha ?? "")),
    })),
  };
}
