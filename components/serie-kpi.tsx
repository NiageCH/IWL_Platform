"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Evolución de un KPI en el tiempo.
 *
 * Una sola serie: el título del bloque la nombra, así que no lleva caja de
 * leyenda. Si hay objetivo del Anexo se dibuja como referencia discontinua en
 * gris, que se distingue del dato por el trazo y no solo por el color.
 */

const ACENTO = "#D6005F";
const NEUTRO = "#71717A";
const FILETE = "#E4E4E7";

interface Punto {
  periodo: string;
  valor: number | null;
  objetivo: number | null;
}

export function SerieKpi({
  puntos,
  unidad,
  nombre,
}: {
  puntos: Punto[];
  unidad: string;
  nombre: string;
}) {
  const hayObjetivo = puntos.some((p) => p.objetivo !== null);

  const datos = puntos.map((p) => ({
    mes: p.periodo.slice(0, 7),
    valor: p.valor,
    objetivo: p.objetivo,
  }));

  return (
    <figure className="m-0">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={FILETE} vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fill: NEUTRO, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: FILETE }}
            />
            <YAxis
              tick={{ fill: NEUTRO, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => compacto(v, unidad)}
            />
            <Tooltip
              cursor={{ stroke: NEUTRO, strokeWidth: 1 }}
              content={<Etiqueta unidad={unidad} nombre={nombre} />}
            />
            {hayObjetivo ? (
              <Line
                type="monotone"
                dataKey="objetivo"
                stroke={NEUTRO}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="valor"
              stroke={ACENTO}
              strokeWidth={2}
              dot={{ r: 3, fill: ACENTO, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: ACENTO, stroke: "#FFFFFF", strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {hayObjetivo ? (
        <figcaption className="mt-2 flex items-center gap-2 text-xs text-secundario">
          <svg width="22" height="8" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="22"
              y2="4"
              stroke={NEUTRO}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          Objetivo del Anexo
        </figcaption>
      ) : null}
    </figure>
  );
}

interface EtiquetaProps {
  active?: boolean;
  label?: string;
  unidad: string;
  nombre: string;
  payload?: Array<{ dataKey: string; value: number | null }>;
}

function Etiqueta({ active, label, payload, unidad, nombre }: EtiquetaProps) {
  if (!active || !payload?.length) return null;

  const valor = payload.find((p) => p.dataKey === "valor")?.value ?? null;
  const objetivo = payload.find((p) => p.dataKey === "objetivo")?.value ?? null;

  return (
    <div className="border border-filete bg-papel px-3 py-2 text-xs shadow-sm">
      <p className="cifra text-metadato">{label}</p>
      <p className="mt-1 text-titular">
        {nombre}: <span className="cifra">{formatear(valor, unidad)}</span>
      </p>
      {objetivo !== null ? (
        <p className="text-secundario">
          Objetivo: <span className="cifra">{formatear(objetivo, unidad)}</span>
        </p>
      ) : null}
    </div>
  );
}

function formatear(valor: number | null, unidad: string): string {
  if (valor === null) return "—";
  if (unidad === "moneda") {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(valor);
  }
  if (unidad === "porcentaje") return `${new Intl.NumberFormat("es-ES").format(valor)} %`;
  return new Intl.NumberFormat("es-ES").format(valor);
}

/**
 * Eje corto: 12.400 euros se lee mejor como 12,4 k. Con un decimal, no
 * redondeado a miles: un tick de 10.800 etiquetado «11 k» dice algo que no es.
 */
function compacto(valor: number, unidad: string): string {
  if (unidad === "moneda" && Math.abs(valor) >= 1000) {
    const miles = new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 1,
    }).format(valor / 1000);
    return `${miles} k`;
  }
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(valor);
}
