import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * ¿Esta persona puede abrir esta compañía?
 *
 * Lo pregunta el layout de `/cartera/[slug]` para poder cerrar la puerta
 * arriba, de forma explícita, en vez de confiar en que una consulta de más
 * abajo no devuelva nada.
 *
 * La respuesta sale de la propia base: se pide la compañía con el cliente
 * de sesión, así que la política `companies_select` —que es
 * `can_read_company(id)`— decide. No se reimplementa la regla aquí: eso
 * serían dos reglas que pueden discrepar.
 */
export async function puedeVerCompania(slug: string): Promise<boolean> {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return data !== null;
}
