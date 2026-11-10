"use client";

import { comentarNda, guardarNdaPropio, responderComentarioNda } from "@/lib/acciones/nda";
import { useState } from "react";
import { AreaTexto, Boton, Campo, Desplegable, Formulario } from "@/components/ui/formulario";
import { VistaPreviaPlantilla } from "@/components/formularios/nda-iwl";

/**
 * Comentar el NDA, del lado de la candidata. El formulario se queda
 * montado y vacío después de enviar: el mensaje dice que llegó, y el
 * comentario sale en la lista de encima. Si ella ya ha firmado, lo que
 * comenta llega antes de la firma de IWL, y la ayuda lo dice así.
 */
export function ComentarNda({ firmadoPorElla = false }: { firmadoPorElla?: boolean }) {
  return (
    <Formulario accion={comentarNda} className="gap-3">
      {(r) => (
        <>
          <Campo
            etiqueta="Comentar el NDA"
            ayuda={
              firmadoPorElla
                ? "Si algo no te encaja, dínoslo. Lo vemos antes de que firme IWL."
                : "Si algo no te encaja o no lo entiendes, dínoslo antes de firmar"
            }
            error={r.ok ? undefined : r.campos?.texto}
          >
            <AreaTexto name="texto" rows={3} />
          </Campo>
          <div>
            <Boton variante="secundario">Enviar el comentario</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** Responder un comentario, del lado de IWL */
export function ResponderComentarioNda({ id, candidaturaId }: { id: string; candidaturaId: string }) {
  return (
    <Formulario accion={responderComentarioNda} className="gap-2">
      {(r) => (
        <>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <Campo etiqueta="Respuesta" error={r.ok ? undefined : r.campos?.respuesta}>
            <AreaTexto name="respuesta" rows={2} />
          </Campo>
          <div>
            <Boton variante="secundario">Responder</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/**
 * Cambiar el texto solo para ella. Sale con el texto que tiene ahora, para
 * tocar lo que haga falta y no volver a pegar el NDA entero.
 */
export function NdaPropio({
  candidaturaId,
  texto,
  firmadoPorElla,
}: {
  candidaturaId: string;
  texto: string;
  firmadoPorElla: boolean;
}) {
  const [actual, setActual] = useState(texto);
  return (
    <Desplegable titulo="Cambiar el texto solo para ella">
      <Formulario accion={guardarNdaPropio} className="gap-3 px-4 pb-4">
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <p className="text-xs text-secundario">
              Guarda una versión nueva que solo vale para esta candidatura. La
              genérica no cambia.
              {firmadoPorElla
                ? " Ella ya ha firmado: su firma se anula y tendrá que firmar esta versión."
                : ""}
            </p>
            <Campo etiqueta="Texto del NDA" obligatorio error={r.ok ? undefined : r.campos?.texto}>
              <AreaTexto
                name="texto"
                rows={14}
                defaultValue={texto}
                required
                onChange={(e) => setActual(e.currentTarget.value)}
              />
            </Campo>
            <VistaPreviaPlantilla texto={actual} />
            <div>
              <Boton variante="secundario">Guardar la versión para ella</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
