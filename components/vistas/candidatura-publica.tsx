import type { ReactNode } from "react";
import { CheckCircle2, Clock, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lo que ve una candidata de su propia candidatura.
 *
 * El mismo componente para las dos puertas: el enlace privado, mientras no
 * tiene cuenta, y la sesión, desde que firma el NDA. Lo que cambia es cómo
 * se llega, no lo que se ve.
 *
 * Y se enseñan cuatro momentos, no los nueve pasos internos. «Comité» o
 * «due diligence» son jerga de dentro, y saber el punto exacto no le aporta
 * nada: invita a interpretar silencios. Cuatro estados honestos y una frase
 * que dice qué toca ahora.
 */

export type VistaCandidata = {
  id: string;
  nombre: string;
  momento: string;
  presentada_on: string | null;
  convocatoria: string | null;
  puede_subir: boolean;
  enlaces: { titulo: string; url: string }[];
  /** Si todavía le toca a ella presentarse */
  le_toca_a_ella?: boolean;
  sector?: string | null;
  one_liner?: string | null;
  website?: string | null;
  pais?: string | null;
  contacto_cargo?: string | null;
  contacto_telefono?: string | null;
  estado_declarado?: string | null;
  equipo_personas?: number | null;
  liderazgo_femenino_pct?: number | null;
};

/*
 * Cuando todavía le toca a ella.
 *
 * Una candidatura que dio de alta IWL —en un evento, por recomendación—
 * llega aquí sin que la startup haya contado nada. Darle las gracias por un
 * material que no ha mandado es una forma rara de empezar, y además no le
 * dice lo único que importa: que le toca.
 */
const LE_TOCA = {
  titulo: "Cuéntanos quiénes sois",
  cuerpo:
    "Te hemos dado de alta para que no tengas que empezar de cero, pero la parte importante la tienes que contar tú. Rellena lo de abajo y déjanos tu material: con eso valoramos la candidatura.",
  icono: Sparkles,
  tono: "[--tono:var(--color-acento-texto)]",
};

const MOMENTOS: Record<
  string,
  { titulo: string; cuerpo: string; icono: typeof Clock; tono: string }
> = {
  recibida: {
    titulo: "Recibida",
    cuerpo:
      "La tenemos. Ahora la leemos con calma y te escribimos; no hace falta que hagas nada mientras tanto. Si se te quedó algo por mandar, puedes añadirlo aquí abajo.",
    icono: CheckCircle2,
    tono: "[--tono:var(--color-cielo)]",
    },
  en_estudio: {
    titulo: "En estudio",
    cuerpo:
      "La estamos valorando. Puede que te escribamos para hablar con vosotros. Si tienes material nuevo, añádelo: cuanto mejor os conozcamos, mejor.",
    icono: Clock,
    tono: "[--tono:var(--color-durazno)]",
  },
  avanzando: {
    titulo: "Avanzando",
    cuerpo:
      "Seguimos adelante con vosotros. A partir de aquí el contacto es directo con la persona de IWL que lleva vuestro caso.",
    icono: Sparkles,
    tono: "[--tono:var(--color-menta)]",
  },
  dentro: {
    titulo: "Dentro del programa",
    cuerpo:
      "El acuerdo está firmado. A partir de ahora trabajáis desde vuestra propia ficha en la plataforma.",
    icono: CheckCircle2,
    tono: "[--tono:var(--color-bien)]",
  },
  cerrada: {
    titulo: "Proceso cerrado",
    cuerpo:
      "Esta vez no seguimos adelante. Si no hemos hablado contigo todavía, lo haremos: estas cosas se cuentan por teléfono, no por una pantalla.",
    icono: FileText,
    tono: "[--tono:var(--color-metadato)]",
  },
};

export function CandidaturaPublica({
  vista,
  ficha,
  children,
}: {
  vista: VistaCandidata;
  /** El formulario donde ella cuenta quién es */
  ficha?: ReactNode;
  /** El formulario para añadir material, si procede */
  children?: ReactNode;
}) {
  const abierta = vista.momento !== "cerrada" && vista.momento !== "dentro";
  const momento =
    vista.le_toca_a_ella && abierta
      ? LE_TOCA
      : (MOMENTOS[vista.momento] ?? MOMENTOS.recibida);
  const Icono = momento.icono;

  return (
    <>
      <div className="relative mb-8 pl-4">
        <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
        <h1 className="titular-marca text-3xl text-titular sm:text-4xl">
          {vista.nombre}
        </h1>
        <p className="mt-2 text-sm text-secundario">
          Candidatura a Inception Woman Lab
          {vista.convocatoria ? ` · ${vista.convocatoria}` : ""}
          {vista.presentada_on ? ` · presentada el ${vista.presentada_on}` : ""}
        </p>
      </div>

      <div className="tarjeta mb-6 p-6">
        <div className="flex items-start gap-4">
          <span className={cn("chip-icono", momento.tono)}>
            <Icono aria-hidden="true" className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-titular">
              {momento.titulo}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-secundario">
              {momento.cuerpo}
            </p>
          </div>
        </div>
      </div>

      {ficha}

      {/*
        El bloque de documentos no sale si no hay nada que enseñar ni nada
        que hacer.
        
        En una candidatura cerrada decía «todavía no nos has mandado ningún
        documento» —cierto, y ya da igual: el proceso terminó—. Una caja
        vacía con un reproche es lo último que tiene que leer.
      */}
      {vista.enlaces.length > 0 || vista.puede_subir ? (
      <div className="tarjeta mt-6 p-6">
        <h2 className="mb-1 text-base font-semibold text-titular">
          Lo que nos has mandado
        </h2>
        <p className="mb-4 text-sm text-secundario">
          {vista.enlaces.length === 0
            ? "Todavía no nos has mandado ningún documento."
            : "Esto es lo que tenemos. Si algo ha cambiado, añade la versión nueva."}
        </p>

        {vista.enlaces.length > 0 ? (
          <ul className="mb-4 divide-y divide-filete">
            {vista.enlaces.map((e) => (
              <li key={e.url} className="py-2">
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="enlace block truncate text-sm text-titular"
                >
                  {e.titulo}
                </a>
                <span className="block truncate text-xs text-metadato">
                  {e.url}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {vista.puede_subir ? children : null}
      </div>
      ) : null}
    </>
  );
}
