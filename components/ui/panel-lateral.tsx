"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * El detalle se abre al lado, sin salir de la página.
 *
 * Hoy un hallazgo, un hito o un documento se abren desplegándose en línea:
 * la lista salta, lo que estabas mirando se mueve, y al cerrar has perdido
 * el sitio. Y lo que no se despliega manda a otra pantalla, que es peor:
 * vuelves con el navegador y la lista arranca de arriba.
 *
 * Esta pieza se añade en el paso 2 del rediseño y **todavía no la usa
 * nadie**: las pantallas que la van a usar se rehacen en el paso 5. Está
 * aquí para que el esqueleto esté completo antes de mover el contenido.
 *
 * Tres cosas que un panel tiene que hacer y casi nunca hace: cerrarse con
 * Escape, devolver el foco a donde estaba, y no dejar que la página de
 * detrás se desplace mientras está abierto.
 */
export function PanelLateral({
  abierto,
  titulo,
  onCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const foco = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) return;

    // De dónde venía el foco, para devolverlo al cerrar
    foco.current = document.activeElement as HTMLElement | null;
    panel.current?.focus();

    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = scroll;
      foco.current?.focus();
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <>
      {/*
        El velo cierra al pulsar. No lleva rótulo porque no es un control
        que se busque: es la forma de salir de quien ya ha decidido salir.
      */}
      <div
        aria-hidden="true"
        onClick={onCerrar}
        className="fixed inset-0 z-30 bg-hundido/60"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-filete bg-papel shadow-2xl outline-none sm:max-w-lg"
      >
        <header className="titulo-bloque flex items-center justify-between gap-4 px-5 py-3">
          <h2 className="text-sm font-semibold text-titular">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="accion text-xs"
            aria-label="Cerrar"
          >
            <X aria-hidden="true" className="size-4" />
            Cerrar
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </>
  );
}
