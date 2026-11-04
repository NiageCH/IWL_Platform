"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

/**
 * La explicación de una cifra, detrás de un signo de interrogación.
 *
 * «Técnico 94,2 ↑ 47,1» no dice nada a quien no estuvo en la conversación
 * en la que se definió. Tampoco «Distancia», ni «Preparación 87,2». La
 * respuesta no es escribirlo debajo —eso es lo que llenó la pantalla de
 * párrafos— sino tenerlo a un gesto: se ve al pasar el ratón y se fija al
 * pulsar, que es lo único que funciona en una pantalla táctil.
 *
 * Tres líneas como mucho: qué mide, contra qué se compara, qué significa
 * la flecha. Si hace falta más, es que el dato está mal definido.
 */
export function Ayuda({
  titulo,
  children,
}: {
  /** De qué cifra se está hablando */
  titulo: string;
  children: React.ReactNode;
}) {
  const [fijado, setFijado] = useState(false);
  const caja = useRef<HTMLSpanElement>(null);

  /* Pulsar fuera lo cierra: un globo que se queda puesto tapa la cifra de
     al lado, y cerrarlo no puede exigir volver a buscar el mismo botón */
  useEffect(() => {
    if (!fijado) return;

    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setFijado(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFijado(false);
    };

    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [fijado]);

  return (
    <span ref={caja} className="group relative inline-flex">
      <button
        type="button"
        aria-expanded={fijado}
        aria-label={`Qué es ${titulo}`}
        onClick={() => setFijado((v) => !v)}
        className="inline-flex size-4 items-center justify-center rounded-full text-metadato transition-colors hover:text-titular"
      >
        <HelpCircle aria-hidden="true" className="size-3.5" strokeWidth={2} />
      </button>

      {/*
        Oculto por defecto, visible al pasar el ratón o al enfocar con
        teclado, y fijado al pulsar. El estilo en línea gana a la clase, que
        es justo lo que hace falta: pulsado se queda aunque el ratón se
        vaya.
      */}
      <span
        role="note"
        className="globo-ayuda group-hover:flex group-focus-within:flex"
        style={fijado ? { display: "flex" } : undefined}
      >
        <strong className="text-xs font-semibold text-titular">{titulo}</strong>
        <span className="text-xs leading-snug text-secundario">{children}</span>
      </span>
    </span>
  );
}
