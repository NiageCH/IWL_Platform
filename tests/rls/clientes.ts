import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Utilidades para los tests de Row Level Security.
 *
 * Cada test entra como una persona concreta de los datos semilla y comprueba
 * qué ve y qué puede escribir. No se usa la clave de servicio salvo para
 * preparar datos: con ella RLS no se aplica y el test no probaría nada.
 */

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Contraseña de los usuarios de desarrollo, fijada en la semilla */
const PASSWORD = "iwl-local-2026";

export const USUARIOS = {
  admin: "admin@iwl.test",
  equipoIwl: "programa@iwl.test",
  revisorMareaRaiz: "revisor@niage.test",
  revisorVega: "revisor2@niage.test",
  fundadoraMarea: "fundadora@marea.test",
  ctoMarea: "cto@marea.test",
  fundadoraVega: "fundadora@vega.test",
  fundadoraRaiz: "fundadora@raiz.test",
  /*
   * Los dos mentores están cruzados a propósito: producto coordina Marea y
   * apoya en Raíz; comercial al revés. Es la situación que hay que probar,
   * porque el papel va en la asignación y no en la persona.
   */
  mentorProducto: "mentor@iwl.test",
  mentorComercial: "mentor2@iwl.test",
} as const;

export const COMPANIAS = {
  marea: "00000000-0000-0000-0004-000000000001",
  vega: "00000000-0000-0000-0004-000000000002",
  raiz: "00000000-0000-0000-0004-000000000003",
} as const;

/** Cliente autenticado como la persona indicada */
export async function entrarComo(email: string): Promise<SupabaseClient> {
  const cliente = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await cliente.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });

  if (error) {
    throw new Error(`No se ha podido entrar como ${email}: ${error.message}`);
  }

  return cliente;
}

/** Cliente sin sesión: representa a alguien que no ha entrado */
export function clienteAnonimo(): SupabaseClient {
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente con clave de servicio. Salta RLS. Solo para preparar datos o para
 * comprobar, desde fuera, que una escritura que debía fallar no ha ocurrido.
 */
export function clienteServicio(): SupabaseClient {
  return createClient(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function claveConfigurada(): boolean {
  return ANON_KEY.length > 0 && SERVICE_KEY.length > 0;
}

/**
 * Registrar una sesión con unas horas, como lo hace la pantalla: por
 * `registrar_sesion`, que es el único camino. Devuelve el id o el error.
 */
export async function registrarSesion(
  cliente: SupabaseClient,
  s: {
    company: string;
    fecha: string;
    profile: string;
    horas: number;
    perfil?: string;
    titulo?: string;
    /** El acta de una sesión solo la levanta el mentor (REVISION, 22 nov); un trabajo, quien acompaña */
    tipo?: "sesion" | "trabajo";
  },
): Promise<{ id: string | null; error: { message: string } | null }> {
  const servicio = clienteServicio();
  const { data: materia } = await servicio.from("contribution_subjects").select("id").limit(1).single();
  const { data, error } = await cliente.rpc("registrar_sesion", {
    p: {
      company_id: s.company,
      kind: s.tipo ?? "sesion",
      held_on: s.fecha,
      duration_minutes: 60,
      modality: "videollamada",
      title: s.titulo ?? "Sesión de prueba",
      subject_id: materia!.id,
      worked: "Lo que se trabajó en la sesión de prueba.",
      // Un trabajo fuera de sesión va con su entregable
      ...(s.tipo === "trabajo" ? { deliverable_url: "https://ejemplo.test/entregable" } : {}),
      horas: [{ profile_id: s.profile, profile_code: s.perfil ?? "senior", hours: s.horas }],
    },
  });
  return { id: (data as string | null) ?? null, error };
}

/**
 * Quitar las sesiones que creó una prueba, con sus horas, su historia y
 * sus avisos.
 *
 * Una sesión no se borra —se anula con motivo— y eso vale también con la
 * clave de servicio. Para dejar la base como estaba, la prueba la quita
 * por debajo de los disparadores, y así se ve.
 */
export async function quitarSesiones(ids: Array<string | null | undefined>): Promise<void> {
  const limpios = ids.filter((i): i is string => Boolean(i));
  if (!limpios.length) return;
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.SUPABASE_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres", {
    max: 1,
    onnotice: () => {},
  });
  try {
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role = replica`;
      await tx`delete from avisos where work_session_id = any(${limpios}::uuid[])`;
      await tx`delete from session_events where session_id = any(${limpios}::uuid[])`;
      await tx`delete from session_agreements where session_id = any(${limpios}::uuid[])`;
      await tx`delete from contribution_hours where work_session_id = any(${limpios}::uuid[])`;
      await tx`delete from work_sessions where id = any(${limpios}::uuid[])`;
    });
  } finally {
    await sql.end();
  }
}
