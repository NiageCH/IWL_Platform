import Link from "next/link";
import { leerModoPruebasPantalla } from "@/lib/datos/modo-pruebas";

/** «a», «a y b», «a, b y c» */
function enLista(xs: string[]): string {
  return xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`;
}

/**
 * La franja fija de dirección mientras el correo esté en modo pruebas
 * (REVISION, 21 nov): que nadie crea que un correo ha llegado a una
 * candidata cuando se ha quedado retenido.
 */
export async function FranjaModoPruebas({ rol }: { rol: string | null | undefined }) {
  if (rol !== "admin_iwl") return null;
  const modo = await leerModoPruebasPantalla();
  if (!modo.activo) return null;
  return (
    <div
      role="status"
      data-modo-pruebas
      className="es-atencion flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-filete bg-papel px-6 py-2 text-xs text-titular"
    >
      <span>
        Modo pruebas: los correos solo salen a {enLista(modo.dominios.map((d) => `@${d}`))}.
      </span>
      <Link href="/admin/programa#modo-pruebas" className="enlace text-acento-texto">
        Cambiarlo
      </Link>
    </div>
  );
}
