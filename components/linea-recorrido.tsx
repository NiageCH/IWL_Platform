import Link from "next/link";

import { BarraSegmentada, NodoEstado, type Segmento } from "@/components/ui/estado";
import { ESTADOS, estadoVisual } from "@/lib/estados";
import type { Etapa } from "@/lib/datos/ruta";
import { cn } from "@/lib/utils";

/**
 * El recorrido como línea de puntos.
 *
 * La hoja de ruta se leía bajando por seis tarjetas de media pantalla cada
 * una: para saber por dónde iba el proyecto había que leerse las seis y
 * acordarse. Aquí está entera en cuatro centímetros —un punto por tramo,
 * del color de su estado, con sus hitos debajo— y «estás aquí» marcado.
 *
 * Pulsar un tramo baja a su tarjeta, que es donde se trabaja. La línea
 * resume y lleva; no sustituye a nada.
 */
export function LineaRecorrido({
  etapas,
  etapaActualId,
}: {
  etapas: Etapa[];
  /** El tramo en el que está el proyecto, para marcar dónde se está */
  etapaActualId: string | null;
}) {
  if (etapas.length === 0) return null;

  return (
    <ol className="flex flex-wrap gap-y-5 px-4 py-4">
      {etapas.map((etapa) => {
        const estado = estadoVisual("etapa", {
          estado: etapa.estado,
          fin: etapa.fin,
        });
        const aqui = etapa.id === etapaActualId;

        const hitos: Segmento[] = etapa.hitos.map((h) => ({
          id: h.id,
          estado: estadoVisual("hito", { estado: h.estado, fecha: h.fecha }),
          rotulo: h.titulo,
          href: `#etapa-${etapa.id}`,
        }));

        return (
          <li
            key={etapa.id}
            className="group relative flex min-w-36 flex-1 flex-col items-start gap-2 pr-4"
          >
            {/*
              La línea que une un punto con el siguiente, por detrás. Sale
              del propio punto y el último tramo no la lleva: una línea que
              sigue después del final sugiere que queda algo más.
            */}
            <span
              aria-hidden="true"
              className="absolute top-[0.6875rem] right-0 left-2.5 h-px bg-filete group-last:hidden"
            />

            <span className="relative z-10 flex items-center gap-2 bg-papel pr-2">
              <NodoEstado
                valor={estado}
                titulo={`${etapa.nombre} · ${ESTADOS[estado].nombre}`}
              />
              {aqui ? (
                <span className="pastilla [--tono:var(--color-acento-texto)]">
                  Estás aquí
                </span>
              ) : null}
            </span>

            <Link
              href={`#etapa-${etapa.id}`}
              className={cn(
                "enlace text-xs",
                aqui ? "font-semibold text-titular" : "text-secundario",
              )}
            >
              {etapa.orden + 1}. {etapa.nombre}
            </Link>

            {hitos.length > 0 ? (
              <span className="barra-segmentos">
                {hitos.map((h) => (
                  <Link
                    key={h.id}
                    href={`#etapa-${etapa.id}`}
                    title={`${h.rotulo} · ${ESTADOS[h.estado].nombre}`}
                    className={cn("segmento size-2.5", `es-${h.estado}`)}
                  >
                    <span className="sr-only">
                      {h.rotulo} · {ESTADOS[h.estado].nombre}
                    </span>
                  </Link>
                ))}
              </span>
            ) : (
              <span className="text-xs text-metadato">Sin hitos</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Todos los hitos del plan, de un vistazo y en una sola barra */
export function BarraHitos({ etapas, sueltos }: { etapas: Etapa[]; sueltos: Etapa["hitos"] }) {
  const todos = [...etapas.flatMap((e) => e.hitos), ...sueltos];
  if (todos.length === 0) return null;

  return (
    <BarraSegmentada
      etiqueta="Hitos del plan"
      segmentos={todos.map((h) => ({
        id: h.id,
        estado: estadoVisual("hito", { estado: h.estado, fecha: h.fecha }),
        rotulo: h.titulo,
      }))}
    />
  );
}
