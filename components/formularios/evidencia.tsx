"use client";

import { useState } from "react";
import { ExternalLink, FileText, Link2, Paperclip, Upload, X } from "lucide-react";

import { adjuntarEvidencia, quitarEvidencia } from "@/lib/acciones/evidencia";
import {
  Boton,
  Campo,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";
import { fecha } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Adjuntar algo a lo que se afirma.
 *
 * La misma pieza en todas partes: al encargar una tarea, al cambiar el
 * estado de un hito, al puntuar una dimensión técnica, al dar por
 * entregado un punto del checklist. Hasta ahora solo el business plan
 * podía respaldar lo que decía, y en el resto de pantallas había que
 * creerse la afirmación.
 *
 * Tres formas, en el orden en que se usan: subir un archivo, elegir uno
 * que ya está en el data room, o pegar un enlace. La segunda importa más
 * de lo que parece: el mismo contrato respalda tres cosas distintas, y
 * subirlo tres veces es la manera de acabar con tres versiones que no
 * coinciden.
 */

export interface EvidenciaAdjunta {
  id: string;
  label: string;
  /** El documento del data room, cuando lo hay */
  documentId: string | null;
  url: string | null;
  cuando: string;
  quien: string | null;
}

/** Un documento que ya está en el data room, para poder elegirlo */
export interface DocumentoElegible {
  id: string;
  nombre: string;
  carpeta: string | null;
}

type Modo = "archivo" | "data-room" | "enlace";

export function Evidencia({
  slug,
  companyId,
  entidad,
  entidadId,
  adjuntas = [],
  elegibles = [],
  puedeEscribir = true,
}: {
  slug: string;
  companyId: string;
  /** A qué cuelga: milestone, task, dd_item, tech_score… */
  entidad: string;
  entidadId: string;
  adjuntas?: EvidenciaAdjunta[];
  elegibles?: DocumentoElegible[];
  puedeEscribir?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>("archivo");

  return (
    <div className="flex flex-col gap-2">
      {adjuntas.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {adjuntas.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-2 text-xs text-secundario"
            >
              {e.url ? (
                <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <FileText aria-hidden="true" className="size-3.5 shrink-0" />
              )}
              {e.url ? (
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="enlace text-titular"
                >
                  {e.label}
                </a>
              ) : (
                <span className="text-titular">{e.label}</span>
              )}
              <span className="text-metadato">
                {e.quien ?? "alguien"} · {fecha(e.cuando)}
              </span>
              {puedeEscribir ? (
                <Formulario accion={quitarEvidencia} className="gap-0">
                  {() => (
                    <>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="slug" value={slug} />
                      <button
                        type="submit"
                        aria-label={`Quitar ${e.label}`}
                        className="accion accion-riesgo text-[11px]"
                      >
                        <X aria-hidden="true" className="size-3" />
                        Quitar
                      </button>
                    </>
                  )}
                </Formulario>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!puedeEscribir ? (
        adjuntas.length === 0 ? (
          <p className="text-xs text-metadato">Sin evidencia adjunta</p>
        ) : null
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="accion w-fit text-xs"
        >
          <Paperclip aria-hidden="true" className="size-3.5 text-acento-texto" />
          Adjuntar evidencia
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-filete bg-elevado px-3 py-3">
          {/*
            Las tres formas, como pestañas: se ve que hay tres antes de
            elegir. Con un desplegable había que abrirlo para saber que
            existía la de «uno que ya está», que es la que evita
            duplicados.
          */}
          <div role="tablist" className="flex flex-wrap gap-2">
            {(
              [
                ["archivo", "Subir un archivo", Upload],
                ["data-room", "Uno del data room", FileText],
                ["enlace", "Un enlace", Link2],
              ] as Array<[Modo, string, typeof Upload]>
            ).map(([valor, texto, Icono]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={modo === valor}
                onClick={() => setModo(valor)}
                className={cn("pestana text-xs", modo === valor && "pestana-activa")}
              >
                <Icono aria-hidden="true" className="size-3.5" />
                {texto}
              </button>
            ))}
          </div>

          <Formulario accion={adjuntarEvidencia} onOk={() => setAbierto(false)}>
            {(resultado) => (
              <>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="company_id" value={companyId} />
                <input type="hidden" name="entity" value={entidad} />
                <input type="hidden" name="entity_id" value={entidadId} />

                <Campo
                  etiqueta="Qué es"
                  ayuda="Cómo se va a llamar en la lista y en el data room"
                  error={!resultado.ok ? resultado.campos?.label : undefined}
                >
                  <Texto
                    name="label"
                    placeholder="Contrato firmado con el centro"
                    required
                    error={!resultado.ok && Boolean(resultado.campos?.label)}
                  />
                </Campo>

                {modo === "archivo" ? (
                  <Campo
                    etiqueta="El archivo"
                    ayuda="Hasta 50 MB. Queda en el data room de la compañía, no suelto aquí"
                  >
                    <input
                      type="file"
                      name="fichero"
                      className="block w-full text-sm text-secundario file:mr-3 file:rounded-full file:border file:border-filete file:bg-papel file:px-3 file:py-1.5 file:text-xs file:text-cuerpo"
                    />
                  </Campo>
                ) : null}

                {modo === "data-room" ? (
                  elegibles.length === 0 ? (
                    <p className="text-xs text-secundario">
                      El data room todavía no tiene documentos. Sube uno y
                      quedará disponible para la próxima vez.
                    </p>
                  ) : (
                    <Campo
                      etiqueta="Cuál"
                      ayuda="Se enlaza, no se duplica: sigue siendo el mismo documento"
                    >
                      <Seleccion name="document_id" defaultValue="">
                        <option value="">Elige un documento</option>
                        {elegibles.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.nombre}
                            {d.carpeta ? ` · ${d.carpeta}` : ""}
                          </option>
                        ))}
                      </Seleccion>
                    </Campo>
                  )
                ) : null}

                {modo === "enlace" ? (
                  <Campo
                    etiqueta="La dirección"
                    ayuda="Para lo que vive fuera: un repositorio, un panel, un acta"
                    error={!resultado.ok ? resultado.campos?.url : undefined}
                  >
                    <Texto
                      name="url"
                      type="url"
                      placeholder="https://"
                      error={!resultado.ok && Boolean(resultado.campos?.url)}
                    />
                  </Campo>
                ) : null}

                <div className="flex items-center gap-3">
                  <Boton>Adjuntar</Boton>
                  <button
                    type="button"
                    onClick={() => setAbierto(false)}
                    className="accion text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </Formulario>
        </div>
      )}
    </div>
  );
}
