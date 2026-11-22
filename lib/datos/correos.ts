import { clienteServidor } from "@/lib/supabase/servidor";
import { escribirCorreo, type DatosCorreo, type Evento } from "@/lib/correo/plantillas";

/** Los correos de una candidatura o de una compañía. Los lee IWL, por RLS */
export interface FilaCorreo {
  id: string;
  evento: Evento;
  destinatario: string;
  asunto: string;
  estado: "pendiente" | "enviado" | "sin_enviar" | "retenido";
  error: string | null;
  intentos: number;
  created_at: string;
  enviado_at: string | null;
  /** El correo como le habría llegado, en texto: para leer un retenido */
  texto: string;
}

/**
 * El texto del correo, escrito otra vez con sus datos. El enlace de acceso
 * de los que lo llevan se genera al enviar y no se guarda, así que aquí va
 * dicho en vez de inventarlo.
 */
function textoDe(evento: Evento, datos: unknown): string {
  try {
    const d = { ...((datos ?? {}) as DatosCorreo) };
    if (!d.enlace) d.enlace = "(el enlace se genera al enviarlo)";
    return escribirCorreo(evento, d).texto;
  } catch {
    return "No se ha podido volver a escribir este correo.";
  }
}

function conTexto<T extends { evento: Evento; datos?: unknown }>(c: T): Omit<T, "datos"> & { texto: string } {
  const { datos, ...resto } = c;
  return { ...resto, texto: textoDe(c.evento, datos) };
}

export async function leerCorreos(de: { candidaturaId?: string; companyId?: string }): Promise<FilaCorreo[]> {
  const supabase = await clienteServidor();
  let q = supabase
    .from("correos")
    .select("id, evento, destinatario, asunto, estado, error, intentos, created_at, enviado_at, datos")
    .order("created_at", { ascending: false })
    .limit(30);
  if (de.candidaturaId) q = q.eq("candidatura_id", de.candidaturaId);
  else if (de.companyId) q = q.eq("company_id", de.companyId);
  else return [];
  const { data } = await q;
  return (data ?? []).map((c) => conTexto(c as unknown as FilaCorreo & { datos: unknown })) as FilaCorreo[];
}

/** Un correo con a quién iba: candidatura, compañía o una persona */
export interface FilaCorreoSuelta extends FilaCorreo {
  donde: { tipo: "candidatura" | "compania"; nombre: string; href: string } | null;
}

/**
 * Los que no salieron, de toda la plataforma, más los últimos que sí: para
 * el bloque «Correos» de Administración, que es adonde lleva su aviso.
 */
export async function leerCorreosDeTodos(): Promise<{
  sinEnviar: FilaCorreoSuelta[];
  ultimos: FilaCorreoSuelta[];
  retenidos: FilaCorreoSuelta[];
}> {
  const supabase = await clienteServidor();
  const campos =
    "id, evento, destinatario, asunto, estado, error, intentos, created_at, enviado_at, datos, candidaturas(id, nombre), companies(slug, name)";
  const [sinEnviar, ultimos, retenidos] = await Promise.all([
    supabase.from("correos").select(campos).eq("estado", "sin_enviar").order("created_at").limit(200),
    supabase.from("correos").select(campos).in("estado", ["enviado", "pendiente"]).order("created_at", { ascending: false }).limit(20),
    supabase.from("correos").select(campos).eq("estado", "retenido").order("created_at", { ascending: false }).limit(50),
  ]);
  const comoFila = (c: Record<string, unknown>): FilaCorreoSuelta => {
    const k = c.candidaturas as { id: string; nombre: string } | null;
    const co = c.companies as { slug: string; name: string } | null;
    return {
      ...(conTexto(c as unknown as FilaCorreo & { datos: unknown }) as FilaCorreo),
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
    retenidos: (retenidos.data ?? []).map(comoFila),
  };
}
