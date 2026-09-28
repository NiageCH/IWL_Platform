"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Navegación entre secciones.
 *
 * Marca cuál está abierta. Sin eso, una fila de pestañas todas iguales no
 * dice dónde estás ni que se puedan pulsar: era el caso de administración,
 * donde ninguna sección se distinguía de las demás.
 *
 * Es cliente solo por `usePathname`. Lo que decide qué está activo es la
 * dirección, no un parámetro que haya que recordar pasar en cada página.
 */
export function NavSecciones({
  secciones,
  className,
}: {
  secciones: { href: string; nombre: string }[];
  className?: string;
}) {
  const ruta = usePathname();

  return (
    <nav className={cn("mb-6 flex flex-wrap gap-2", className)}>
      {secciones.map((s) => {
        const activa = ruta === s.href || ruta.startsWith(`${s.href}/`);

        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={activa ? "page" : undefined}
            className={activa ? "pestana pestana-activa" : "pestana"}
          >
            {s.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
