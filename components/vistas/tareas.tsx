import type { ResumenCompania } from "@/lib/datos/compania";
import { leerAsignables, leerTareas } from "@/lib/datos/tareas";
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
                    t.vencida ? "text-mal" : "text-metadato",
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
                <EstadoTarea slug={compania.slug} id={t.id} estado={t.status} />
              ) : (
                <Etiqueta>{ESTADOS[t.status] ?? t.status}</Etiqueta>
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
                <Etiqueta>{ESTADOS[t.status] ?? t.status}</Etiqueta>
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
