/**
 * La dirección pública de la plataforma.
 *
 * Hace falta para componer enlaces enteros que alguien va a copiar y pegar
 * fuera: el de la convocatoria y el privado de cada candidata. Una ruta
 * relativa no sirve para eso.
 */

/**
 * El dominio de producción, y el único que se reparte.
 *
 * Vercel da también `iwl-platform.vercel.app`, que funciona y es el que
 * sale por defecto. Repartir dos direcciones para lo mismo es repartir
 * una que algún día deja de valer: el enlace privado de una candidata
 * dura semanas, y si lo guardó con el dominio de Vercel y mañana el
 * proyecto se renombra, ese enlace se cae. El proxy manda de uno al otro.
 */
export const DOMINIO_PRODUCCION = "ride.inceptionwlab.es";

/** El de Vercel, que redirige al anterior */
export const DOMINIO_VERCEL = "iwl-platform.vercel.app";

export function direccionBase(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;

  /*
   * En Vercel, el dominio de producción y no el del despliegue: un enlace
   * compuesto en una vista previa tiene que seguir llevando al sitio de
   * verdad. Si ese dominio es todavía el de `vercel.app`, se corrige aquí
   * en vez de repartirlo.
   */
  const deVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (deVercel) {
    return `https://${deVercel === DOMINIO_VERCEL ? DOMINIO_PRODUCCION : deVercel}`;
  }

  return "http://localhost:3000";
}
