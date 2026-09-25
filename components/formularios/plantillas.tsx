"use client";

import {
  borrarDePlantilla,
  crearEtapaPlantilla,
  crearHitoPlantilla,
  crearPlantilla,
  fijarEstadoEntrada,
} from "@/lib/acciones/ruta";
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
 * Configuración del catálogo de recorridos.
 *
 * Es de la dirección de IWL. Lo que se toca aquí no altera ninguna hoja de
 * ruta en marcha: las plantillas se copian al instanciar, y ese es el motivo
 * de que se copien.
 */

const ESTADOS = [
  { valor: "idea", texto: "Idea" },
  { valor: "prototipo", texto: "Prototipo" },
  { valor: "mvp", texto: "MVP" },
  { valor: "primeros_clientes", texto: "Primeros clientes" },
  { valor: "facturacion", texto: "Facturación" },
];

export function NuevaPlantilla() {
  return (
    <Desplegable titulo="Crear un recorrido">
      <Formulario accion={crearPlantilla}>
        {(resultado) => {
          const campo = (n: string) =>
            !resultado.ok ? resultado.campos?.[n] : undefined;

          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre" error={campo("name")}>
                  <Texto name="name" required placeholder="Desde el MVP" />
                </Campo>
                <Campo
                  etiqueta="Código"
                  ayuda="Interno. En minúsculas y con guiones bajos"
                  error={campo("code")}
                >
                  <Texto
                    name="code"
                    required
                    placeholder="desde_mvp"
                    pattern="[a-z0-9]+(_[a-z0-9]+)*"
                  />
                </Campo>
                <Campo
                  etiqueta="Para quién entra en"
                  ayuda="El estado de entrada al que se le sugerirá"
                >
                  <Seleccion name="entry_state" required defaultValue="mvp">
                    {ESTADOS.map((e) => (
                      <option key={e.valor} value={e.valor}>
                        {e.texto}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
                <Campo etiqueta="Duración orientativa (meses)" error={campo("duration_months")}>
                  <Texto type="number" name="duration_months" min={1} max={60} />
                </Campo>
              </div>

              <Campo etiqueta="Descripción" error={campo("description")}>
                <AreaTexto
                  name="description"
                  rows={2}
                  placeholder="A qué tipo de proyecto sirve y qué persigue el recorrido."
                />
              </Campo>

              <div>
                <Boton>Crear recorrido</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}

export function NuevaEtapaPlantilla({
  plantillaId,
  siguienteOrden,
}: {
  plantillaId: string;
  siguienteOrden: number;
}) {
  return (
    <Desplegable titulo="Añadir una etapa a este recorrido">
      <Formulario accion={crearEtapaPlantilla}>
        {(resultado) => {
          const campo = (n: string) =>
            !resultado.ok ? resultado.campos?.[n] : undefined;

          return (
            <>
              <input type="hidden" name="template_id" value={plantillaId} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre" error={campo("name")}>
                  <Texto name="name" required placeholder="Motor comercial repetible" />
                </Campo>
                <Campo etiqueta="Código" error={campo("code")}>
                  <Texto
                    name="code"
                    required
                    placeholder="motor_comercial"
                    pattern="[a-z0-9]+(_[a-z0-9]+)*"
                  />
                </Campo>
              </div>

              <Campo
                etiqueta="Objetivo"
                ayuda="Sin objetivo, una etapa es solo un plazo"
                error={campo("objective")}
              >
                <AreaTexto name="objective" rows={2} required />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-4">
                <Campo etiqueta="Orden" error={campo("order_index")}>
                  <Texto
                    type="number"
                    name="order_index"
                    min={0}
                    defaultValue={siguienteOrden}
                    required
                  />
                </Campo>
                <Campo etiqueta="Semanas" error={campo("planned_weeks")}>
                  <Texto type="number" name="planned_weeks" min={1} />
                </Campo>
                <Campo etiqueta="Horas de IWL" error={campo("planned_hours")}>
                  <Texto type="number" name="planned_hours" min={0} step="0.5" />
                </Campo>
                <Campo etiqueta="Caja (€)" error={campo("planned_cash")}>
                  <Texto type="number" name="planned_cash" min={0} step="100" />
                </Campo>
              </div>

              <div>
                <Boton>Añadir etapa</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}

export function NuevoHitoPlantilla({
  etapaId,
  siguienteOrden,
}: {
  etapaId: string;
  siguienteOrden: number;
}) {
  return (
    <Desplegable titulo="Añadir un hito a esta etapa">
      <Formulario accion={crearHitoPlantilla}>
        {(resultado) => {
          const campo = (n: string) =>
            !resultado.ok ? resultado.campos?.[n] : undefined;

          return (
            <>
              <input type="hidden" name="template_stage_id" value={etapaId} />

              <Campo etiqueta="Título" error={campo("title")}>
                <Texto name="title" required />
              </Campo>

              <Campo
                etiqueta="Criterio de éxito"
                ayuda="Escríbelo de forma que se pueda comprobar. «Validar el mercado» no es un hito; «veinte entrevistas con quien firma la compra» sí"
                error={campo("success_criteria")}
              >
                <AreaTexto name="success_criteria" rows={2} required />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-3">
                <Campo etiqueta="Orden" error={campo("order_index")}>
                  <Texto
                    type="number"
                    name="order_index"
                    min={0}
                    defaultValue={siguienteOrden}
                    required
                  />
                </Campo>
                <Campo
                  etiqueta="Semanas desde el inicio"
                  ayuda="De la etapa"
                  error={campo("offset_weeks")}
                >
                  <Texto type="number" name="offset_weeks" min={0} />
                </Campo>
                <label className="flex items-center gap-2 self-end pb-2 text-sm text-cuerpo">
                  <input
                    type="checkbox"
                    name="gates_investable"
                    className="accent-[var(--color-acento)]"
                  />
                  Condiciona invertible
                </label>
              </div>

              <div>
                <Boton>Añadir hito</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}

export function BorrarDePlantilla({
  tabla,
  id,
  etiqueta,
}: {
  tabla: "roadmap_template_stages" | "roadmap_template_milestones";
  id: string;
  etiqueta: string;
}) {
  return (
    <Formulario accion={borrarDePlantilla} className="gap-0">
      {() => (
        <>
          <input type="hidden" name="tabla" value={tabla} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="text-xs text-metadato underline decoration-filete underline-offset-4 transition-colors hover:text-mal"
          >
            {etiqueta}
          </button>
        </>
      )}
    </Formulario>
  );
}

/** Corrige el estado de entrada desde la tabla de compañías */
export function EstadoEntrada({
  id,
  valor,
}: {
  id: string;
  valor: string | null;
}) {
  return (
    <Formulario accion={fijarEstadoEntrada} className="gap-0">
      {(resultado) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Seleccion
            key={valor ?? "sin"}
            name="entry_state"
            defaultValue={valor ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="py-1 text-xs"
            error={!resultado.ok}
          >
            {valor === null ? <option value="">Sin fijar</option> : null}
            {ESTADOS.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.texto}
              </option>
            ))}
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}
