/**
 * Un enlace como lo pega la gente, convertido en una dirección completa.
 *
 * Meet, Zoom y Teams se copian a menudo sin el `https://`
 * (`meet.google.com/abc-defg-hij`), y a veces se pega la invitación entera,
 * con texto alrededor. Con `type="url"` el navegador rechazaba lo primero
 * antes de que nadie pudiera arreglarlo, y Rodrigo no podía proponer una
 * reunión (REVISION, 13 nov). Los campos de enlace son ahora de texto, y lo
 * pegado se arregla aquí, en el servidor:
 *
 *   · se quitan los espacios de los lados;
 *   · si hay texto alrededor, se toma la primera dirección que aparezca;
 *   · si falta el esquema, se pone `https://`;
 *   · tiene que quedar una dirección web de verdad: http o https y un
 *     dominio con punto.
 *
 * Devuelve `""` si está vacío y `null` si no es un enlace.
 */
export function normalizarEnlace(texto: string | null | undefined): string | null {
  const limpio = (texto ?? "").trim();
  if (!limpio) return "";

  const candidato = /\s/.test(limpio) ? primeraDireccion(limpio) : limpio;
  if (!candidato) return null;

  const sinCola = candidato.replace(/[.,;:!?)\]}>»"']+$/, "");
  const conEsquema = /^[a-z][a-z0-9+.-]*:\/\//i.test(sinCola) ? sinCola : `https://${sinCola}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
  if (!/\.[a-z]{2,}$/i.test(url.hostname)) return null;

  // `https://siren.es`, no `https://siren.es/`: la barra la añade URL sola
  const completa = url.toString();
  return url.pathname === "/" && !url.search && !url.hash ? completa.replace(/\/$/, "") : completa;
}

/** La primera dirección dentro de un texto: con esquema, o un dominio con ruta */
function primeraDireccion(texto: string): string | null {
  const conEsquema = texto.match(/https?:\/\/[^\s<>"']+/i);
  if (conEsquema) return conEsquema[0];
  const dominio = texto.match(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/i);
  return dominio ? dominio[0] : null;
}

/** El mensaje cuando lo pegado no es un enlace de videollamada */
export const ENLACE_REUNION_NO_VALE =
  "No reconozco ese enlace. Pégalo tal como lo copias de Meet, Zoom o Teams.";

/** El mensaje cuando lo pegado no es un enlace, en el resto de campos */
export const ENLACE_NO_VALE =
  "No reconozco ese enlace. Pégalo tal como lo copias de la barra del navegador.";
