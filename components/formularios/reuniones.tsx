"use client";

import { useState } from "react";
import { anotarReunion, proponerReunion } from "@/lib/acciones/reuniones";
import { franjaDesdeFormulario, textoPropuestaReunion, type Franja } from "@/lib/reuniones";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/**
 * Proponer una reunión: dos o tres franjas, y se abre el correo ya
 * redactado en el programa de quien la propone. Queda apuntada en la
 * plataforma; el acuse es verla en la lista.
 */
export function ProponerReunion({
  candidaturaId,
  contacto,
  correo,
  startup,
}: {
  candidaturaId: string;
  contacto: string;
  correo: string | null;
  startup: string;
}) {
  const [franjas, setFranjas] = useState(["", "", ""]);
  const [duracion, setDuracion] = useState(45);

  function abrirCorreo() {
    if (!correo) return;
    const elegidas = franjas
      .map((f) => (f ? franjaDesdeFormulario(f, duracion) : null))
      .filter((f): f is Franja => f !== null);
    const { asunto, cuerpo } = textoPropuestaReunion(contacto, startup, elegidas);
    window.location.href = `mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  return (
    <Desplegable titulo="Proponer reunión">
      <Formulario accion={proponerReunion} onOk={abrirCorreo} className="gap-4 px-4 pb-4">
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <p className="text-sm text-secundario">
              Dos o tres franjas, en hora de Madrid. Al proponerla se abre un
              correo ya escrito para {contacto}: revísalo y envíalo.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <Campo
                  key={n}
                  etiqueta={`Franja ${n}`}
                  obligatorio={n < 3}
                  error={r.ok ? undefined : r.campos?.[`franja_${n}`]}
                >
                  <Texto
                    type="datetime-local"
                    name={`franja_${n}`}
                    value={franjas[n - 1]}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      setFranjas((f) => f.map((x, i) => (i === n - 1 ? v : x)));
                    }}
                    required={n < 3}
                  />
                </Campo>
              ))}
            </div>
            <Campo etiqueta="Duración">
              <Seleccion
                name="duracion"
                value={duracion}
                onChange={(e) => setDuracion(Number(e.currentTarget.value))}
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>Una hora</option>
              </Seleccion>
            </Campo>
            <div>
              <Boton variante="secundario">Proponer y abrir el correo</Boton>
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
