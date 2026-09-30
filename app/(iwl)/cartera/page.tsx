import { CalendarClock, ShieldAlert, Target, Wallet } from "lucide-react";
import type { ReactNode } from "react";
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
import {
  EvolucionCohorte,
  HallazgosPorSeveridad,
  RadaresCohorte,
  RunwayCohorte,
} from "@/components/graficos-cohorte";
import { bandaDe } from "@/lib/datos/cohorte";
import { cn, euros, numero, porcentaje } from "@/lib/utils";

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
/*
 * Las iniciales de una compañía, para el chip de su fila.
 *
 * Identifican de un vistazo cuando la lista es larga. El tono es decorativo
 * y va por la longitud del nombre: no informa de nada, y el nombre está al
 * lado, así que nadie depende del color para saber de quién se trata.
 */
function inicialesCompania(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const TONO_COMPANIA = [
  "[--tono:var(--color-acento-texto)]",
  "[--tono:var(--color-cielo)]",
  "[--tono:var(--color-lila)]",
  "[--tono:var(--color-menta)]",
  "[--tono:var(--color-durazno)]",
] as const;

/**
 * Un dato de la fila: la cifra y su rótulo debajo.
 *
 * Sin ancho propio: va en una fila que envuelve, así que se coloca solo
 * donde haya sitio. Fijarle un ancho era lo que rompía la lista en las
 * ventanas intermedias.
 */
function DatoFila({
  etiqueta,
  pie,
  children,
}: {
  etiqueta: string;
  pie?: string;
  children: ReactNode;
}) {
  return (
    <span className="flex flex-col">
      <span className="cifra text-sm text-titular">{children}</span>
      <span className="text-[0.6875rem] leading-tight text-metadato">
        {etiqueta}
      </span>
      {pie ? (
        <span className="text-[0.6875rem] leading-tight text-secundario">
          {pie}
        </span>
      ) : null}
    </span>
  );
}

export default async function Cartera() {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (!esIwl(persona.role) && persona.role !== "revisor_niage") redirect("/proyecto");

  const {
    companias,
    cohorte,
    bandas,
    mapa,
    tramos,
    lectura,
    evolucion,
    severidades,
    radares,
    runway,
    compromisos,
  } = await leerCartera();

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
    <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10">
      {/*
        El titular, grande y sin el filete lateral.
        
        Era del tamaño de un subtítulo y llevaba una raya de acento al lado,
        que es el recurso que usaba toda la interfaz para señalar dónde
        empieza algo. Un panel se orienta por el tamaño del titular, no por
        una marca decorativa.
      */}
      <header className="mb-8">
        <h1 className="titular-marca text-3xl text-titular sm:text-4xl">
          {cohorte?.name ?? "Cartera"}
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-secundario">
          {lectura}
        </p>
        <p className="mt-3 text-sm text-metadato">
          {companias.length}{" "}
          {companias.length === 1 ? "compañía en seguimiento" : "compañías en seguimiento"}
        </p>
      </header>

      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Bloque elevacion={2} className="p-6">
          <Cifra
            destacada
            icono={Target}
            tono="acento"
            etiqueta="Invertibles"
            valor={`${invertibles} de ${companias.length}`}
            nota={
              cohorte?.investable_target
                ? `Objetivo de cohorte: ${cohorte.investable_target}`
                : "Sin objetivo fijado"
            }
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            icono={ShieldAlert}
            tono="mal"
            etiqueta="Con hallazgo crítico"
            valor={numero(conCriticos)}
            nota="Bloquea el estado invertible"
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            icono={Wallet}
            tono="durazno"
            etiqueta="Runway bajo umbral"
            valor={numero(runwayBajo)}
            nota="Menos de 6 meses"
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            icono={CalendarClock}
            tono="cielo"
            etiqueta="Updates pendientes"
            valor={numero(companias.filter((c) => !c.updateAlDia).length)}
            nota="Del mes en curso"
          />
        </Bloque>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Bloque>
          <TituloBloque accion={<Metadato>Media de la cohorte</Metadato>}>
            Preparación en el tiempo
          </TituloBloque>
          <EvolucionCohorte puntos={evolucion} />
        </Bloque>

        <Bloque>
          <TituloBloque accion={<Metadato>Abiertos ahora</Metadato>}>
            Hallazgos por severidad
          </TituloBloque>
          <HallazgosPorSeveridad filas={severidades} />
        </Bloque>
      </div>

      <Bloque className="mb-6">
        <TituloBloque accion={<Metadato>Umbral en 6 meses</Metadato>}>
          Meses de caja
        </TituloBloque>
        <RunwayCohorte filas={runway} />
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Una por compañía</Metadato>}>
          Cohorte
        </TituloBloque>

        {/*
          Lista, no tabla de nueve columnas.

          La tabla obligaba a 860 px de ancho mínimo y aun así partía los
          nombres en dos y tres líneas. Nueve cifras en fila no se comparan:
          se recorren. Aquí cada compañía es una fila con aire, con lo que
          identifica a la izquierda, lo que mide en el centro y su estado a
          la derecha; lo secundario se retira en pantallas estrechas en vez
          de empujar una barra de desplazamiento horizontal.
        */}
        <ul className="divide-y divide-filete">
          {companias.map((c) => (
            /*
             * Dos líneas, y ninguna con anchos fijos.
             *
             * Antes era una rejilla de siete columnas en rem. Sumaban unos
             * 936 px que, con los 256 de la barra lateral, pedían 1192 de
             * ventana: entre 1024 —donde aparece la barra— y esa cifra, las
             * columnas se aplastaban por debajo de su contenido y los
             * textos se solapaban. Un ancho fijo siempre acaba encontrando
             * una ventana donde no cabe.
             *
             * Arriba, quién es y cómo está. Abajo, lo que mide, que fluye y
             * envuelve según haya sitio. Aguanta cualquier ancho sin
             * columnas mágicas.
             */
            <li key={c.compania.id} className="fila-enlace px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "chip-icono chip-icono-sm text-xs font-bold",
                    TONO_COMPANIA[
                      c.compania.name.length % TONO_COMPANIA.length
                    ],
                  )}
                >
                  {inicialesCompania(c.compania.name)}
                </span>

                <span className="min-w-0 flex-1">
                  <Link
                    href={`/cartera/${c.compania.slug}`}
                    className="enlace enlace-destacado block truncate font-medium text-titular"
                  >
                    {c.compania.name}
                  </Link>
                  <span className="block truncate text-xs text-metadato">
                    {ETAPAS[c.compania.stage] ?? c.compania.stage}
                    {c.compania.phases?.name ? ` · ${c.compania.phases.name}` : ""}
                  </span>
                </span>

                <Semaforo estado={c.semaforo.estado} motivo={c.semaforo.motivo} />

                {/*
                  El segundo punto de entrada de la fila, y un enlace de
                  verdad: así funciona el clic derecho, la rueda del ratón y
                  el teclado.
                */}
                <Link
                  href={`/cartera/${c.compania.slug}`}
                  aria-label={`Abrir ${c.compania.name}`}
                  className="flecha cifra shrink-0 px-1 text-acento-texto"
                >
                  →
                </Link>
              </div>

              {/* Lo que mide, sangrado bajo el nombre */}
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 pl-11">
                <DatoFila etiqueta="Técnico">
                  {numero(c.scoreTecnico.valor, 1)}
                </DatoFila>
                <DatoFila
                  etiqueta="Preparación"
                  pie={bandaDe(c.scorePreparacion.valor, bandas).nombre}
                >
                  {numero(c.scorePreparacion.valor, 1)}
                </DatoFila>
                <DatoFila etiqueta="Runway">
                  {c.kpis.derivados.runway_meses === null
                    ? "—"
                    : `${numero(c.kpis.derivados.runway_meses, 1)} m`}
                </DatoFila>
                <DatoFila etiqueta="MRR">{euros(c.kpis.valores.mrr)}</DatoFila>
                <DatoFila etiqueta="Último update">
                  {c.kpis.periodo?.slice(0, 7) ?? "—"}
                </DatoFila>

                <span className="flex items-center gap-2">
                  {c.movimiento && c.movimiento.seriePreparacion.length > 1 ? (
                    <Chispa valores={c.movimiento.seriePreparacion} />
                  ) : null}
                  <Movimiento
                    delta={c.movimiento?.deltaPreparacion ?? null}
                    sufijo=""
                  />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Bloque>

      <div className="mt-6 flex flex-col gap-6">
        <Embudo tramos={tramos} objetivo={cohorte?.investable_target ?? null} />
        <MapaIntervencion mapa={mapa} />

        <Bloque>
          <TituloBloque accion={<Metadato>Nivel frente al objetivo de su etapa</Metadato>}>
            Scorecards de la cohorte
          </TituloBloque>
          <RadaresCohorte companias={radares} />
        </Bloque>

        {compromisos.length > 0 ? (
          <Bloque>
            <TituloBloque accion={<Metadato>Entregado sobre comprometido</Metadato>}>
              Compromiso de IWL
            </TituloBloque>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-filete text-left">
                    <th className="px-4 py-2 font-medium text-metadato">Compañía</th>
                    <th className="px-4 py-2 font-medium text-metadato">Horas</th>
                    <th className="px-4 py-2 text-right font-medium text-metadato">
                      Entregadas
                    </th>
                    <th className="px-4 py-2 font-medium text-metadato">Caja</th>
                    <th className="px-4 py-2 text-right font-medium text-metadato">
                      Desembolsada
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-filete">
                  {compromisos.map((c) => (
                    <tr key={c.slug} className="fila-enlace">
                      <td className="px-4 py-3">
                        <Link
                          href={`/cartera/${c.slug}/aportacion`}
                          className="enlace enlace-destacado font-medium text-titular"
                        >
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <ProgresoCompromiso pct={c.horasPct} />
                      </td>
                      <td className="cifra px-4 py-3 text-right text-secundario">
                        {numero(c.horasEntregadas, 0)} de {numero(c.horasComprometidas, 0)} h
                      </td>
                      <td className="px-4 py-3">
                        <ProgresoCompromiso pct={c.cajaPct} />
                      </td>
                      <td className="cifra px-4 py-3 text-right text-secundario">
                        {euros(c.cajaDesembolsada)} de {euros(c.cajaComprometida)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-filete px-4 py-2.5 text-xs text-metadato">
              Lo que IWL ha entregado frente a lo que firmó. Si va por detrás,
              se ve aquí antes de que lo pregunte nadie.
            </p>
          </Bloque>
        ) : null}

        <Bloque>
          <TituloBloque accion={<Metadato>Lo que falta a cada una</Metadato>}>
            Siguientes pasos de la cohorte
          </TituloBloque>
          <ul className="divide-y divide-filete">
            {companias.map((c) => (
              <li key={c.compania.id} className="fila-enlace px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Link
                    href={`/cartera/${c.compania.slug}`}
                    className="estirado enlace enlace-destacado text-sm font-medium text-titular"
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

/** Barra de avance del compromiso, con su cifra siempre escrita al lado */
function ProgresoCompromiso({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs text-metadato">Sin compromiso fijado</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-24 shrink-0 rounded-sm bg-hundido" aria-hidden="true">
        <span
          className="barra-acento block h-full rounded-sm"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </span>
      <span className="cifra text-xs text-secundario">{porcentaje(pct, 0)}</span>
    </span>
  );
}
