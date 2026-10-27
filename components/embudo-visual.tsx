import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * El recorrido del embudo, como un embudo.
 *
 * Era una rejilla de ocho celdas, cada una con su pastilla, su cifra y dos
 * líneas de descripción. Ocupaba media pantalla, repetía las cuatro cifras
 * de arriba y no se leía como un recorrido: se leía como una tabla.
 *
 * Aquí cada paso es una barra cuyo ancho es su cuenta, así que el
 * estrechamiento se ve solo —que es toda la gracia de un embudo— y dónde se
 * acumula el trabajo salta a la vista sin contar nada.
 *
 * El ancho no es la única señal: cada barra lleva su cifra escrita y su
 * nombre al lado.
 */
export function EmbudoVisual({
  pasos,
}: {
  pasos: Array<{ codigo: string; nombre: string; cuenta: number }>;
}) {
  const maximo = Math.max(1, ...pasos.map((p) => p.cuenta));

  return (
    <ol className="flex flex-col gap-1 px-4 py-4">
      {pasos.map((p) => {
        const vacio = p.cuenta === 0;

        return (
          <li key={p.codigo} className="flex items-center gap-3">
            <span
              className={cn(
                "w-36 shrink-0 text-right text-xs",
                vacio ? "text-metadato" : "text-titular",
              )}
            >
              {p.nombre}
            </span>

            <span className="relative h-6 min-w-0 flex-1">
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-sm",
                  vacio ? "bg-filete" : "bg-acento",
                )}
                style={{
                  width: vacio ? "2px" : `${(p.cuenta / maximo) * 100}%`,
                }}
              />
            </span>

            <span
              className={cn(
                "cifra w-6 shrink-0 text-sm",
                vacio ? "text-metadato" : "text-titular",
              )}
            >
              {p.cuenta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Una candidatura en la lista, en una línea en vez de cuatro.
 *
 * Antes cada una ocupaba nombre, sector con contacto, descripción y
 * pastilla —cuatro líneas— y con ocho candidaturas la lista no cabía en
 * pantalla. Lo que se viene a hacer aquí es encontrar una y entrar, así que
 * se queda el nombre, por dónde va y de quién es.
 */
export function FilaCandidatura({
  id,
  nombre,
  sector,
  paso,
  tono,
  children,
}: {
  id: string;
  nombre: string;
  sector: string | null;
  paso: string;
  tono: string;
  /** El chip con las iniciales o el logo */
  children: React.ReactNode;
}) {
  return (
    <li className="fila-enlace flex items-center gap-3 px-4 py-2.5">
      {children}
      <Link
        href={`/embudo/${id}`}
        className="estirado enlace min-w-0 flex-1 truncate text-sm font-medium text-titular"
      >
        {nombre}
      </Link>
      <span className="hidden shrink-0 truncate text-xs text-metadato sm:block sm:max-w-[10rem]">
        {sector ?? "Sin sector"}
      </span>
      <span className={cn("pastilla shrink-0", tono)}>{paso}</span>
      <span aria-hidden="true" className="flecha cifra shrink-0 text-acento-texto">
        →
      </span>
    </li>
  );
}
