import { problemaParaEnviar } from "@/lib/nda-texto";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * El NDA de una candidatura, para la pantalla de ella y para la de IWL.
 *
 * En qué punto está lo decide la base (`estado_nda`): la puerta de la
 * candidata no puede depender de una cuenta hecha en la pantalla.
 */

export type EstadoNda =
  | "no_aplica"
  | "sin_plantilla"
  | "plantilla_con_huecos"
  | "por_firmar"
  | "esperando_iwl"
  | "firmado";

export interface PlantillaNda {
  id: string;
  version: number;
  texto: string;
  hash: string;
  created_at: string;
  /** Nulo es la genérica; con valor, la versión propia de esa candidatura */
  candidatura_id: string | null;
}

const COLUMNAS_PLANTILLA = "id, version, texto, hash, created_at, candidatura_id";

/** La genérica más reciente: la que firma quien no tiene una propia */
export async function leerPlantillaVigente(): Promise<PlantillaNda | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("nda_plantillas")
    .select(COLUMNAS_PLANTILLA)
    .is("candidatura_id", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** La que le toca a una candidatura: la propia si la tiene, si no la genérica. Lo decide la base */
export async function leerPlantillaDe(candidaturaId: string): Promise<PlantillaNda | null> {
  const supabase = await clienteServidor();
  const { data: id } = await supabase.rpc("plantilla_nda_de", { p_candidatura: candidaturaId });
  if (!id) return null;
  const { data } = await supabase.from("nda_plantillas").select(COLUMNAS_PLANTILLA).eq("id", id).maybeSingle();
  return data;
}

export interface BaseNda {
  startup: string;
  contraparte_nombre: string;
  situacion_societaria: string | null;
  lugar: string;
}

export async function leerNda(candidaturaId: string) {
  const supabase = await clienteServidor();
  const [{ data: estado }, plantilla, { data: firma }, { data: base }] = await Promise.all([
    supabase.rpc("estado_nda", { p_candidatura: candidaturaId }),
    leerPlantillaDe(candidaturaId),
    supabase
      .from("nda_firmas")
      .select(
        "modo, firmante_nombre, firmado_at, contrafirmante_nombre, contrafirmado_at, texto_version, texto_hash, externo, evidencia_url, documento_id",
      )
      .eq("candidatura_id", candidaturaId)
      .maybeSingle(),
    // Lo que completa el texto sin que lo rellene ella, para la vista previa
    supabase.rpc("datos_nda", { p_candidatura: candidaturaId }).maybeSingle(),
  ]);

  return {
    estado: (estado ?? "no_aplica") as EstadoNda,
    plantilla,
    firma,
    base: (base as BaseNda | null) ?? null,
    /** Por qué no se puede enviar: sin plantilla, o con huecos. Nulo si se puede */
    problema: plantilla ? problemaParaEnviar(plantilla.texto) : "Falta cargar la plantilla del NDA.",
  };
}
