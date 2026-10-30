import { DocumentoDeSeleccion } from "@/components/formularios/expediente";
import { leerDiligencia } from "@/lib/datos/diligencia";
import type { ResumenCompania } from "@/lib/datos/compania";
import {
  Bloque,
  Etiqueta,
  Metadato,
  Severidad,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import {
  BarraSegmentada,
  Estado,
  LeyendaEstados,
  type Segmento,
} from "@/components/ui/estado";
import { estadoVisual } from "@/lib/estados";
import { EstadoPunto } from "@/components/formularios/diligencia";
import {
  AbrirDocumento,
  SubirAlPunto,
  SubirDocumento,
} from "@/components/formularios/documentos";
import { fecha, numero } from "@/lib/utils";

/**
 * Due diligence general y data room (§4.3).
 *
 * Los puntos se agrupan por área, con su score. Un documento caducado se
 * muestra como pendiente aunque en base siga marcado validado: es lo que hace
 * el cálculo, y la interfaz tiene que decir lo mismo.
 *
 * Abre con la barra de segmentos: veintinueve puntos son veintinueve
 * cuadrados, y cuántos están en rojo se ve antes de leer una sola línea.
 * Antes había que recorrer siete bloques de desplegables para saberlo.
 */

const ESTADOS: Record<string, string> = {
  pendiente: "Pendiente",
  entregado: "Entregado",
  en_revision: "En revisión",
  validado: "Validado",
  bloqueante: "Bloqueante",
};

export async function VistaDiligencia({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { areas, areasCatalogo, puntos, hallazgos, documentos } =
    await leerDiligencia(resumen.compania.id);
  const { permisos, compania } = resumen;

  const scorePorArea = new Map(
    resumen.scorePreparacion.areas.map((a) => [a.codigo, a]),
  );

  /** Un cuadrado por punto, en el orden en que se repasan */
  const segmentos = (
    puntosDelArea: (typeof areas)[number]["puntos"],
  ): Segmento[] =>
    puntosDelArea.map((p) => ({
      id: p.id,
      estado: estadoVisual("punto_dd", {
        estado: p.status,
        caducado: p.caducado,
        vence: p.due_date,
      }),
      rotulo: p.title,
      href: `#punto-${p.id}`,
    }));

  const todos = areas.flatMap((a) => segmentos(a.puntos));

  return (
    <div className="flex flex-col gap-6">
      {/*
        Por dónde va el due diligence, lo primero y sin leer.

        La pantalla abría directamente con el primer área, así que para
        saber si quedaba algo en rojo había que bajar siete bloques y
        mirar veintinueve desplegables uno a uno.
      */}
      {todos.length > 0 ? (
        <Bloque elevacion={2}>
          <TituloBloque
            accion={
              <Metadato>
                {todos.length} {todos.length === 1 ? "punto" : "puntos"}
              </Metadato>
            }
          >
            Due diligence
          </TituloBloque>
          <div className="px-4 py-4">
            <BarraSegmentada segmentos={todos} etiqueta="Puntos del checklist" />
          </div>
        </Bloque>
      ) : null}

      {hallazgos.length > 0 ? (
        <Bloque>
          <TituloBloque
            accion={
              <Metadato>
                {hallazgos.length} {hallazgos.length === 1 ? "hallazgo" : "hallazgos"}
              </Metadato>
            }
          >
            Hallazgos
          </TituloBloque>
          <ul className="divide-y divide-filete">
            {hallazgos.map((h) => (
              <li key={h.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Severidad
                    nivel={h.severity as "critico" | "alto" | "medio" | "bajo"}
                    estado={h.status}
                  />
                  <span className="text-sm font-medium text-titular">{h.title}</span>
                  <Metadato>{h.dd_areas?.name}</Metadato>
                  {h.due_date ? <Metadato>Para {fecha(h.due_date)}</Metadato> : null}
                </div>
                <p className="mt-2 text-sm text-secundario">{h.description}</p>
                {h.impact ? (
                  <p className="mt-1 text-xs text-metadato">Impacto: {h.impact}</p>
                ) : null}
                {h.resolution_plan ? (
                  <p className="mt-2 border-l-2 border-acento pl-3 text-sm text-titular">
                    {h.resolution_plan}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      {areas.map((area) => {
        const score = scorePorArea.get(area.codigo);
        return (
          <Bloque key={area.codigo}>
            <TituloBloque
              accion={
                score ? (
                  <Metadato>
                    {numero(score.valor, 0)} · peso {numero(score.peso, 1)}
                  </Metadato>
                ) : undefined
              }
            >
              {area.nombre}
            </TituloBloque>

            {/* El área entera, antes de su lista */}
            <div className="border-b border-filete px-4 py-3">
              <BarraSegmentada
                segmentos={segmentos(area.puntos)}
                etiqueta={`Puntos de ${area.nombre}`}
              />
            </div>

            <ul className="divide-y divide-filete">
              {area.puntos.map((punto) => {
                const visual = estadoVisual("punto_dd", {
                  estado: punto.status,
                  caducado: punto.caducado,
                  vence: punto.due_date,
                });

                return (
                  <li
                    key={punto.id}
                    id={`punto-${punto.id}`}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 scroll-mt-24"
                  >
                    <span className="min-w-0 flex-1 text-sm text-titular">
                      {punto.title}
                      {punto.description ? (
                        <span className="block text-xs text-secundario">
                          {punto.description}
                        </span>
                      ) : null}
                      {punto.notes ? (
                        <span className="mt-1 block border-l-2 border-acento pl-2 text-xs text-secundario">
                          {punto.notes}
                        </span>
                      ) : null}
                      {/*
                        Lo que ya entregó siendo candidatura.

                        No se copió al firmar: se lee del expediente de su
                        candidatura, que es donde pasó. Enseñarlo aquí es lo
                        que evita pedirle dos veces lo mismo.
                      */}
                      {punto.deSeleccion.length > 0 ? (
                        <span className="mt-1 block">
                          {punto.deSeleccion.map((d) => (
                            <DocumentoDeSeleccion key={d.id} documento={d} />
                          ))}
                        </span>
                      ) : null}
                    </span>

                    {!punto.is_required ? <Etiqueta>Opcional</Etiqueta> : null}

                    {/*
                      Subir desde la propia línea.

                      Antes había un único formulario al final de la página
                      donde había que volver a elegir el área y el punto que
                      ya estabas mirando. En una checklist de treinta líneas,
                      eso es bajar y buscar treinta veces.
                    */}
                    {permisos.puedeEscribir && !punto.caducado ? (
                      <SubirAlPunto
                        slug={compania.slug}
                        companyId={compania.id}
                        areaId={area.id}
                        puntoId={punto.id}
                        titulo={punto.title}
                      />
                    ) : null}

                    {/*
                      Desde que está en manos de IWL, el estado se enseña pero
                      no se toca: la base lo rechazaría igual, así que un
                      desplegable solo daría un error.
                    */}
                    {permisos.puedeEscribir &&
                    !punto.caducado &&
                    (permisos.puedeValidar ||
                      !["en_revision", "validado", "bloqueante"].includes(
                        punto.status,
                      )) ? (
                      <>
                        {/*
                          El icono del estado delante del control, no una
                          pastilla al lado: con la pastilla, la fila decía
                          «Validado» dos veces. El icono es lo que hace que
                          el estado se distinga en escala de grises, que es
                          lo que el desplegable solo no da.
                        */}
                        <Estado valor={visual} soloIcono />
                        <EstadoPunto
                          slug={compania.slug}
                          id={punto.id}
                          estado={punto.status}
                          visual={visual}
                          puedeValidar={permisos.puedeValidar}
                        />
                      </>
                    ) : (
                      <Estado
                        valor={visual}
                        rotulo={
                          punto.caducado
                            ? `Caducado el ${fecha(punto.expires_on)}`
                            : (ESTADOS[punto.status] ?? punto.status)
                        }
                        motivo={
                          punto.expires_on && !punto.caducado
                            ? `Vence el ${fecha(punto.expires_on)}`
                            : undefined
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </Bloque>
        );
      })}

      <Bloque>
        <TituloBloque accion={<Metadato>{documentos.length} documentos</Metadato>}>
          Data room
        </TituloBloque>
        {documentos.length === 0 ? (
          <SinDatos>
            El data room está vacío. Cada documento que subas queda enlazado a su
            punto del checklist.
          </SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {documentos.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 text-sm text-titular">{d.name}</span>
                <Metadato>{d.folder}</Metadato>
                {d.caducado ? (
                  <Estado
                    valor="vencido"
                    rotulo={`Caducado el ${fecha(d.expires_on)}`}
                  />
                ) : d.expires_on ? (
                  <Metadato>Vence {fecha(d.expires_on)}</Metadato>
                ) : (
                  <Metadato>Sin caducidad</Metadato>
                )}
                {d.tieneFichero ? (
                  <AbrirDocumento documentId={d.id} />
                ) : (
                  <Metadato>Sin fichero</Metadato>
                )}
              </li>
            ))}
          </ul>
        )}

        {permisos.puedeEscribir ? (
          <SubirDocumento
            slug={compania.slug}
            companyId={compania.id}
            areas={areasCatalogo}
            puntos={puntos}
          />
        ) : null}
      </Bloque>

      <LeyendaEstados />
    </div>
  );
}
