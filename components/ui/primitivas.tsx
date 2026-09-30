import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
}: {
  children: ReactNode;
  className?: string;
  /** 2 para lo que tiene que destacar sobre el resto de la pantalla */
  elevacion?: 1 | 2;
}) {
  return (
    <section
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
    <header className="flex items-baseline justify-between gap-4 border-b border-filete px-4 py-3">
      <h2 className="text-sm font-semibold tracking-tight text-titular">
        {children}
      </h2>
      {accion}
    </header>
  );
}

export function Metadato({ children }: { children: ReactNode }) {
  return (
    <span className="cifra text-xs uppercase tracking-wide text-metadato">
      {children}
    </span>
  );
}

/**
 * Los tonos que puede llevar el icono de una cifra.
 *
 * Clasifican, no informan: la etiqueta de la cifra dice siempre de qué se
 * trata, así que quien no distinga el tono lee exactamente lo mismo. Por eso
 * esto vale para un icono y no para una serie de un gráfico.
 */
const TONOS_ICONO = {
  acento: "[--tono:var(--color-acento-texto)]",
  cielo: "[--tono:var(--color-cielo)]",
  lila: "[--tono:var(--color-lila)]",
  menta: "[--tono:var(--color-menta)]",
  durazno: "[--tono:var(--color-durazno)]",
  bien: "[--tono:var(--color-bien)]",
  aviso: "[--tono:var(--color-aviso)]",
  mal: "[--tono:var(--color-mal)]",
} as const;

export type TonoIcono = keyof typeof TONOS_ICONO;

export function Cifra({
  valor,
  etiqueta,
  nota,
  destacada = false,
  icono: Icono,
  tono = "acento",
}: {
  valor: ReactNode;
  etiqueta: string;
  nota?: ReactNode;
  /** La cifra que manda en la pantalla, con el acento encendido */
  destacada?: boolean;
  /** Un icono de lucide. Acompaña a la etiqueta, no la sustituye */
  icono?: LucideIcon;
  tono?: TonoIcono;
}) {
  const cuerpo = (
    <div className="flex min-w-0 flex-col gap-1">
      <Metadato>{etiqueta}</Metadato>
      <span
        className={cn(
          "cifra text-2xl leading-none",
          destacada ? "brillo-acento text-acento-texto" : "text-titular",
        )}
      >
        {valor}
      </span>
      {nota ? <span className="text-xs text-secundario">{nota}</span> : null}
    </div>
  );

  if (!Icono) return cuerpo;

  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={cn("chip-icono mt-0.5", TONOS_ICONO[tono])}
      >
        <Icono className="size-4" strokeWidth={2} />
      </span>
      {cuerpo}
    </div>
  );
}

const TONOS_SEMAFORO = {
  verde: "border-bien text-bien",
  ambar: "border-aviso text-aviso",
  rojo: "border-mal text-mal",
} as const;

/**
 * Semáforo. Siempre con texto, nunca solo color (§8): quien no distingue el
 * color tiene que poder leer el estado.
 */
export function Semaforo({
  estado,
  motivo,
}: {
  estado: "verde" | "ambar" | "rojo";
  motivo: string;
}) {
  const nombre = { verde: "En curso", ambar: "Atención", rojo: "Bloqueo" }[estado];

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 border-l-2 pl-2 text-xs",
        TONOS_SEMAFORO[estado],
      )}
    >
      <span className="font-semibold uppercase tracking-wide">{nombre}</span>
      <span className="text-secundario">{motivo}</span>
    </span>
  );
}

const TONOS_SEVERIDAD = {
  critico: "border-mal bg-mal/10 text-mal",
  alto: "border-aviso bg-aviso/10 text-aviso",
  medio: "border-filete-fuerte text-secundario",
  bajo: "border-filete text-metadato",
} as const;

export function Severidad({
  nivel,
}: {
  nivel: "critico" | "alto" | "medio" | "bajo";
}) {
  const nombre = {
    critico: "Crítico",
    alto: "Alto",
    medio: "Medio",
    bajo: "Bajo",
  }[nivel];

  return (
    <span
      className={cn(
        "cifra inline-block rounded border px-1.5 py-0.5 text-[11px] uppercase tracking-wide",
        TONOS_SEVERIDAD[nivel],
      )}
    >
      {nombre}
    </span>
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
