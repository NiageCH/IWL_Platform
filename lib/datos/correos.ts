import { clienteServidor } from "@/lib/supabase/servidor";
import type { Evento } from "@/lib/correo/plantillas";

/** Los correos de una candidatura o de una compañía. Los lee IWL, por RLS */
export interface FilaCorreo {
  id: string;
  evento: Evento;
  destinatario: string;
  asunto: string;
  estado: "pendiente" | "enviado" | "sin_enviar";
  error: string | null;
  intentos: number;
  created_at: string;
  enviado_at: string | null;
}

export async function leerCorreos(de: { candidaturaId?: string; companyId?: string }): Promise<FilaCorreo[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("correos")
    .select("id, evento, destinatario, asunto, estado, error, intentos, created_at, enviado_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (de.candidaturaId) q = q.eq("candidatura_id", de.candidaturaId);
  else if (de.companyId) q = q.eq("company_id", de.companyId);
  else return [];
  const { data } = await q;
  return (data ?? []) as FilaCorreo[];
}
