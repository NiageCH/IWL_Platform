import { clienteServidor } from "@/lib/supabase/servidor";
import { leerPlantillas, nombreEstadoEntrada } from "@/lib/datos/ruta";
import {
  BorrarDePlantilla,
  NuevaEtapaPlantilla,
  NuevaPlantilla,
  NuevoHitoPlantilla,
} from "@/components/formularios/plantillas";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { euros, numero } from "@/lib/utils";

export const metadata = { title: "Recorridos · Administración" };

/**
 * El catálogo de recorridos.
 *
 * IWL es una incubadora boutique: no hay un programa único, hay recorridos
 * según el estado en que entra cada proyecto. Aquí se definen; en la ficha de
 * cada compañía se instancian y se ajustan.
 */
export default async function AdminRutas() {
  const supabase = await clienteServidor();

  const [plantillas, usos] = await Promise.all([
    leerPlantillas(),
    supabase.from("companies").select("id, entry_state"),
  ]);

  const porEstado = new Map<string, number>();
  for (const c of usos.data ?? []) {
    if (!c.entry_state) continue;
    porEstado.set(c.entry_state, (porEstado.get(c.entry_state) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque
          accion={<Metadato>{plantillas.length} recorridos</Metadato>}
        >
          Recorridos del programa
        </TituloBloque>
        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          Un recorrido es el punto de partida del plan de un proyecto, no su
          programa cerrado. Al aplicarlo a una compañía se copia entero, así que
          cambiar un recorrido aquí no toca ninguna hoja de ruta en marcha. Eso
          permite reorganizar el catálogo sin reescribirle el plan a nadie.
        </p>
        <NuevaPlantilla />
      </Bloque>

      {plantillas.length === 0 ? (
        <Bloque>
          <SinDatos>
            No hay recorridos definidos. Sin al menos uno, las hojas de ruta hay
            que montarlas etapa a etapa desde cada ficha.
          </SinDatos>
        </Bloque>
      ) : null}

      {plantillas.map((p) => {
        const horas = p.etapas.reduce((t, e) => t + (e.horas ?? 0), 0);
        const caja = p.etapas.reduce((t, e) => t + (e.caja ?? 0), 0);
        const semanas = p.etapas.reduce((t, e) => t + (e.semanas ?? 0), 0);
        const hitos = p.etapas.reduce((t, e) => t + e.hitos.length, 0);

        return (
          <Bloque key={p.id}>
            <TituloBloque
              accion={
                <Etiqueta>
                  Para quien entra en {nombreEstadoEntrada(p.estadoEntrada)}
                </Etiqueta>
              }
            >
              {p.nombre}
            </TituloBloque>

            <div className="border-b border-filete px-4 py-3">
              {p.descripcion ? (
                <p className="text-sm text-cuerpo">{p.descripcion}</p>
              ) : null}
              <p className="mt-2 text-xs text-metadato">
                {p.etapas.length} etapas · {hitos} hitos · {semanas} semanas ·{" "}
                {numero(horas)} horas de IWL · {euros(caja)} de caja ·{" "}
                {porEstado.get(p.estadoEntrada) ?? 0} compañías en ese estado
              </p>
            </div>

            {p.etapas.length === 0 ? (
              <SinDatos>
                Este recorrido no tiene etapas todavía, así que no se puede
                aplicar a ninguna compañía.
              </SinDatos>
            ) : (
              <ol className="divide-y divide-filete">
                {p.etapas.map((e) => (
                  <li key={e.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="text-sm font-medium text-titular">
                        {e.orden + 1}. {e.nombre}
                      </span>
                      <Metadato>
                        {e.semanas ? `${e.semanas} semanas` : "sin plazo"}
                        {e.horas ? ` · ${numero(e.horas)} h` : ""}
                        {e.caja ? ` · ${euros(e.caja)}` : ""}
                      </Metadato>
                      <span className="flex-1" />
                      <BorrarDePlantilla
                        tabla="roadmap_template_stages"
                        id={e.id}
                        etiqueta="Quitar etapa"
                      />
                    </div>

                    <p className="mt-1 text-sm text-secundario">{e.objetivo}</p>

                    {e.hitos.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-2 border-l border-filete pl-3">
                        {e.hitos.map((h) => (
                          <li key={h.id} className="flex flex-wrap items-baseline gap-2">
                            <span className="text-sm text-cuerpo">{h.titulo}</span>
                            {h.condicionaInvertible ? (
                              <Etiqueta>Condiciona invertible</Etiqueta>
                            ) : null}
                            <span className="flex-1" />
                            <BorrarDePlantilla
                              tabla="roadmap_template_milestones"
                              id={h.id}
                              etiqueta="Quitar"
                            />
                            <span className="w-full text-xs text-metadato">
                              {h.criterio}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-metadato">
                        Sin hitos: las compañías que reciban esta etapa no
                        tendrán con qué cerrarla.
                      </p>
                    )}

                    <div className="mt-3">
                      <NuevoHitoPlantilla
                        etapaId={e.id}
                        siguienteOrden={e.hitos.length}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <NuevaEtapaPlantilla
              plantillaId={p.id}
              siguienteOrden={p.etapas.length}
            />
          </Bloque>
        );
      })}
    </div>
  );
}
