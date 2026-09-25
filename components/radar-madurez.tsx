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

/**
 * Madurez de hoy sobre la del día de partida.
 *
 * La figura de hoy va rellena en el acento; la línea base, en contorno
 * discontinuo gris. Es la misma gramática que el scorecard técnico —relleno
 * para lo que es, trazo para la referencia— y se distinguen sin depender del
 * color, que es lo que necesita quien no lo ve.
 *
 * El área entre las dos figuras es la transformación. Es lo que el programa
 * tiene que poder enseñar y lo que no cuenta ninguna cifra sola.
 */

const ACENTO = "var(--color-acento)";
const NEUTRO = "var(--color-metadato)";
const FILETE = "var(--color-filete)";

export interface PuntoMadurez {
  nombre: string;
  hoy: number | null;
  inicio: number | null;
}

export function RadarMadurez({
  ejes,
  conLineaBase,
}: {
  ejes: PuntoMadurez[];
  conLineaBase: boolean;
}) {
  /*
   * Un eje sin medir se dibuja en cero pero se marca en el tooltip.
   *
   * Recharts necesita un número para cerrar el polígono. Lo que no puede
   * pasar es que ese cero se lea como «mal»: por eso el tooltip dice «sin
   * medir» y la cifra de cabecera se calcula solo con los ejes medidos.
   */
  const datos = ejes.map((e) => ({
    nombre: e.nombre,
    hoy: e.hoy ?? 0,
    inicio: e.inicio ?? 0,
    hoyMedido: e.hoy !== null,
    inicioMedido: e.inicio !== null,
  }));

  if (datos.length < 3) return null;

  return (
    <figure className="m-0">
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={datos} outerRadius="72%">
            <PolarGrid stroke={FILETE} />
            <PolarAngleAxis dataKey="nombre" tick={{ fill: NEUTRO, fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />

            {conLineaBase ? (
              <Radar
                name="Al empezar"
                dataKey="inicio"
                stroke={NEUTRO}
                strokeWidth={2}
                strokeDasharray="4 3"
                fill="none"
                isAnimationActive={false}
              />
            ) : null}

            <Radar
              name="Hoy"
              dataKey="hoy"
              stroke={ACENTO}
              strokeWidth={2}
              fill={ACENTO}
              fillOpacity={0.14}
              isAnimationActive={false}
            />

            <Tooltip
              cursor={false}
              contentStyle={{
                background: "var(--color-elevado)",
                border: "1px solid var(--color-filete-fuerte)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-titular)" }}
              formatter={(valor, nombre, item) => {
                const fila = item?.payload as (typeof datos)[number] | undefined;
                const medido =
                  nombre === "Hoy" ? fila?.hoyMedido : fila?.inicioMedido;
                return [medido ? `${valor}` : "sin medir", String(nombre)];
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="px-4 pb-3 text-xs text-metadato">
        {conLineaBase
          ? "La figura rellena es hoy; el contorno discontinuo, el día que se congeló la línea base. Lo que hay entre las dos es lo que ha cambiado."
          : "Sin línea base congelada no hay con qué comparar: esta figura es solo el estado de hoy."}
      </figcaption>
    </figure>
  );
}
