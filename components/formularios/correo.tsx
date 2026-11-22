"use client";

import {
  enviarMensajeDescarte,
  guardarDominiosModoPruebas,
  quitarModoPruebas,
  reintentarCorreo,
  reintentarCorreosSinEnviar,
  volverAModoPruebas,
} from "@/lib/acciones/correo";
import { Boton, Campo, Desplegable, Formulario, Texto } from "@/components/ui/formulario";

/**
 * Enviarle el mensaje de un descarte. Se queda montado con su mensaje: el
 * acuse dice a qué correo salió, o por qué no.
 */
export function EnviarMensajeDescarte({ origen, id }: { origen: "acta" | "incorporacion"; id: string }) {
  return (
    <Formulario accion={enviarMensajeDescarte}>
      {() => (
        <>
          <input type="hidden" name="origen" value={origen} />
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="accion text-xs font-medium text-titular">
            Enviarle el mensaje
          </button>
        </>
      )}
    </Formulario>
  );
}

/** Volver a intentarlo. Sin mensaje si sale: el acuse es la fila en «Enviado» */
export function ReintentarCorreo({ id }: { id: string }) {
  return (
    <Formulario accion={reintentarCorreo}>
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="accion text-xs">
            Reintentar
          </button>
        </>
      )}
    </Formulario>
  );
}

/** Todos los que no salieron, de una vez. Si alguno sigue sin salir, lo dice */
export function ReintentarTodos({ cuantos }: { cuantos: number }) {
  return (
    <Formulario accion={reintentarCorreosSinEnviar}>
      {() => (
        <button type="submit" className="boton-marca px-4 py-1.5 text-xs">
          {cuantos === 1 ? "Reintentar" : `Reintentar los ${cuantos}`}
        </button>
      )}
    </Formulario>
  );
}

/**
 * El modo pruebas del correo, en Administración → Programa (REVISION,
 * 21 nov). Activo: los dominios que pueden recibir y «Quitar el modo
 * pruebas», que pide escribir ACTIVAR CORREOS. Quitado: quién y cuándo, y
 * volver a ponerlo. El acuse de quitarlo y de ponerlo es el bloque cambiado.
 */
export function ModoPruebasCorreo({
  activo,
  dominios,
  quitado,
}: {
  activo: boolean;
  dominios: string[];
  quitado: string | null;
}) {
  if (!activo) {
    return (
      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="text-sm text-titular">
          Los correos salen a todo el mundo{quitado ? `. ${quitado}` : ""}.
        </p>
        <Formulario accion={volverAModoPruebas}>
          {() => (
            <div>
              <Boton variante="secundario">Volver al modo pruebas</Boton>
            </div>
          )}
        </Formulario>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <Formulario accion={guardarDominiosModoPruebas} className="gap-3 px-4 py-4">
        {(r) => (
          <>
            <Campo
              etiqueta="Dominios que reciben correo"
              ayuda="Separados por comas. A cualquier otra dirección el correo queda retenido"
              error={r.ok ? undefined : r.campos?.dominios}
            >
              <Texto name="dominios" defaultValue={dominios.join(", ")} />
            </Campo>
            <div>
              <Boton variante="secundario">Guardar los dominios</Boton>
            </div>
          </>
        )}
      </Formulario>
      <Desplegable titulo="Quitar el modo pruebas">
        <Formulario accion={quitarModoPruebas} className="gap-3 px-4 py-4">
          {(r) => (
            <>
              <p className="text-sm text-secundario">
                Desde ese momento los correos salen a cualquier dirección, también a
                personas de fuera de IWL. Los retenidos no se envían: eran de pruebas.
                Hazlo cuando empiece la carga real.
              </p>
              <Campo
                etiqueta="Escribe ACTIVAR CORREOS para confirmarlo"
                error={r.ok ? undefined : r.campos?.confirmacion}
                obligatorio
              >
                <Texto name="confirmacion" autoComplete="off" />
              </Campo>
              <div>
                <Boton>Quitar el modo pruebas</Boton>
              </div>
            </>
          )}
        </Formulario>
      </Desplegable>
    </div>
  );
}
