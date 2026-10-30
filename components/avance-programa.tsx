import type { AvanceDelPrograma } from "@/lib/datos/avance";
import { NodoEstado } from "@/components/ui/estado";
import type { EstadoVisual } from "@/lib/estados";
import { fecha, numero } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Por dónde va el proyecto, de un vistazo.
 *
 * Lo primero que se ve al abrir una compañía, y antes no existía: la fase
 * estaba en letra pequeña en la cabecera y no decía ni cuántas hay, ni cuál
 * viene después, ni cuánto queda.
 *
 * Tres respuestas, de más general a más concreta: en qué fase del programa
 * está, cuántos hitos lleva cumplidos, y cuánto tiempo del Anexo ha
 * consumido.
 *
 * Habla el mismo idioma que todo lo demás: lo recorrido en verde, lo de
 * ahora en azul, lo que falta en gris. Antes tenía su propia escala
 * —magenta, magenta apagado, filete— que no significaba nada en ninguna
 * otra pantalla. Y ya no lleva números de fase ni la frase «va por X, y
 * después le toca Y»: lo dice la propia línea.
 */

/** Cuántos días antes del final el plazo pasa a pedir atención */
const AVISO_DIAS = 30;

const ESTADO_FASE: Record<
  AvanceDelPrograma["fases"][number]["estado"],
  EstadoVisual
> = {
  recorrida: "hecho",
  actual: "curso",
  pendiente: "pendiente",
};

export function AvanceDelProgramaVista({
  avance,
}: {
  avance: AvanceDelPrograma;
}) {
  const { fases, hitos, tiempo } = avance;

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      {/* Las cuatro fases, como un recorrido y no como cuatro etiquetas */}
      <ol className="flex flex-wrap items-stretch gap-x-2 gap-y-3">
        {fases.map((f) => {
          const estado = ESTADO_FASE[f.estado];
          return (
            <li
              key={f.codigo}
              className={cn(
                "group relative flex min-w-36 flex-1 flex-col gap-1.5",
                `es-${estado}`,
              )}
            >
              <span
                aria-hidden="true"
                className="h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    f.estado === "pendiente"
                      ? "var(--color-filete)"
                      : "var(--estado-solido)",
                }}
              />
              <span className="flex items-center gap-1.5">
                <NodoEstado valor={estado} titulo={f.nombre} />
                <span
                  className={cn(
                    "text-xs leading-snug",
                    f.estado === "actual"
                      ? "font-semibold text-titular"
                      : "text-metadato",
                  )}
                >
                  {f.nombre}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 sm:grid-cols-2">
        <Barra
          etiqueta="Hitos del Anexo"
          pct={hitos.pct}
          hecho={`${hitos.cumplidos} de ${hitos.total}`}
          falta={
            hitos.total === 0
              ? "Sin hitos acordados todavía"
              : hitos.total - hitos.cumplidos === 0
                ? "Todos cumplidos"
                : `Quedan ${hitos.total - hitos.cumplidos}`
          }
        />

        <Barra
          etiqueta="Tiempo del programa"
          pct={tiempo?.pct ?? null}
          hecho={
            tiempo?.mesesIdos !== null && tiempo?.mesesIdos !== undefined
              ? `${numero(tiempo.mesesIdos)} ${tiempo.mesesIdos === 1 ? "mes" : "meses"}`
              : "—"
          }
          falta={
            tiempo
              ? `Hasta ${fecha(tiempo.fin)}`
              : "Sin Anexo firmado con fechas"
          }
          estado={tiempo ? estadoDelPlazo(tiempo.fin) : "pendiente"}
        />
      </div>
    </div>
  );
}

/**
 * Qué dice el calendario sobre el final del programa.
 *
 * Treinta días y no siete, que es el aviso del resto de la plataforma: un
 * programa de doce meses no se endereza en una semana, y avisar con siete
 * días es avisar cuando ya no hay nada que hacer.
 */
function estadoDelPlazo(fin: string): EstadoVisual {
  const hoy = new Date().toISOString().slice(0, 10);
  if (fin < hoy) return "vencido";

  const aviso = new Date(`${hoy}T00:00:00Z`);
  aviso.setUTCDate(aviso.getUTCDate() + AVISO_DIAS);
  return fin <= aviso.toISOString().slice(0, 10) ? "atencion" : "curso";
}

function Barra({
  etiqueta,
  pct,
  hecho,
  falta,
  estado,
}: {
  etiqueta: string;
  pct: number | null;
  hecho: string;
  falta: string;
  /** Cuando la barra tiene estado. Sin él va en el gris de los datos */
  estado?: EstadoVisual;
}) {
  /* En curso no se tiñe: una barra azul al lado de una verde sugiere que
     pasa algo, y no pasa nada. Solo ámbar y rojo cambian el color */
  const tenido = estado === "atencion" || estado === "vencido";

  return (
    <div className={cn("flex flex-col gap-1.5", estado && `es-${estado}`)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-metadato">{etiqueta}</span>
        <span
          className={cn(
            "cifra text-sm",
            tenido ? "texto-estado" : "text-titular",
          )}
        >
          {hecho}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-hundido ring-1 ring-filete">
        {pct === null ? null : (
          <div
            className={cn(
              "h-full rounded-full",
              tenido ? "relleno-estado" : "bg-dato",
            )}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        )}
      </div>

      <span className="text-xs text-metadato">{falta}</span>
    </div>
  );
}
