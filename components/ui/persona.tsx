import { inicialesDe } from "@/components/chip-compania";
import { cn } from "@/lib/utils";

/**
 * La cara de una persona: su foto, o sus iniciales si no ha puesto ninguna.
 *
 * Va siempre con el nombre al lado, así que es decorativa —`aria-hidden`—:
 * quien no la vea no pierde nada. Redonda, para no confundirse con el chip
 * de una compañía, que es cuadrado.
 */
export function Avatar({
  nombre,
  foto,
  tamano = "sm",
  className,
}: {
  nombre: string;
  /** Dirección firmada de la foto, si la tiene */
  foto?: string | null;
  tamano?: "xs" | "sm" | "md";
  className?: string;
}) {
  const medida = { xs: "size-6 text-[0.625rem]", sm: "size-9 text-xs", md: "size-16 text-lg" }[tamano];

  if (foto) {
    return (
      // `<img>` y no `next/image`: la firma caduca, ver `ChipCompania`
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt=""
        aria-hidden="true"
        data-avatar="foto"
        className={cn(medida, "shrink-0 rounded-full border border-filete bg-elevado object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      data-avatar="iniciales"
      className={cn(
        medida,
        "flex shrink-0 items-center justify-center rounded-full bg-elevado font-bold text-acento-texto",
        className,
      )}
    >
      {inicialesDe(nombre)}
    </span>
  );
}

/**
 * El LinkedIn de una persona, como icono enlazado junto a su nombre.
 *
 * lucide ya no trae logotipos de marca, así que el dibujo va aquí. El
 * enlace lleva su nombre accesible: el icono solo no dice adónde va.
 */
export function EnlaceLinkedin({
  url,
  nombre,
  className,
}: {
  url?: string | null;
  nombre: string;
  className?: string;
}) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`LinkedIn de ${nombre}`}
      title={`LinkedIn de ${nombre}`}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-metadato transition-colors hover:text-acento-texto focus-visible:text-acento-texto",
        className,
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
      </svg>
    </a>
  );
}
