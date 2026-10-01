"use server";

import { revalidatePath } from "next/cache";
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
function numeroEscritoAMano(min: number, max: number, mensaje: string) {
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
  equipo_personas: numeroEscritoAMano(
    0,
    10_000,
    "Escribe cuántas personas sois, en número.",
  ),
  liderazgo_femenino_pct: numeroEscritoAMano(
    0,
    100,
    "Un porcentaje entre 0 y 100.",
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

export async function presentarse(
  formData: FormData,
): Promise<Resultado & { enlace?: string }> {
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

  const { data: nueva, error: fallo } = await supabase.rpc("presentar_candidatura", {
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

  /*
   * Y se le devuelve su enlace privado.
   *
   * Sin esto se quedaba sin forma de volver: la pantalla le decía «te
   * escribimos al correo» y no hay envío de correo montado, así que su
   * candidatura desaparecía de su vista en cuanto cerrara la pestaña.
   *
   * El testigo se pide con la clave pública igual que todo lo demás: la
   * función solo devuelve el de la candidatura que acaba de crear.
   */
  const { data: testigo } = await supabase
    .rpc("testigo_de_candidatura", { p_id: nueva as string })
    .single<string>();

  return {
    ok: true,
    mensaje: "Recibida. Gracias.",
    enlace: testigo ? `/candidatura/${testigo}` : undefined,
  };
}

/**
 * Añadir un documento desde el enlace privado.
 *
 * Vive aquí, con el formulario público, y no con las acciones del embudo:
 * todo lo de allí exige ser de IWL y esto es justo lo contrario.
 *
 * Lo que decide si vale es el testigo, y lo comprueba la base: la función
 * busca la candidatura por su llave y se niega si está anulada o si el
 * proceso ya se cerró.
 */
const esquemaMaterial = z.object({
  token: z.string().trim().min(10),
  titulo: z.string().trim().min(1, "¿Qué es este documento?").max(120),
  url: z.string().trim().min(1, "Falta el enlace.").max(500),
});

export async function anadirMaterial(formData: FormData): Promise<Resultado> {
  const validado = validar(esquemaMaterial, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const url = enlaceValido(datos.url);
  if (!url) {
    return error("Eso no parece una dirección web.", {
      url: "Tiene que empezar por https://",
    });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { error: fallo } = await supabase.rpc("anadir_enlace_con_token", {
    p_token: datos.token,
    p_titulo: datos.titulo,
    p_url: url,
  });

  if (fallo) {
    if (fallo.message.includes("ya no está activo")) {
      return error(
        "Este enlace ya no admite documentos. Si sigues en el proceso, escríbenos y te decimos por dónde.",
      );
    }
    if (fallo.message.includes("muchos documentos")) {
      return error(fallo.message);
    }
    return error("No hemos podido guardarlo. Vuelve a intentarlo.");
  }

  revalidatePath(`/candidatura/${datos.token}`);
  return ok("Añadido. Gracias.");
}

/**
 * La candidata completa su propia ficha desde el enlace privado.
 *
 * Es el camino de la invitación: IWL la da de alta con el nombre y un
 * correo, le manda el enlace, y ella cuenta quién es. Hasta ahora ese
 * enlace le daba las gracias por un material que no había mandado, porque
 * la ficha la había escrito IWL con dos campos.
 *
 * Solo toca lo descriptivo. El estado, el equity y lo demás son de IWL, y
 * eso lo garantiza la función de la base, no este formulario.
 */
const esquemaCompletar = z.object({
  token: z.string().trim().min(10),
  sector: z.string().trim().max(120).optional(),
  one_liner: z.string().trim().max(400).optional(),
  website: z.string().trim().max(300).optional(),
  pais: z.string().trim().max(80).optional(),
  contacto_cargo: z.string().trim().max(80).optional(),
  contacto_telefono: z.string().trim().max(40).optional(),
  estado_declarado: z
    .enum(["idea", "prototipo", "mvp", "primeros_clientes", "facturacion"])
    .nullable()
    .catch(null),
  equipo_personas: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v !== "" ? Number.parseInt(v, 10) : null))
    .refine(
      (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 10_000),
      "Escribe un número de personas.",
    ),
  liderazgo_femenino_pct: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : null))
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100),
      "Un porcentaje, entre 0 y 100.",
    ),
});

export async function completarCandidatura(
  formData: FormData,
): Promise<Resultado> {
  const validado = validar(esquemaCompletar, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { error: fallo } = await supabase.rpc("completar_candidatura", {
    p_token: datos.token,
    p_sector: datos.sector || undefined,
    p_one_liner: datos.one_liner || undefined,
    p_website: enlaceValido(datos.website ?? "") ?? undefined,
    p_pais: datos.pais || undefined,
    p_contacto_cargo: datos.contacto_cargo || undefined,
    p_contacto_telefono: datos.contacto_telefono || undefined,
    p_estado_declarado: datos.estado_declarado ?? undefined,
    p_equipo_personas: datos.equipo_personas ?? undefined,
    p_liderazgo_femenino_pct: datos.liderazgo_femenino_pct ?? undefined,
  });

  if (fallo) {
    if (fallo.message.includes("ya no está activo")) {
      return error("Este enlace ya no admite cambios. Escríbenos.");
    }
    return error("No hemos podido guardarlo. Vuelve a intentarlo.");
  }

  revalidatePath(`/candidatura/${datos.token}`);
  return ok("Guardado. Gracias.");
}
