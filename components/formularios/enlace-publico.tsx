"use client";

import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";

/**
 * La dirección donde se presenta la gente.
 *
 * Estaba solo en el código y en la cabeza de quien la escribió: para
 * repartirla había que acordarse de `/presentarse` y escribirla a mano. Es
 * el enlace que va a un correo, a LinkedIn o a la web de IWL, así que tiene
 * que estar donde se abre la convocatoria y listo para copiar.
 */
export function EnlacePublico({ base }: { base: string }) {
  const [copiado, setCopiado] = useState(false);
  const enlace = `${base}/presentarse`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="chip-icono chip-icono-sm [--tono:var(--color-cielo)]">
        <Link2 aria-hidden="true" className="size-4" />
      </span>
      <code className="min-w-0 flex-1 truncate rounded-md border border-filete bg-elevado px-3 py-2 text-xs text-secundario">
        {enlace}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(enlace);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
        className="boton-marca shrink-0 px-4 py-2 text-xs"
      >
        {copiado ? "Copiada" : "Copiar"}
      </button>
      <a
        href={enlace}
        target="_blank"
        rel="noreferrer noopener"
        className="accion inline-flex shrink-0 items-center gap-1.5 text-xs text-acento-texto"
      >
        <ExternalLink aria-hidden="true" className="size-3.5" />
        Abrir
      </a>
    </div>
  );
}
