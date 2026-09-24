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
import { EstadoPunto } from "@/components/formularios/diligencia";
import { AbrirDocumento, SubirDocumento } from "@/components/formularios/documentos";
import { fecha, numero } from "@/lib/utils";

/**
 * Due diligence general y data room (§4.3).
 *
 * Los puntos se agrupan por área, con su score. Un documento caducado se
 * muestra como pendiente aunque en base siga marcado validado: es lo que hace
 * el cálculo, y la interfaz tiene que decir lo mismo.
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

  return (
    <div className="flex flex-col gap-6">
      {hallazgos.length > 0 ? (
        <Bloque>
          <TituloBloque>Hallazgos</TituloBloque>
          <ul className="divide-y divide-filete">
            {hallazgos.map((h) => (
              <li key={h.id} className="px-4 py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Severidad nivel={h.severity as "critico" | "alto" | "medio" | "bajo"} />
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
            <ul className="divide-y divide-filete">
              {area.puntos.map((punto) => (
                <li
                  key={punto.id}
                  className="flex flex-wrap items-baseline gap-3 px-4 py-3"
                >
                  <span className="flex-1 text-sm text-titular">
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
                  </span>
                  {!punto.is_required ? <Etiqueta>Opcional</Etiqueta> : null}
                  {punto.caducado ? (
                    <Etiqueta>Caducado el {fecha(punto.expires_on)}</Etiqueta>
                  ) : punto.expires_on ? (
                    <Metadato>Vence {fecha(punto.expires_on)}</Metadato>
                  ) : null}
                  {permisos.puedeEscribir && !punto.caducado ? (
                    <EstadoPunto
                      slug={compania.slug}
                      id={punto.id}
                      estado={punto.status}
                      puedeValidar={permisos.puedeValidar}
                    />
                  ) : (
                    <Etiqueta>
                      {ESTADOS[punto.estadoEfectivo] ?? punto.estadoEfectivo}
                    </Etiqueta>
                  )}
                </li>
              ))}
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
              <li key={d.id} className="flex flex-wrap items-baseline gap-3 px-4 py-3">
                <span className="flex-1 text-sm text-titular">{d.name}</span>
                <Metadato>{d.folder}</Metadato>
                {d.expires_on ? (
                  d.caducado ? (
                    <Etiqueta>Caducado el {fecha(d.expires_on)}</Etiqueta>
                  ) : (
                    <Metadato>Vence {fecha(d.expires_on)}</Metadato>
                  )
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
    </div>
  );
}
