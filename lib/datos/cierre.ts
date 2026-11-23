import { clienteServidor } from "@/lib/supabase/servidor";
import type { HitosParaGraduar } from "@/lib/cierre";

/**
 * Cuántos hitos condicionan invertible y cuántos faltan por validar. La
 * cuenta la hace la base (`hitos_para_graduar`), que es la misma que
 * comprueba al graduar; a quien no es dirección le devuelve null.
 */
export async function leerHitosParaGraduar(companyId: string): Promise<HitosParaGraduar | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase.rpc("hitos_para_graduar", { p_company: companyId });
  return (data as HitosParaGraduar | null) ?? null;
}
