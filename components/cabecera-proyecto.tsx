import {
  Cpu,
  FileSignature,
  FolderCheck,
  HandCoins,
  LayoutDashboard,
  NotebookPen,
  Route,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type { ResumenCompania } from "@/lib/datos/compania";
import { Metadato, Semaforo } from "@/components/ui/primitivas";
import { Movimiento } from "@/components/evolucion";
import type { NombreIcono } from "@/lib/secciones";
import { MenuAcciones } from "@/components/menu-acciones";
import { numero } from "@/lib/utils";
import { DistintivoDemo } from "@/components/ui/distintivo-demo";

/**
 * Cabecera fija de todas las pantallas del proyecto (§4.1): fase, semáforo,
 * score de preparación y score técnico.
 *
 * Los dos scores llevan siempre su lectura en texto, para que se entiendan sin
 * abrir el módulo: qué mide y contra qué.
 */



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
  const { compania, scoreTecnico, scorePreparacion, semaforo, permisos } =
    resumen;

  const secciones: {
    codigo: NombreIcono;
    nombre: string;
    href: string;
    Icono: typeof LayoutDashboard;
  }[] = [
    { codigo: "resumen", nombre: "Resumen", href: base, Icono: LayoutDashboard },
    { codigo: "ruta", nombre: "Hoja de ruta", href: `${base}/ruta`, Icono: Route },
    { codigo: "programa", nombre: "Programa y Anexo", href: `${base}/programa`, Icono: FileSignature },
    { codigo: "aportacion", nombre: "Aportación de IWL", href: `${base}/aportacion`, Icono: HandCoins },
    { codigo: "tecnico", nombre: "Due diligence técnico", href: `${base}/tecnico`, Icono: Cpu },
    { codigo: "diligencia", nombre: "Due diligence general", href: `${base}/diligencia`, Icono: FolderCheck },
    { codigo: "plan", nombre: "Business plan", href: `${base}/plan`, Icono: NotebookPen },
    { codigo: "kpi", nombre: "KPI y updates", href: `${base}/kpi`, Icono: TrendingUp },
  ];

  return (
    <header className="border-b border-filete bg-lienzo/60">
      <div className="mx-auto w-full max-w-6xl px-6 pt-5">
        {/*
          Una línea, y en este orden: nombre · fase · semáforo · los dos
          scores. A la derecha, un único menú de acciones.

          Llevaba nombre, sector, dos enlaces de administración,
          descripción, fase, etapa, perfil, semáforo y tres cifras con su
          nota, y se repetía en las ocho pantallas de la compañía: la
          cabecera pesaba más que el contenido que encabezaba.

          Lo que se ha ido no se ha perdido. La descripción, el sector, la
          etapa y el perfil bajan al Resumen, que es donde se leen una vez
          y no ocho. «Invertible» también: su respuesta larga —qué falta—
          ya vive ahí, en los siguientes pasos.
        */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="relative flex min-w-0 items-center gap-3 pl-3">
            <span className="filete-acento absolute inset-y-1 left-0 w-0.5 rounded-full" />
            <h1 className="titular-marca truncate text-lg text-titular">
              {compania.name}
            </h1>
            {compania.is_demo ? <DistintivoDemo compacto /> : null}
          </div>

          <Metadato>{compania.phases?.name ?? "Sin fase"}</Metadato>
          <Semaforo
            estado={semaforo.estado}
            motivo={semaforo.motivo}
            compacto
          />

          <span className="flex-1" />

          {/* Las dos cifras que se miran a diario, sin su nota larga */}
          <span className="flex items-baseline gap-5">
            <CifraCompacta
              etiqueta="Técnico"
              rotulo="Score técnico"
              valor={
                scoreTecnico.evaluadas === 0
                  ? "—"
                  : numero(scoreTecnico.valor, 1)
              }
              delta={movimiento?.deltaTecnico}
            />
            <CifraCompacta
              etiqueta="Preparación"
              rotulo="Score de preparación"
              valor={numero(scorePreparacion.valor, 1)}
              delta={movimiento?.deltaPreparacion}
            />
          </span>

          {permisos.esIwl ? (
            <MenuAcciones
              acciones={[
                {
                  texto: "Editar la ficha",
                  href: `/admin/companias?editar=${compania.slug}#${compania.slug}`,
                },
                {
                  texto: "Informe para inversor",
                  href: `/informe/tecnico-inversor/${compania.slug}`,
                },
                {
                  texto: "Informe mensual",
                  href: `/informe/mensual/${compania.slug}`,
                },
                {
                  texto: "Archivar o dar de baja",
                  href: `/admin/companias#${compania.slug}`,
                  riesgo: true,
                },
              ]}
            />
          ) : null}
        </div>

        <nav className="mt-6 flex flex-wrap gap-2">
          {secciones.map((s) => {
            const activa = s.codigo === seccionActiva;

            return (
              <Link
                key={s.codigo}
                href={s.href}
                aria-current={activa ? "page" : undefined}
                className={activa ? "pestana pestana-activa" : "pestana"}
              >
                {/* El icono acompaña al rótulo; el rótulo no se quita nunca */}
                <s.Icono
                  aria-hidden="true"
                  className="icono-seccion size-4 shrink-0"
                  strokeWidth={activa ? 2.5 : 2}
                />
                {s.nombre}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/**
 * Una cifra de cabecera, sin su párrafo.
 *
 * Las tres que había llevaban cada una dos líneas de nota explicando de
 * dónde salía. Está bien dicho y está bien que se diga —una vez, en el
 * Resumen—, no ocho veces encima de cada pantalla.
 */
function CifraCompacta({
  etiqueta,
  rotulo,
  valor,
  delta,
}: {
  etiqueta: string;
  /**
   * El nombre entero, para quien no ve la pantalla.
   *
   * En compacto la etiqueta se abrevia —«Técnico»— y suelta no dice nada:
   * un lector de pantalla leería «Técnico 94,2 flecha arriba 47,1». El
   * rótulo devuelve el contexto que la abreviatura quita.
   */
  rotulo: string;
  valor: string;
  delta?: number | null;
}) {
  return (
    <span aria-label={rotulo} className="flex items-baseline gap-1.5">
      <span aria-hidden="true" className="text-xs text-metadato">
        {etiqueta}
      </span>
      <span className="cifra text-base text-titular">{valor}</span>
      {/*
        El delta, sin su coletilla.
        
        «↑ 47,1 desde el inicio» ocupa media cabecera y repite ocho veces lo
        mismo. Aquí solo la flecha y la cifra; el «desde el inicio» se lee
        entero en el Resumen, con su línea base y su fecha.
      */}
      {delta !== undefined && delta !== null ? (
        <Movimiento delta={delta} sufijo="" />
      ) : null}
    </span>
  );
}
