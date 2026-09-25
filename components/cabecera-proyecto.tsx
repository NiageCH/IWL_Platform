import Link from "next/link";
import type { ResumenCompania } from "@/lib/datos/compania";
import { Cifra, Metadato, Semaforo } from "@/components/ui/primitivas";
import { Movimiento } from "@/components/evolucion";
import { numero } from "@/lib/utils";

/**
 * Cabecera fija de todas las pantallas del proyecto (§4.1): fase, semáforo,
 * score de preparación y score técnico.
 *
 * Los dos scores llevan siempre su lectura en texto, para que se entiendan sin
 * abrir el módulo: qué mide y contra qué.
 */

const ETAPAS: Record<string, string> = {
  pre_semilla: "Pre-semilla",
  semilla: "Semilla",
  serie_a: "Serie A",
};

const PERFILES: Record<string, string> = {
  software: "Software",
  software_ia: "Software con IA",
  hardware: "Hardware",
};

export function CabeceraProyecto({
  resumen,
  base,
  seccionActiva,
  movimiento,
}: {
  resumen: NonNullable<ResumenCompania>;
  /** Prefijo de las rutas: `/proyecto` para la fundadora, `/cartera/<slug>` para IWL */
  base: string;
  seccionActiva: string;
  /** Distancia desde la línea base. Sin él, la cifra solo cuenta el presente */
  movimiento?: { deltaTecnico: number | null; deltaPreparacion: number | null };
}) {
  const { compania, scoreTecnico, scorePreparacion, semaforo, invertible } = resumen;

  const secciones = [
    { codigo: "resumen", nombre: "Resumen", href: base },
    { codigo: "programa", nombre: "Programa e hitos", href: `${base}/programa` },
    { codigo: "aportacion", nombre: "Aportación de IWL", href: `${base}/aportacion` },
    { codigo: "tecnico", nombre: "Due diligence técnico", href: `${base}/tecnico` },
    { codigo: "diligencia", nombre: "Due diligence general", href: `${base}/diligencia` },
    { codigo: "plan", nombre: "Business plan", href: `${base}/plan` },
    { codigo: "kpi", nombre: "KPI y updates", href: `${base}/kpi` },
  ];

  return (
    <header className="border-b border-filete bg-lienzo/60">
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="relative pl-4">
            <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-lg font-semibold tracking-tight text-titular">
                {compania.name}
              </h1>
              <Metadato>{compania.sector ?? "Sin sector"}</Metadato>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-secundario">
              {compania.one_liner ?? "Sin descripción todavía."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Metadato>{compania.phases?.name ?? "Sin fase"}</Metadato>
              <Metadato>{ETAPAS[compania.stage] ?? compania.stage}</Metadato>
              <Metadato>{PERFILES[compania.tech_profile] ?? compania.tech_profile}</Metadato>
              <Semaforo estado={semaforo.estado} motivo={semaforo.motivo} />
            </div>
          </div>

          {/* En móvil las tres cifras se reparten en dos líneas antes que
              obligar a desplazar la página en horizontal */}
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <Cifra
              destacada
              etiqueta="Score técnico"
              /*
               * Sin ninguna dimensión evaluada no hay score que enseñar. Una
               * cifra ahí sería peor que un hueco: parecería una medición y
               * es la ausencia de una.
               */
              valor={
                scoreTecnico.evaluadas === 0 ? "—" : numero(scoreTecnico.valor, 1)
              }
              nota={
                <>
                  {movimiento?.deltaTecnico !== undefined &&
                  movimiento?.deltaTecnico !== null ? (
                    <span className="block">
                      <Movimiento delta={movimiento.deltaTecnico} />
                    </span>
                  ) : null}
                  <span className="block">
                    {scoreTecnico.evaluadas === 0
                      ? "Due diligence técnico pendiente"
                      : scoreTecnico.completo
                        ? `Sobre el objetivo de ${ETAPAS[compania.stage]?.toLowerCase()}`
                        : `${scoreTecnico.evaluadas} de ${scoreTecnico.aplicables} dimensiones evaluadas`}
                  </span>
                </>
              }
            />
            <Cifra
              etiqueta="Preparación"
              valor={numero(scorePreparacion.valor, 1)}
              nota={
                <>
                  {movimiento?.deltaPreparacion !== undefined &&
                  movimiento?.deltaPreparacion !== null ? (
                    <span className="block">
                      <Movimiento delta={movimiento.deltaPreparacion} />
                    </span>
                  ) : null}
                  <span className="block">
                    {scorePreparacion.areas.length} áreas y la técnica
                  </span>
                </>
              }
            />
            <Cifra
              etiqueta="Invertible"
              valor={invertible.invertible ? "Sí" : "No"}
              nota={
                invertible.invertible
                  ? "Cumple la definición del programa"
                  : invertible.siguientesPasos.length === 1
                    ? "Un paso por delante"
                    : `${invertible.siguientesPasos.length} pasos por delante`
              }
            />
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {secciones.map((s) => (
            <Link
              key={s.codigo}
              href={s.href}
              className={
                s.codigo === seccionActiva
                  ? "border-b-2 border-acento pb-2 text-sm font-medium text-titular [text-shadow:0_0_20px_color-mix(in_oklab,var(--color-acento)_35%,transparent)]"
                  : "border-b-2 border-transparent pb-2 text-sm text-secundario transition-colors hover:border-filete-fuerte hover:text-titular"
              }
            >
              {s.nombre}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
