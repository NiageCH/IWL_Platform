import Link from "next/link";
import { redirect } from "next/navigation";
import { personaActual, esIwl } from "@/lib/supabase/servidor";
import { leerCartera } from "@/lib/datos/cartera";
import {
  Bloque,
  Cifra,
  Metadato,
  Semaforo,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { Chispa, Movimiento } from "@/components/evolucion";
import { Embudo, MapaIntervencion } from "@/components/cohorte";
import { bandaDe } from "@/lib/datos/cohorte";
import { euros, numero } from "@/lib/utils";

export const metadata = { title: "Cartera · Plataforma IWL" };

const ETAPAS: Record<string, string> = {
  pre_semilla: "Pre-semilla",
  semilla: "Semilla",
  serie_a: "Serie A",
};

/**
 * Dashboard de cohorte (§4.7): una fila por compañía con fase, semáforo,
 * scores, último update, runway e hitos.
 *
 * Debajo, el embudo hacia invertible con el objetivo interno de la cohorte.
 */
export default async function Cartera() {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (!esIwl(persona.role) && persona.role !== "revisor_niage") redirect("/proyecto");

  const { companias, cohorte, bandas, mapa, tramos, lectura } = await leerCartera();

  if (companias.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <Bloque>
          <TituloBloque>Cartera</TituloBloque>
          <SinDatos>No hay compañías asignadas todavía.</SinDatos>
        </Bloque>
      </main>
    );
  }

  const invertibles = companias.filter((c) => c.invertible.invertible).length;
  const conCriticos = companias.filter((c) =>
    c.hallazgos.some((h) => h.severidad === "critico"),
  ).length;
  const runwayBajo = companias.filter(
    (c) => c.kpis.derivados.runway_meses !== null && c.kpis.derivados.runway_meses < 6,
  ).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 border-l-2 border-acento pl-4">
        <h1 className="text-lg font-semibold tracking-tight text-titular">
          {cohorte?.name ?? "Cartera"}
        </h1>
        <p className="mt-1 text-sm text-secundario">
          {companias.length}{" "}
          {companias.length === 1 ? "compañía en seguimiento" : "compañías en seguimiento"}
        </p>
      </div>

      {/* La lectura de la cohorte en una frase: qué ha cambiado, dónde está el
          hueco y cuántas están listas. Se construye con reglas, así que ante
          los mismos datos dice siempre lo mismo. */}
      <p className="mb-6 border-y border-filete py-4 text-base leading-relaxed text-titular">
        {lectura}
      </p>

      <div className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Bloque className="px-4 py-4">
          <Cifra
            etiqueta="Invertibles"
            valor={`${invertibles} de ${companias.length}`}
            nota={
              cohorte?.investable_target
                ? `Objetivo de cohorte: ${cohorte.investable_target}`
                : "Sin objetivo fijado"
            }
          />
        </Bloque>
        <Bloque className="px-4 py-4">
          <Cifra
            etiqueta="Con hallazgo crítico"
            valor={numero(conCriticos)}
            nota="Bloquea el estado invertible"
          />
        </Bloque>
        <Bloque className="px-4 py-4">
          <Cifra
            etiqueta="Runway bajo umbral"
            valor={numero(runwayBajo)}
            nota="Menos de 6 meses"
          />
        </Bloque>
        <Bloque className="px-4 py-4">
          <Cifra
            etiqueta="Updates pendientes"
            valor={numero(companias.filter((c) => !c.updateAlDia).length)}
            nota="Del mes en curso"
          />
        </Bloque>
      </div>

      <Bloque>
        <TituloBloque accion={<Metadato>Fila por compañía</Metadato>}>
          Cohorte
        </TituloBloque>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-filete text-left">
                <th className="px-4 py-2 font-medium text-metadato">Compañía</th>
                <th className="px-4 py-2 font-medium text-metadato">Fase</th>
                <th className="px-4 py-2 text-right font-medium text-metadato">Técnico</th>
                <th className="px-4 py-2 text-right font-medium text-metadato">Preparación</th>
                <th className="px-4 py-2 font-medium text-metadato">Recorrido</th>
                <th className="px-4 py-2 text-right font-medium text-metadato">Runway</th>
                <th className="px-4 py-2 text-right font-medium text-metadato">MRR</th>
                <th className="px-4 py-2 font-medium text-metadato">Último update</th>
                <th className="px-4 py-2 font-medium text-metadato">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-filete">
              {companias.map((c) => (
                <tr key={c.compania.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/cartera/${c.compania.slug}`}
                      className="font-medium text-titular underline-offset-4 hover:underline"
                    >
                      {c.compania.name}
                    </Link>
                    <span className="block text-xs text-metadato">
                      {ETAPAS[c.compania.stage] ?? c.compania.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secundario">
                    {c.compania.phases?.name ?? "—"}
                  </td>
                  <td className="cifra px-4 py-3 text-right text-titular">
                    {numero(c.scoreTecnico.valor, 1)}
                  </td>
                  <td className="cifra px-4 py-3 text-right text-titular">
                    {numero(c.scorePreparacion.valor, 1)}
                    <span className="block text-xs font-normal text-metadato">
                      {bandaDe(c.scorePreparacion.valor, bandas).nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {c.movimiento && c.movimiento.seriePreparacion.length > 1 ? (
                        <Chispa valores={c.movimiento.seriePreparacion} />
                      ) : null}
                      <Movimiento
                        delta={c.movimiento?.deltaPreparacion ?? null}
                        sufijo=""
                      />
                    </span>
                  </td>
                  <td className="cifra px-4 py-3 text-right text-secundario">
                    {c.kpis.derivados.runway_meses === null
                      ? "—"
                      : `${numero(c.kpis.derivados.runway_meses, 1)} m`}
                  </td>
                  <td className="cifra px-4 py-3 text-right text-secundario">
                    {euros(c.kpis.valores.mrr)}
                  </td>
                  <td className="cifra px-4 py-3 text-secundario">
                    {c.kpis.periodo?.slice(0, 7) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Semaforo estado={c.semaforo.estado} motivo={c.semaforo.motivo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloque>

      <div className="mt-6 flex flex-col gap-6">
        <Embudo tramos={tramos} objetivo={cohorte?.investable_target ?? null} />
        <MapaIntervencion mapa={mapa} />

        <Bloque>
          <TituloBloque accion={<Metadato>Lo que falta a cada una</Metadato>}>
            Siguientes pasos de la cohorte
          </TituloBloque>
          <ul className="divide-y divide-filete">
            {companias.map((c) => (
              <li key={c.compania.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Link
                    href={`/cartera/${c.compania.slug}`}
                    className="text-sm font-medium text-titular underline-offset-4 hover:underline"
                  >
                    {c.compania.name}
                  </Link>
                  <Metadato>
                    {c.invertible.invertible
                      ? "Invertible"
                      : c.invertible.siguientesPasos.length === 1
                        ? "Un paso"
                        : `${c.invertible.siguientesPasos.length} pasos`}
                  </Metadato>
                </div>
                {c.invertible.siguientesPasos.length > 0 ? (
                  <ol className="mt-1 flex flex-col gap-0.5">
                    {c.invertible.siguientesPasos.slice(0, 3).map((paso) => (
                      <li key={paso} className="text-sm text-secundario">
                        {paso}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-1 text-sm text-secundario">
                    Cumple la definición de proyecto invertible del programa.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Bloque>
      </div>

    </main>
  );
}
