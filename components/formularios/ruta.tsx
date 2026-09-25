"use client";

import { useState } from "react";
import {
  borrarAvance,
  crearEtapa,
  crearHito,
  disenarHojaDeRuta,
  editarEtapa,
  registrarAportacion,
  registrarAvance,
} from "@/lib/acciones/ruta";
import type { EstadoEntrada } from "@/lib/datos/ruta";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";
import { Bloque, TituloBloque } from "@/components/ui/primitivas";

/**
 * Formularios de la hoja de ruta.
 *
 * Todos son de IWL: diseñarla, reorganizarla y añadir hitos. La compañía
 * cambia el estado de sus hitos y carga avances, que están en otro sitio.
 */

const HOY = () => new Date().toISOString().slice(0, 10);

interface ResumenPlantilla {
  id: string;
  nombre: string;
  estadoEntrada: EstadoEntrada;
  descripcion: string | null;
  etapas: number;
  hitos: number;
  meses: number | null;
}

/**
 * Diseñar la hoja de ruta partiendo de una plantilla.
 *
 * La plantilla del estado en que entró la compañía viene preseleccionada,
 * pero se puede cambiar: un proyecto que entra con MVP y sin nada vendido
 * puede necesitar el recorrido de idea en la parte comercial.
 */
export function DisenarHojaDeRuta({
  slug,
  companyId,
  estadoEntrada,
  plantillas,
}: {
  slug: string;
  companyId: string;
  estadoEntrada: EstadoEntrada | null;
  plantillas: ResumenPlantilla[];
}) {
  const sugerida =
    plantillas.find((p) => p.estadoEntrada === estadoEntrada) ?? plantillas[0];
  const [elegida, setElegida] = useState(sugerida?.id ?? "");
  const detalle = plantillas.find((p) => p.id === elegida) ?? sugerida;

  return (
    <Bloque elevacion={2}>
      <TituloBloque>Diseñar la hoja de ruta</TituloBloque>
      <div className="px-4 py-4">
        <Formulario accion={disenarHojaDeRuta}>
          {(resultado) => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="company_id" value={companyId} />

              <Campo
                etiqueta="Plantilla de partida"
                error={!resultado.ok ? resultado.campos?.template_id : undefined}
                ayuda={
                  estadoEntrada === null
                    ? "Esta compañía no tiene estado de entrada. Se puede fijar en administración."
                    : undefined
                }
              >
                <Seleccion
                  name="template_id"
                  value={elegida}
                  onChange={(e) => setElegida(e.currentTarget.value)}
                >
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.estadoEntrada === estadoEntrada ? " · la de su estado" : ""}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              {detalle ? (
                <p className="text-xs text-secundario">
                  {detalle.descripcion} Crea {detalle.etapas} etapas y{" "}
                  {detalle.hitos} hitos
                  {detalle.meses ? `, sobre ${detalle.meses} meses` : ""}. Se
                  copian: a partir de ahí son de este proyecto y editarlos no
                  toca la plantilla.
                </p>
              ) : null}

              <Campo
                etiqueta="Fecha de arranque"
                error={!resultado.ok ? resultado.campos?.starts_on : undefined}
                ayuda="Desde aquí se encadenan los plazos de cada etapa."
              >
                <Texto type="date" name="starts_on" defaultValue={HOY()} required />
              </Campo>

              <div>
                <Boton>Crear la hoja de ruta</Boton>
              </div>
            </>
          )}
        </Formulario>
      </div>
    </Bloque>
  );
}

function CamposEtapa({
  resultado,
  valores,
}: {
  resultado: { ok: boolean; campos?: Record<string, string> };
  valores?: {
    nombre: string;
    objetivo: string;
    orden: number;
    inicio: string | null;
    fin: string | null;
    horasPrevistas: number | null;
    cajaPrevista: number | null;
    notas: string | null;
  };
}) {
  const campo = (nombre: string) =>
    !resultado.ok ? resultado.campos?.[nombre] : undefined;

  return (
    <>
      <Campo etiqueta="Nombre" error={campo("name")}>
        <Texto name="name" defaultValue={valores?.nombre ?? ""} required />
      </Campo>

      <Campo
        etiqueta="Objetivo"
        error={campo("objective")}
        ayuda="Qué se persigue en este tramo. Sin objetivo, una etapa es solo un plazo."
      >
        <AreaTexto
          name="objective"
          rows={3}
          defaultValue={valores?.objetivo ?? ""}
          required
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo etiqueta="Orden" error={campo("order_index")}>
          <Texto
            type="number"
            name="order_index"
            min={0}
            defaultValue={valores?.orden ?? 0}
            required
          />
        </Campo>
        <Campo etiqueta="Empieza" error={campo("starts_on")}>
          <Texto type="date" name="starts_on" defaultValue={valores?.inicio ?? ""} />
        </Campo>
        <Campo etiqueta="Termina" error={campo("ends_on")}>
          <Texto type="date" name="ends_on" defaultValue={valores?.fin ?? ""} />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Horas previstas de IWL"
          error={campo("planned_hours")}
          ayuda="Lo que se compromete en este tramo."
        >
          <Texto
            type="number"
            step="0.5"
            min={0}
            name="planned_hours"
            defaultValue={valores?.horasPrevistas ?? ""}
          />
        </Campo>
        <Campo etiqueta="Caja prevista (€)" error={campo("planned_cash")}>
          <Texto
            type="number"
            step="100"
            min={0}
            name="planned_cash"
            defaultValue={valores?.cajaPrevista ?? ""}
          />
        </Campo>
      </div>

      <Campo etiqueta="Notas" error={campo("notes")}>
        <AreaTexto name="notes" rows={2} defaultValue={valores?.notas ?? ""} />
      </Campo>
    </>
  );
}

export function NuevaEtapa({
  slug,
  companyId,
  siguienteOrden,
}: {
  slug: string;
  companyId: string;
  siguienteOrden: number;
}) {
  return (
    <Bloque>
      <Desplegable titulo="Añadir una etapa">
        <Formulario accion={crearEtapa}>
          {(resultado) => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="company_id" value={companyId} />
              <CamposEtapa
                resultado={resultado}
                valores={{
                  nombre: "",
                  objetivo: "",
                  orden: siguienteOrden,
                  inicio: null,
                  fin: null,
                  horasPrevistas: null,
                  cajaPrevista: null,
                  notas: null,
                }}
              />
              <div>
                <Boton>Añadir etapa</Boton>
              </div>
            </>
          )}
        </Formulario>
      </Desplegable>
    </Bloque>
  );
}

export function EditorEtapa({
  slug,
  etapa,
}: {
  slug: string;
  etapa: {
    id: string;
    nombre: string;
    objetivo: string;
    orden: number;
    inicio: string | null;
    fin: string | null;
    estado: string;
    horasPrevistas: number | null;
    cajaPrevista: number | null;
    notas: string | null;
  };
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-secundario underline decoration-filete underline-offset-4 transition-colors hover:text-titular"
      >
        Editar la etapa
      </button>
    );
  }

  return (
    <Formulario accion={editarEtapa} onOk={() => setAbierto(false)}>
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={etapa.id} />

          <Campo etiqueta="Estado">
            <Seleccion key={etapa.estado} name="status" defaultValue={etapa.estado}>
              <option value="planificada">Planificada</option>
              <option value="en_curso">En curso</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </Seleccion>
          </Campo>

          <CamposEtapa resultado={resultado} valores={etapa} />

          <div className="flex gap-2">
            <Boton>Guardar</Boton>
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

export function NuevoHito({
  slug,
  companyId,
  stageId,
}: {
  slug: string;
  companyId: string;
  stageId: string;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-secundario underline decoration-filete underline-offset-4 transition-colors hover:text-titular"
      >
        Añadir un hito a esta etapa
      </button>
    );
  }

  return (
    <Formulario accion={crearHito} onOk={() => setAbierto(false)}>
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="stage_id" value={stageId} />

          <Campo
            etiqueta="Título"
            error={!resultado.ok ? resultado.campos?.title : undefined}
          >
            <Texto name="title" required />
          </Campo>

          <Campo
            etiqueta="Criterio de éxito"
            error={
              !resultado.ok ? resultado.campos?.success_criteria : undefined
            }
            ayuda="Qué tiene que pasar para darlo por cumplido, escrito de forma que se pueda comprobar."
          >
            <AreaTexto name="success_criteria" rows={2} required />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Fecha prevista"
              error={!resultado.ok ? resultado.campos?.due_date : undefined}
            >
              <Texto type="date" name="due_date" />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-cuerpo">
              <input
                type="checkbox"
                name="gates_investable"
                className="accent-[var(--color-acento)]"
              />
              Condiciona el estado invertible
            </label>
          </div>

          <div className="flex gap-2">
            <Boton>Añadir hito</Boton>
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

/**
 * Registrar un avance.
 *
 * El carril lo decide la base según quién escribe, así que el formulario es
 * el mismo para las dos partes y no hay nada que elegir: la fundadora escribe
 * en su carril y el equipo de IWL en el suyo, sin poder confundirse.
 */
export function NuevoAvance({
  slug,
  companyId,
  stageId,
  etiqueta = "Registrar un avance",
}: {
  slug: string;
  companyId: string;
  stageId?: string;
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-secundario underline decoration-filete underline-offset-4 transition-colors hover:text-titular"
      >
        {etiqueta}
      </button>
    );
  }

  return (
    <Formulario accion={registrarAvance} onOk={() => setAbierto(false)}>
      {(resultado) => {
        const campo = (n: string) =>
          !resultado.ok ? resultado.campos?.[n] : undefined;

        return (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="company_id" value={companyId} />
            {stageId ? (
              <input type="hidden" name="stage_id" value={stageId} />
            ) : null}

            <Campo etiqueta="Qué ha pasado" error={campo("title")}>
              <Texto
                name="title"
                required
                placeholder="Primera venta cerrada sin el fundador delante"
              />
            </Campo>

            <Campo etiqueta="Detalle" error={campo("body")}>
              <AreaTexto
                name="body"
                rows={3}
                placeholder="Lo que conviene recordar dentro de seis meses cuando se mire esta etapa."
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Fecha" error={campo("entry_date")}>
                <Texto type="date" name="entry_date" defaultValue={HOY()} required />
              </Campo>
              <Campo etiqueta="Enlace a la evidencia" error={campo("evidence_url")}>
                <Texto type="url" name="evidence_url" placeholder="https://" />
              </Campo>
            </div>

            <div className="flex gap-2">
              <Boton>Registrar</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
              >
                Cancelar
              </button>
            </div>
          </>
        );
      }}
    </Formulario>
  );
}

/** Quitar un avance. Solo quien lo escribió, y IWL */
export function BorrarAvance({ slug, id }: { slug: string; id: string }) {
  return (
    <Formulario accion={borrarAvance} className="gap-0">
      {() => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="text-xs text-metadato underline decoration-filete underline-offset-4 transition-colors hover:text-mal"
          >
            Quitar
          </button>
        </>
      )}
    </Formulario>
  );
}

/**
 * Registrar una aportación que no son horas.
 *
 * Una compra, un evento, una reunión con inversores o una gestión. Los dos
 * importes son distintos a propósito: lo que le cuesta a IWL y lo que le
 * costaría a la compañía por su cuenta. La diferencia es lo que sostiene el
 * equity, igual que en las tarifas.
 */
export function NuevaAportacion({
  slug,
  companyId,
  etapas,
}: {
  slug: string;
  companyId: string;
  etapas: { id: string; nombre: string }[];
}) {
  return (
    <Desplegable titulo="Registrar una compra, un evento o una reunión">
      <Formulario accion={registrarAportacion}>
        {(resultado) => {
          const campo = (n: string) =>
            !resultado.ok ? resultado.campos?.[n] : undefined;

          return (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="company_id" value={companyId} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Tipo">
                  <Seleccion name="kind" required defaultValue="compra">
                    <option value="compra">Compra</option>
                    <option value="evento">Evento</option>
                    <option value="reunion_inversor">Reunión con inversores</option>
                    <option value="gestion">Gestión</option>
                  </Seleccion>
                </Campo>
                <Campo etiqueta="Fecha" error={campo("occurred_on")}>
                  <Texto
                    type="date"
                    name="occurred_on"
                    defaultValue={HOY()}
                    required
                  />
                </Campo>
              </div>

              <Campo etiqueta="Qué se ha aportado" error={campo("title")}>
                <Texto
                  name="title"
                  required
                  placeholder="Estand compartido en la feria del sector"
                />
              </Campo>

              <Campo etiqueta="Detalle" error={campo("description")}>
                <AreaTexto name="description" rows={2} />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-3">
                <Campo etiqueta="Con quién" error={campo("counterpart")}>
                  <Texto name="counterpart" placeholder="Proveedor, fondo, organizador" />
                </Campo>
                <Campo
                  etiqueta="Le cuesta a IWL (€)"
                  error={campo("amount")}
                  ayuda="El desembolso real"
                >
                  <Texto type="number" name="amount" min={0} step="10" />
                </Campo>
                <Campo
                  etiqueta="Valor de mercado (€)"
                  error={campo("market_value")}
                  ayuda="Lo que costaría por su cuenta"
                >
                  <Texto type="number" name="market_value" min={0} step="10" />
                </Campo>
              </div>

              {etapas.length > 0 ? (
                <Campo
                  etiqueta="Etapa de la hoja de ruta"
                  ayuda="Para poder ver qué se puso en cada tramo"
                >
                  <Seleccion name="stage_id" defaultValue="">
                    <option value="">Sin etapa</option>
                    {etapas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
              ) : null}

              <Campo
                etiqueta="Qué salió de ahí"
                ayuda="Sin esto, un evento es un gasto y no una aportación"
                error={campo("outcome")}
              >
                <AreaTexto name="outcome" rows={2} />
              </Campo>

              <div>
                <Boton>Registrar</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}
