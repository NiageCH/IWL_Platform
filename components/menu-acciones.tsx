"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

export interface AccionMenu {
  texto: string;
  /** Lleva a otra página… */
  href?: string;
  /** …o hace algo aquí mismo, como abrir un panel */
  alPulsar?: () => void;
  /** Lo que no tiene vuelta atrás se tiñe al acercarse */
  riesgo?: boolean;
}

/**
 * Un único menú de acciones, arriba a la derecha.
 *
 * La cabecera llevaba los enlaces sueltos —editar, archivar, informe— uno
 * al lado del otro, compitiendo con el nombre de la compañía. Con tres ya
 * pesaban más que el contenido, y cada acción nueva empujaba a la
 * siguiente.
 *
 * Aquí van todas menos la principal de la pantalla, que se queda fuera.
 * Así la cabecera cabe en una línea y las acciones tienen un sitio fijo en
 * el que buscarlas, siempre el mismo.
 */
export function MenuAcciones({
  acciones,
  rotulo,
}: {
  acciones: AccionMenu[];
  /** En una fila: solo «⋯», con este nombre para quien no ve el icono */
  rotulo?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  /*
   * Se cierra al pulsar fuera y con Escape.
   *
   * Un menú que solo se cierra con su propio botón deja a quien lo abrió
   * sin salida evidente, y en el teclado es una trampa: tabulas y el menú
   * sigue ahí tapando lo siguiente.
   */
  useEffect(() => {
    if (!abierto) return;

    function fuera(e: MouseEvent) {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [abierto]);

  if (acciones.length === 0) return null;

  return (
    <div ref={caja} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={rotulo}
        className="accion text-xs"
      >
        <MoreHorizontal aria-hidden="true" className="size-4 text-acento-texto" />
        {rotulo ? null : "Acciones"}
      </button>

      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-filete bg-papel py-1 shadow-lg"
        >
          {acciones.map((a) => {
            // Lo destructivo que se hace aquí mismo va en rojo desde el principio
            // (REVISION, 23 nov); el enlace de riesgo, como estaba: se tiñe al acercarse
            const clase = a.riesgo
              ? a.href
                ? "block w-full px-3 py-2 text-left text-sm text-secundario transition-colors hover:bg-mal/10 hover:text-mal"
                : "block w-full px-3 py-2 text-left text-sm text-mal transition-colors hover:bg-mal/10"
              : "block w-full px-3 py-2 text-left text-sm text-secundario transition-colors hover:bg-elevado hover:text-titular";
            return a.href ? (
              <Link key={a.href + a.texto} href={a.href} role="menuitem" onClick={() => setAbierto(false)} className={clase}>
                {a.texto}
              </Link>
            ) : (
              <button
                key={a.texto}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  a.alPulsar?.();
                }}
                className={clase}
              >
                {a.texto}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
