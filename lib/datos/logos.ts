import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Las direcciones firmadas de los logos y de las fotos.
 *
 * El bucket es privado, así que un logo no tiene dirección fija: hay que
 * firmarla. Se firman todas de una vez y no una por compañía, que en una
 * lista de cohorte serían tantas llamadas como filas.
 *
 * Quién puede firmar lo decide RLS igual que el resto: la política de
 * `storage.objects` solo deja leer los logos de compañías que esa persona
 * puede ver, así que esto no abre ninguna puerta.
 */

/** Una hora. Lo que dura mirar una pantalla, con margen */
const VIGENCIA = 3600;

export async function firmarLogos(
  rutas: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  return firmarRutas("logos", rutas);
}

/**
 * Las fotos de las personas, igual que los logos. Quién puede firmar cuál lo
 * decide la política de `fotos`: la de quien ya puede ver a esa persona.
 */
export async function firmarFotos(
  rutas: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  return firmarRutas("fotos", rutas);
}

async function firmarRutas(
  bucket: "logos" | "fotos",
  rutas: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const limpias = [...new Set(rutas.filter((r): r is string => Boolean(r)))];
  if (limpias.length === 0) return new Map();

  const supabase = await clienteServidor();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(limpias, VIGENCIA);

  /*
   * Una imagen que no se puede firmar no es motivo para que falle la
   * pantalla: se cae a las iniciales, que es lo que había antes.
   */
  if (error || !data) return new Map();

  const mapa = new Map<string, string>();
  for (const fila of data) {
    if (fila.path && fila.signedUrl) mapa.set(fila.path, fila.signedUrl);
  }
  return mapa;
}
