import Link from "next/link";

import { ESTADOS, type EstadoVisual } from "@/lib/estados";
import { cn } from "@/lib/utils";

/**
 * Una barra que avanza de verdad.
 *
 * Había tres maneras de dibujar un avance en la plataforma —la barra del
 * Anexo, la de preparación por área y la del tiempo del programa— y cada
 * una calculaba su relleno a su manera. La del Anexo salía vacía con «6 de
 * 11» porque el porcentaje llegaba nulo cuando no había previsión, y una
 * barra vacía al lado de un «6 de 11» no es un detalle: dice lo contrario
 * de lo que dice el número.
 *
 * Aquí el relleno sale del par hecho/total y de nada más. Si no hay total,
 * no hay barra: se dice que no la hay en vez de pintar una a cero.
 */
export function BarraProgreso({
  hecho,
  total,
  etiqueta,
  estado = "curso",
  href,
}: {
  hecho: number;
  total: number;
  /** Qué se está contando, para quien no ve la barra */
  etiqueta: string;
  /** El color del relleno. Por defecto, el de «en curso» */
  estado?: EstadoVisual;
  /** A dónde lleva pulsarla. Lo que se cuenta, se pulsa */
  href?: string;
}) {
  if (total <= 0) {
    return (
      <p className="text-xs text-metadato">Sin {etiqueta.toLowerCase()} todavía</p>
    );
  }

  const pct = Math.round((Math.min(hecho, total) / total) * 100);

  const barra = (
    <span className="flex items-center gap-3">
      <span
        role="img"
        aria-label={`${etiqueta}: ${hecho} de ${total}, ${pct} por ciento`}
        className="h-2 flex-1 overflow-hidden rounded-full bg-hundido ring-1 ring-filete"
      >
        <span
          className={cn("block h-full rounded-full relleno-estado", `es-${estado}`)}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="cifra shrink-0 text-xs text-secundario">
        {hecho} de {total}
      </span>
    </span>
  );

  return href ? (
    <Link href={href} className="fila-enlace block rounded-md">
      {barra}
    </Link>
  ) : (
    barra
  );
}

export interface TramoBarra {
  id: string;
  estado: EstadoVisual;
  rotulo: string;
  href?: string;
}

/**
 * La misma barra, partida por estados.
 *
 * Para cuando lo que importa no es cuánto va hecho sino **en qué está
 * repartido**: once hitos de los que seis están cumplidos, uno vencido y
 * cuatro por empezar no es lo mismo que once a medias. Cada tramo ocupa
 * lo que le toca y se puede pulsar.
 */
export function BarraPorEstado({
  tramos,
  etiqueta,
}: {
  tramos: TramoBarra[];
  etiqueta: string;
}) {
  if (tramos.length === 0) return null;

  const porEstado = new Map<EstadoVisual, TramoBarra[]>();
  for (const t of tramos) {
    porEstado.set(t.estado, [...(porEstado.get(t.estado) ?? []), t]);
  }

  const orden: EstadoVisual[] = [
    "hecho",
    "curso",
    "pendiente",
    "atencion",
    "vencido",
    "no_aplica",
  ];

  return (
    <span
      role="img"
      aria-label={`${etiqueta}: ${orden
        .filter((e) => porEstado.has(e))
        .map((e) => `${porEstado.get(e)!.length} ${ESTADOS[e].nombre.toLowerCase()}`)
        .join(", ")}`}
      className="flex h-2 overflow-hidden rounded-full ring-1 ring-filete"
    >
      {orden
        .filter((e) => porEstado.has(e))
        .map((e) => {
          const suyos = porEstado.get(e)!;
          const pct = (suyos.length / tramos.length) * 100;
          const titulo = `${suyos.length} ${ESTADOS[e].nombre.toLowerCase()}`;
          const destino = suyos.find((t) => t.href)?.href;

          const tramo = (
            <span
              className={cn("block h-full relleno-estado", `es-${e}`)}
              style={{ width: "100%" }}
            />
          );

          return destino ? (
            <Link
              key={e}
              href={destino}
              title={titulo}
              style={{ width: `${pct}%` }}
              className="block h-full"
            >
              {tramo}
            </Link>
          ) : (
            <span
              key={e}
              title={titulo}
              style={{ width: `${pct}%` }}
              className="block h-full"
            >
              {tramo}
            </span>
          );
        })}
    </span>
  );
}
