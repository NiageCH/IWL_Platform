"use client";

import { useState } from "react";
import { regenerarPdfActa, borrarActa, firmarActa, guardarComiteDefecto, redactarActa } from "@/lib/acciones/comite";
import { DECISIONES, VIAS, mensajeDescarte, type Decision, type Via } from "@/lib/comite";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

interface Persona {
  id: string;
  nombre: string;
}

/** Quién forma el comité: una casilla por persona de IWL */
function Miembros({ personas, marcados }: { personas: Persona[]; marcados: string[] }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="cifra mb-1 text-xs uppercase tracking-wide text-metadato">Comité</legend>
      {personas.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm text-titular">
          <input type="checkbox" name="miembros" value={p.id} defaultChecked={marcados.includes(p.id)} className="size-4" />
          {p.nombre}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Redactar el acta. Lo que pide cambia con la decisión: la vía si sigue,
 * la fecha de revisión si se aplaza, el motivo y el mensaje si se descarta.
 * Nadie la puede editar después de la primera firma.
 */
export function RedactarActa({
  candidaturaId,
  personas,
  porDefecto,
  viaPropuesta,
  contacto,
  startup,
}: {
  candidaturaId: string;
  personas: Persona[];
  porDefecto: string[];
  viaPropuesta: Via | null;
  contacto: string;
  startup: string;
}) {
  const [decision, setDecision] = useState<Decision | "">("");
  const [via, setVia] = useState<Via | "">(viaPropuesta ?? "");
  const [puedeVolver, setPuedeVolver] = useState(true);

  return (
    <Desplegable titulo="Redactar el acta de comité">
      <Formulario accion={redactarActa} className="gap-4 px-4 pb-4">
        {(r) => {
          const e = (n: string) => (r.ok ? undefined : r.campos?.[n]);
          return (
            <>
              <input type="hidden" name="candidatura_id" value={candidaturaId} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo etiqueta="Fecha del comité" obligatorio error={e("fecha")}>
                  <Texto type="date" name="fecha" required defaultValue={new Date().toISOString().slice(0, 10)} />
                </Campo>
                <Campo etiqueta="Decisión" obligatorio error={e("decision")}>
                  <Seleccion
                    name="decision"
                    value={decision}
                    onChange={(ev) => setDecision(ev.currentTarget.value as Decision | "")}
                    required
                  >
                    <option value="">Elige…</option>
                    {Object.entries(DECISIONES).map(([v, n]) => (
                      <option key={v} value={v}>
                        {n}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
              </div>

              <Miembros personas={personas} marcados={porDefecto} />
              {e("miembros") ? <p className="text-xs text-mal">{e("miembros")}</p> : null}

              <Campo etiqueta="Resumen" obligatorio error={e("resumen")} ayuda="Qué se valoró. Es lo que firma cada miembro">
                <AreaTexto name="resumen" rows={4} required />
              </Campo>

              {decision === "preseleccionada" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo
                    etiqueta="Vía de entrada"
                    obligatorio
                    error={e("via")}
                    ayuda={viaPropuesta ? `Por su estado de entrada: ${VIAS[viaPropuesta]}` : "Sin estado de entrada: elígela"}
                  >
                    <Seleccion name="via" value={via} onChange={(ev) => setVia(ev.currentTarget.value as Via | "")} required>
                      <option value="">Elige…</option>
                      {Object.entries(VIAS).map(([v, n]) => (
                        <option key={v} value={v}>
                          {n}
                        </option>
                      ))}
                    </Seleccion>
                  </Campo>
                  {viaPropuesta && via && via !== viaPropuesta ? (
                    <Campo etiqueta="Por qué otra vía" obligatorio error={e("via_motivo")}>
                      <AreaTexto name="via_motivo" rows={2} required />
                    </Campo>
                  ) : null}
                </div>
              ) : null}

              {decision === "aplazada" ? (
                <Campo etiqueta="Se vuelve a mirar el" obligatorio error={e("revision_on")} ayuda="Ese día te avisa">
                  <Texto type="date" name="revision_on" required />
                </Campo>
              ) : null}

              {decision === "descartada" || decision === "aplazada" ? (
                <Campo etiqueta="Motivo" obligatorio={decision === "descartada"} error={e("motivo")}>
                  <AreaTexto name="motivo" rows={2} required={decision === "descartada"} />
                </Campo>
              ) : null}

              {decision === "descartada" ? (
                <>
                  <label className="flex items-center gap-2 text-sm text-titular">
                    <input
                      type="checkbox"
                      name="puede_volver"
                      value="si"
                      checked={puedeVolver}
                      onChange={(ev) => setPuedeVolver(ev.currentTarget.checked)}
                      className="size-4"
                    />
                    Puede volver a presentarse
                  </label>
                  <Campo etiqueta="El mensaje para ella" ayuda="Claro, con el motivo si es objetivo. Se le manda al cerrar el acta">
                    <AreaTexto
                      key={String(puedeVolver)}
                      name="mensaje"
                      rows={8}
                      defaultValue={mensajeDescarte(contacto, startup, puedeVolver)}
                    />
                  </Campo>
                </>
              ) : null}

              <div>
                <Boton variante="secundario">Guardar el acta para firmar</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}

export function FirmarActa({ actaId, candidaturaId }: { actaId: string; candidaturaId: string }) {
  return (
    <Formulario accion={firmarActa}>
      {() => (
        <>
          <input type="hidden" name="acta_id" value={actaId} />
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <button type="submit" className="accion text-xs font-medium text-titular">
            Firmar el acta
          </button>
        </>
      )}
    </Formulario>
  );
}

/**
 * Rehacer el PDF de un acta cerrada con el diseño de ahora: solo dirección.
 * Se queda montado con su mensaje: el acuse dice que el de antes sigue.
 */
export function RegenerarPdfActa({ actaId, candidaturaId }: { actaId: string; candidaturaId: string }) {
  return (
    <Formulario accion={regenerarPdfActa}>
      {() => (
        <>
          <input type="hidden" name="acta_id" value={actaId} />
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <button type="submit" className="accion text-xs">
            Regenerar el PDF
          </button>
        </>
      )}
    </Formulario>
  );
}

export function BorrarActa({ actaId, candidaturaId }: { actaId: string; candidaturaId: string }) {
  return (
    <Formulario accion={borrarActa}>
      {() => (
        <>
          <input type="hidden" name="acta_id" value={actaId} />
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <button type="submit" className="accion accion-riesgo text-xs">
            Descartar este borrador
          </button>
        </>
      )}
    </Formulario>
  );
}

/** El comité por defecto, en Programa */
export function ComiteDefecto({ personas, marcados }: { personas: Persona[]; marcados: string[] }) {
  return (
    <Formulario accion={guardarComiteDefecto} className="px-4 py-4">
      {() => (
        <>
          <Miembros personas={personas} marcados={marcados} />
          <div>
            <Boton>Guardar el comité</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
