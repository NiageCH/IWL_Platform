import type { ReactNode } from "react";
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
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-filete bg-papel", className)}>
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

export function Cifra({
  valor,
  etiqueta,
  nota,
}: {
  valor: ReactNode;
  etiqueta: string;
  nota?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Metadato>{etiqueta}</Metadato>
      <span className="cifra text-2xl leading-none text-titular">{valor}</span>
      {nota ? <span className="text-xs text-secundario">{nota}</span> : null}
    </div>
  );
}

const TONOS_SEMAFORO = {
  verde: "border-emerald-600 text-emerald-700",
  ambar: "border-amber-600 text-amber-700",
  rojo: "border-red-600 text-red-700",
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
  critico: "border-red-600 text-red-700",
  alto: "border-amber-600 text-amber-700",
  medio: "border-zinc-400 text-secundario",
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
        "cifra inline-block border px-1.5 py-0.5 text-[11px] uppercase tracking-wide",
        TONOS_SEVERIDAD[nivel],
      )}
    >
      {nombre}
    </span>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="cifra inline-block border border-filete px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-secundario">
      {children}
    </span>
  );
}

/** Estado vacío. Dice qué hacer, no que no hay nada */
export function SinDatos({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-sm text-secundario">{children}</p>;
}
