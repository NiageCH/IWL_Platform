"use client";

import { cambiarEstadoPunto } from "@/lib/acciones/diligencia";
import { Formulario, Seleccion } from "@/components/ui/formulario";

/**
 * Cambio de estado de un punto del checklist.
 *
 * La lista de estados que se ofrece depende de quién mira: la fundadora puede
 * decir que ha entregado, no que está validado. Quien de verdad lo impide es
 * un trigger de la base; esto solo evita enseñar una opción que va a fallar.
 */
export function EstadoPunto({
  slug,
  id,
  estado,
  puedeValidar,
}: {
  slug: string;
  id: string;
  estado: string;
  puedeValidar: boolean;
}) {
  return (
    <Formulario accion={cambiarEstadoPunto} className="gap-0">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Seleccion
            /*
             * La `key` con el estado hace que React vuelva a montar el select
             * cuando el servidor devuelve otro valor. Sin ella, un campo no
             * controlado conserva el valor con el que se montó: se guardaría
             * bien y la pantalla seguiría enseñando el estado anterior.
             */
            key={estado}
            name="status"
            defaultValue={estado}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="py-1 text-xs"
            error={!resultado.ok}
          >
            <option value="pendiente">Pendiente</option>
            <option value="entregado">Entregado</option>
            {puedeValidar ? <option value="en_revision">En revisión</option> : null}
            {puedeValidar ? <option value="validado">Validado</option> : null}
            {puedeValidar ? <option value="bloqueante">Bloqueante</option> : null}
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}
