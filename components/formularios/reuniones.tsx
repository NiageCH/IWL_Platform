"use client";

import { useState } from "react";
import { aceptarFranja, anotarReunion, cancelarReunion, proponerReunion } from "@/lib/acciones/reuniones";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/** Las dos o tres franjas, en hora de Madrid, y su duración */
export function CamposFranjas({
  campos,
  duracionFija,
}: {
  campos?: Record<string, string>;
  /** Si la duración ya está decidida —la de IWL, cuando propone ella—, no se pregunta */
  duracionFija?: number;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <Campo key={n} etiqueta={`Fecha ${n}`} obligatorio={n < 3} error={campos?.[`franja_${n}`]}>
            <Texto type="datetime-local" name={`franja_${n}`} required={n < 3} />
          </Campo>
        ))}
      </div>
      {duracionFija ? (
        <input type="hidden" name="duracion" value={duracionFija} />
      ) : (
        <Campo etiqueta="Duración">
          <Seleccion name="duracion" defaultValue={45}>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>Una hora</option>
          </Seleccion>
        </Campo>
      )}
    </>
  );
}

/**
 * Proponer una reunión: dos o tres franjas, quién va de IWL, el formato y,
 * si se quiere, una nota. Ella las ve en su página y elige, o propone
 * otras. Con una reunión en juego, esto la sustituye: si estaba
 * confirmada, es un cambio, y se pide el motivo. Sin mensaje: el acuse es
 * la reunión en la lista, y el correo, en el bloque «Correos».
 */
export function ProponerReunion({
  candidaturaId,
  personas,
  titulo = "Proponer reunión",
  cambio = false,
}: {
  candidaturaId: string;
  personas: { id: string; nombre: string }[];
  titulo?: string;
  /** Cambiar una confirmada: pide el motivo, que va en el correo */
  cambio?: boolean;
}) {
  const [formato, setFormato] = useState<"videollamada" | "presencial">("videollamada");
  return (
    <Desplegable titulo={titulo}>
      <Formulario accion={proponerReunion} className="gap-4 px-4 pb-4">
        {(r) => {
          const campos = r.ok ? undefined : r.campos;
          return (
            <>
              <input type="hidden" name="candidatura_id" value={candidaturaId} />
              <p className="text-sm text-secundario">
                Dos o tres fechas, en hora de Madrid. Ella las ve en su página, elige
                una o propone otras, y le llega un correo.
              </p>
              <CamposFranjas campos={campos} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm text-titular">Quién va de IWL</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-cuerpo">
                  {personas.map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <input type="checkbox" name="iwl" value={p.id} />
                      {p.nombre}
                    </label>
                  ))}
                </div>
                {campos?.iwl ? <span className="text-xs text-mal">{campos.iwl}</span> : null}
              </fieldset>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo etiqueta="Formato" obligatorio error={campos?.formato}>
                  <Seleccion
                    name="formato"
                    value={formato}
                    onChange={(e) => setFormato(e.currentTarget.value as "videollamada" | "presencial")}
                  >
                    <option value="videollamada">Videollamada</option>
                    <option value="presencial">En persona</option>
                  </Seleccion>
                </Campo>
                {formato === "videollamada" ? (
                  <Campo etiqueta="Enlace de la videollamada" obligatorio error={campos?.enlace}>
                    <Texto name="enlace" type="url" placeholder="https://" required />
                  </Campo>
                ) : (
                  <Campo etiqueta="Dirección" obligatorio error={campos?.direccion}>
                    <Texto name="direccion" required />
                  </Campo>
                )}
              </div>
              <Campo etiqueta="Nota para ella" ayuda="Opcional: para qué es, qué conviene traer">
                <AreaTexto name="nota" rows={2} />
              </Campo>
              {cambio ? (
                <Campo etiqueta="Por qué se cambia" ayuda="Va en el correo que le llega">
                  <AreaTexto name="motivo" rows={2} />
                </Campo>
              ) : null}
              <div>
                <Boton variante="secundario">{cambio ? "Cambiar la reunión" : "Proponer las fechas"}</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}

/** Aceptar una de las fechas que propuso ella. El acuse es la reunión confirmada */
export function AceptarFranja({
  reunionId,
  candidaturaId,
  inicio,
}: {
  reunionId: string;
  candidaturaId: string;
  inicio: string;
}) {
  return (
    <Formulario accion={aceptarFranja}>
      {() => (
        <>
          <input type="hidden" name="reunion_id" value={reunionId} />
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <input type="hidden" name="inicio" value={inicio} />
          <button type="submit" className="accion text-xs font-medium text-titular">
            Aceptar esta
          </button>
        </>
      )}
    </Formulario>
  );
}

/** Cancelar, con motivo. El acuse es la reunión cancelada en la lista */
export function CancelarReunion({ reunionId, candidaturaId }: { reunionId: string; candidaturaId: string }) {
  return (
    <Desplegable titulo="Cancelar la reunión">
      <Formulario accion={cancelarReunion} className="gap-3 px-4 pb-4">
        {(r) => (
          <>
            <input type="hidden" name="reunion_id" value={reunionId} />
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <Campo etiqueta="Motivo" obligatorio ayuda="Va en el correo que le llega" error={r.ok ? undefined : r.campos?.motivo}>
              <AreaTexto name="motivo" rows={2} required />
            </Campo>
            <div>
              <Boton variante="secundario">Cancelar la reunión</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * Anotar una reunión: la que se propuso, o una que se celebró sin pasar
 * por aquí. Fecha, quién estuvo, qué se habló, cómo quedó y lo que se
 * compartió.
 */
export function AnotarReunion({
  candidaturaId,
  reunionId,
  contacto,
}: {
  candidaturaId: string;
  reunionId?: string;
  contacto: string;
}) {
  return (
    <Desplegable titulo={reunionId ? "Anotar esta reunión" : "Anotar una reunión"}>
      <Formulario accion={anotarReunion} className="gap-4 px-4 pb-4">
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <input type="hidden" name="reunion_id" value={reunionId ?? ""} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo etiqueta="Fue el" obligatorio error={r.ok ? undefined : r.campos?.celebrada_on}>
                <Texto type="date" name="celebrada_on" required />
              </Campo>
              <Campo etiqueta="Cómo quedó" obligatorio error={r.ok ? undefined : r.campos?.conclusion}>
                <Seleccion name="conclusion" defaultValue="" required>
                  <option value="">Elige…</option>
                  <option value="seguir">Seguir</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="no_seguir">No seguir</option>
                </Seleccion>
              </Campo>
              <Campo etiqueta="De IWL" ayuda="Una persona por línea" error={r.ok ? undefined : r.campos?.de_iwl}>
                <AreaTexto name="de_iwl" rows={2} />
              </Campo>
              <Campo etiqueta="De la candidatura" ayuda="Una persona por línea">
                <AreaTexto name="de_candidatura" rows={2} defaultValue={contacto} />
              </Campo>
            </div>
            <Campo etiqueta="Qué se habló" obligatorio error={r.ok ? undefined : r.campos?.notas}>
              <AreaTexto name="notas" rows={4} required />
            </Campo>
            <Campo etiqueta="Adjuntos" ayuda="Lo que se compartió: presentación, notas, lo que sea">
              <Texto type="file" name="adjuntos" multiple />
            </Campo>
            <div>
              <Boton variante="secundario">Guardar la reunión</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
