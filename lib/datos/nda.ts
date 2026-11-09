import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * El NDA de una candidatura, para la pantalla de ella y para la de IWL.
 *
 * En qué punto está lo decide la base (`estado_nda`): la puerta de la
 * candidata no puede depender de una cuenta hecha en la pantalla.
 */

export type EstadoNda = "no_aplica" | "sin_plantilla" | "por_firmar" | "esperando_iwl" | "firmado";

export interface PlantillaNda {
  id: string;
  version: number;
  texto: string;
  hash: string;
  created_at: string;
}

export async function leerPlantillaVigente(): Promise<PlantillaNda | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("nda_plantillas")
    .select("id, version, texto, hash, created_at")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function leerNda(candidaturaId: string) {
  const supabase = await clienteServidor();
  const [{ data: estado }, plantilla, { data: firma }] = await Promise.all([
    supabase.rpc("estado_nda", { p_candidatura: candidaturaId }),
    leerPlantillaVigente(),
    supabase
      .from("nda_firmas")
      .select(
        "firmante_nombre, firmado_at, contrafirmante_nombre, contrafirmado_at, texto_version, texto_hash, externo, evidencia_url, documento_id",
      )
      .eq("candidatura_id", candidaturaId)
      .maybeSingle(),
  ]);

  return {
    estado: (estado ?? "no_aplica") as EstadoNda,
    plantilla,
    firma,
  };
}
