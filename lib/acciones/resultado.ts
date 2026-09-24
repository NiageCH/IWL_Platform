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

  return {
    datos: null,
    fallo: error("Revisa los campos marcados.", campos),
  };
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

/** Campo de texto opcional que convierte la cadena vacía en null */
export const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

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
