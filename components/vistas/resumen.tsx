import type { ResumenCompania } from "@/lib/datos/compania";
import { leerSeguimiento } from "@/lib/datos/hoja";
import { TramosEnCorto } from "@/components/vistas/hoja";
import { VistaQueFalta } from "./tareas";
import { EnlacesInforme } from "@/components/informe/enlace";
import {
  Bloque,
  Cifra,
  Metadato,
  Semaforo,
  Severidad,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { LeyendaEstados } from "@/components/ui/estado";
import { estadoVisual, type EstadoVisual } from "@/lib/estados";
import { ETAPAS, PERFILES } from "@/lib/etiquetas";
import { euros, numero } from "@/lib/utils";

/**
 * Resumen del proyecto. Lo primero que se ve al entrar.
 *
 * Cuatro bloques y ni uno más: por dónde va, qué falta, el último mes y
 * los hallazgos abiertos. Tenía ocho, y eso era lo que lo hacía ilegible.
 * La madurez y el recorrido de scores se leen en el due diligence
 * técnico, que es de donde salen; la preparación por área, en el due
 * diligence general, que es donde se trabaja sobre ella. Aquí se queda lo
 * que contesta «¿qué hago hoy?».
 */
export async function VistaResumen({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { compania, invertible, estadoInvertible, kpis, hallazgos, scoreTecnico, semaforo } = resumen;
  // Por dónde va, en tramos: lo mismo que el resumen de la Hoja de ruta (REVISION, 24 nov)
  const seguimiento = await leerSeguimiento(compania.id);

  /* El mismo prefijo que usa la cabecera: la fundadora ve `/proyecto`, IWL
     la ficha de esa compañía dentro de la cartera */
  const base = resumen.permisos.esIwl
    ? `/cartera/${compania.slug}`
    : "/proyecto";

  const criticos = hallazgos.filter((h) => h.severidad === "critico");
  const altos = hallazgos.filter((h) => h.severidad === "alto");

  return (
    <div className="flex flex-col gap-6">
      {/*
        Por dónde va, lo primero.

        En tramos de la hoja de ruta, con las mismas cifras que su pestaña.
        Fueron las fases antiguas del programa, que no convivían con los
        tramos (REVISION, 24 nov).
      */}
      <Bloque elevacion={2}>
        <TituloBloque>Por dónde va</TituloBloque>

        {/*
          Lo que bajó de la cabecera: se repetía en las ocho pantallas de
          la compañía y aquí se lee una vez, que son las que hacen falta.
        */}
        <div className="border-b border-filete px-4 py-3">
          <p className="text-sm text-cuerpo">
            {compania.one_liner ?? "Sin descripción todavía."}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Metadato>{compania.sector ?? "Sin sector"}</Metadato>
            <Metadato>
              {compania.stage ? (ETAPAS[compania.stage] ?? compania.stage) : "Sin etapa todavía"}
            </Metadato>
            <Metadato>
              {compania.tech_profile
                ? (PERFILES[compania.tech_profile] ?? compania.tech_profile)
                : "Sin perfil todavía"}
            </Metadato>
            {compania.website ? (
              <a
                href={compania.website}
                target="_blank"
                rel="noreferrer noopener"
                className="enlace text-xs text-acento-texto"
              >
                {compania.website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-filete px-4 py-3">
          <Semaforo estado={semaforo.estado} motivo={semaforo.motivo} />

          <span className="flex items-baseline gap-2 text-xs">
            <span className="text-metadato">Invertible</span>
            {/* La regla del 23 nov: «Sí» graduada; antes, sus hitos marcados validados */}
            <span className="text-sm tabular-nums text-titular">{estadoInvertible.texto}</span>
          </span>

          {scoreTecnico.evaluadas === 0 ? (
            <span className="text-xs text-metadato">
              Due diligence técnico pendiente
            </span>
          ) : scoreTecnico.completo ? null : (
            <span className="text-xs text-metadato">
              {scoreTecnico.evaluadas} de {scoreTecnico.aplicables} dimensiones
              técnicas evaluadas
            </span>
          )}
        </div>

        <TramosEnCorto seguimiento={seguimiento} hoy={new Date().toISOString().slice(0, 10)} ruta={`${base}/ruta`} />
      </Bloque>

      {/*
        Qué falta: los siguientes pasos y las tareas, en una sola lista.

        Eran dos bloques seguidos que había que cruzar de cabeza: uno decía
        lo que falta y el otro quién lo estaba haciendo. Son la misma
        pregunta.
      */}
      <VistaQueFalta
        resumen={resumen}
        pasos={invertible.siguientesPasos.map((p) => ({
          texto: p.texto,
          href: `${base}/${p.seccion}`,
          paraInvertible: p.paraInvertible,
        }))}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Bloque>
          <TituloBloque
            accion={<Metadato>{kpis.periodo ?? "Sin datos"}</Metadato>}
          >
            Último mes
          </TituloBloque>

          {kpis.periodo ? (
            <div className="grid grid-cols-2 gap-6 px-4 py-4">
              <Cifra
                etiqueta="MRR"
                valor={numero(kpis.valores.mrr, 0)}
                unidad="€"
                estado={frenteAlObjetivo(kpis.valores.mrr, kpis.objetivos.mrr)}
                nota={conObjetivo(kpis.objetivos.mrr, euros)}
              />
              <Cifra
                etiqueta="Crecimiento"
                valor={numero(kpis.derivados.crecimiento_mrr, 1)}
                unidad="%"
                nota="Respecto al mes anterior"
              />
              <Cifra
                etiqueta="Caja"
                valor={numero(kpis.valores.caja, 0)}
                unidad="€"
                estado={frenteAlObjetivo(kpis.valores.caja, kpis.objetivos.caja)}
                nota={conObjetivo(kpis.objetivos.caja, euros)}
              />
              <Cifra
                etiqueta="Runway"
                valor={
                  kpis.derivados.runway_meses === null
                    ? "—"
                    : numero(kpis.derivados.runway_meses, 1)
                }
                unidad={kpis.derivados.runway_meses === null ? undefined : "meses"}
                nota={`Burn de ${euros(kpis.valores.burn_mensual)}`}
              />
              <Cifra
                etiqueta="Clientes de pago"
                valor={numero(kpis.valores.clientes_pago)}
                estado={frenteAlObjetivo(
                  kpis.valores.clientes_pago,
                  kpis.objetivos.clientes_pago,
                )}
                nota={
                  conObjetivo(kpis.objetivos.clientes_pago, (v) => numero(v)) ??
                  `${numero(kpis.valores.pilotos_activos)} pilotos abiertos`
                }
              />
              <Cifra
                etiqueta="Coste cloud"
                valor={numero(kpis.derivados.coste_cloud_sobre_ingresos, 1)}
                unidad="%"
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
            Hallazgos abiertos
          </TituloBloque>

          {hallazgos.length === 0 ? (
            <SinDatos>Ningún hallazgo abierto ahora mismo.</SinDatos>
          ) : (
            <ul className="divide-y divide-filete">
              {[...criticos, ...altos]
                .concat(
                  hallazgos.filter(
                    (h) => !["critico", "alto"].includes(h.severidad),
                  ),
                )
                .slice(0, 6)
                .map((h) => (
                  <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <Severidad nivel={h.severidad} />
                    <span className="flex-1 text-sm text-titular">{h.titulo}</span>
                    <Metadato>
                      {h.origen === "tecnico" ? "Técnico" : "General"}
                    </Metadato>
                  </li>
                ))}
            </ul>
          )}
          <EnlacesInforme slug={compania.slug} tipos={["mensual"]} />
        </Bloque>
      </div>

      <LeyendaEstados />
    </div>
  );
}

/**
 * El estado de un KPI frente a su objetivo.
 *
 * Sin objetivo no hay estado que enseñar: una cifra suelta no está ni bien
 * ni mal, y pintarla de algo sería inventarse un juicio.
 */
function frenteAlObjetivo(
  valor: number | null | undefined,
  meta: number | null | undefined,
): EstadoVisual | undefined {
  if (meta === null || meta === undefined) return undefined;
  return estadoVisual("kpi", { valor: valor ?? null, objetivo: meta });
}

function conObjetivo(
  meta: number | null | undefined,
  formato: (v: number) => string,
): string | undefined {
  return meta === null || meta === undefined
    ? undefined
    : `Objetivo ${formato(meta)}`;
}
