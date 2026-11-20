import { clienteServidor } from "@/lib/supabase/servidor";
import { leerEvidencias } from "@/lib/datos/evidencia";
import type { EvidenciaAdjunta } from "@/components/formularios/evidencia";
import { nombreCompleto } from "@/lib/etiquetas";
import { sumarPorEstado, type EstadoSesion, type RecuentoHoras } from "@/lib/sesiones";

/**
 * Las sesiones de una compañía, con su acta, sus horas y su historia
 * (REVISION, 13 nov). Las lee IWL y la fundadora: RLS decide.
 */

export interface LineaSesion {
  id: string;
  persona: string;
  profileId: string | null;
  perfil: string;
  horas: number;
  valor: number;
}

export interface AcuerdoSesion {
  id: string;
  texto: string;
  responsable: string | null;
  fecha: string | null;
  tareaId: string | null;
  hito: { id: string; titulo: string } | null;
}

export interface EventoSesion {
  id: string;
  tipo: string;
  autor: string | null;
  texto: string | null;
  detalle: Record<string, unknown>;
  fecha: string;
}

export interface Sesion {
  id: string;
  tipo: "sesion" | "trabajo";
  fecha: string;
  duracionMin: number | null;
  modalidad: string | null;
  asistentesCompania: string | null;
  titulo: string;
  materia: string | null;
  pilar: string | null;
  trabajado: string | null;
  entregable: string | null;
  estado: EstadoSesion;
  pendienteDesde: string;
  registradaPor: { id: string | null; nombre: string };
  cerradaAt: string | null;
  migrada: boolean;
  lineas: LineaSesion[];
  horas: number;
  acuerdos: AcuerdoSesion[];
  historia: EventoSesion[];
  evidencias: EvidenciaAdjunta[];
}

export async function leerSesiones(companyId: string): Promise<{ sesiones: Sesion[]; recuento: RecuentoHoras }> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("work_sessions")
    .select(
      `id, kind, held_on, duration_minutes, modality, attendees_company, title, worked, deliverable_url,
       status, pending_since, registered_by, closed_at, migrated, created_at,
       contribution_subjects ( name ), pillars ( name ),
       registrador:profiles!work_sessions_registered_by_fkey ( full_name, last_name, email ),
       contribution_hours ( id, person_name, profile_id, profile_code, hours, applied_rate ),
       session_agreements ( id, body, owner_name, due_on, task_id, milestone_id, created_at, milestones ( id, title ) ),
       session_events ( id, kind, author_name, body, detail, created_at )`,
    )
    .eq("company_id", companyId)
    .order("held_on", { ascending: false })
    .order("created_at", { ascending: false });

  const filas = data ?? [];
  const evidencias = await leerEvidencias(companyId, "session");

  const sesiones: Sesion[] = filas.map((f) => {
    const r = f.registrador as unknown as { full_name: string | null; last_name: string | null; email: string | null } | null;
    const lineas = (f.contribution_hours ?? []).map((h) => ({
      id: h.id,
      persona: h.person_name,
      profileId: h.profile_id,
      perfil: h.profile_code,
      horas: Number(h.hours),
      valor: Math.round(Number(h.hours) * Number(h.applied_rate) * 100) / 100,
    }));
    return {
      id: f.id,
      tipo: f.kind as Sesion["tipo"],
      fecha: f.held_on,
      duracionMin: f.duration_minutes,
      modalidad: f.modality,
      asistentesCompania: f.attendees_company,
      titulo: f.title,
      materia: f.contribution_subjects?.name ?? null,
      pilar: f.pillars?.name ?? null,
      trabajado: f.worked,
      entregable: f.deliverable_url,
      estado: f.status as EstadoSesion,
      pendienteDesde: f.pending_since,
      registradaPor: { id: f.registered_by, nombre: r ? nombreCompleto(r.full_name, r.last_name) || r.email || "IWL" : "IWL" },
      cerradaAt: f.closed_at,
      migrada: f.migrated,
      lineas,
      horas: lineas.reduce((t, l) => t + l.horas, 0),
      acuerdos: [...(f.session_agreements ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((a) => ({
          id: a.id,
          texto: a.body,
          responsable: a.owner_name,
          fecha: a.due_on,
          tareaId: a.task_id,
          hito: a.milestones ? { id: a.milestones.id, titulo: a.milestones.title } : null,
        })),
      historia: [...(f.session_events ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((e) => ({
          id: e.id,
          tipo: e.kind,
          autor: e.author_name,
          texto: e.body,
          detalle: (e.detail ?? {}) as Record<string, unknown>,
          fecha: e.created_at,
        })),
      evidencias: evidencias.get(f.id) ?? [],
    };
  });

  return { sesiones, recuento: sumarPorEstado(sesiones) };
}

/** Lo que hace falta para registrar una sesión: materias, pilares y quién puede imputar */
export interface OpcionesSesion {
  materias: Array<{ id: string; nombre: string }>;
  pilares: Array<{ id: string; nombre: string }>;
  perfiles: Array<{ codigo: string; nombre: string }>;
  /** Las personas de IWL con quien se imputa: las de la compañía, con su perfil de tarifa */
  personas: Array<{ id: string; nombre: string; perfil: string | null }>;
  hitos: Array<{ id: string; titulo: string }>;
}

export async function leerOpcionesSesion(companyId: string): Promise<OpcionesSesion> {
  const supabase = await clienteServidor();
  const [materias, pilares, perfiles, miembros, iwl, hitos] = await Promise.all([
    supabase.from("contribution_subjects").select("id, name").eq("is_active", true).order("order_index"),
    supabase.from("pillars").select("id, name").order("order_index"),
    supabase.from("rate_cards").select("profile_code, profile_name").is("valid_to", null).order("applied_rate", { ascending: false }),
    supabase
      .from("company_members")
      .select("profile_id, member_role, rate_profile, profiles ( full_name, last_name, email )")
      .eq("company_id", companyId)
      .neq("member_role", "fundadora"),
    supabase.from("profiles").select("id, full_name, last_name, email").in("role", ["admin_iwl", "equipo_iwl"]).eq("is_active", true),
    supabase.from("milestones").select("id, title").eq("company_id", companyId).order("due_date", { nullsFirst: false }),
  ]);

  const personas = new Map<string, { id: string; nombre: string; perfil: string | null }>();
  for (const m of miembros.data ?? []) {
    const p = m.profiles as unknown as { full_name: string | null; last_name: string | null; email: string | null } | null;
    personas.set(m.profile_id, {
      id: m.profile_id,
      nombre: nombreCompleto(p?.full_name, p?.last_name) || p?.email || "Sin nombre",
      perfil: m.rate_profile,
    });
  }
  for (const p of iwl.data ?? []) {
    if (!personas.has(p.id)) {
      personas.set(p.id, { id: p.id, nombre: nombreCompleto(p.full_name, p.last_name) || p.email || "Sin nombre", perfil: null });
    }
  }

  return {
    materias: (materias.data ?? []).map((m) => ({ id: m.id, nombre: m.name })),
    pilares: (pilares.data ?? []).map((p) => ({ id: p.id, nombre: p.name })),
    perfiles: [
      ...new Map((perfiles.data ?? []).map((p) => [p.profile_code, { codigo: p.profile_code, nombre: p.profile_name }])).values(),
    ],
    personas: [...personas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    hitos: (hitos.data ?? []).map((h) => ({ id: h.id, titulo: h.title })),
  };
}
