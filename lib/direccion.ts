/**
 * La dirección pública de la plataforma.
 *
 * Hace falta para componer enlaces enteros que alguien va a copiar y pegar
 * fuera: el de la convocatoria y el privado de cada candidata. Una ruta
 * relativa no sirve para eso.
 *
 * En Vercel llega por `VERCEL_PROJECT_PRODUCTION_URL`, que apunta siempre al
 * dominio de producción aunque se esté mirando un despliegue de vista
 * previa: es justo lo que se quiere, porque el enlace que se reparte no
 * puede ser el de una rama.
 */
export function direccionBase(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
