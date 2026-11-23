import Link from "next/link";
import { cerrarAvisoGuia } from "@/lib/acciones/guia";
import { hayGuia } from "@/lib/datos/guia";

/**
 * La primera entrada por un enlace de aviso.
 *
 * Quien entra por `/` la primera vez cae en su guía. Quien entra por el
 * enlace de un correo va directa a lo suyo, que es a lo que venía, y aquí
 * se le dice en una línea que hay guía. Sale mientras no la haya abierto
 * ni la haya cerrado; las dos cosas la dan por vista. Si su papel no tiene
 * guía, no se le ofrece.
 */
export function PrimeraVez({ vista, rol }: { vista: boolean; rol: string | null | undefined }) {
  if (vista || !hayGuia(rol)) return null;
  return (
    <div
      data-primera-vez
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-filete bg-papel px-6 py-2 text-xs text-secundario"
    >
      <span>¿Es tu primera vez? Tu guía te explica cómo funciona.</span>
      <Link href="/guia" className="enlace text-acento-texto">
        Abrir la guía
      </Link>
      <form action={cerrarAvisoGuia} className="ml-auto">
        <button type="submit" className="accion text-xs" aria-label="Cerrar el aviso de la guía">
          Cerrar
        </button>
      </form>
    </div>
  );
}
