"use client";

import { enviarMensajeDescarte, reintentarCorreo, reintentarCorreosSinEnviar } from "@/lib/acciones/correo";
import { Formulario } from "@/components/ui/formulario";

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
