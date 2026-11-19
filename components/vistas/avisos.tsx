import Link from "next/link";
import { presentarAviso, type DatosAviso } from "@/lib/avisos";

/**
 * Una fila de aviso: qué pasó, qué te toca y el botón con ese verbo
 * (REVISION, 18 nov). Debajo, en pequeño, de dónde viene y qué va después.
 *
 * Sin «dar por visto»: un aviso se cierra solo cuando alguien hace lo que
 * pide, o cuando ya no tiene sentido. Si no pide nada, no es un aviso.
 */
export function FilaAviso({ aviso }: { aviso: DatosAviso }) {
  const p = presentarAviso(aviso);
  return (
    <li className="flex flex-col gap-1 px-4 py-3" data-aviso={aviso.tipo}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 text-sm text-titular">
          {p.paso}
          {aviso.donde && !p.paso.includes(aviso.donde) ? (
            <span className="text-metadato"> · {aviso.donde}</span>
          ) : null}
        </span>
        <span className="text-xs text-secundario">Te toca: {p.toca.toLowerCase()}</span>
        <Link href={p.href} className="accion text-xs text-acento-texto">
          {p.verbo}
        </Link>
      </div>
      {p.vieneDe || p.despues ? <Traza vieneDe={p.vieneDe} despues={p.despues} /> : null}
    </li>
  );
}

/** «Viene de: … · Después: …», sacado del recorrido (`lib/recorridos.ts`) */
export function Traza({ vieneDe, despues }: { vieneDe: string | null; despues: string | null }) {
  return (
    <p className="text-[11px] text-metadato">
      {vieneDe ? `Viene de: ${vieneDe}` : null}
      {vieneDe && despues ? " · " : null}
      {despues ? `Después: ${despues}` : null}
    </p>
  );
}
