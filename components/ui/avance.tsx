import Link from "next/link";

import { Estado } from "@/components/ui/estado";
import { ESTADOS, type EstadoVisual } from "@/lib/estados";

/**
 * Cuánto va hecho, y qué se ha salido de lo normal.
 *
 * Sustituye a la fila de cuadritos de colores. La idea de la fila era
 * buena —ver veintinueve puntos de un vistazo— pero cinco colores
 * seguidos no se leen como avance: se leen como ruido, y había que contar
 * cuadrados para saber si quedaba algo en rojo.
 *
 * Dos cosas, en este orden:
 *
 *   1. **Una barra de un solo color.** Verde lo hecho, gris claro el
 *      resto, y el par «23 de 29» al lado. Eso contesta «¿cuánto queda?»
 *      sin leer nada.
 *   2. **Debajo, solo lo que se ha salido**: lo vencido y lo que pide
 *      atención, como pastillas con su cuenta. Si no hay excepciones no
 *      hay nada, que es la forma de que una excepción se note.
 *
 * Lo que está en curso o por hacer no sale: es lo normal, y el hueco que
 * deja la barra ya lo dice.
 */

export interface ElementoAvance {
  id: string;
  estado: EstadoVisual;
  rotulo: string;
}

/** Lo que no es «va según lo previsto», en el orden en que preocupa */
const EXCEPCIONES: EstadoVisual[] = ["vencido", "atencion"];

export function Avance({
  elementos,
  etiqueta,
  /**
   * A dónde lleva pulsar. Se le añade `?ver=<estado>` en cada pastilla,
   * para abrir la lista filtrada por lo que se acaba de pulsar.
   */
  href,
}: {
  elementos: ElementoAvance[];
  /** Qué se está contando: «puntos del checklist», «hitos del plan» */
  etiqueta: string;
  href?: string;
}) {
  if (elementos.length === 0) return null;

  const hechos = elementos.filter((e) => e.estado === "hecho").length;
  const total = elementos.length;
  const pct = Math.round((hechos / total) * 100);

  const excepciones = EXCEPCIONES.map((estado) => ({
    estado,
    total: elementos.filter((e) => e.estado === estado).length,
  })).filter((e) => e.total > 0);

  const barra = (
    <span className="flex items-center gap-3">
      <span
        role="img"
        aria-label={`${etiqueta}: ${hechos} de ${total} hechos`}
        className="h-2 flex-1 overflow-hidden rounded-full bg-hundido ring-1 ring-filete"
      >
        <span
          className="es-hecho relleno-estado block h-full rounded-full"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="cifra shrink-0 text-xs text-secundario">
        {hechos} de {total}
      </span>
    </span>
  );

  return (
    <div className="flex flex-col gap-2">
      {href ? (
        <Link href={href} className="block rounded-md">
          {barra}
        </Link>
      ) : (
        barra
      )}

      {excepciones.length > 0 ? (
        <p className="flex flex-wrap items-center gap-2">
          {excepciones.map(({ estado, total: cuantos }) => (
            <Estado
              key={estado}
              valor={estado}
              rotulo={`${cuantos} ${nombrePlural(estado, cuantos)}`}
              href={href ? `${href}?ver=${estado}` : undefined}
            />
          ))}
        </p>
      ) : null}
    </div>
  );
}

/**
 * «2 vencidos», no «2 vencido».
 *
 * El nombre del estado es un adjetivo y concuerda con lo que cuenta. Con
 * una sola forma salía «1 vencidos» o «2 atención», y eso delata que la
 * frase la escribió una máquina.
 */
function nombrePlural(estado: EstadoVisual, cuantos: number): string {
  if (estado === "atencion") return cuantos === 1 ? "en atención" : "en atención";
  const nombre = ESTADOS[estado].nombre.toLowerCase();
  return cuantos === 1 ? nombre : `${nombre}s`;
}

/**
 * El aviso de que se está viendo una parte y no el todo.
 *
 * Sin esto, una lista filtrada se confunde con una lista corta: se ven
 * dos puntos donde había veintinueve y parece que han desaparecido.
 */
export function FiltroPuesto({
  estado,
  cuantos,
  href,
}: {
  estado: EstadoVisual;
  cuantos: number;
  /** La misma pantalla sin filtro */
  href: string;
}) {
  return (
    <p className="flex flex-wrap items-center gap-3 border-b border-filete px-4 py-2.5 text-xs">
      <Estado
        valor={estado}
        rotulo={`Viendo ${cuantos} ${nombrePlural(estado, cuantos)}`}
      />
      <Link href={href} className="enlace text-secundario">
        Ver todo
      </Link>
    </p>
  );
}

/**
 * El estado que pide la dirección, si pide uno válido.
 *
 * Acepta lo que venga en la dirección —puede llegar repetido, y entonces
 * Next lo da como lista— y descarta lo que no sea un estado. Un `?ver=`
 * escrito a mano con cualquier cosa no rompe la pantalla: no filtra.
 */
export function filtroDe(
  valor: string | string[] | undefined,
): EstadoVisual | null {
  const uno = Array.isArray(valor) ? valor[0] : valor;
  return uno && uno in ESTADOS ? (uno as EstadoVisual) : null;
}
