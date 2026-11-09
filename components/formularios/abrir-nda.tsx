"use client";

import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { abrirNda } from "@/lib/acciones/nda";

/**
 * Abrir el NDA firmado. Un enlace firmado de cinco minutos: quién puede
 * abrirlo lo dice el almacenamiento, no este botón.
 */
export function AbrirNda({ candidaturaId }: { candidaturaId: string }) {
  const [fallo, setFallo] = useState<string | null>(null);
  const [cargando, empezar] = useTransition();

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={cargando}
        onClick={() => {
          const datos = new FormData();
          datos.set("candidatura_id", candidaturaId);
          empezar(async () => {
            const r = await abrirNda(datos);
            if (r.ok && r.url) window.open(r.url, "_blank", "noopener");
            else setFallo(r.ok ? "No se ha podido abrir." : r.error);
          });
        }}
        className="accion inline-flex items-center gap-1.5 text-xs font-medium text-titular"
      >
        <FileText aria-hidden="true" className="size-3.5 text-acento-texto" />
        {cargando ? "Abriendo…" : "Abrir el NDA firmado"}
      </button>
      {fallo ? <span className="text-xs text-mal">{fallo}</span> : null}
    </span>
  );
}
