"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Cpu,
  Filter,
  FolderCheck,
  Gauge,
  HandCoins,
  LayoutDashboard,
  LayoutGrid,
  NotebookPen,
  Route,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Los iconos, por nombre.
 *
 * Se pasa el nombre y no el componente porque quien llama es casi siempre un
 * componente de servidor, y una función no cruza esa frontera. Un nombre sí,
 * y además obliga a que el repertorio esté en un sitio en vez de repartido.
 *
 * El icono acompaña al rótulo, nunca lo sustituye: el texto va siempre al
 * lado. Un icono suelto es una adivinanza.
 */
const ICONOS = {
  cartera: LayoutGrid,
  embudo: Filter,
  comparativa: BarChart3,
  administracion: Settings,
  resumen: LayoutDashboard,
  ruta: Route,
  programa: NotebookPen,
  aportacion: HandCoins,
  tecnico: Cpu,
  diligencia: FolderCheck,
  plan: NotebookPen,
  kpi: TrendingUp,
  companias: Building2,
  personas: Users,
  evaluacion: Gauge,
  umbrales: SlidersHorizontal,
} satisfies Record<string, LucideIcon>;

export type NombreIcono = keyof typeof ICONOS;

export type Seccion = {
  href: string;
  nombre: string;
  icono?: NombreIcono;
};

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
  secciones: Seccion[];
  className?: string;
}) {
  const ruta = usePathname();

  return (
    <nav className={cn("mb-6 flex flex-wrap gap-2", className)}>
      {secciones.map((s) => {
        const activa = ruta === s.href || ruta.startsWith(`${s.href}/`);
        const Icono = s.icono ? ICONOS[s.icono] : null;

        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2",
              activa ? "pestana pestana-activa" : "pestana",
            )}
          >
            {Icono ? (
              <Icono
                aria-hidden="true"
                className="size-4 shrink-0"
                strokeWidth={activa ? 2.25 : 1.75}
              />
            ) : null}
            {s.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
