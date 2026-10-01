"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  abrirDocumentoCandidata,
  pedirDocumento,
} from "@/lib/acciones/candidaturas";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Texto,
} from "@/components/ui/formulario";

/**
 * Abrir un documento entregado.
 *
 * La dirección se firma al pulsar y dura cinco minutos. No se pinta un
 * enlace firmado en la página porque entonces estaría en el HTML de todas
 * las fichas abiertas, y una dirección a documentación de due diligence que
 * vive en una pestaña olvidada es una dirección que acaba reenviada.
 */
export function AbrirDocumento({
  documento,
}: {
  documento: {
    nombre: string;
    storage_path: string;
    bytes: number | null;
    created_at: string;
  };
}) {
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const kb = documento.bytes ? Math.round(documento.bytes / 1024) : null;

  return (
    <div className="mt-1">
      <button
        type="button"
        disabled={abriendo}
        onClick={async () => {
          setAbriendo(true);
          setFallo(null);
          const datos = new FormData();
          datos.set("storage_path", documento.storage_path);
          const r = await abrirDocumentoCandidata(datos);
          setAbriendo(false);
          if (r.ok && r.url) window.open(r.url, "_blank", "noopener");
          else setFallo(r.ok ? "No se ha podido abrir." : r.error);
        }}
        className="accion inline-flex items-center gap-1.5 text-xs text-acento-texto disabled:opacity-50"
      >
        <Download aria-hidden="true" className="size-3.5" />
        {abriendo ? "Abriendo" : documento.nombre}
      </button>
      <span className="ml-2 text-xs text-metadato">
        {documento.created_at.slice(0, 10)}
        {kb !== null ? ` · ${kb} KB` : ""}
      </span>
      {fallo ? <p className="text-xs text-mal">{fallo}</p> : null}
    </div>
  );
}

/** Pedirle algo que no está en la plantilla */
export function PedirDocumento({ candidaturaId }: { candidaturaId: string }) {
  return (
    <Desplegable titulo="Pedirle algo más">
      <Formulario accion={pedirDocumento}>
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <Campo
              etiqueta="Qué le pides"
              error={r.ok ? undefined : r.campos?.titulo}
            >
              <Texto name="titulo" placeholder="Contrato con el proveedor X" required />
            </Campo>
            <Campo etiqueta="Por qué, o qué tiene que incluir">
              <AreaTexto name="detalle" rows={2} />
            </Campo>
            <Boton>Pedirlo</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * Un documento que la compañía entregó siendo candidatura.
 *
 * Se abre igual que los del expediente: dirección firmada al pulsar. Lo que
 * cambia es dónde se enseña —en el punto del checklist de la compañía al
 * que responde— y para qué: para que nadie vuelva a pedirlo.
 */
export function DocumentoDeSeleccion({
  documento,
}: {
  documento: {
    id: string | null;
    nombre: string | null;
    storage_path: string | null;
    created_at: string | null;
  };
}) {
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  return (
    <span className="mt-1 flex flex-wrap items-baseline gap-2">
      <span className="pastilla [--tono:var(--color-menta)]">
        Entregado en la selección
      </span>
      <button
        type="button"
        disabled={abriendo}
        onClick={async () => {
          setAbriendo(true);
          setFallo(null);
          const datos = new FormData();
          datos.set("storage_path", documento.storage_path ?? "");
          const r = await abrirDocumentoCandidata(datos);
          setAbriendo(false);
          if (r.ok && r.url) window.open(r.url, "_blank", "noopener");
          else setFallo(r.ok ? "No se ha podido abrir." : r.error);
        }}
        className="accion inline-flex items-center gap-1.5 text-xs text-acento-texto disabled:opacity-50"
      >
        <Download aria-hidden="true" className="size-3.5" />
        {abriendo ? "Abriendo" : (documento.nombre ?? "Documento")}
      </button>
      {documento.created_at ? (
        <span className="text-xs text-metadato">
          {documento.created_at.slice(0, 10)}
        </span>
      ) : null}
      {fallo ? <span className="text-xs text-mal">{fallo}</span> : null}
    </span>
  );
}
