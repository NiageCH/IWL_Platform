import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente con clave de servicio. Se salta Row Level Security.
 *
 * Solo para trabajos que no tienen persona detrás: instanciar el checklist de
 * due diligence al dar de alta una compañía, recibir resultados del worker de
 * análisis, calcular alertas programadas.
 *
 * Nunca se usa para servir una petición de una persona: ahí va `clienteServidor`,
 * que respeta el aislamiento entre compañías. El import de `server-only` hace
 * que el build falle si este fichero acaba en un bundle de cliente.
 */
export function clienteServicio() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clave) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Este cliente solo funciona en servidor.",
    );
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
