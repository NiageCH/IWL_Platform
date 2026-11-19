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

/** Un correo con a quién iba: candidatura, compañía o una persona */
export interface FilaCorreoSuelta extends FilaCorreo {
  donde: { tipo: "candidatura" | "compania"; nombre: string; href: string } | null;
}

/**
 * Los que no salieron, de toda la plataforma, más los últimos que sí: para
 * el bloque «Correos» de Administración, que es adonde lleva su aviso.
 */
export async function leerCorreosDeTodos(): Promise<{ sinEnviar: FilaCorreoSuelta[]; ultimos: FilaCorreoSuelta[] }> {
  const supabase = await clienteServidor();
  const campos =
    "id, evento, destinatario, asunto, estado, error, intentos, created_at, enviado_at, candidaturas(id, nombre), companies(slug, name)";
  const [sinEnviar, ultimos] = await Promise.all([
    supabase.from("correos").select(campos).eq("estado", "sin_enviar").order("created_at").limit(200),
    supabase.from("correos").select(campos).neq("estado", "sin_enviar").order("created_at", { ascending: false }).limit(20),
  ]);
  const comoFila = (c: Record<string, unknown>): FilaCorreoSuelta => {
    const k = c.candidaturas as { id: string; nombre: string } | null;
    const co = c.companies as { slug: string; name: string } | null;
    return {
      ...(c as unknown as FilaCorreo),
      donde: co
        ? { tipo: "compania", nombre: co.name, href: `/cartera/${co.slug}` }
        : k
          ? { tipo: "candidatura", nombre: k.nombre, href: `/embudo/${k.id}` }
          : null,
    };
  };
  return {
    sinEnviar: (sinEnviar.data ?? []).map(comoFila),
    ultimos: (ultimos.data ?? []).map(comoFila),
  };
}
