import type { Database } from "@/lib/supabase/database.types";

export type EstadoCandidatura =
  Database["public"]["Enums"]["estado_candidatura"];

/**
 * Los pasos del embudo, en orden y con lo que significan.
 *
 * Vive aquí y no en cada pantalla porque el orden es el dato: sin él no hay
 * «cuántas van por delante de comité» ni se puede dibujar un embudo. Y la
 * descripción es lo que convierte una lista de palabras en un proceso que se
 * entiende sin que nadie lo explique.
 */
export const PASOS = [
  {
    codigo: "presentada",
    nombre: "Presentada",
    descripcion: "Ha rellenado el formulario. Nadie la ha mirado todavía.",
    siguiente: "Revisar lo que ha mandado",
  },
  {
    codigo: "en_revision",
    nombre: "En revisión",
    descripcion: "IWL está mirando su material para situarla.",
    siguiente: "Convocar la reunión",
  },
  {
    codigo: "reunion",
    nombre: "Reunión",
    descripcion: "Toca hablar con ella, o ya se ha hablado.",
    siguiente: "Llevarla a comité",
  },
  {
    codigo: "comite",
    nombre: "Comité",
    descripcion: "Va a comité con su informe.",
    siguiente: "Decidir si se preselecciona",
  },
  {
    codigo: "preseleccionada",
    nombre: "Preseleccionada",
    descripcion: "El comité ha dicho que sí.",
    siguiente: "Firmar el NDA",
  },
  {
    codigo: "nda",
    nombre: "NDA firmado",
    descripcion: "Se le puede pedir la información del due diligence.",
    siguiente: "Empezar el due diligence",
  },
  {
    codigo: "diligencia",
    nombre: "Due diligence",
    descripcion: "Se está mirando a fondo y fijando en qué estado entra.",
    siguiente: "Proponer el acuerdo",
  },
  {
    codigo: "acuerdo",
    nombre: "Acuerdo propuesto",
    descripcion: "Hay documento sobre la mesa, con aportación y equity.",
    siguiente: "Firmar",
  },
  {
    codigo: "firmada",
    nombre: "Firmada",
    descripcion: "Dentro del programa. Ya es una compañía de la cartera.",
    siguiente: null,
  },
  {
    codigo: "descartada",
    nombre: "Descartada",
    descripcion: "Fuera del proceso, con su motivo.",
    siguiente: null,
  },
] as const satisfies ReadonlyArray<{
  codigo: EstadoCandidatura;
  nombre: string;
  descripcion: string;
  siguiente: string | null;
}>;

/** Los que forman el recorrido, sin los dos finales */
export const PASOS_ABIERTOS = PASOS.filter(
  (p) => p.codigo !== "firmada" && p.codigo !== "descartada",
);

const POR_CODIGO = new Map(PASOS.map((p) => [p.codigo, p]));

export function paso(codigo: EstadoCandidatura) {
  return POR_CODIGO.get(codigo) ?? PASOS[0];
}

export function nombrePaso(codigo: EstadoCandidatura) {
  return paso(codigo).nombre;
}

/**
 * El siguiente paso natural.
 *
 * El embudo no es una máquina de estados cerrada: a veces una candidata
 * vuelve atrás porque falta información, o se salta la reunión porque ya se
 * conocía. Esto solo dice cuál es el camino de siempre, para que la pantalla
 * pueda ofrecerlo en un clic; mover a cualquier otro sitio sigue siendo
 * posible.
 */
export function siguientePaso(
  codigo: EstadoCandidatura,
): EstadoCandidatura | null {
  const i = PASOS_ABIERTOS.findIndex((p) => p.codigo === codigo);
  if (i === -1 || i === PASOS_ABIERTOS.length - 1) {
    return codigo === "acuerdo" ? "firmada" : null;
  }
  return PASOS_ABIERTOS[i + 1].codigo;
}

/**
 * El tono del paso, para su pastilla.
 *
 * Acompaña al nombre, nunca lo sustituye: la pastilla lleva su palabra
 * dentro, así que quien no distinga el tono lee lo mismo.
 */
export function tonoPaso(codigo: EstadoCandidatura): string {
  if (codigo === "firmada") return "[--tono:var(--color-bien)]";
  if (codigo === "descartada") return "[--tono:var(--color-metadato)]";
  if (codigo === "acuerdo" || codigo === "diligencia" || codigo === "nda") {
    return "[--tono:var(--color-acento-texto)]";
  }
  if (codigo === "preseleccionada") return "[--tono:var(--color-menta)]";
  if (codigo === "comite") return "[--tono:var(--color-durazno)]";
  return "[--tono:var(--color-cielo)]";
}
