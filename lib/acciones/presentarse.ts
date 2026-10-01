"use server";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { error, ok, validar, type Resultado } from "./resultado";

/**
 * El alta desde el formulario público.
 *
 * Vive aparte de `candidaturas.ts` a propósito: todo lo de ahí exige ser de
 * IWL, y esto es lo contrario, lo único que puede hacer alguien sin cuenta.
 * Tenerlos en el mismo fichero invita a que un día alguien copie una función
 * de arriba sin fijarse en que no lleva la comprobación.
 *
 * Lo que protege esto no es esta función: es que `app.presentar_candidatura`
 * recibe solo los campos del formulario y pone ella la cohorte, el estado y
 * las fechas. Aunque alguien llame a la API a mano con la clave pública, no
 * puede darse de alta ya preseleccionada.
 */

const esquema = z.object({
  nombre: z.string().trim().min(1, "¿Cómo se llama tu startup?").max(120),
  contacto_nombre: z.string().trim().min(1, "¿Cómo te llamas?").max(120),
  contacto_email: z.string().trim().email("Ese correo no parece un correo."),
  sector: z.string().trim().max(120).optional(),
  one_liner: z.string().trim().max(400).optional(),
  website: z.string().trim().max(300).optional(),
  pais: z.string().trim().max(80).optional(),
  contacto_telefono: z.string().trim().max(40).optional(),
  contacto_cargo: z.string().trim().max(80).optional(),
  estado_declarado: z
    .enum(["idea", "prototipo", "mvp", "primeros_clientes", "facturacion"])
    .nullable()
    .catch(null),
  equipo_personas: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number.parseInt(v, 10)))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 10_000),
      "Escribe un número de personas.",
    ),
  liderazgo_femenino_pct: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100),
      "Un porcentaje, entre 0 y 100.",
    ),
  origen: z.string().trim().max(200).optional(),
  enlace_1: z.string().trim().max(500).optional(),
  enlace_2: z.string().trim().max(500).optional(),
  enlace_3: z.string().trim().max(500).optional(),
  /** La trampa para robots: un campo que nadie ve */
  apodo: z.string().optional(),
});

/** Solo http y https, y que se pueda analizar como dirección */
function enlaceValido(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function presentarse(formData: FormData): Promise<Resultado> {
  const validado = validar(esquema, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  /*
   * El campo trampa venía relleno: lo ha escrito un robot, porque está fuera
   * de la pantalla y sin orden de tabulación.
   *
   * Se responde que todo ha ido bien y no se guarda nada. Decirle que se le
   * ha visto solo le enseña a esquivarlo la próxima vez.
   */
  if (datos.apodo && datos.apodo.trim() !== "") {
    return ok("Recibida. Gracias.");
  }

  const enlaces = [
    { titulo: "Pitch o presentación", url: enlaceValido(datos.enlace_1) },
    { titulo: "Caso de negocio", url: enlaceValido(datos.enlace_2) },
    { titulo: "Material adicional", url: enlaceValido(datos.enlace_3) },
  ].filter((e): e is { titulo: string; url: string } => e.url !== null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { error: fallo } = await supabase.rpc("presentar_candidatura", {
    p_nombre: datos.nombre,
    p_contacto_nombre: datos.contacto_nombre,
    p_contacto_email: datos.contacto_email,
    p_sector: datos.sector || undefined,
    p_one_liner: datos.one_liner || undefined,
    p_website: enlaceValido(datos.website) ?? undefined,
    p_pais: datos.pais || undefined,
    p_contacto_telefono: datos.contacto_telefono || undefined,
    p_contacto_cargo: datos.contacto_cargo || undefined,
    p_estado_declarado: datos.estado_declarado ?? undefined,
    p_equipo_personas: datos.equipo_personas ?? undefined,
    p_liderazgo_femenino_pct: datos.liderazgo_femenino_pct ?? undefined,
    p_origen: datos.origen || undefined,
    p_enlaces: enlaces,
  });

  if (fallo) {
    // Ya presentada: el índice único por cohorte y correo
    if (fallo.code === "23505") {
      return error(
        "Ya hemos recibido una candidatura con ese correo para esta convocatoria. Si quieres añadir algo, respóndenos al correo que te mandamos.",
      );
    }
    if (fallo.message.includes("convocatoria abierta")) {
      return error("Ahora mismo no hay ninguna convocatoria abierta.");
    }
    return error(
      "No hemos podido guardar tu candidatura. Vuelve a intentarlo en un momento, y si sigue sin ir escríbenos.",
    );
  }

  return ok("Recibida. Gracias.");
}
