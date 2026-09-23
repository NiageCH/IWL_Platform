import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Cliente de Supabase para componentes de cliente.
 *
 * Solo lleva la clave anónima: todo lo que consulte pasa por Row Level
 * Security igual que en servidor. Se usa para el inicio de sesión y para
 * suscripciones en tiempo real, no para leer datos de página.
 */
export function clienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
