import type { ReactNode } from "react";
import { cn, fecha } from "@/lib/utils";

/**
 * Piezas de los informes.
 *
 * Un informe no es una pantalla: se lee entero y de una vez, en papel o en
 * PDF, muchas veces por alguien que no ha entrado nunca en la plataforma. Por
 * eso cada apartado dice de dónde sale su número y cada ausencia se declara
 * en vez de dejarse en blanco: un hueco en un informe se lee como un cero.
 */

export function Portada({
  titulo,
  compania,
  subtitulo,
  confidencialidad,
  datos,
}: {
  titulo: string;
  compania: string;
  subtitulo: string;
  /** Para quién es y qué puede hacer con él. Va en portada, no en letra pequeña */
  confidencialidad: string;
  datos: { etiqueta: string; valor: ReactNode }[];
}) {
  return (
    <header className="bloque-informe mb-8 border-b border-filete pb-6">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold leading-none text-acento">W</span>
        <span className="cifra text-xs uppercase tracking-wide text-metadato">
          Iberian Women Leaders
        </span>
      </div>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-titular">
        {titulo}
      </h1>
      <p className="mt-1 text-lg text-titular">{compania}</p>
      <p className="mt-2 max-w-2xl text-sm text-secundario">{subtitulo}</p>

      <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-3">
        {datos.map((d) => (
          <div key={d.etiqueta} className="flex flex-col gap-0.5">
            <dt className="cifra text-xs uppercase tracking-wide text-metadato">
              {d.etiqueta}
            </dt>
            <dd className="text-sm text-cuerpo">{d.valor}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 border-l-2 border-acento pl-3 text-xs text-secundario">
        {confidencialidad}
      </p>
    </header>
  );
}

export function Seccion({
  titulo,
  descripcion,
  children,
  hojaNueva = false,
  accion,
}: {
  titulo: string;
  /** Qué contesta este apartado. Sin esto, una tabla es solo una tabla */
  descripcion?: string;
  children: ReactNode;
  hojaNueva?: boolean;
  accion?: ReactNode;
}) {
  return (
    <section className={cn("mb-8", hojaNueva && "hoja-nueva")}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-filete pb-2">
        <h2 className="text-base font-semibold tracking-tight text-titular">
          {titulo}
        </h2>
        {accion}
      </div>
      {descripcion ? (
        <p className="mb-3 text-sm text-secundario">{descripcion}</p>
      ) : null}
      {children}
    </section>
  );
}

/** Rejilla de cifras de cabecera de apartado */
export function Cifras({
  items,
}: {
  items: { etiqueta: string; valor: ReactNode; nota?: string }[];
}) {
  return (
    <div className="bloque-informe mb-4 grid gap-6 border border-filete bg-elevado px-4 py-4 sm:grid-cols-4">
      {items.map((c) => (
        <div key={c.etiqueta} className="flex flex-col gap-1">
          <span className="cifra text-xs uppercase tracking-wide text-metadato">
            {c.etiqueta}
          </span>
          <span className="cifra text-xl leading-none text-titular">{c.valor}</span>
          {c.nota ? (
            <span className="text-xs text-secundario">{c.nota}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Tabla({
  cabeceras,
  children,
  alineadas = [],
}: {
  cabeceras: string[];
  children: ReactNode;
  /** Índices de columna alineados a la derecha, por llevar cifras */
  alineadas?: number[];
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-filete-fuerte text-left">
          {cabeceras.map((c, i) => (
            <th
              key={c}
              className={cn(
                "cifra py-2 pr-3 text-xs font-medium uppercase tracking-wide text-metadato",
                alineadas.includes(i) && "text-right",
              )}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-filete">{children}</tbody>
    </table>
  );
}

export function Celda({
  children,
  cifra = false,
  className,
}: {
  /** Opcional: en una fila de totales hay columnas que no llevan nada */
  children?: ReactNode;
  cifra?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "py-2 pr-3 align-top text-cuerpo",
        cifra && "cifra whitespace-nowrap text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Lo que no hay se dice, porque un hueco en un informe se lee como un cero */
export function NoHay({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-filete px-4 py-3 text-sm text-secundario">
      {children}
    </p>
  );
}

/**
 * Nota al pie.
 *
 * Quien lo lee fuera de la plataforma necesita saber de cuándo son los datos:
 * un PDF no se actualiza solo.
 */
export function Pie({
  generadoPor,
  nota,
}: {
  generadoPor: string;
  nota?: string;
}) {
  return (
    <footer className="mt-10 border-t border-filete pt-4 text-xs text-metadato">
      <p>
        Generado el {fecha(new Date())} por {generadoPor} desde la plataforma de
        seguimiento de IWL. Los datos son los que había ese día: el documento no
        se actualiza solo.
      </p>
      {nota ? <p className="mt-1">{nota}</p> : null}
    </footer>
  );
}
