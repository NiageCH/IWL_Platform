import type { ResumenCompania } from "@/lib/datos/compania";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { Evolucion } from "@/components/evolucion";
import { VistaMadurez } from "./madurez";
import { Bloque, Cifra, Metadato, Severidad, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { euros, numero, porcentaje } from "@/lib/utils";

/**
 * Resumen del proyecto. Lo primero que se ve al entrar: qué falta y cómo van
 * las cifras del último mes.
 *
 * Los siguientes pasos van arriba porque son lo accionable. La interfaz los
 * presenta como siguiente paso con fecha, no como lista de reproches (§8).
 */
export async function VistaResumen({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { invertible, kpis, hallazgos, scorePreparacion } = resumen;
  const movimiento = await leerMovimiento(resumen.compania.id);

  const criticos = hallazgos.filter((h) => h.severidad === "critico");
  const altos = hallazgos.filter((h) => h.severidad === "alto");

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {invertible.invertible ? "Proyecto invertible" : "Camino a invertible"}
            </Metadato>
          }
        >
          Siguientes pasos
        </TituloBloque>

        {invertible.siguientesPasos.length === 0 ? (
          <SinDatos>
            La compañía cumple la definición de proyecto invertible del programa:
            due diligence superado, sin hallazgos críticos abiertos y en
            condiciones de levantar ronda.
          </SinDatos>
        ) : (
          <ol className="divide-y divide-filete">
            {invertible.siguientesPasos.map((paso, i) => (
              <li key={paso} className="flex gap-4 px-4 py-3">
                <span className="cifra text-xs text-metadato">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-titular">{paso}</span>
              </li>
            ))}
          </ol>
        )}
      </Bloque>

      <VistaMadurez resumen={resumen} />

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {movimiento.lineaBase
                ? `Desde ${movimiento.lineaBase.fecha}`
                : "Sin medición de partida"}
            </Metadato>
          }
        >
          Recorrido
        </TituloBloque>
        <Evolucion puntos={movimiento.puntos} />
      </Bloque>

      <div className="grid gap-6 md:grid-cols-2">
        <Bloque>
          <TituloBloque
            accion={<Metadato>{kpis.periodo ?? "Sin datos"}</Metadato>}
          >
            Último mes
          </TituloBloque>

          {kpis.periodo ? (
            <div className="grid grid-cols-2 gap-6 px-4 py-4">
              <Cifra etiqueta="MRR" valor={euros(kpis.valores.mrr)} />
              <Cifra
                etiqueta="Crecimiento"
                valor={porcentaje(kpis.derivados.crecimiento_mrr)}
                nota="Respecto al mes anterior"
              />
              <Cifra etiqueta="Caja" valor={euros(kpis.valores.caja)} />
              <Cifra
                etiqueta="Runway"
                valor={
                  kpis.derivados.runway_meses === null
                    ? "—"
                    : `${numero(kpis.derivados.runway_meses, 1)} meses`
                }
                nota={`Burn de ${euros(kpis.valores.burn_mensual)}`}
              />
              <Cifra
                etiqueta="Clientes de pago"
                valor={numero(kpis.valores.clientes_pago)}
                nota={`${numero(kpis.valores.pilotos_activos)} pilotos abiertos`}
              />
              <Cifra
                etiqueta="Coste cloud"
                valor={porcentaje(kpis.derivados.coste_cloud_sobre_ingresos)}
                nota="Sobre ingresos del mes"
              />
            </div>
          ) : (
            <SinDatos>
              Todavía no hay ningún update mensual cargado. El primero fija la
              línea de partida.
            </SinDatos>
          )}
        </Bloque>

        <Bloque>
          <TituloBloque accion={<Metadato>{hallazgos.length} abiertos</Metadato>}>
            Hallazgos
          </TituloBloque>

          {hallazgos.length === 0 ? (
            <SinDatos>Ningún hallazgo abierto ahora mismo.</SinDatos>
          ) : (
            <ul className="divide-y divide-filete">
              {[...criticos, ...altos]
                .concat(hallazgos.filter((h) => !["critico", "alto"].includes(h.severidad)))
                .slice(0, 6)
                .map((h) => (
                  <li key={h.id} className="flex items-baseline gap-3 px-4 py-3">
                    <Severidad nivel={h.severidad} />
                    <span className="flex-1 text-sm text-titular">{h.titulo}</span>
                    <Metadato>{h.origen === "tecnico" ? "Técnico" : "General"}</Metadato>
                  </li>
                ))}
            </ul>
          )}
        </Bloque>
      </div>

      <Bloque>
        <TituloBloque
          accion={<Metadato>Score {numero(scorePreparacion.valor, 1)}</Metadato>}
        >
          Preparación por área
        </TituloBloque>

        <ul className="divide-y divide-filete">
          {scorePreparacion.areas.map((area) => (
            <li key={area.codigo} className="flex items-center gap-4 px-4 py-3">
              <span className="w-32 shrink-0 text-sm text-titular sm:w-56">
                {area.nombre}
              </span>
              <span className="h-1.5 flex-1 rounded-sm bg-hundido" aria-hidden="true">
                <span
                  className="barra-acento block h-full rounded-sm"
                  style={{ width: `${area.valor}%` }}
                />
              </span>
              <span className="cifra w-14 shrink-0 text-right text-sm text-titular">
                {numero(area.valor, 0)}
              </span>
              <span className="hidden w-44 shrink-0 text-right text-xs text-secundario sm:inline">
                {area.bloqueantes > 0
                  ? `${area.bloqueantes} bloqueante${area.bloqueantes > 1 ? "s" : ""}`
                  : area.pendientes > 0
                    ? `${area.pendientes} por entregar`
                    : "Completa"}
              </span>
            </li>
          ))}

          {scorePreparacion.aportacionTecnica ? (
            <li className="flex items-center gap-4 bg-elevado px-4 py-3">
              <span className="w-32 shrink-0 text-sm font-medium text-titular sm:w-56">
                Due diligence técnico
              </span>
              <span className="h-1.5 flex-1 rounded-sm bg-hundido" aria-hidden="true">
                <span
                  className="barra-acento block h-full rounded-sm"
                  style={{ width: `${scorePreparacion.aportacionTecnica.valor}%` }}
                />
              </span>
              <span className="cifra w-14 shrink-0 text-right text-sm text-titular">
                {numero(scorePreparacion.aportacionTecnica.valor, 0)}
              </span>
              <span className="hidden w-44 shrink-0 text-right text-xs text-secundario sm:inline">
                Peso {numero(scorePreparacion.aportacionTecnica.peso, 1)}
              </span>
            </li>
          ) : null}
        </ul>
      </Bloque>
    </div>
  );
}
