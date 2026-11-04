import type { AvanceDelPrograma } from "@/lib/datos/avance";
import { NodoEstado } from "@/components/ui/estado";
import { BarraProgreso } from "@/components/ui/barra-progreso";
import type { EstadoVisual } from "@/lib/estados";
import { fecha } from "@/lib/utils";
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
  base,
}: {
  avance: AvanceDelPrograma;
  /** `/proyecto` o `/cartera/<slug>`: las barras llevan a su pantalla */
  base: string;
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
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-metadato">Hitos del Anexo</span>
          <BarraProgreso
            etiqueta="Hitos del Anexo"
            hecho={hitos.cumplidos}
            total={hitos.total}
            estado={hitos.cumplidos === hitos.total ? "hecho" : "curso"}
            href={`${base}/ruta`}
          />
          <span className="text-xs text-metadato">
            {hitos.total === 0
              ? "Sin hitos acordados todavía"
              : hitos.total - hitos.cumplidos === 0
                ? "Todos cumplidos"
                : `Quedan ${hitos.total - hitos.cumplidos}`}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-metadato">Tiempo del programa</span>
          {tiempo && tiempo.meses ? (
            <BarraProgreso
              etiqueta="Tiempo del programa"
              hecho={tiempo.mesesIdos ?? 0}
              total={tiempo.meses}
              estado={estadoDelPlazo(tiempo.fin)}
              href={`${base}/programa`}
            />
          ) : (
            <p className="text-xs text-metadato">Sin Anexo firmado con fechas</p>
          )}
          <span className="text-xs text-metadato">
            {tiempo ? `Hasta ${fecha(tiempo.fin)}` : "Sin Anexo firmado con fechas"}
          </span>
        </div>
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
