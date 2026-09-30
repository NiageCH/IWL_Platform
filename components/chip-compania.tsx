import { cn } from "@/lib/utils";

/**
 * El distintivo de una compañía: su logo, o sus iniciales si no lo tiene.
 *
 * Vive en un solo sitio porque aparece en la cartera, en los siguientes
 * pasos, en los scorecards y en la comparativa, y porque así el día que una
 * compañía sube su logo cambia en todas a la vez.
 *
 * El tono de las iniciales es decorativo: va por la longitud del nombre, no
 * informa de nada, y el nombre está siempre al lado. Nadie depende del color
 * para saber de quién se trata.
 */

const TONOS = [
  "[--tono:var(--color-acento-texto)]",
  "[--tono:var(--color-cielo)]",
  "[--tono:var(--color-lila)]",
  "[--tono:var(--color-menta)]",
  "[--tono:var(--color-durazno)]",
] as const;

export function tonoDe(nombre: string) {
  return TONOS[nombre.length % TONOS.length];
}

export function inicialesDe(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function ChipCompania({
  nombre,
  logo,
  tamano = "sm",
  className,
}: {
  nombre: string;
  /** Dirección pública del logo, si la compañía tiene uno */
  logo?: string | null;
  tamano?: "sm" | "md";
  className?: string;
}) {
  const medida = tamano === "md" ? "size-11" : "size-8";

  if (logo) {
    return (
      /*
        Se usa `<img>` y no `next/image`: la dirección la sirve Storage con
        una firma que caduca, así que no se puede optimizar en construcción
        ni se gana nada cacheándola.
      */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className={cn(
          medida,
          "shrink-0 rounded-[0.625rem] border border-filete bg-papel object-contain",
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "chip-icono text-xs font-bold",
        medida,
        tamano === "sm" && "rounded-[0.625rem]",
        tonoDe(nombre),
        className,
      )}
    >
      {inicialesDe(nombre)}
    </span>
  );
}
