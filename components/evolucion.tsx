"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Metadato } from "@/components/ui/primitivas";

/**
 * Evolución de los dos scores desde la línea base (§4.4).
 *
 * Van en dos paneles y no en un gráfico con dos series. La identidad de IWL
 * tiene un solo color cromático, el acento, así que una segunda serie tendría
 * que ir en gris: esa pareja no separa lo suficiente para quien no distingue
 * el color. Dos paneles con el mismo eje resuelven la comparación sin pedir
 * prestado un color que no existe en la identidad.
 */

/*
 * Los colores salen de los tokens del tema, no de constantes.
 *
 * Un atributo de presentación de SVG acepta `var()`, así que el mismo gráfico
 * se lee sobre la consola oscura de IWL y sobre el papel de la vista de la
 * compañía sin saber en cuál está. Con hexadecimales fijos habría que
 * duplicar cada componente.
 */
const ACENTO = "var(--color-acento)";
const NEUTRO = "var(--color-metadato)";
const FILETE = "var(--color-filete)";
const MAL = "var(--color-mal)";
const SUPERFICIE = "var(--color-papel)";

export interface PuntoEvolucion {
  fecha: string;
  tecnico: number | null;
  preparacion: number | null;
  motivo: string;
}

export function Evolucion({ puntos }: { puntos: PuntoEvolucion[] }) {
  if (puntos.length < 2) {
    return (
      <p className="px-4 py-6 text-sm text-secundario">
        Con una sola medición no hay recorrido que enseñar. La segunda llega con
        la próxima evaluación técnica o al cierre del mes.
      </p>
    );
  }

  return (
    <div className="grid gap-6 px-4 py-4 md:grid-cols-2">
      <Panel
        titulo="Score técnico"
        clave="tecnico"
        puntos={puntos}
        nota="Contra el objetivo de la etapa"
      />
      <Panel
        titulo="Preparación"
        clave="preparacion"
        puntos={puntos}
        nota="Áreas de due diligence y la técnica"
      />
    </div>
  );
}

function Panel({
  titulo,
  clave,
  puntos,
  nota,
}: {
  titulo: string;
  clave: "tecnico" | "preparacion";
  puntos: PuntoEvolucion[];
  nota: string;
}) {
  const conValor = puntos.filter((p) => p[clave] !== null);
  const primero = conValor[0]?.[clave] ?? 0;
  const ultimo = conValor[conValor.length - 1]?.[clave] ?? 0;
  const delta = Math.round((ultimo - primero) * 10) / 10;

  const datos = puntos.map((p) => ({
    fecha: p.fecha.slice(0, 7),
    valor: p[clave],
    motivo: p.motivo,
  }));

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-titular">{titulo}</span>
        <span className="cifra text-sm text-secundario">
          {formatear(primero)} → <span className="text-titular">{formatear(ultimo)}</span>{" "}
          <span className={delta < 0 ? "text-mal" : "text-acento-texto"}>
            {delta === 0
              ? "sin cambio"
              : `${delta > 0 ? "↑" : "↓"} ${formatear(Math.abs(delta))}`}
          </span>
        </span>
      </figcaption>

      <div className="h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={FILETE} vertical={false} />
            <XAxis
              dataKey="fecha"
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
            {/* La línea base, para leer el recorrido de un vistazo */}
            <ReferenceLine
              y={primero}
              stroke={NEUTRO}
              strokeDasharray="4 3"
              strokeWidth={1}
            />
            <Tooltip cursor={{ stroke: NEUTRO, strokeWidth: 1 }} content={<Etiqueta />} />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={ACENTO}
              strokeWidth={2}
              fill={ACENTO}
              fillOpacity={0.1}
              dot={{ r: 3, fill: ACENTO, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: ACENTO, stroke: SUPERFICIE, strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-1 text-xs text-metadato">
        {nota} · la línea discontinua es la medición de partida
      </p>
    </figure>
  );
}

const MOTIVOS: Record<string, string> = {
  linea_base: "Medición de partida",
  evaluacion: "Evaluación técnica",
  mensual: "Cierre de mes",
  manual: "Medición puntual",
};

interface EtiquetaProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload: { valor: number | null; motivo: string } }>;
}

function Etiqueta({ active, label, payload }: EtiquetaProps) {
  if (!active || !payload?.length) return null;
  const punto = payload[0].payload;

  return (
    <div className="elevacion-2 rounded-md px-3 py-2 text-xs">
      <p className="cifra text-metadato">{label}</p>
      <p className="cifra mt-1 text-titular">{formatear(punto.valor)}</p>
      <p className="text-secundario">{MOTIVOS[punto.motivo] ?? punto.motivo}</p>
    </div>
  );
}

function formatear(valor: number | null): string {
  if (valor === null) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(valor);
}

/**
 * Recorrido en miniatura, para la fila de una compañía en la cartera.
 * Sin ejes ni etiquetas: solo la forma del recorrido, al lado de su cifra.
 */
export function Chispa({
  valores,
  className,
}: {
  valores: number[];
  className?: string;
}) {
  if (valores.length < 2) return null;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const ancho = 64;
  const alto = 18;

  const puntos = valores
    .map((v, i) => {
      const x = (i / (valores.length - 1)) * ancho;
      const y = alto - ((v - min) / rango) * (alto - 3) - 1.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const baja = valores[valores.length - 1] < valores[0];

  return (
    <svg
      width={ancho}
      height={alto}
      viewBox={`0 0 ${ancho} ${alto}`}
      className={className}
      role="img"
      aria-label={`Recorrido de ${formatear(valores[0])} a ${formatear(valores[valores.length - 1])}`}
    >
      <polyline
        points={puntos}
        fill="none"
        stroke={baja ? MAL : ACENTO}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lectura del movimiento en texto, para acompañar siempre a la cifra */
export function Movimiento({
  delta,
  sufijo = "desde el inicio",
}: {
  delta: number | null;
  sufijo?: string;
}) {
  if (delta === null) {
    return <Metadato>Sin recorrido todavía</Metadato>;
  }

  if (delta === 0) {
    return <Metadato>Sin cambio {sufijo}</Metadato>;
  }

  return (
    <span
      className={`cifra whitespace-nowrap text-xs ${delta > 0 ? "text-acento-texto" : "text-mal"}`}
    >
      {delta > 0 ? "↑" : "↓"} {formatear(Math.abs(delta))} {sufijo}
    </span>
  );
}
