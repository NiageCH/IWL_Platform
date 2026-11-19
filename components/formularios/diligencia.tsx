"use client";

import { useState } from "react";
import { cambiarEstadoPunto } from "@/lib/acciones/diligencia";
import { AreaTexto, Boton, Campo, Formulario, Seleccion } from "@/components/ui/formulario";
import type { EstadoVisual } from "@/lib/estados";
import { cn } from "@/lib/utils";

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
  visual,
  puedeValidar,
}: {
  slug: string;
  id: string;
  estado: string;
  /** El estado visual, para que el control lleve su color */
  visual: EstadoVisual;
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
            className={cn("select-estado py-1 text-xs", `es-${visual}`)}
            error={!resultado.ok}
          >
            <option value="pendiente">Pendiente</option>
            <option value="entregado">Entregado</option>
            {puedeValidar ? <option value="en_revision">En revisión</option> : null}
            {puedeValidar ? <option value="validado">Validado</option> : null}
            {puedeValidar ? <option value="bloqueante">Bloqueante</option> : null}
            {/*
              Que no aplique lo decide quien valida. A quien no valida se le
              enseña, pero no puede elegirlo: si no, el desplegable diría
              «Pendiente» de un punto que no se le pide.
            */}
            {puedeValidar || estado === "no_aplica" ? (
              <option value="no_aplica" disabled={!puedeValidar}>
                No aplica
              </option>
            ) : null}
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}

/**
 * Revisar un documento entregado, desde la franja de su aviso: validarlo en
 * un clic, o pedir cambios diciendo cuáles. Pedir cambios lo devuelve a
 * «pendiente» con la nota, que ella ve en su punto.
 */
export function RevisarPunto({ slug, id }: { slug: string; id: string }) {
  const [cambios, setCambios] = useState(false);
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Formulario accion={cambiarEstadoPunto}>
          {() => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="validado" />
              <Boton>Validar</Boton>
            </>
          )}
        </Formulario>
        {!cambios ? (
          <button type="button" onClick={() => setCambios(true)} className="accion text-xs">
            Pedir cambios
          </button>
        ) : null}
      </div>
      {cambios ? (
        <Formulario accion={cambiarEstadoPunto} className="rounded-md border border-filete bg-papel p-3">
          {(r) => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="pendiente" />
              <Campo etiqueta="Qué tiene que cambiar" error={r.ok ? undefined : r.campos?.notes}>
                <AreaTexto name="notes" required minLength={5} rows={3} />
              </Campo>
              <Boton>Pedir cambios</Boton>
            </>
          )}
        </Formulario>
      ) : null}
    </div>
  );
}
