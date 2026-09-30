import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Las direcciones firmadas de los logos.
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
  const limpias = [...new Set(rutas.filter((r): r is string => Boolean(r)))];
  if (limpias.length === 0) return new Map();

  const supabase = await clienteServidor();
  const { data, error } = await supabase.storage
    .from("logos")
    .createSignedUrls(limpias, VIGENCIA);

  /*
   * Un logo que no se puede firmar no es motivo para que falle la pantalla:
   * el chip cae a las iniciales, que es lo que había antes de que existieran
   * los logos.
   */
  if (error || !data) return new Map();

  const mapa = new Map<string, string>();
  for (const fila of data) {
    if (fila.path && fila.signedUrl) mapa.set(fila.path, fila.signedUrl);
  }
  return mapa;
}
