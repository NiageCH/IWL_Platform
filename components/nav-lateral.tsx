"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Filter,
  LayoutGrid,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONOS = {
  cartera: LayoutGrid,
  embudo: Filter,
  comparativa: BarChart3,
  administracion: Settings,
} satisfies Record<string, LucideIcon>;

export type EntradaLateral = {
  href: string;
  nombre: string;
  icono: keyof typeof ICONOS;
};

/**
 * Los enlaces de la barra lateral.
 *
 * Cliente solo por `usePathname`: qué está abierto lo dice la dirección, no
 * un parámetro que haya que acordarse de pasar en cada página.
 *
 * El icono va dentro del propio enlace, no delante como adorno: el destino
 * entero —icono y rótulo— es la zona que se pulsa, que es lo que hace que
 * una barra lateral se lea como navegación y no como una lista de palabras.
 */
export function NavLateral({ entradas }: { entradas: EntradaLateral[] }) {
  const ruta = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {entradas.map((e) => {
        const activa = ruta === e.href || ruta.startsWith(`${e.href}/`);
        const Icono = ICONOS[e.icono];

        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "group/item item-lateral",
              activa && "item-lateral-activo",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] transition-colors",
                activa
                  ? "bg-acento-solido text-white"
                  : "bg-white/5 text-secundario group-hover/item:text-titular",
              )}
            >
              <Icono className="size-4" strokeWidth={2} />
            </span>
            {e.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
