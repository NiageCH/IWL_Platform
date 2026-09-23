import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Cliente de Supabase para Server Components, Server Actions y rutas de API.
 *
 * Lleva la sesión de la persona que navega, así que todas las consultas pasan
 * por Row Level Security. Es el cliente por defecto: usar el de servicio
 * (`servicio.ts`) solo donde esté justificado.
 *
 * En Next 16 `cookies()` es asíncrono, de ahí el await.
 */
export async function clienteServidor() {
  const almacen = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacen.getAll();
        },
        setAll(cookiesAEscribir) {
          try {
            for (const { name, value, options } of cookiesAEscribir) {
              almacen.set(name, value, options);
            }
          } catch {
            // Un Server Component no puede escribir cookies. El refresco de
            // sesión lo hace proxy.ts, así que aquí se puede ignorar.
          }
        },
      },
    },
  );
}

/**
 * La persona que ha iniciado sesión, con su perfil y su rol.
 * Devuelve null si no hay sesión válida.
 */
export async function personaActual() {
  const supabase = await clienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, organization_id, is_active")
    .eq("id", user.id)
    .single();

  if (!perfil || !perfil.is_active) return null;

  return perfil;
}

/** Roles que ven la cartera completa */
export function esIwl(rol: string | undefined): boolean {
  return rol === "admin_iwl" || rol === "equipo_iwl";
}
