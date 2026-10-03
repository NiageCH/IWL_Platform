import { z } from "zod";

/**
 * Resultado de una Server Action.
 *
 * Las acciones no lanzan excepciones por errores de validación ni por permisos:
 * devuelven un resultado que el formulario enseña al lado del campo. Una
 * excepción se reserva para lo que de verdad es un fallo.
 */
export type Resultado =
  | { ok: true; mensaje?: string }
  | { ok: false; error: string; campos?: Record<string, string> };

export function error(mensaje: string, campos?: Record<string, string>): Resultado {
  return { ok: false, error: mensaje, campos };
}

export function ok(mensaje?: string): Resultado {
  return { ok: true, mensaje };
}

/**
 * Cómo se llama cada campo cuando hay que nombrarlo en un mensaje.
 *
 * No están todos a propósito: las columnas van en inglés y un diccionario
 * de ciento y pico entradas no se mantiene. Están los del formulario
 * público, que es el que rellena gente de fuera y donde más caro sale un
 * mensaje que no se entiende.
 */
const ETIQUETAS: Record<string, string> = {
  one_liner: "en una frase, qué hacéis",
  contacto_nombre: "tu nombre",
  contacto_email: "tu correo",
  contacto_cargo: "tu cargo",
  contacto_telefono: "teléfono",
  equipo_personas: "cuántas personas sois",
  liderazgo_femenino_pct: "liderazgo femenino",
  estado_declarado: "en qué punto estáis",
  enlace_1: "enlace al pitch",
  enlace_2: "enlace al caso de negocio",
  enlace_3: "el enlace adicional",
  website: "la web",
  nombre: "el nombre",
  pais: "el país",
};

/**
 * Valida el formulario con un esquema de Zod y devuelve o los datos o un
 * resultado listo para enseñar.
 */
export function validar<T extends z.ZodTypeAny>(
  esquema: T,
  formData: FormData,
): { datos: z.infer<T>; fallo: null } | { datos: null; fallo: Resultado } {
  const bruto = Object.fromEntries(formData.entries());
  const resultado = esquema.safeParse(bruto);

  if (resultado.success) {
    return { datos: resultado.data, fallo: null };
  }

  const campos: Record<string, string> = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path.join(".");
    if (campo && !campos[campo]) campos[campo] = problema.message;
  }

  return { datos: null, fallo: error(mensajeDeCampos(campos), campos) };
}

/**
 * El mensaje de cabecera cuando la validación falla.
 *
 * Nombra los campos en vez de decir «los marcados». Un formulario puede
 * tener un campo cuyo error no se esté enseñando —pasó con el porcentaje
 * del formulario de candidatura— y entonces «revisa los campos marcados» no
 * marca ninguno y deja a la persona mirando la pantalla sin saber dónde.
 *
 * Solo los nombra si sabe decirlos todos en castellano: enseñar
 * `evidence_url` es peor que no decir nada, porque además suena a avería.
 */
export function mensajeDeCampos(campos: Record<string, string>): string {
  const nombres = Object.keys(campos);

  if (nombres.length === 0) return "Revisa lo que has escrito.";
  if (!nombres.every((c) => ETIQUETAS[c])) return "Revisa los campos marcados.";

  const lista = nombres.map((c) => ETIQUETAS[c]).join(", ");
  return nombres.length === 1
    ? `Revisa este campo: ${lista}.`
    : `Revisa estos campos: ${lista}.`;
}

/**
 * Traduce el error que devuelve Supabase a algo que se pueda leer.
 *
 * Un 42501 es una política o un trigger de la base diciendo que esta persona
 * no puede hacer eso. El mensaje del trigger ya está escrito para leerse, así
 * que se usa tal cual.
 */
export function traducirError(fallo: { code?: string; message: string }): Resultado {
  if (fallo.code === "42501") {
    return error(fallo.message);
  }
  if (fallo.code === "23505") {
    return error("Ya existe un registro para ese valor.");
  }
  if (fallo.code === "23514") {
    return error("Los datos no cumplen una condición de la base. Revisa lo introducido.");
  }
  return error(fallo.message);
}

/** Campo de texto obligatorio, ya recortado */
export const textoObligatorio = (min = 1, mensaje = "Escribe algo aquí.") =>
  z.string().trim().min(min, mensaje);

/**
 * Campo de texto opcional.
 *
 * Acepta las tres formas en que un formulario dice «aquí no hay nada»: la
 * clave ausente, la cadena vacía y null. Las tres dan null.
 *
 * Que acepte la clave ausente no es un detalle: un formulario que no incluye
 * el campo es lo normal (el estado de un punto se cambia desde una lista, sin
 * tocar la nota), y si el esquema lo exigiera, esa acción fallaría entera con
 * un «revisa los campos marcados» que no señala ningún campo.
 */
export const textoOpcional = z
  .union([z.string(), z.null()])
  // `.optional()` va antes del transform: es lo que marca la clave como
  // opcional dentro del objeto. Después del transform, Zod seguiría exigiendo
  // que la clave existiera.
  .optional()
  .transform((v) => {
    const recortado = (v ?? "").trim();
    return recortado === "" ? null : recortado;
  });

/** Identificador opcional: vacío o ausente dan null */
export const idOpcional = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const recortado = (v ?? "").trim();
    return recortado === "" ? null : recortado;
  })
  .refine(
    (v) =>
      v === null ||
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v),
    "Identificador no válido.",
  );

/** Fecha opcional en formato AAAA-MM-DD */
export const fechaOpcional = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const recortado = (v ?? "").trim();
    return recortado === "" ? null : recortado;
  })
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "La fecha se escribe como 2026-12-31.",
  );

/**
 * Identificador de fila.
 *
 * No se usa `z.uuid()`: Zod exige además la versión y la variante del RFC, y
 * el tipo `uuid` de Postgres no. Una validación de entrada más estricta que la
 * columna rechaza identificadores que la base acepta sin problema, como los de
 * los datos semilla o los UUID v1 y v7.
 */
export const uuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Identificador no válido.",
  );

/**
 * Un número tal y como lo escribe una persona.
 *
 * Nadie teclea «50» en una casilla que pide un porcentaje: teclea «50 %»,
 * o «33,3» con la coma decimal española. `Number("50%")` es NaN, así que la
 * primera versión rechazaba las dos cosas y, como el campo no enseñaba su
 * error, el formulario decía «revisa los campos marcados» sin marcar
 * ninguno. Alguien rellenó quince campos y se quedó mirando.
 *
 * Se limpia lo que sobra antes de convertir: símbolos de porcentaje,
 * espacios y la coma decimal. Lo que ya no se parezca a un número sí se
 * rechaza, y ahora el campo lo dice.
 */
export function numeroEscritoAMano(min: number, max: number, mensaje: string) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      const limpio = (v ?? "")
        .replace(/[%\s]/g, "")
        .replace(",", ".")
        .trim();
      return limpio === "" ? null : Number(limpio);
    })
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= min && v <= max),
      mensaje,
    );
}
