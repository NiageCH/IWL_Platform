import Link from "next/link";
import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  Clock,
  type LucideIcon,
} from "lucide-react";

import { CINCO, ESTADOS, recuento, type EstadoVisual } from "@/lib/estados";
import { cn } from "@/lib/utils";

/**
 * Cómo se ve un estado.
 *
 * Tres piezas y nada más: la pastilla, la barra de segmentos y la leyenda.
 * La traducción de «qué estado es esto» vive en `lib/estados.ts`; aquí solo
 * está el dibujo.
 *
 * Las tres llevan icono y palabra. El color es el tercer refuerzo: con la
 * pantalla en escala de grises, cada estado se sigue distinguiendo por su
 * icono, que es lo que se comprueba en las pruebas.
 */

const ICONOS: Record<EstadoVisual, LucideIcon> = {
  hecho: CircleCheck,
  curso: CircleDashed,
  pendiente: Circle,
  atencion: Clock,
  vencido: CircleAlert,
  no_aplica: CircleSlash,
};

export function Estado({
  valor,
  rotulo,
  motivo,
  soloIcono = false,
}: {
  valor: EstadoVisual;
  /**
   * La palabra, cuando la de la base dice más que la genérica.
   *
   * «Bloqueante» es más útil que «Vencido» en un punto de due diligence, y
   * los dos son rojo. El estado manda en el color; el rótulo, en lo que se
   * lee.
   */
  rotulo?: string;
  /** Por qué está así. Va en el `title`, para no meter un párrafo en la fila */
  motivo?: string;
  /** Para una tabla donde no cabe la palabra. Sigue llevándola para quien no ve */
  soloIcono?: boolean;
}) {
  const Icono = ICONOS[valor];
  const nombre = rotulo ?? ESTADOS[valor].nombre;

  return (
    <span
      className={cn("estado", `es-${valor}`, soloIcono && "estado-solo-icono")}
      title={motivo ?? (soloIcono ? nombre : undefined)}
    >
      <Icono aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.25} />
      {soloIcono ? <span className="sr-only">{nombre}</span> : nombre}
    </span>
  );
}

/**
 * El estado como punto sobre una línea.
 *
 * Para el recorrido: un nodo por tramo, con el icono de su estado dentro.
 * Es la misma información que la pastilla, en la forma que pide una línea
 * de tiempo.
 */
export function NodoEstado({
  valor,
  titulo,
}: {
  valor: EstadoVisual;
  titulo: string;
}) {
  const Icono = ICONOS[valor];

  return (
    <span className={cn("nodo-estado", `es-${valor}`)} title={titulo}>
      <Icono aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      <span className="sr-only">{titulo}</span>
    </span>
  );
}

export interface Segmento {
  id: string;
  estado: EstadoVisual;
  /** Qué es este cuadrado. Va en el `title` y en el texto alternativo */
  rotulo: string;
  /** A dónde lleva pulsarlo, cuando el elemento tiene sitio propio */
  href?: string;
}

/**
 * Un conjunto entero, de un vistazo.
 *
 * Veintinueve puntos de due diligence son veintinueve cuadrados: cuántos
 * verdes y cuántos rojos se ve antes de leer nada. Debajo va el recuento en
 * palabras, que es lo que de verdad se lee —y lo único que queda cuando no
 * se distinguen los tonos.
 */
export function BarraSegmentada({
  segmentos,
  etiqueta,
}: {
  segmentos: Segmento[];
  /** Qué se está contando: «29 puntos», «12 hitos» */
  etiqueta?: string;
}) {
  if (segmentos.length === 0) return null;

  const totales = recuento(segmentos.map((s) => s.estado));

  return (
    <div className="flex flex-col gap-2">
      <div className="barra-segmentos" role="list" aria-label={etiqueta}>
        {segmentos.map((s) => {
          const titulo = `${s.rotulo} · ${ESTADOS[s.estado].nombre}`;
          const clases = cn("segmento", `es-${s.estado}`);

          return s.href ? (
            <Link
              key={s.id}
              href={s.href}
              role="listitem"
              className={clases}
              title={titulo}
            >
              <span className="sr-only">{titulo}</span>
            </Link>
          ) : (
            <span key={s.id} role="listitem" className={clases} title={titulo}>
              <span className="sr-only">{titulo}</span>
            </span>
          );
        })}
      </div>

      {/*
        El recuento en palabras.

        La barra se ve; esto se lee. Sin ello, quien no distinga los tonos
        tendría que pasar el ratón por veintinueve cuadrados para saber
        cuántos están en rojo.
      */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secundario">
        {totales.map(({ estado, total }) => (
          <span key={estado} className="inline-flex items-center gap-1.5">
            <Punto estado={estado} />
            <span className="cifra text-titular">{total}</span>
            {ESTADOS[estado].nombre.toLowerCase()}
          </span>
        ))}
      </p>
    </div>
  );
}

/** El cuadradito del recuento. Decorativo: la palabra va justo al lado */
function Punto({ estado }: { estado: EstadoVisual }) {
  return (
    <span
      aria-hidden="true"
      className={cn("segmento size-2.5", `es-${estado}`)}
    />
  );
}

/**
 * La leyenda, una sola vez por pantalla.
 *
 * Los cinco estados con su icono y su palabra, iguales para los tres
 * públicos. Va al pie de la pantalla y no encima de cada bloque: repetida
 * seis veces dejaría de leerse a la primera.
 */
export function LeyendaEstados({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-metadato",
        className,
      )}
    >
      <span>Estados</span>
      {CINCO.map((estado) => {
        const Icono = ICONOS[estado];
        return (
          <span
            key={estado}
            className={cn("inline-flex items-center gap-1.5", `es-${estado}`)}
          >
            <Icono
              aria-hidden="true"
              className="size-3.5"
              strokeWidth={2.25}
              style={{ color: "var(--estado-solido)" }}
            />
            {ESTADOS[estado].nombre}
          </span>
        );
      })}
    </p>
  );
}
