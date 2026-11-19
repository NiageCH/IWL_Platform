"use client";

import { useEffect, useState } from "react";
import { DecirSituacion } from "@/components/formularios/entrada";

/**
 * Lo que la franja de un aviso hace en el navegador.
 *
 * Next navega sin recargar, así que `:target` no se entera del ancla: el
 * bloque se busca y se resalta aquí, y se trae a la vista por debajo de la
 * franja, que va pegada arriba. Si está dentro de un plegable cerrado, se
 * abre: un aviso que lleva a algo escondido no lleva a ningún sitio.
 */

function traer(ancla: string, enfocar: boolean) {
  const bloque = document.getElementById(ancla);
  if (!bloque) return;
  let padre = bloque.parentElement;
  while (padre) {
    if (padre instanceof HTMLDetailsElement && !padre.open) padre.open = true;
    padre = padre.parentElement;
  }
  bloque.classList.add("destino-aviso");
  bloque.scrollIntoView({ block: "start", behavior: "auto" });
  if (enfocar) {
    const campo = bloque.querySelector<HTMLElement>("textarea, select, input:not([type=hidden]), button");
    campo?.focus({ preventScroll: true });
  }
}

/** Al llegar: resalta el bloque de destino y lo trae a la vista */
export function Destino({ ancla }: { ancla: string }) {
  useEffect(() => {
    if (!ancla) return;
    // Después de pintar, que el bloque puede venir de un componente de servidor más abajo
    const t = window.setTimeout(() => traer(ancla, false), 50);
    return () => window.clearTimeout(t);
  }, [ancla]);
  return null;
}

/**
 * Para las acciones que piden escribir o elegir —responder, anotar,
 * validar—: el botón lleva al formulario del bloque resaltado y pone el
 * cursor en él. Hacerlas dos veces, aquí y en el bloque, era duplicar
 * cada formulario de la plataforma.
 */
export function IrA({ ancla, verbo }: { ancla: string; verbo: string }) {
  return (
    <button type="button" onClick={() => traer(ancla, true)} className="boton-marca px-4 py-1.5 text-xs">
      {verbo}
    </button>
  );
}

/** «Cambiarla»: la situación, para corregir lo que dijo antes de confirmarla */
export function CambiarSituacion({ companyId }: { companyId: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="accion text-xs">
        Cambiarla
      </button>
    );
  }
  return (
    <div className="w-full rounded-md border border-filete bg-papel p-3">
      <DecirSituacion companyId={companyId} />
    </div>
  );
}
