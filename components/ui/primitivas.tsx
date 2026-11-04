import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Ayuda } from "@/components/ui/ayuda";
import { Estado } from "@/components/ui/estado";
import { ROTULO_OBJETIVO, estadoVisual, type EstadoVisual } from "@/lib/estados";
import { cn } from "@/lib/utils";

/**
 * Primitivas de interfaz de IWL (§8).
 *
 * Papel blanco, texto en zinc, filetes finos. El acento magenta aparece solo
 * en filetes y elementos gráficos, nunca como fondo de un bloque de texto.
 * Sobria y densa en información.
 */

export function Filete({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-filete", className)} />;
}

export function Bloque({
  children,
  className,
  elevacion = 1,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** 2 para lo que tiene que destacar sobre el resto de la pantalla */
  elevacion?: 1 | 2;
  /** Para poder enlazar a un bloque concreto desde un resumen de arriba */
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        elevacion === 2 ? "elevacion-2" : "elevacion-1",
        "rounded-lg",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function TituloBloque({
  children,
  accion,
}: {
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <header className="titulo-bloque flex items-baseline justify-between gap-4 px-4 py-3">
      <h2 className="text-sm font-semibold tracking-tight text-titular">
        {children}
      </h2>
      {accion}
    </header>
  );
}

/**
 * La etiqueta pequeña que acompaña a un dato.
 *
 * Era monoespaciada, en mayúsculas y con la letra separada. Es el rasgo que
 * más delataba a la interfaz: puesto encima de cada cifra y en cada esquina
 * de bloque, convertía la pantalla entera en un panel técnico de los de
 * plantilla. Ahora es texto normal, que es lo que hacen los paneles que se
 * leen bien.
 *
 * El monoespaciado se queda donde sirve para algo: en las cifras, que se
 * alinean en columna.
 */
export function Metadato({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium text-metadato">{children}</span>
  );
}

/**
 * Los tonos que puede llevar el icono de una cifra.
 *
 * Fueron ocho: cuatro decorativos —cielo, lila, menta, durazno— y tres de
 * estado. Los decorativos se retiraron el 30 de octubre, por decisión de
 * Rodrigo: con los cinco estados en pantalla, un color que no significa
 * nada compite con el que sí.
 *
 * Quedan el acento, que es marca, y los tres de alerta, que acompañan a
 * una cifra que ya lleva su rótulo escrito.
 */
const TONOS_ICONO = {
  acento: "[--tono:var(--color-acento-texto)]",
  bien: "[--tono:var(--estado-hecho)]",
  aviso: "[--tono:var(--estado-atencion)]",
  mal: "[--tono:var(--estado-vencido)]",
} as const;

export type TonoIcono = keyof typeof TONOS_ICONO;

/**
 * La escala de tamaños de una cifra. Dos, y las mismas en todas partes.
 *
 * Había tres sin querer: la cifra normal a 2 rem, la destacada a 2,5 y los
 * titulares de tarjeta con su propia tipografía. En pantallas distintas, la
 * misma clase de dato salía de tamaños distintos —«75 %» del Recorrido no
 * medía lo mismo que «Preparación de ronda» al lado—, y eso hace que una
 * parezca más importante que la otra sin que nadie lo haya decidido.
 */
const ESCALA = {
  normal: "text-[2rem]",
  protagonista: "text-[2.5rem] font-semibold",
} as const;

export function Cifra({
  valor,
  etiqueta,
  nota,
  destacada = false,
  icono: Icono,
  tono = "acento",
  estado,
  ayuda,
  href,
}: {
  valor: ReactNode;
  etiqueta: string;
  nota?: ReactNode;
  /**
   * La cifra que manda en la pantalla.
   *
   * Iba en magenta. Un score es un dato y el magenta no pinta datos, así
   * que ahora manda por tamaño y por peso, que es como manda una cifra en
   * una pantalla que ya tiene cinco colores con significado.
   */
  destacada?: boolean;
  /** Un icono de lucide. Acompaña a la etiqueta, no la sustituye */
  icono?: LucideIcon;
  tono?: TonoIcono;
  /**
   * Cómo va esta cifra frente a su objetivo.
   *
   * Solo cuando hay objetivo: una cifra suelta no está ni bien ni mal, y
   * pintarla de algo sería inventarse un juicio.
   */
  estado?: EstadoVisual;
  /**
   * Qué mide, contra qué se compara y qué significa la flecha.
   *
   * Tres líneas detrás de un `?`. «Técnico 94,2 ↑ 47,1» no dice nada a
   * quien no estuvo en la conversación donde se definió, y escribirlo
   * debajo es lo que llenó la pantalla de párrafos.
   */
  ayuda?: ReactNode;
  /** Dónde se ve el detalle de esta cifra. Lo que se cuenta, se pulsa */
  href?: string;
}) {
  const cuerpo = (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="flex items-center gap-1.5">
        <Metadato>{etiqueta}</Metadato>
        {ayuda ? <Ayuda titulo={etiqueta}>{ayuda}</Ayuda> : null}
      </span>
      {/*
        La cifra manda en la tarjeta y tiene que verse desde lejos. Antes era
        del tamaño de un titular pequeño y competía con su propia etiqueta.
      */}
      {href ? (
        <Link
          href={href}
          className={cn(
            "cifra enlace w-fit leading-none tracking-tight text-titular",
            destacada ? ESCALA.protagonista : ESCALA.normal,
          )}
        >
          {valor}
        </Link>
      ) : (
        <span
          className={cn(
            "cifra leading-none tracking-tight text-titular",
            destacada ? ESCALA.protagonista : ESCALA.normal,
          )}
        >
          {valor}
        </span>
      )}
      {estado ? (
        <span>
          {/* Las palabras de una cifra, no las del trabajo: una cifra no
              «vence», se queda lejos de su objetivo */}
          <Estado valor={estado} rotulo={ROTULO_OBJETIVO[estado]} />
        </span>
      ) : null}
      {nota ? <span className="text-xs text-secundario">{nota}</span> : null}
    </div>
  );

  if (!Icono) return cuerpo;

  /*
   * El icono arriba y separado, no pegado al texto: es el patrón de las
   * referencias y deja que la cifra empiece en el margen, alineada con la
   * etiqueta. Con el icono delante, número y rótulo quedaban sangrados y la
   * columna de cifras dejaba de leerse de un vistazo.
   */
  return (
    <div className="flex flex-col gap-3">
      <span
        aria-hidden="true"
        className={cn("chip-icono", TONOS_ICONO[tono])}
      >
        <Icono className="size-5" strokeWidth={2} />
      </span>
      {cuerpo}
    </div>
  );
}

/** Del semáforo de tres luces a los cinco estados, que son los mismos en
 *  toda la plataforma */
const SEMAFORO: Record<
  "verde" | "ambar" | "rojo",
  { estado: EstadoVisual; nombre: string }
> = {
  verde: { estado: "hecho", nombre: "En plazo" },
  ambar: { estado: "atencion", nombre: "Atención" },
  rojo: { estado: "vencido", nombre: "Bloqueado" },
};

/**
 * Semáforo de la compañía: el peor estado de lo que tiene abierto.
 *
 * Tenía su propia paleta de tres tonos —verde, ámbar, rojo— distinta de la
 * de los hitos y de la del due diligence. Ahora es una pastilla de estado
 * más, con el mismo color y el mismo icono que la cosa concreta que lo ha
 * puesto así: si está en rojo por un hito retrasado, el hito se ve del
 * mismo rojo.
 */
export function Semaforo({
  estado,
  motivo,
  href,
}: {
  estado: "verde" | "ambar" | "rojo";
  motivo: string;
  /** A dónde lleva el motivo: al hallazgo, al hito o a lo que lo cause */
  href?: string;
}) {
  const { estado: visual, nombre } = SEMAFORO[estado];

  /*
   * El motivo va siempre escrito al lado, también en la cabecera.
   *
   * Estaba solo en el `title` cuando el sitio era estrecho, y «Bloqueado»
   * a secas no dice nada: hay que saber **qué** bloquea para hacer algo.
   * Un motivo que solo aparece al pasar el ratón no existe en una pantalla
   * táctil, que es desde donde entra la mitad de la gente.
   */
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <Estado valor={visual} rotulo={nombre} />
      {href ? (
        <Link href={href} className="enlace text-secundario">
          {motivo}
        </Link>
      ) : (
        <span className="text-secundario">{motivo}</span>
      )}
    </span>
  );
}

const NOMBRE_SEVERIDAD = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
} as const;

/**
 * La severidad de un hallazgo, en el lenguaje de estados.
 *
 * Un crítico abierto es rojo, un alto es ámbar y un resuelto es verde: lo
 * mismo que un hito o un punto del checklist en esa situación. La palabra
 * sigue siendo la severidad, que dice más que «vencido»; lo que se unifica
 * es el color, que antes tenía su propia escala.
 */
export function Severidad({
  nivel,
  estado = "abierto",
}: {
  nivel: "critico" | "alto" | "medio" | "bajo";
  /** Resuelto o aceptado dejan de pintar de rojo, por muy crítico que fuera */
  estado?: string;
}) {
  const nombre =
    estado === "resuelto"
      ? "Resuelto"
      : estado === "aceptado"
        ? `${NOMBRE_SEVERIDAD[nivel]} · aceptado`
        : NOMBRE_SEVERIDAD[nivel];

  return (
    <Estado
      valor={estadoVisual("hallazgo", { severidad: nivel, estado })}
      rotulo={nombre}
    />
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="cifra inline-block rounded border border-filete bg-elevado px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-secundario">
      {children}
    </span>
  );
}

/** Estado vacío. Dice qué hacer, no que no hay nada */
export function SinDatos({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-sm text-secundario">{children}</p>;
}
