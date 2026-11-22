"use server";

import { ORDEN_ESTADIOS_TUPLA } from "@/lib/estadios";
import { revalidatePath } from "next/cache";
import { normalizarEnlace } from "@/lib/enlaces";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  error,
  ok,
  validar,
  type Resultado,
} from "./resultado";
import { notificar } from "@/lib/correo";
import { direccionBase } from "@/lib/direccion";
import { randomUUID } from "node:crypto";
import { clienteServicio } from "@/lib/supabase/servicio";
import { completarNda, huecos, type DatosTextoNda } from "@/lib/nda-texto";
import { generarPdfNda } from "@/lib/nda-pdf";
import { lugarDelNda, origen } from "@/lib/nda-servidor";
import { comprobarFichero, sanear } from "@/lib/subidas";
import { leerSubida } from "@/lib/subidas-servidor";
import { SECTORES, leerPct, sumaCuadra, sumaSocios, type Socio } from "@/lib/candidatura-nueva";
import type { SubidaPreparada } from "@/lib/acciones/subidas";
import type { Json } from "@/lib/supabase/database.types";

/**
 * El alta desde el formulario público.
 *
 * Vive aparte de `candidaturas.ts` a propósito: todo lo de ahí exige ser de
 * IWL, y esto es lo contrario, lo único que puede hacer alguien sin cuenta.
 * Tenerlos en el mismo fichero invita a que un día alguien copie una función
 * de arriba sin fijarse en que no lleva la comprobación.
 *
 * Lo que protege esto no es esta función: es que `app.aceptar_nda` y `app.enviar_candidatura`
 * recibe solo los campos del formulario y pone ella la cohorte, el estado y
 * las fechas. Aunque alguien llame a la API a mano con la clave pública, no
 * puede darse de alta ya preseleccionada.
 */

/** La web como la escriba: sin https, con texto alrededor. Si no es una web, se queda sin web */
function enlaceValido(url: string | undefined): string | null {
  return normalizarEnlace(url) || null;
}

/*
 * El NDA va primero (REVISION, 22 nov · bloque 2). Antes de contar nada del
 * proyecto, ella da sus datos y acepta el NDA con una casilla; con eso nace
 * la candidatura, en borrador, y se le manda el PDF con su enlace privado.
 * Desde el enlace presenta el proyecto (bloque 3), y al enviarlo la base
 * aplica el filtro.
 *
 * Las dos llamadas a la base van con la clave de servicio, como firmar el
 * NDA: la IP y el navegador de quien acepta los sabe este servidor, no el
 * formulario. La base vuelve a comprobar todo lo que puede: convocatoria
 * abierta, plantilla vigente, ningún hueco en el texto, el testigo y el
 * filtro entero.
 */

const texto = (max: number) => z.string().trim().max(max).optional().transform((v) => v ?? "");

const esquemaNda = z.object({
  startup: z.string().trim().min(1, "¿Cómo se llama tu startup?").max(120),
  nombre: z.string().trim().min(1, "¿Cómo te llamas?").max(120),
  apellidos: z.string().trim().min(1, "Faltan tus apellidos.").max(160),
  correo: z.string().trim().email("Ese correo no parece un correo."),
  como: z.enum(["persona", "sociedad"], { message: "Dinos si aceptas como persona física o en nombre de una sociedad." }),
  documento: texto(40),
  domicilio: texto(300),
  denominacion: texto(200),
  nif: texto(20),
  cargo: texto(120),
  plantilla_id: z.string().uuid("El NDA ha cambiado mientras lo leías. Vuelve a cargar la página."),
  acepto: z.literal("si", { message: "Para seguir, marca que aceptas el NDA." }),
  /** La trampa para robots: un campo que nadie ve */
  apodo: z.string().optional(),
});

const ROTULOS_NDA: Record<string, string> = {
  documento: "tu documento",
  domicilio: "el domicilio",
  denominacion: "la denominación de la sociedad",
  nif: "el NIF de la sociedad",
  cargo: "tu cargo",
};

/** La plantilla genérica vigente: la que acepta quien se presenta */
async function plantillaVigente() {
  const { data } = await clienteServicio()
    .from("nda_plantillas")
    .select("id, version, texto")
    .is("candidatura_id", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function aceptarNda(formData: FormData): Promise<Resultado & { enlace?: string }> {
  const validado = validar(esquemaNda, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  // El campo trampa venía relleno: un robot. Se le dice que todo ha ido bien y no se guarda nada
  if (datos.apodo && datos.apodo.trim() !== "") return ok();

  const [plantilla, lugar] = await Promise.all([plantillaVigente(), lugarDelNda()]);
  if (!plantilla || plantilla.id !== datos.plantilla_id) {
    return error("El NDA ha cambiado mientras lo leías. Vuelve a cargar la página y lee la versión nueva.");
  }

  const esSociedad = datos.como === "sociedad";
  const completos: DatosTextoNda = {
    startup: datos.startup,
    contraparte_nombre: `${datos.nombre} ${datos.apellidos}`,
    lugar,
    es_sociedad: esSociedad,
    documento: datos.documento,
    domicilio: datos.domicilio,
    denominacion: esSociedad ? datos.denominacion : "",
    nif: esSociedad ? datos.nif : "",
    cargo: esSociedad ? datos.cargo : "",
  };
  const textoNda = completarNda(plantilla.texto, completos);
  const faltan = huecos(textoNda);
  if (faltan.length) {
    const campos: Record<string, string> = {};
    for (const h of faltan) {
      const nombre = h.replace(/[{}\s]/g, "");
      if (nombre in ROTULOS_NDA) campos[nombre] = "Falta este dato.";
    }
    const que = faltan.map((h) => ROTULOS_NDA[h.replace(/[{}\s]/g, "")] ?? h).join(", ");
    return error(`Al NDA le falta: ${que}. Rellénalo y vuelve a aceptarlo.`, campos);
  }

  const servicio = clienteServicio();
  const { ip, ua } = await origen();
  const { data: nueva, error: fallo } = await servicio
    .rpc("aceptar_nda", {
      p_startup: datos.startup,
      p_nombre: datos.nombre,
      p_apellidos: datos.apellidos,
      p_correo: datos.correo,
      p_plantilla: plantilla.id,
      p_texto: textoNda,
      p_datos: { ...completos },
      p_ip: ip ?? "",
      p_ua: ua ?? "",
    })
    .single<{ candidatura_id: string; token: string }>();

  if (fallo || !nueva) {
    // Ya hay una con ese correo en esta convocatoria: se le vuelve a mandar su enlace
    if (fallo?.code === "23505") {
      await reenviarEnlace(datos.correo);
      return error(
        "Ya hay una candidatura con ese correo en esta convocatoria. Te hemos vuelto a mandar tu enlace privado para que sigas desde ahí.",
      );
    }
    if (fallo?.message.includes("convocatoria abierta")) return error("Ahora mismo no hay ninguna convocatoria abierta.");
    if (fallo?.code === "P0001") return error(fallo.message);
    return error("No hemos podido guardarlo. Vuelve a intentarlo en un momento, y si sigue sin ir escríbenos.");
  }

  // El PDF de lo aceptado, en su expediente. Si falla, lo aceptado vale igual y el correo sale sin él
  await guardarPdfAceptado(nueva.candidatura_id);

  const enlace = `${direccionBase()}/candidatura/${nueva.token}`;
  await notificar(
    { correo: datos.correo, nombre: `${datos.nombre} ${datos.apellidos}` },
    "nda_aceptado",
    { nombre: datos.nombre, startup: datos.startup, enlace, candidatura_id: nueva.candidatura_id },
    { candidaturaId: nueva.candidatura_id },
  );

  // Sin mensaje: el acuse es la pantalla siguiente, la de presentar el proyecto
  return { ok: true, enlace: `/candidatura/${nueva.token}` };
}

/** Vuelve a mandar el enlace privado de la candidatura con ese correo, si la hay y vale */
async function reenviarEnlace(correo: string) {
  const { data: c } = await clienteServicio()
    .from("candidaturas")
    .select("id, nombre, contacto_nombre, token, token_anulado_at")
    .ilike("contacto_email", correo.trim())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!c?.token || c.token_anulado_at) return;
  await notificar(
    { correo, nombre: c.contacto_nombre },
    "enlace_candidatura",
    { nombre: c.contacto_nombre, startup: c.nombre, enlace: `${direccionBase()}/candidatura/${c.token}` },
    { candidaturaId: c.id },
  );
}

/** El PDF del NDA aceptado, con el registro de la aceptación, en el expediente de la candidatura */
async function guardarPdfAceptado(candidaturaId: string): Promise<void> {
  const servicio = clienteServicio();
  const [{ data: firma }, { data: c }] = await Promise.all([
    servicio.from("nda_firmas").select("*").eq("candidatura_id", candidaturaId).single(),
    servicio.from("candidaturas").select("nombre").eq("id", candidaturaId).single(),
  ]);
  if (!firma || !c || !firma.firmado_at) return;
  const bytes = await generarPdfNda({
    candidatura: c.nombre,
    candidaturaId,
    texto: firma.texto_firmado ?? "",
    version: firma.texto_version ?? "",
    hash: firma.texto_hash ?? "",
    ella: {
      nombre: firma.firmante_nombre ?? "",
      correo: firma.firmante_correo,
      cuando: firma.firmado_at,
      ip: firma.firmado_ip,
      navegador: firma.firmado_ua,
    },
    iwl: null,
    generado: new Date().toISOString(),
  });
  const ruta = `${candidaturaId}/${Date.now()}-NDA-aceptado.pdf`;
  const { error: falloSubida } = await servicio.storage
    .from("candidaturas")
    .upload(ruta, bytes, { contentType: "application/pdf" });
  if (falloSubida) return;
  const { data: doc } = await servicio
    .from("candidatura_documentos")
    .insert({ candidatura_id: candidaturaId, nombre: "NDA aceptado.pdf", storage_path: ruta, mime: "application/pdf", bytes: bytes.length })
    .select("id")
    .single();
  if (!doc) {
    await servicio.storage.from("candidaturas").remove([ruta]);
    return;
  }
  await servicio.rpc("apuntar_documento_nda", { p_candidatura: candidaturaId, p_documento: doc.id });
}

// -----------------------------------------------------------------------------
// Presentar el proyecto, desde su enlace privado (bloque 3)
// -----------------------------------------------------------------------------

/** La candidatura en borrador de ese testigo: es lo único que autoriza a subir o enviar */
async function borradorDe(token: string) {
  const { data } = await clienteServicio()
    .from("candidaturas")
    .select("id, nombre, contacto_nombre, contacto_apellidos, contacto_email, estado, token_anulado_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.token_anulado_at || data.estado !== "borrador") return null;
  return data;
}

/**
 * La dirección firmada para subir la prueba del estadio. Sin sesión: la
 * autoriza el testigo de una candidatura en borrador, y la ruta la pone el
 * servidor, dentro de su carpeta.
 */
export async function prepararSubidaPrueba(
  token: string,
  fichero: { nombre: string; tamano: number; tipo: string },
): Promise<SubidaPreparada> {
  const c = await borradorDe(token);
  if (!c) return { ok: false, error: "Ese enlace ya no admite cambios. Escríbenos." };
  const problema = comprobarFichero("candidata", fichero);
  if (problema) return { ok: false, error: problema };
  const ruta = `${c.id}/prueba/${randomUUID()}-${sanear(fichero.nombre) || "prueba"}`;
  const { data, error: fallo } = await clienteServicio().storage.from("candidaturas").createSignedUploadUrl(ruta);
  if (fallo || !data) return { ok: false, error: "No se ha podido preparar la subida. Vuelve a intentarlo." };
  return { ok: true, bucket: "candidaturas", ruta, url: data.signedUrl };
}

const esquemaEnvio = z
  .object({
    token: z.string().trim().min(10),
    sector: z.enum(SECTORES, { message: "Elige el sector." }),
    sector_otro: texto(120),
    one_liner: z.string().trim().min(10, "Cuéntanos en una frase qué hacéis.").max(400),
    website: texto(300),
    estadio: z.enum(ORDEN_ESTADIOS_TUPLA, { message: "Dinos en qué estadio estáis." }),
    recomendada_por: z.string().optional().transform((v) => (v ? v : null)),
    prueba: z.string().optional(),
    prueba_nombre: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.sector === "Otro" && !d.sector_otro) {
      ctx.addIssue({ code: "custom", path: ["sector_otro"], message: "¿Cuál es el sector?" });
    }
    if (d.estadio === "idea" && !d.recomendada_por) {
      ctx.addIssue({ code: "custom", path: ["recomendada_por"], message: "En idea, ¿quién de IWL os recomienda?" });
    }
    if (d.estadio !== "idea" && !d.prueba) {
      ctx.addIssue({ code: "custom", path: ["prueba"], message: "Adjunta la prueba del estadio." });
    }
  });

/** Los socios vienen en filas: socio_nombre, socio_pct y socio_mujer, en el mismo orden */
function sociosDe(formData: FormData): { socios: Socio[]; problema: string | null } {
  const nombres = formData.getAll("socio_nombre").map(String);
  const pcts = formData.getAll("socio_pct").map(String);
  const mujeres = formData.getAll("socio_mujer").map(String);
  const socios: Socio[] = [];
  for (let i = 0; i < nombres.length; i++) {
    const nombre = nombres[i].trim();
    const pct = leerPct(pcts[i] ?? "");
    if (!nombre && pct === null) continue;
    if (!nombre) return { socios, problema: "Cada socio con su nombre." };
    if (pct === null || pct <= 0 || pct > 100) return { socios, problema: `La parte de ${nombre}, entre 0 y 100.` };
    socios.push({ nombre, pct, mujer: mujeres[i] === "si" });
  }
  if (!socios.length) return { socios, problema: "Dinos quién tiene el capital: al menos un socio." };
  if (!sumaCuadra(socios)) {
    return { socios, problema: `Las partes tienen que sumar el 100 %. Ahora suman el ${cifraPct(sumaSocios(socios))} %.` };
  }
  return { socios, problema: null };
}

const cifraPct = (n: number) => String(n).replace(".", ",");

export async function enviarCandidatura(formData: FormData): Promise<Resultado> {
  const validado = validar(esquemaEnvio, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const { socios, problema } = sociosDe(formData);
  if (problema) return error(problema, { socios: problema });

  const c = await borradorDe(datos.token);
  if (!c) return error("Esta candidatura ya está enviada, o el enlace ya no vale.");

  const servicio = clienteServicio();

  // La prueba: se comprueba lo subido y se registra en su expediente
  let prueba: string | null = null;
  if (datos.estadio !== "idea" && datos.prueba) {
    const subido = await leerSubida(servicio, "candidaturas", "candidata", datos.prueba, datos.prueba_nombre || "Prueba", `${c.id}/prueba/`);
    if ("error" in subido) return error(subido.error, { prueba: subido.error });
    const { data: doc, error: falloDoc } = await servicio
      .from("candidatura_documentos")
      .insert({
        candidatura_id: c.id,
        nombre: `Prueba del estadio · ${subido.nombre}`,
        storage_path: subido.ruta,
        mime: subido.tipo,
        bytes: subido.tamano,
      })
      .select("id")
      .single();
    if (falloDoc || !doc) return error("No hemos podido guardar la prueba. Vuelve a intentarlo.");
    prueba = doc.id;
  }

  const { data: resultado, error: fallo } = await servicio
    .rpc("enviar_candidatura", {
      p_token: datos.token,
      p_sector: datos.sector,
      p_sector_otro: datos.sector_otro,
      p_one_liner: datos.one_liner,
      p_website: normalizarEnlace(datos.website) || "",
      p_estadio: datos.estadio,
      p_socios: socios as unknown as Json,
      p_prueba: prueba as string,
      p_recomendada: (datos.estadio === "idea" ? datos.recomendada_por : null) as string,
    })
    .single<{ filtro: string; motivo: string | null }>();
  if (fallo || !resultado) {
    if (fallo?.code === "P0001" || fallo?.code === "42501") return error(fallo.message);
    return error("No hemos podido enviarla. Vuelve a intentarlo en un momento, y si sigue sin ir escríbenos.");
  }

  // Si no pasa, se le dice por qué, por correo: la pantalla también lo dice
  if (resultado.filtro === "no_pasa") {
    await notificar(
      { correo: c.contacto_email, nombre: `${c.contacto_nombre} ${c.contacto_apellidos ?? ""}`.trim() },
      "filtro_no_pasa",
      { nombre: c.contacto_nombre, startup: c.nombre, motivo: resultado.motivo, enlace: `${direccionBase()}/candidatura/${datos.token}` },
      { candidaturaId: c.id },
    );
  }

  revalidatePath(`/candidatura/${datos.token}`);
  revalidatePath("/embudo", "layout");
  // El acuse es la pantalla cambiada: dice en qué ha quedado
  return ok();
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
    .enum(ORDEN_ESTADIOS_TUPLA)
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
