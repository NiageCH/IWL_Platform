"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Gráficos de cohorte (§4.7).
 *
 * Todos usan el acento como única serie y diferencian por etiqueta de texto.
 * No es una limitación: es que la identidad de IWL tiene un solo color
 * cromático, y cualquier segundo tono tendría que ser un gris que no separa
 * lo suficiente para quien no distingue el color.
 */

const ACENTO = "#FF007A";
const ACENTO_APAGADO = "#7A1345";
const NEUTRO = "#8B8B94";
const FILETE = "#2C2C33";
const MAL = "#FB7185";
const SUPERFICIE = "#1A1A1F";

function Caja({ children }: { children: React.ReactNode }) {
  return <div className="elevacion-2 rounded-md px-3 py-2 text-xs">{children}</div>;
}

// -----------------------------------------------------------------------------
// Evolución de la cohorte
// -----------------------------------------------------------------------------

export interface PuntoCohorte {
  fecha: string;
  media: number;
  companias: number;
}

/**
 * Preparación media de la cohorte en el tiempo.
 *
 * Es la pregunta que se hace un patrocinador: ¿el programa mueve la aguja? Se
 * dibuja sin suavizar. Si un mes baja, baja.
 */
export function EvolucionCohorte({ puntos }: { puntos: PuntoCohorte[] }) {
  if (puntos.length < 2) {
    return (
      <p className="px-4 py-6 text-sm text-secundario">
        Con una sola medición no hay recorrido de cohorte que enseñar.
      </p>
    );
  }

  const primera = puntos[0].media;
  const datos = puntos.map((p) => ({ ...p, mes: p.fecha.slice(0, 7) }));

  return (
    <div className="h-[220px] w-full px-4 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="degradadoCohorte" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACENTO} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ACENTO} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="mes"
            tick={{ fill: NEUTRO, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: FILETE }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: NEUTRO, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <ReferenceLine y={primera} stroke={NEUTRO} strokeDasharray="4 3" />
          <Tooltip
            cursor={{ stroke: NEUTRO, strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PuntoCohorte & { mes: string };
              return (
                <Caja>
                  <p className="cifra text-metadato">{label}</p>
                  <p className="cifra mt-1 text-titular">
                    {formatear(d.media)} de media
                  </p>
                  <p className="text-secundario">
                    {d.companias}{" "}
                    {d.companias === 1 ? "compañía medida" : "compañías medidas"}
                  </p>
                </Caja>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="media"
            stroke={ACENTO}
            strokeWidth={2}
            fill="url(#degradadoCohorte)"
            dot={{ r: 3, fill: ACENTO, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: ACENTO, stroke: SUPERFICIE, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-1 text-xs text-metadato">
        Media del score de preparación · la línea discontinua es la primera
        medición de la cohorte
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Runway por compañía
// -----------------------------------------------------------------------------

export interface FilaRunway {
  nombre: string;
  meses: number | null;
}

/**
 * Meses de caja por compañía, con el umbral marcado.
 *
 * Las que están por debajo se pintan en el tono de alerta y además llevan su
 * cifra escrita: quien no distingue el color lee el número igual.
 */
export function RunwayCohorte({
  filas,
  umbral = 6,
}: {
  filas: FilaRunway[];
  umbral?: number;
}) {
  const datos = filas
    .filter((f): f is { nombre: string; meses: number } => f.meses !== null)
    .sort((a, b) => a.meses - b.meses);

  if (datos.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-secundario">
        Ninguna compañía tiene todavía caja y consumo cargados.
      </p>
    );
  }

  return (
    <div
      className="w-full px-4 py-4"
      style={{ height: `${Math.max(140, datos.length * 44 + 60)}px` }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 16, left: 8 }}
          barCategoryGap={12}
        >
          <XAxis
            type="number"
            tick={{ fill: NEUTRO, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: FILETE }}
            label={{
              value: "meses de caja",
              position: "insideBottom",
              offset: -8,
              fill: NEUTRO,
              fontSize: 11,
            }}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            tick={{ fill: "#E4E4E7", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={128}
          />
          <ReferenceLine
            x={umbral}
            stroke={MAL}
            strokeDasharray="4 3"
            label={{
              value: `umbral ${umbral}`,
              position: "top",
              fill: MAL,
              fontSize: 11,
            }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { nombre: string; meses: number };
              return (
                <Caja>
                  <p className="text-titular">{d.nombre}</p>
                  <p className="cifra mt-1 text-secundario">
                    {formatear(d.meses)} meses de caja
                  </p>
                  {d.meses < umbral ? (
                    <p className="mt-1 text-mal">Por debajo del umbral</p>
                  ) : null}
                </Caja>
              );
            }}
          />
          <Bar dataKey="meses" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {datos.map((d) => (
              <Cell
                key={d.nombre}
                fill={d.meses < umbral ? MAL : ACENTO}
              />
            ))}
            <LabelList
              dataKey="meses"
              position="right"
              fill="#E4E4E7"
              fontSize={11}
              formatter={(v) => (typeof v === "number" ? `${formatear(v)} m` : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Scorecards de la cohorte, uno al lado de otro
// -----------------------------------------------------------------------------

export interface RadarCompania {
  nombre: string;
  slug: string;
  score: number;
  dimensiones: Array<{ nombre: string; nivel: number; objetivo: number }>;
}

/**
 * Un radar por compañía, en paralelo.
 *
 * No van superpuestos en un solo radar: eso necesitaría un color por compañía
 * y la identidad no los tiene. En paralelo, además, se comparan formas, que es
 * lo que de verdad se quiere ver.
 */
export function RadaresCohorte({ companias }: { companias: RadarCompania[] }) {
  if (companias.length === 0) return null;

  return (
    <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
      {companias.map((c) => (
        <figure key={c.slug} className="m-0">
          <figcaption className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-titular">
              {c.nombre}
            </span>
            <span className="cifra text-sm text-acento-texto">
              {formatear(c.score)}
            </span>
          </figcaption>

          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={c.dimensiones} outerRadius="70%">
                <PolarGrid stroke={FILETE} />
                <PolarAngleAxis
                  dataKey="nombre"
                  tick={{ fill: NEUTRO, fontSize: 9 }}
                />
                <PolarRadiusAxis domain={[0, 4]} tick={false} axisLine={false} />
                <Radar
                  dataKey="nivel"
                  stroke={ACENTO}
                  strokeWidth={2}
                  fill={ACENTO}
                  fillOpacity={0.18}
                  isAnimationActive={false}
                />
                <Radar
                  dataKey="objetivo"
                  stroke={NEUTRO}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="none"
                  isAnimationActive={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as {
                      nombre: string;
                      nivel: number;
                      objetivo: number;
                    };
                    return (
                      <Caja>
                        <p className="text-titular">{d.nombre}</p>
                        <p className="cifra mt-1 text-secundario">
                          Nivel {d.nivel} · objetivo {d.objetivo}
                        </p>
                      </Caja>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hallazgos abiertos por severidad
// -----------------------------------------------------------------------------

export interface FilaSeveridad {
  severidad: string;
  nombre: string;
  cuenta: number;
  critica: boolean;
}

export function HallazgosPorSeveridad({ filas }: { filas: FilaSeveridad[] }) {
  const total = filas.reduce((acc, f) => acc + f.cuenta, 0);

  if (total === 0) {
    return (
      <p className="px-4 py-6 text-sm text-secundario">
        Ningún hallazgo abierto en toda la cohorte.
      </p>
    );
  }

  return (
    <div className="h-[200px] w-full px-4 py-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="nombre"
            tick={{ fill: "#E4E4E7", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: FILETE }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: NEUTRO, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as FilaSeveridad;
              return (
                <Caja>
                  <p className="text-titular">{d.nombre}</p>
                  <p className="cifra mt-1 text-secundario">
                    {d.cuenta} {d.cuenta === 1 ? "hallazgo" : "hallazgos"}
                  </p>
                  {d.critica && d.cuenta > 0 ? (
                    <p className="mt-1 text-mal">Bloquea el estado invertible</p>
                  ) : null}
                </Caja>
              );
            }}
          />
          <Bar dataKey="cuenta" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {filas.map((f) => (
              <Cell
                key={f.severidad}
                fill={f.critica ? MAL : f.cuenta === 0 ? ACENTO_APAGADO : ACENTO}
              />
            ))}
            <LabelList
              dataKey="cuenta"
              position="top"
              fill="#E4E4E7"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatear(valor: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(valor);
}
