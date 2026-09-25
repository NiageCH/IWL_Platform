import Link from "next/link";
import { INFORMES, type TipoInforme } from "@/app/informe/[tipo]/[slug]/page";

/**
 * Enlaces a los informes desde la pantalla que los alimenta.
 *
 * El informe se genera desde donde se trabajan sus datos, no desde un menú
 * aparte: quien acaba de cerrar una evaluación es quien va a querer el
 * informe técnico, y ahí es donde tiene que estar el enlace.
 *
 * Se abren en otra pestaña porque son documentos: se imprimen y se vuelve a
 * lo que se estaba haciendo.
 */
export function EnlacesInforme({
  slug,
  tipos,
}: {
  slug: string;
  tipos: TipoInforme[];
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-filete px-4 py-3">
      {tipos.map((tipo) => (
        <Link
          key={tipo}
          href={`/informe/${tipo}/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-wrap items-baseline gap-x-3 gap-y-0.5"
        >
          <span className="text-sm text-acento-texto underline decoration-filete underline-offset-4 group-hover:decoration-current">
            {INFORMES[tipo].titulo}
          </span>
          <span className="text-xs text-secundario">{INFORMES[tipo].resumen}</span>
        </Link>
      ))}
    </div>
  );
}
