import Link from "next/link";
import type { BloqueGuia, Trozo } from "@/lib/guia";

/**
 * La guía, pintada con nuestras piezas. Los enlaces internos van con
 * `<Link>`; los de fuera, en pestaña nueva.
 */
export function TextoGuia({ bloques }: { bloques: BloqueGuia[] }) {
  return (
    <div className="flex flex-col gap-4">
      {bloques.map((b, i) => {
        if (b.tipo === "titulo") {
          if (b.nivel === 1) return null;
          return b.nivel === 2 ? (
            <h2 key={i} className="mt-4 border-b border-filete pb-1 text-base font-semibold text-titular">
              {b.texto}
            </h2>
          ) : (
            <h3 key={i} className="mt-2 text-sm font-semibold text-titular">
              {b.texto}
            </h3>
          );
        }
        if (b.tipo === "parrafo") {
          return (
            <p key={i} className="text-sm leading-relaxed text-cuerpo">
              <Trozos trozos={b.trozos} />
            </p>
          );
        }
        const Lista = b.ordenada ? "ol" : "ul";
        return (
          <Lista key={i} className={`flex flex-col gap-1.5 pl-5 text-sm leading-relaxed text-cuerpo ${b.ordenada ? "list-decimal" : "list-disc"}`}>
            {b.items.map((t, j) => (
              <li key={j}>
                <Trozos trozos={t} />
              </li>
            ))}
          </Lista>
        );
      })}
    </div>
  );
}

function Trozos({ trozos }: { trozos: Trozo[] }) {
  return (
    <>
      {trozos.map((t, i) => {
        if (t.tipo === "negrita") return <strong key={i} className="font-semibold text-titular">{t.texto}</strong>;
        if (t.tipo === "codigo") return <code key={i} className="rounded bg-hundido px-1 text-xs">{t.texto}</code>;
        if (t.tipo === "enlace") {
          return t.href.startsWith("/") ? (
            <Link key={i} href={t.href} className="enlace text-acento-texto">
              {t.texto}
            </Link>
          ) : (
            <a key={i} href={t.href} target="_blank" rel="noreferrer noopener" className="enlace text-acento-texto">
              {t.texto}
            </a>
          );
        }
        return <span key={i}>{t.texto}</span>;
      })}
    </>
  );
}
