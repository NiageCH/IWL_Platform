import type { ResumenCompania } from "@/lib/datos/compania";
import { leerUmbralesPublicos } from "@/lib/datos/compania";
import { leerTransformacion } from "@/lib/datos/madurez";
import { EXPLICACION_EJE, type EjeMadurez } from "@/lib/scoring/madurez";
import { RadarMadurez } from "@/components/radar-madurez";
import { CongelarLineaBase } from "@/components/formularios/linea-base";
import {
  Bloque,
  Cifra,
  Metadato,
  TituloBloque,
} from "@/components/ui/primitivas";
import { clienteServidor } from "@/lib/supabase/servidor";
import { fecha, numero } from "@/lib/utils";

/**
 * Madurez y transformación.
 *
 * La pregunta que contesta es «¿está este proyecto más maduro que cuando
 * entró?». El índice de hoy no basta para responderla: hace falta el mismo
 * índice calculado sobre el estado congelado del primer día, y por eso esta
 * pantalla depende de la línea base y lo dice cuando no la hay.
 */
export async function VistaMadurez({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const umbrales = await leerUmbralesPublicos();
  const transformacion = await leerTransformacion(resumen, umbrales.runwayMinimoMeses);
  const { hoy, inicio, lineaBaseFecha, deltas } = transformacion;

  const supabase = await clienteServidor();
  const { count } = await supabase
    .from("baselines")
    .select("id", { count: "exact", head: true })
    .eq("company_id", resumen.compania.id);

  const delta =
    hoy.valor !== null && inicio?.valor != null ? hoy.valor - inicio.valor : null;

  return (
    <Bloque>
      <TituloBloque
        accion={
          <Metadato>
            {hoy.cobertura === 100
              ? "Cinco ejes medidos"
              : `${hoy.cobertura} % del peso medido`}
          </Metadato>
        }
      >
        Madurez y transformación
      </TituloBloque>

      <div className="grid gap-6 border-b border-filete px-4 py-4 sm:grid-cols-3">
        <Cifra
          destacada
          valor={hoy.valor === null ? "—" : numero(hoy.valor, 1)}
          etiqueta="Madurez hoy"
          nota={
            hoy.valor === null
              ? "Sin ningún eje con datos"
              : `Sobre 100, con los ${5 - hoy.sinMedir.length} ejes medidos`
          }
        />
        <Cifra
          valor={inicio?.valor == null ? "—" : numero(inicio.valor, 1)}
          etiqueta="Al empezar"
          nota={
            lineaBaseFecha
              ? `Línea base del ${fecha(lineaBaseFecha)}`
              : "Sin línea base congelada"
          }
        />
        <Cifra
          valor={delta === null ? "—" : `${delta >= 0 ? "+" : ""}${numero(delta, 1)}`}
          etiqueta="Transformación"
          nota={
            delta === null
              ? "Hace falta una línea base para medirla"
              : delta >= 0
                ? "Puntos ganados desde el inicio"
                : "Puntos perdidos desde el inicio"
          }
        />
      </div>

      <RadarMadurez
        ejes={deltas.map((d) => ({
          nombre: d.nombre,
          hoy: d.hoy,
          inicio: d.inicio,
        }))}
        conLineaBase={inicio !== null}
      />

      <ul className="divide-y divide-filete border-t border-filete">
        {hoy.ejes.map((eje) => {
          const partida = deltas.find((d) => d.eje === eje.eje)?.inicio ?? null;
          const salto =
            eje.valor !== null && partida !== null ? eje.valor - partida : null;

          return (
            <li key={eje.eje} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
              <span className="w-28 text-sm text-titular">{eje.nombre}</span>
              <span className="cifra w-12 text-right text-sm text-titular">
                {eje.valor === null ? "—" : numero(eje.valor, 0)}
              </span>
              <span className="cifra w-16 text-right text-xs text-acento-texto">
                {salto === null
                  ? ""
                  : `${salto >= 0 ? "↑" : "↓"} ${numero(Math.abs(salto), 0)}`}
              </span>
              <span className="min-w-0 flex-1 text-xs text-secundario">
                {eje.motivo}
              </span>
              <Metadato>peso {eje.peso}</Metadato>
            </li>
          );
        })}
      </ul>

      {hoy.sinMedir.length > 0 ? (
        <p className="border-t border-filete px-4 py-2.5 text-xs text-metadato">
          Sin medir: {hoy.sinMedir.join(", ")}. No cuentan como cero: el índice
          se reparte sobre los ejes que sí tienen datos, igual que el score
          técnico. Un eje sin evaluar no es un eje malo.
        </p>
      ) : null}

      {!lineaBaseFecha ? (
        <div className="border-t border-filete px-4 py-3">
          <p className="text-xs text-secundario">
            Sin línea base congelada no hay transformación que medir, solo un
            estado de hoy. Se congela al firmar el Anexo, cuando el diagnóstico
            ya ha dicho de dónde se parte.
          </p>
          {resumen.permisos.esIwl ? (
            <div className="mt-2">
              <CongelarLineaBase slug={resumen.compania.slug} tieneInicial={false} />
            </div>
          ) : null}
        </div>
      ) : resumen.permisos.esIwl ? (
        <div className="border-t border-filete px-4 py-3">
          <CongelarLineaBase
            slug={resumen.compania.slug}
            tieneInicial
          />
          <p className="mt-2 text-xs text-metadato">
            {count === 1
              ? "Una línea base congelada"
              : `${count ?? 0} líneas base congeladas`}
            . La comparación se hace siempre contra la inicial.
          </p>
        </div>
      ) : null}
    </Bloque>
  );
}

/** Ayuda de cada eje, para el panel de configuración */
export function explicacion(eje: EjeMadurez): string {
  return EXPLICACION_EJE[eje];
}
