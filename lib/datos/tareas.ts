import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Las tareas de un proyecto, y a quién se le pueden asignar.
 *
 * La tabla, las políticas y el disparador que decide quién asigna a quién
 * llevaban desde septiembre. Lo que no había era pantalla: un módulo entero
 * que solo existía en la base.
 */

export interface Tarea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  owner_id: string | null;
  owner: string | null;
  /** De dónde nació, cuando viene de un hallazgo o de un punto del checklist */
  source_entity: string | null;
  vencida: boolean;
}

export interface Asignable {
  id: string;
  nombre: string;
  /** Para agrupar el desplegable: el equipo de la compañía o el de IWL */
  grupo: string;
}

const ABIERTAS = ["pendiente", "en_curso"];

export async function leerTareas(companyId: string): Promise<{
  tareas: Tarea[];
  abiertas: number;
  vencidas: number;
}> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, due_date, owner_id, source_entity, profiles:owner_id ( full_name )",
    )
    .eq("company_id", companyId)
    .order("status")
    .order("due_date", { nullsFirst: false });

  const hoy = new Date().toISOString().slice(0, 10);

  const tareas: Tarea[] = (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    due_date: t.due_date,
    owner_id: t.owner_id,
    owner: t.profiles?.full_name ?? null,
    source_entity: t.source_entity,
    vencida:
      ABIERTAS.includes(t.status) && t.due_date !== null && t.due_date < hoy,
  }));

  return {
    tareas,
    abiertas: tareas.filter((t) => ABIERTAS.includes(t.status)).length,
    vencidas: tareas.filter((t) => t.vencida).length,
  };
}

/**
 * A quién se le puede asignar una tarea de este proyecto.
 *
 * Su equipo y quien lo lleva por parte de IWL, que es a quien de verdad se
 * le puede pedir algo. Quien no esté asignado al proyecto no sale: una
 * tarea a nombre de alguien que no puede ni abrir la compañía no la va a
 * hacer nadie.
 */
export async function leerAsignables(companyId: string): Promise<Asignable[]> {
  const supabase = await clienteServidor();

  const [{ data: miembros }, { data: iwl }] = await Promise.all([
    supabase
      .from("company_members")
      .select("profile_id, member_role, profiles ( full_name, is_active )")
      .eq("company_id", companyId),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["admin_iwl", "equipo_iwl"])
      .eq("is_active", true),
  ]);

  const vistos = new Set<string>();
  const lista: Asignable[] = [];

  for (const m of miembros ?? []) {
    if (!m.profile_id || !m.profiles?.is_active || vistos.has(m.profile_id)) {
      continue;
    }
    vistos.add(m.profile_id);
    lista.push({
      id: m.profile_id,
      nombre: m.profiles.full_name ?? "Sin nombre",
      grupo: "En el proyecto",
    });
  }

  for (const p of iwl ?? []) {
    if (!p.id || vistos.has(p.id)) continue;
    vistos.add(p.id);
    lista.push({
      id: p.id,
      nombre: p.full_name ?? "Sin nombre",
      grupo: "Equipo de IWL",
    });
  }

  return lista;
}
