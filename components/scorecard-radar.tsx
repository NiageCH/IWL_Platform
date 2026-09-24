"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ResultadoDimension } from "@/lib/scoring/tipos";

/**
 * Scorecard técnico (§4.4): las diez dimensiones, nivel actual frente al
 * objetivo de la etapa.
 *
 * El nivel actual es la serie de datos, en el acento de IWL. El objetivo es
 * una referencia, no una segunda serie: va como contorno discontinuo en gris.
 * La diferencia entre relleno y trazo discontinuo hace que las dos se
 * distingan sin depender del color, que es lo que necesita quien no lo ve.
 */

const NOMBRES_CORTOS: Record<string, string> = {
  arquitectura_producto: "Arquitectura",
  codigo_calidad: "Código",
  seguridad: "Seguridad",
  infraestructura_operacion: "Infraestructura",
  escalabilidad_rendimiento: "Escalabilidad",
  datos_privacidad: "Datos",
  ia_modelos: "IA",
  hardware: "Hardware",
  propiedad_intelectual_tecnica: "PI técnica",
  equipo_proceso: "Equipo",
};

const ACENTO = "#D6005F";
const NEUTRO = "#71717A";
const FILETE = "#E4E4E7";

interface Punto {
  dimension: string;
  nombre: string;
  nivel: number;
  objetivo: number;
  evaluada: boolean;
}

export function ScorecardRadar({
  dimensiones,
}: {
  dimensiones: ResultadoDimension[];
}) {
  // Las dimensiones que no aplican a esta compañía no se dibujan: un cero en
  // hardware para una compañía de software solo confunde la figura
  const datos: Punto[] = dimensiones
    .filter((d) => d.aplica)
    .map((d) => ({
      dimension: d.codigo,
      nombre: NOMBRES_CORTOS[d.codigo] ?? d.nombre,
      nivel: d.nivel ?? 0,
      objetivo: d.objetivo,
      evaluada: d.evaluada,
    }));

  if (datos.length < 3) {
    return (
      <p className="px-4 py-6 text-sm text-secundario">
        Hacen falta al menos tres dimensiones puntuadas para dibujar el scorecard.
      </p>
    );
  }

  return (
    <figure className="m-0">
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={datos} outerRadius="72%">
            <PolarGrid stroke={FILETE} />
            <PolarAngleAxis
              dataKey="nombre"
              tick={{ fill: NEUTRO, fontSize: 11 }}
            />
            {/*
              Los anillos de la rejilla ya marcan los cinco niveles y el
              tooltip da la cifra exacta, así que el eje radial va sin
              etiquetas: escritas encima del gráfico solo ensucian.
            */}
            <PolarRadiusAxis domain={[0, 4]} tickCount={5} tick={false} axisLine={false} />
            {/*
              El nivel va debajo, relleno; el objetivo encima, en contorno.
              Al revés, el relleno tapa la referencia justo donde importa:
              en las dimensiones que ya superan el objetivo.
            */}
            <Radar
              name="Nivel actual"
              dataKey="nivel"
              stroke={ACENTO}
              strokeWidth={2}
              fill={ACENTO}
              fillOpacity={0.12}
              isAnimationActive={false}
            />
            <Radar
              name="Objetivo de la etapa"
              dataKey="objetivo"
              stroke={NEUTRO}
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="none"
              isAnimationActive={false}
            />
            <Tooltip content={<Etiqueta />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <figcaption className="mt-2 flex flex-wrap items-center gap-6 border-t border-filete pt-3">
        <span className="flex items-center gap-2 text-xs text-secundario">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke={ACENTO} strokeWidth="2" />
          </svg>
          Nivel actual
        </span>
        <span className="flex items-center gap-2 text-xs text-secundario">
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
          Objetivo de la etapa
        </span>
        <span className="text-xs text-metadato">
          Escala de madurez de 0 a 4
        </span>
      </figcaption>
    </figure>
  );
}

interface EtiquetaProps {
  active?: boolean;
  payload?: Array<{ payload: Punto }>;
}

function Etiqueta({ active, payload }: EtiquetaProps) {
  if (!active || !payload?.length) return null;

  const punto = payload[0].payload;
  const brecha = Math.max(0, punto.objetivo - punto.nivel);

  return (
    <div className="border border-filete bg-papel px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-titular">{punto.nombre}</p>
      <p className="cifra mt-1 text-secundario">
        Nivel {punto.evaluada ? punto.nivel : "sin evaluar"} · objetivo{" "}
        {punto.objetivo}
      </p>
      <p className="mt-1 text-secundario">
        {brecha === 0
          ? "En objetivo para la etapa"
          : `Faltan ${brecha} ${brecha === 1 ? "nivel" : "niveles"}`}
      </p>
    </div>
  );
}
