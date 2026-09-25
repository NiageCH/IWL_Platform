"use client";

import { useState } from "react";
import { congelarLineaBase } from "@/lib/acciones/linea-base";
import {
  AreaTexto,
  Boton,
  Campo,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/**
 * Congelar una línea base.
 *
 * Se avisa de que no tiene vuelta atrás antes de pulsar, porque no la tiene:
 * el trigger de la base rechaza cualquier edición posterior. Es lo que hace
 * que una línea base valga para medir.
 */
export function CongelarLineaBase({
  slug,
  tieneInicial,
}: {
  slug: string;
  tieneInicial: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-acento-texto underline decoration-filete underline-offset-4 transition-colors hover:text-titular"
      >
        {tieneInicial ? "Congelar otra línea base" : "Congelar la línea base"}
      </button>
    );
  }

  return (
    <Formulario accion={congelarLineaBase} onOk={() => setAbierto(false)}>
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />

          <p className="text-xs text-secundario">
            Se guarda una copia del estado de hoy: scores, KPI, hitos, etapas y
            horas puestas. No se puede editar después. Si algo está sin cargar,
            cárgalo antes: lo que se congele es lo que se usará para medir el
            avance durante todo el programa.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Tipo">
              <Seleccion
                name="kind"
                required
                defaultValue={tieneInicial ? "trimestral" : "inicial"}
              >
                <option value="inicial">Inicial, al firmar el Anexo</option>
                <option value="trimestral">Corte trimestral</option>
                <option value="previa_ronda">Previa a una ronda</option>
              </Seleccion>
            </Campo>
            <Campo
              etiqueta="Fecha"
              error={!resultado.ok ? resultado.campos?.taken_on : undefined}
            >
              <Texto
                type="date"
                name="taken_on"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </Campo>
          </div>

          <Campo etiqueta="Notas">
            <AreaTexto
              name="notes"
              rows={2}
              placeholder="Qué conviene recordar de este punto de partida."
            />
          </Campo>

          <div className="flex gap-2">
            <Boton>Congelar</Boton>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </Formulario>
  );
}
