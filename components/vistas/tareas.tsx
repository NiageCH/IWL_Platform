import Link from "next/link";

import type { ResumenCompania } from "@/lib/datos/compania";
import { leerAsignables, leerTareas, type Tarea } from "@/lib/datos/tareas";
import {
  Bloque,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import {
  AsignarTarea,
  EstadoTarea,
  NuevaTarea,
} from "@/components/formularios/tareas";
import { Estado } from "@/components/ui/estado";
import { Avance } from "@/components/ui/avance";
import { Evidencia } from "@/components/formularios/evidencia";
import {
  leerDocumentosElegibles,
  leerEvidencias,
} from "@/lib/datos/evidencia";
import { estadoVisual } from "@/lib/estados";
import { fecha } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Qué falta en este proyecto: una sola lista.
 *
 * Eran dos bloques seguidos —«Siguientes pasos» y «Quién hace qué»— y
 * había que cruzarlos de cabeza: uno decía lo que falta para que el
 * proyecto sea invertible y el otro quién lo estaba haciendo. Son la misma
 * pregunta, y separadas obligaban a leer dos veces para contestarla.
 *
 * Ahora van juntas. Lo que tiene dueño y fecha es una tarea; lo que sale de
 * la definición de invertible y todavía no se le ha encargado a nadie va
 * igual en la lista, con su estado, y lleva a la pantalla donde se hace.
 */

const ESTADOS: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha",
  bloqueada: "Bloqueada",
  descartada: "Descartada",
};

const CERRADAS = ["hecha", "descartada"];

/** El estado visual de una tarea, que se pide en la barra y en cada fila */
const visualTarea = (t: Tarea) =>
  estadoVisual("tarea", { estado: t.status, fecha: t.due_date });

export async function VistaQueFalta({
  resumen,
  pasos = [],
}: {
  resumen: NonNullable<ResumenCompania>;
  /** Lo que falta para ser invertible, con la pantalla donde se hace */
  pasos?: Array<{ texto: string; href: string }>;
}) {
  const { compania, permisos } = resumen;

  const [{ tareas, abiertas, vencidas }, asignables, evidencias, elegibles] =
    await Promise.all([
      leerTareas(compania.id),
      permisos.puedeEscribir ? leerAsignables(compania.id) : Promise.resolve([]),
      leerEvidencias(compania.id, "task"),
      permisos.puedeEscribir
        ? leerDocumentosElegibles(compania.id)
        : Promise.resolve([]),
    ]);

  const vivas = tareas.filter((t) => !CERRADAS.includes(t.status));
  const cerradas = tareas.filter((t) => CERRADAS.includes(t.status));
  const nadaQueHacer = vivas.length === 0 && pasos.length === 0;

  return (
    <Bloque>
      <TituloBloque
        accion={
          <Metadato>
            {nadaQueHacer
              ? "Nada pendiente"
              : vencidas > 0
                ? `${abiertas + pasos.length} abiertas · ${vencidas} vencidas`
                : `${abiertas + pasos.length} abiertas`}
          </Metadato>
        }
      >
        Qué falta
      </TituloBloque>

      {/*
        Las tareas, de un vistazo y antes de la lista. Con doce encargos
        repartidos, cuántos están vencidos no se sabía sin contarlos.
      */}
      {tareas.length > 0 ? (
        <div className="border-b border-filete px-4 py-3">
          <Avance
            etiqueta="Tareas del proyecto"
            elementos={tareas.map((t) => ({
              id: t.id,
              estado: visualTarea(t),
              rotulo: t.title,
            }))}
          />
        </div>
      ) : null}

      {nadaQueHacer ? (
        <SinDatos>
          No queda nada por hacer: la compañía cumple la definición de
          proyecto invertible y no tiene tareas abiertas.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {vivas.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-titular">{t.title}</span>
                {t.description ? (
                  <span className="block text-xs text-secundario">
                    {t.description}
                  </span>
                ) : null}
                {/*
                  En qué se apoya. Encargar una tarea sin poder adjuntar el
                  documento del que sale obliga a explicarlo por correo, y
                  entonces la tarea y su contexto viven en sitios distintos.
                */}
                <span className="mt-1.5 block">
                  <Evidencia
                    slug={compania.slug}
                    companyId={compania.id}
                    entidad="task"
                    entidadId={t.id}
                    adjuntas={evidencias.get(t.id) ?? []}
                    elegibles={elegibles}
                    puedeEscribir={permisos.puedeEscribir}
                  />
                </span>
              </span>

              {t.due_date ? (
                <span
                  className={cn(
                    "cifra shrink-0 text-xs",
                    t.vencida ? "es-vencido texto-estado" : "text-metadato",
                  )}
                >
                  {t.vencida ? "venció el " : ""}
                  {fecha(t.due_date)}
                </span>
              ) : (
                <Metadato>Sin fecha</Metadato>
              )}

              {permisos.puedeEscribir ? (
                <AsignarTarea
                  slug={compania.slug}
                  id={t.id}
                  ownerId={t.owner_id}
                  asignables={asignables}
                />
              ) : (
                <Metadato>{t.owner ?? "Sin asignar"}</Metadato>
              )}

              {permisos.puedeEscribir ? (
                <>
                  <Estado valor={visualTarea(t)} soloIcono />
                  <EstadoTarea
                    slug={compania.slug}
                    id={t.id}
                    estado={t.status}
                    visual={visualTarea(t)}
                  />
                </>
              ) : (
                <Estado
                  valor={visualTarea(t)}
                  rotulo={ESTADOS[t.status] ?? t.status}
                />
              )}
            </li>
          ))}

          {/*
            Lo que falta para ser invertible y todavía no es de nadie.

            Va en la misma lista y no en un bloque aparte: la diferencia
            entre esto y una tarea es solo que nadie se ha hecho cargo
            todavía, y eso se dice con el estado, no con otro bloque.
          */}
          {pasos.map((paso) => (
            <li
              key={paso.texto}
              className="fila-enlace flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <Link
                href={paso.href}
                className="estirado enlace min-w-0 flex-1 text-sm text-titular"
              >
                {paso.texto}
              </Link>
              <Metadato>Sin encargar</Metadato>
              <Estado valor="pendiente" rotulo="Para invertible" />
              <span aria-hidden="true" className="flecha cifra shrink-0 text-acento-texto">
                →
              </span>
            </li>
          ))}
        </ul>
      )}

      {cerradas.length > 0 ? (
        <details className="border-t border-filete px-4 py-3">
          <summary className="accion cursor-pointer text-xs">
            {cerradas.length} {cerradas.length === 1 ? "cerrada" : "cerradas"}
          </summary>
          <ul className="mt-3 flex flex-col gap-1.5">
            {cerradas.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 text-xs"
              >
                <span className="min-w-0 flex-1 text-secundario line-through">
                  {t.title}
                </span>
                <Metadato>{t.owner ?? "Sin asignar"}</Metadato>
                <Estado
                  valor={visualTarea(t)}
                  rotulo={ESTADOS[t.status] ?? t.status}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {permisos.puedeEscribir ? (
        <NuevaTarea
          slug={compania.slug}
          companyId={compania.id}
          asignables={asignables}
        />
      ) : null}
    </Bloque>
  );
}
