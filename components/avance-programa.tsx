import { Check } from "lucide-react";
import type { AvanceDelPrograma } from "@/lib/datos/avance";
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
 * consumido. Las tres con lo recorrido a la izquierda y lo que falta a la
 * derecha, que es como se lee un avance.
 *
 * El color no es la única señal en ninguna: la fase recorrida lleva su
 * marca de verificado, la actual su rótulo en negrita, y las barras llevan
 * su cifra escrita al lado.
 */
export function AvanceDelProgramaVista({
  avance,
}: {
  avance: AvanceDelPrograma;
}) {
  const { fases, faseActual, hitos, tiempo } = avance;

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      {/* Las cuatro fases, como un recorrido y no como cuatro etiquetas */}
      <ol className="flex flex-wrap items-stretch gap-1">
        {fases.map((f, i) => (
          <li
            key={f.codigo}
            className="flex min-w-[9rem] flex-1 flex-col gap-1.5"
          >
            <span
              className={cn(
                "h-1.5 rounded-full",
                f.estado === "recorrida" && "bg-acento-apagado",
                f.estado === "actual" && "bg-acento",
                f.estado === "pendiente" && "bg-filete",
              )}
            />
            <span className="flex items-baseline gap-1.5">
              <span className="cifra text-[0.65rem] text-metadato">
                {String(i + 1).padStart(2, "0")}
              </span>
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
              {f.estado === "recorrida" ? (
                <Check
                  aria-hidden="true"
                  className="size-3 shrink-0 text-acento-texto"
                  strokeWidth={3}
                />
              ) : null}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-sm text-secundario">
        {faseActual ? (
          <>
            Va por <strong className="text-titular">{faseActual.nombre}</strong>
            {faseActual.orden < fases.length - 1 ? (
              <>
                , y después le toca{" "}
                {fases[faseActual.orden + 1]?.nombre.toLowerCase()}.
              </>
            ) : (
              ", que es la última."
            )}
          </>
        ) : (
          "Todavía no tiene fase asignada en el programa."
        )}
      </p>

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
          /* Pasarse de plazo es justo lo que hay que ver, así que no se
             recorta la barra: se tiñe */
          excedido={(tiempo?.pct ?? 0) > 100}
        />
      </div>
    </div>
  );
}

function Barra({
  etiqueta,
  pct,
  hecho,
  falta,
  excedido = false,
}: {
  etiqueta: string;
  pct: number | null;
  hecho: string;
  falta: string;
  excedido?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-metadato">{etiqueta}</span>
        <span
          className={cn(
            "cifra text-sm",
            excedido ? "es-vencido texto-estado" : "text-titular",
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
              excedido ? "es-vencido relleno-estado" : "bg-acento",
            )}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        )}
      </div>

      <span className="text-xs text-metadato">{falta}</span>
    </div>
  );
}
