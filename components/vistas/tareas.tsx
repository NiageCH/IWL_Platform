import type { ResumenCompania } from "@/lib/datos/compania";
import { leerAsignables, leerTareas, type Tarea } from "@/lib/datos/tareas";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import {
  AsignarTarea,
  EstadoTarea,
  NuevaTarea,
} from "@/components/formularios/tareas";
import { BarraSegmentada, Estado } from "@/components/ui/estado";
import { estadoVisual } from "@/lib/estados";
import { fecha } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Quién hace qué en este proyecto.
 *
 * La tabla y sus permisos llevaban desde septiembre sin una sola pantalla:
 * no había forma de encargarle nada a nadie. «Quiero asignar la auditoría
 * técnica a Juan Mishima, o al fundador, o a un tercero» no tenía respuesta.
 *
 * Las abiertas primero y las vencidas marcadas, que es lo accionable. Lo
 * cerrado baja al final y se cuenta, pero no ocupa.
 */

const ESTADOS: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha",
  descartada: "Descartada",
};

const CERRADAS = ["hecha", "descartada"];

/** El estado visual de una tarea, que se pide en la barra y en cada fila */
const visualTarea = (t: Tarea) =>
  estadoVisual("tarea", { estado: t.status, fecha: t.due_date });

export async function VistaTareas({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { compania, permisos } = resumen;

  const [{ tareas, abiertas, vencidas }, asignables] = await Promise.all([
    leerTareas(compania.id),
    permisos.puedeEscribir ? leerAsignables(compania.id) : Promise.resolve([]),
  ]);

  const vivas = tareas.filter((t) => !CERRADAS.includes(t.status));
  const cerradas = tareas.filter((t) => CERRADAS.includes(t.status));

  return (
    <Bloque>
      <TituloBloque
        accion={
          <Metadato>
            {abiertas === 0
              ? "Nada pendiente"
              : vencidas > 0
                ? `${abiertas} abiertas · ${vencidas} vencidas`
                : `${abiertas} abiertas`}
          </Metadato>
        }
      >
        Quién hace qué
      </TituloBloque>

      {/*
        Las tareas, de un vistazo y antes de la lista. Con doce encargos
        repartidos, cuántos están vencidos no se sabía sin contarlos.
      */}
      {tareas.length > 0 ? (
        <div className="border-b border-filete px-4 py-3">
          <BarraSegmentada
            etiqueta="Tareas del proyecto"
            segmentos={tareas.map((t) => ({
              id: t.id,
              estado: visualTarea(t),
              rotulo: t.title,
            }))}
          />
        </div>
      ) : null}

      {vivas.length === 0 ? (
        <SinDatos>
          No hay nada encargado. Una tarea es para lo que tiene dueño y fecha:
          una auditoría, un documento que falta, una llamada que hay que hacer.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {vivas.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-2 px-4 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-titular">{t.title}</span>
                {t.description ? (
                  <span className="block text-xs text-secundario">
                    {t.description}
                  </span>
                ) : null}
                {t.source_entity ? (
                  <Metadato>Nace de {t.source_entity}</Metadato>
                ) : null}
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
                <Etiqueta>{t.owner ?? "Sin asignar"}</Etiqueta>
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
                className="flex flex-wrap items-baseline gap-3 text-xs"
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
