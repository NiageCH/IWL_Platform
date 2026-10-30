"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  cambiarEstadoTarea,
  crearTarea,
  reasignarTarea,
} from "@/lib/acciones/tareas";
import type { Asignable } from "@/lib/datos/tareas";
import type { EstadoVisual } from "@/lib/estados";
import { cn } from "@/lib/utils";
import {
  AreaTexto,
  Boton,
  Campo,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/** Agrupa a quien se puede asignar, para que el desplegable se lea */
function porGrupo(gente: Asignable[]): Array<[string, Asignable[]]> {
  const grupos = new Map<string, Asignable[]>();
  for (const p of gente) {
    if (!grupos.has(p.grupo)) grupos.set(p.grupo, []);
    grupos.get(p.grupo)!.push(p);
  }
  return [...grupos.entries()];
}

/**
 * Encargar una tarea.
 *
 * Asignarla a otra persona es de IWL o de quien coordina el proyecto, y lo
 * impone un disparador de la base. Aquí no se repite esa comprobación: la
 * regla en dos sitios acaba discrepando.
 */
export function NuevaTarea({
  slug,
  companyId,
  asignables,
}: {
  slug: string;
  companyId: string;
  asignables: Asignable[];
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs"
      >
        <Plus aria-hidden="true" className="size-3.5 text-acento-texto" />
        Encargar una tarea
      </button>
    );
  }

  return (
    <div className="border-t border-filete px-4 py-4">
      <Formulario accion={crearTarea}>
        {(r) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="company_id" value={companyId} />

            <Campo
              etiqueta="Qué hay que hacer"
              obligatorio
              error={r.ok ? undefined : r.campos?.title}
            >
              <Texto
                name="title"
                required
                placeholder="Auditoría técnica del repositorio"
              />
            </Campo>

            <Campo
              etiqueta="Detalle"
              ayuda="Lo que haga falta para que quien la coja sepa por dónde empezar"
              error={r.ok ? undefined : r.campos?.description}
            >
              <AreaTexto name="description" rows={2} />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Quién la hace"
                ayuda="Asignar a otra persona es de IWL o de quien coordina"
                error={r.ok ? undefined : r.campos?.owner_id}
              >
                <Seleccion name="owner_id" defaultValue="">
                  <option value="">Sin asignar</option>
                  {porGrupo(asignables).map(([grupo, gente]) => (
                    <optgroup key={grupo} label={grupo}>
                      {gente.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Seleccion>
              </Campo>

              <Campo
                etiqueta="Para cuándo"
                error={r.ok ? undefined : r.campos?.due_date}
              >
                <Texto name="due_date" type="date" />
              </Campo>
            </div>

            <div className="flex gap-2">
              <Boton>Encargar</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm text-secundario"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/** Mover una tarea de estado, desde su propia fila */
export function EstadoTarea({
  slug,
  id,
  estado,
  visual,
}: {
  slug: string;
  id: string;
  estado: string;
  /** El estado visual, para que el control lleve su color */
  visual: EstadoVisual;
}) {
  return (
    <Formulario accion={cambiarEstadoTarea} className="gap-0">
      {(r) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Seleccion
            /* La `key` fuerza el remontaje cuando el servidor devuelve otro
               valor: un campo no controlado conserva el que tenía al montar */
            key={estado}
            name="status"
            defaultValue={estado}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className={cn("select-estado py-1 text-xs", `es-${visual}`)}
            error={!r.ok}
            aria-label="Estado de la tarea"
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="hecha">Hecha</option>
            <option value="descartada">Descartada</option>
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}

/** Cambiar a quién le toca, sin tener que borrar y volver a crear */
export function AsignarTarea({
  slug,
  id,
  ownerId,
  asignables,
}: {
  slug: string;
  id: string;
  ownerId: string | null;
  asignables: Asignable[];
}) {
  return (
    <Formulario accion={reasignarTarea} className="gap-0">
      {(r) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Seleccion
            key={ownerId ?? "sin-asignar"}
            name="owner_id"
            defaultValue={ownerId ?? ""}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="py-1 text-xs"
            error={!r.ok}
            aria-label="Quién hace la tarea"
          >
            <option value="">Sin asignar</option>
            {porGrupo(asignables).map(([grupo, gente]) => (
              <optgroup key={grupo} label={grupo}>
                {gente.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}
