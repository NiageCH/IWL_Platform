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
  mentor: "mentor@iwl.test",
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
