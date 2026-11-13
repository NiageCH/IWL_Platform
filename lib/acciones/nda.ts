"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/supabase/servicio";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { descartarSubida, leerSubida, subidasDe } from "@/lib/subidas-servidor";
import { generarPdfNda } from "@/lib/nda-pdf";
import { faltanMarcas } from "@/lib/nda-formato";
import { notificar } from "@/lib/correo";
import { direccionBase } from "@/lib/direccion";
import {
  CAMPOS_DE_ELLA,
  completarNda,
  erroresPlantilla,
  huecos,
  type DatosTextoNda,
} from "@/lib/nda-texto";

/**
 * El NDA: la plantilla, la firma de la candidata, la contrafirma de IWL y
 * el registro de uno firmado fuera.
 *
 * Firmar y contrafirmar van con la clave de servicio, y es la excepción a
 * «quien autoriza es la base» que está escrita aquí: la IP y el navegador
 * de quien firma solo los conoce este servidor, y si la función de la base
 * se pudiera llamar con la sesión, cada cual se escribiría la IP que
 * quisiera. Por eso la sesión se comprueba aquí, a mano, antes de llamarla,
 * y la función vuelve a comprobar todo lo que puede sin sesión.
 */

function refrescar(candidaturaId?: string) {
  revalidatePath("/candidatura");
  revalidatePath("/cartera", "layout");
  if (candidaturaId) revalidatePath(`/embudo/${candidaturaId}`);
}

/** De dónde viene la petición: la IP de verdad la pone el proxy delante */
async function origen() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  return { ip, ua: h.get("user-agent") };
}

// -----------------------------------------------------------------------------
// La plantilla
// -----------------------------------------------------------------------------

const esquemaPlantilla = z.object({
  texto: z
    .string()
    .trim()
    .min(200, "Eso es demasiado corto para un NDA. Pega el texto entero de la plantilla validada.")
    // Un marcador desconocido no deja guardar: la base lo comprueba también
    .superRefine((texto, ctx) => {
      // Sin marcas, el PDF sale en un bloque corrido: se dice antes de guardar
      const sinMarcas = faltanMarcas(texto);
      if (sinMarcas) return ctx.addIssue({ code: "custom", message: sinMarcas });
      const errores = erroresPlantilla(texto);
      if (errores.length) ctx.addIssue({ code: "custom", message: `${errores.join(". ")}.` });
    }),
});

/**
 * Guardar el texto crea una versión nueva; ninguna se edita. Las firmas
 * hechas apuntan a la versión que vieron, con su hash.
 */
export async function guardarPlantillaNda(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPlantilla, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data: vigente } = await supabase
    .from("nda_plantillas")
    .select("texto")
    .is("candidatura_id", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (vigente?.texto.trim() === datos.texto) {
    return error("Es el mismo texto que la versión vigente. No hace falta otra.");
  }

  const { data, error: falloBase } = await supabase
    .from("nda_plantillas")
    .insert({ texto: datos.texto, version: 0, hash: "" })
    .select("version")
    .single();

  if (falloBase) {
    if (falloBase.code === "42501") return error("La plantilla del NDA la cambia la dirección de IWL.");
    return traducirError(falloBase);
  }

  refrescar();
  return ok(`Guardada como versión ${data.version}. Las firmas nuevas serán sobre este texto.`);
}

// -----------------------------------------------------------------------------
// La firma de la candidata
// -----------------------------------------------------------------------------

const opcional = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ?? "").trim());

const esquemaFirma = z.object({
  plantilla_id: z.string().uuid(),
  // El nombre completo, que entra en el texto como Contraparte y firma
  nombre: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => /\S+\s+\S+/.test(v), "Escribe tu nombre y tus apellidos, como en tu documento de identidad."),
  acepto: z.literal("si", { message: "Marca la casilla para firmar." }),
  /** Solo si su situación societaria no se ha dicho: firma como persona o en nombre de una sociedad */
  como: z.union([z.enum(["persona", "sociedad"]), z.literal(""), z.null()]).optional(),
  documento: opcional,
  domicilio: opcional,
  denominacion: opcional,
  nif: opcional,
  cargo: opcional,
});

/** El lugar de firma, de Programa */
async function lugarDelNda(): Promise<string> {
  const { data } = await clienteServicio()
    .from("platform_settings")
    .select("value")
    .eq("key", "nda_lugar")
    .maybeSingle();
  return typeof data?.value === "string" && data.value.trim() ? data.value.trim() : "Málaga";
}

const ROTULOS: Record<string, string> = {
  documento: "tu documento",
  domicilio: "el domicilio",
  denominacion: "la denominación de la sociedad",
  nif: "el NIF de la sociedad",
  cargo: "tu cargo",
};

/**
 * Ella firma su texto, completado con sus datos. Se completa aquí, con el
 * mismo código que le enseñó la vista previa, y la base calcula el hash
 * sobre lo que recibe y comprueba que no le queda ningún hueco.
 */
export async function firmarNda(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaFirma, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  // Cuál es su candidatura lo dice la base por la sesión, no el formulario
  const supabase = await clienteServidor();
  const { data: candidaturaId } = await supabase.rpc("mi_candidatura_id");
  if (!candidaturaId) return error("No encontramos tu candidatura. Escríbenos.");

  const servicio = clienteServicio();
  const [{ data: plantilla }, { data: c }, lugar] = await Promise.all([
    servicio.from("nda_plantillas").select("texto").eq("id", datos.plantilla_id).maybeSingle(),
    servicio.from("candidaturas").select("nombre, situacion_societaria").eq("id", candidaturaId).single(),
    lugarDelNda(),
  ]);
  if (!plantilla || !c) return error("El NDA ha cambiado mientras lo leías. Vuelve a cargar la página.");

  const esSociedad = c.situacion_societaria
    ? c.situacion_societaria === "constituida"
    : datos.como === "sociedad";
  if (!c.situacion_societaria && !datos.como) {
    return error("Dinos si firmas como persona física o en nombre de una sociedad.", { como: "Elige una." });
  }

  const deElla = Object.fromEntries(CAMPOS_DE_ELLA.map((k) => [k, datos[k]]));
  const completos: DatosTextoNda = {
    startup: c.nombre,
    // El que ella confirma o corrige, no el de la candidatura: es el que firma
    contraparte_nombre: datos.nombre,
    lugar,
    es_sociedad: esSociedad,
    ...deElla,
  };
  const texto = completarNda(plantilla.texto, completos);

  const faltan = huecos(texto);
  if (faltan.length) {
    const campos: Record<string, string> = {};
    for (const h of faltan) {
      const nombre = h.replace(/[{}\s]/g, "");
      if (nombre in ROTULOS) campos[nombre] = "Falta este dato.";
    }
    const que = faltan.map((h) => ROTULOS[h.replace(/[{}\s]/g, "")] ?? h).join(", ");
    return error(`Al NDA le falta: ${que}. Rellénalo y vuelve a firmar.`, campos);
  }

  const { ip, ua } = await origen();
  const { error: falloFirma } = await servicio.rpc("firmar_nda", {
    p_candidatura: candidaturaId,
    p_profile: persona.id,
    p_nombre: datos.nombre,
    p_plantilla: datos.plantilla_id,
    p_texto: texto,
    p_datos: { ...completos, es_sociedad: esSociedad },
    p_ip: ip ?? "",
    p_ua: ua ?? "",
  });

  if (falloFirma) return traducirError(falloFirma);

  refrescar(candidaturaId);
  // El acuse es la pantalla cambiada: deja de pedirle la firma
  return ok();
}

// -----------------------------------------------------------------------------
// Comentarlo, responder y la versión propia
// -----------------------------------------------------------------------------

/**
 * La candidata comenta el NDA. Sobre qué versión y de quién lo pone la
 * base, y también si todavía se puede comentar; el aviso a dirección sale
 * de ahí.
 */
export async function comentarNda(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ texto: z.string().trim().min(3, "Escribe qué quieres comentar.") }),
    formData,
  );
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data: candidaturaId } = await supabase.rpc("mi_candidatura_id");
  if (!candidaturaId) return error("No encontramos tu candidatura. Escríbenos.");

  const { error: falloBase } = await supabase
    .from("nda_comentarios")
    .insert({ candidatura_id: candidaturaId, texto: datos.texto });
  if (falloBase) return traducirError(falloBase);

  refrescar(candidaturaId);
  return ok("Enviado. Te responderemos aquí mismo; mientras tanto puedes firmar o esperar a la respuesta.");
}

export async function responderComentarioNda(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      id: z.string().uuid(),
      candidatura_id: z.string().uuid(),
      respuesta: z.string().trim().min(3, "Escribe la respuesta."),
    }),
    formData,
  );
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("nda_comentarios")
    .update({ respuesta: datos.respuesta })
    .eq("id", datos.id)
    .is("respuesta", null)
    .select("profile_id, profiles!nda_comentarios_profile_id_fkey ( email, full_name )");
  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("Ese comentario ya está respondido, o tu cuenta no puede responderlo.");

  // A ella, la respuesta por correo. Si no sale, queda en la ficha para reintentar
  const ella = data[0].profiles as unknown as { email: string | null; full_name: string | null } | null;
  if (ella?.email) {
    const persona = await personaActual();
    await notificar(
      { correo: ella.email, nombre: ella.full_name, profileId: data[0].profile_id },
      "respuesta_comentario",
      { nombre: ella.full_name, sobre: "el NDA", respuesta: datos.respuesta, enlace: `${direccionBase()}/candidatura` },
      { candidaturaId: datos.candidatura_id, autor: persona?.id },
    );
  }

  refrescar(datos.candidatura_id);
  // El acuse es la respuesta, que sale ya en su sitio
  return ok();
}

/**
 * Una versión del NDA solo para esta candidatura, cuando un comentario
 * cambia el texto. Si ella ya había firmado y IWL no, su firma se anula y
 * se le vuelve a pedir; con las dos firmas, la base no deja. Lo dice el
 * mensaje, porque es una consecuencia que no se ve desde aquí.
 */
export async function guardarNdaPropio(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    esquemaPlantilla.extend({ candidatura_id: z.string().uuid() }),
    formData,
  );
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data: vigenteId } = await supabase.rpc("plantilla_nda_de", { p_candidatura: datos.candidatura_id });
  if (vigenteId) {
    const { data: vigente } = await supabase.from("nda_plantillas").select("texto").eq("id", vigenteId).maybeSingle();
    if (vigente?.texto.trim() === datos.texto) {
      return error("Es el mismo texto que ya tiene. Cambia lo que haga falta antes de guardar.");
    }
  }
  const { data: firmaPrevia } = await supabase
    .from("nda_firmas")
    .select("firmado_at")
    .eq("candidatura_id", datos.candidatura_id)
    .maybeSingle();

  const { data, error: falloBase } = await supabase
    .from("nda_plantillas")
    .insert({ texto: datos.texto, version: 0, hash: "", candidatura_id: datos.candidatura_id })
    .select("version")
    .single();
  if (falloBase) {
    if (falloBase.code === "42501") return error("El texto del NDA lo cambia la dirección de IWL.");
    return traducirError(falloBase);
  }

  refrescar(datos.candidatura_id);
  return ok(
    firmaPrevia
      ? `Guardada como versión ${data.version}, solo para ella. Su firma anterior queda anulada: la verá para firmar de nuevo.`
      : `Guardada como versión ${data.version}, solo para ella. Es la que verá para firmar.`,
  );
}

// -----------------------------------------------------------------------------
// La contrafirma de IWL, y el PDF
// -----------------------------------------------------------------------------

async function soloDireccion() {
  const persona = await personaActual();
  if (!persona) return { persona: null, fallo: error("Tu sesión ha caducado. Vuelve a entrar.") };
  if (persona.role !== "admin_iwl") {
    return { persona: null, fallo: error("El NDA lo firma por IWL una persona de dirección.") };
  }
  return { persona, fallo: null };
}

export async function contrafirmarNda(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ candidatura_id: z.string().uuid() }), formData);
  if (fallo) return fallo;

  const { persona, fallo: sinPermiso } = await soloDireccion();
  if (sinPermiso) return sinPermiso;

  const { ip, ua } = await origen();
  const servicio = clienteServicio();

  /*
   * IWL firma exactamente el mismo texto que ella, con el mismo hash. La
   * fecha de efecto es la de esta firma, la última, y va en el registro de
   * firmas del PDF, no en el texto (REVISION, 10 nov).
   */
  const { error: falloFirma } = await servicio.rpc("contrafirmar_nda", {
    p_candidatura: datos.candidatura_id,
    p_profile: persona!.id,
    p_ip: ip ?? "",
    p_ua: ua ?? "",
  });
  if (falloFirma) return traducirError(falloFirma);

  /*
   * El PDF, después de firmar: si falla, la firma ya está y se dice. Un
   * PDF que no se genera no deshace una firma que sí se hizo.
   */
  const pdf = await guardarPdf(datos.candidatura_id, persona!.id);
  refrescar(datos.candidatura_id);
  if (pdf) return ok(`Firmado por IWL. El PDF no se ha podido generar: ${pdf}. Vuelve a intentarlo desde la ficha.`);
  return ok();
}

/** Genera el PDF de las dos firmas y lo deja en el data room de la candidatura */
async function guardarPdf(candidaturaId: string, autor: string): Promise<string | null> {
  const servicio = clienteServicio();
  const [{ data: firma }, { data: candidatura }] = await Promise.all([
    servicio.from("nda_firmas").select("*, nda_plantillas(texto, version)").eq("candidatura_id", candidaturaId).single(),
    servicio.from("candidaturas").select("nombre").eq("id", candidaturaId).single(),
  ]);
  if (!firma || !candidatura) return "no se encuentra la firma";
  const plantilla = firma.nda_plantillas as unknown as { texto: string; version: number } | null;
  if (!plantilla || !firma.firmado_at || !firma.contrafirmado_at) return "faltan datos de la firma";

  const bytes = await generarPdfNda({
    candidatura: candidatura.nombre,
    candidaturaId,
    // El texto con sus datos; los de antes de los marcadores, la plantilla
    texto: firma.texto_firmado ?? plantilla.texto,
    version: plantilla.version,
    hash: firma.texto_hash ?? "",
    ella: {
      nombre: firma.firmante_nombre ?? "",
      correo: firma.firmante_correo,
      cuando: firma.firmado_at,
      ip: firma.firmado_ip,
      navegador: firma.firmado_ua,
    },
    iwl: {
      nombre: firma.contrafirmante_nombre ?? "",
      correo: firma.contrafirmante_correo,
      cuando: firma.contrafirmado_at,
      ip: firma.contrafirmado_ip,
      navegador: firma.contrafirmado_ua,
    },
    generado: new Date().toISOString(),
  });

  // Con la sesión de dirección: las políticas del data room ya la dejan
  const supabase = await clienteServidor();
  const ruta = `${candidaturaId}/${Date.now()}-NDA-firmado.pdf`;
  const { error: falloSubida } = await supabase.storage
    .from("candidaturas")
    .upload(ruta, bytes, { contentType: "application/pdf" });
  if (falloSubida) return falloSubida.message;

  const { data: doc, error: falloFicha } = await supabase
    .from("candidatura_documentos")
    .insert({
      candidatura_id: candidaturaId,
      nombre: "NDA firmado por las dos partes.pdf",
      storage_path: ruta,
      mime: "application/pdf",
      bytes: bytes.length,
      created_by: autor,
    })
    .select("id")
    .single();
  if (falloFicha) {
    await supabase.storage.from("candidaturas").remove([ruta]);
    return falloFicha.message;
  }

  await servicio.rpc("apuntar_documento_nda", { p_candidatura: candidaturaId, p_documento: doc.id });
  return null;
}

/** Volver a generar el PDF si falló al contrafirmar */
export async function regenerarPdfNda(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ candidatura_id: z.string().uuid() }), formData);
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloDireccion();
  if (sinPermiso) return sinPermiso;

  const problema = await guardarPdf(datos.candidatura_id, persona!.id);
  refrescar(datos.candidatura_id);
  return problema ? error(`El PDF no se ha podido generar: ${problema}`) : ok();
}

// -----------------------------------------------------------------------------
// Un NDA firmado fuera de la plataforma
// -----------------------------------------------------------------------------

const esquemaExterno = z.object({
  candidatura_id: z.string().uuid(),
  firmado_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "¿Qué día se firmó?"),
  url: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ?? "").trim()),
});

export async function registrarNdaExterno(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaExterno, formData);
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloDireccion();
  if (sinPermiso) return sinPermiso;

  const [subida] = subidasDe(formData, "documento");
  if (!subida && !datos.url) {
    return error("Sube el NDA firmado o pega el enlace donde está.", {
      documento: "El documento firmado, o el enlace de abajo.",
    });
  }
  if (datos.url && !/^https?:\/\//i.test(datos.url)) {
    return error("Revisa el enlace.", { url: "Tiene que empezar por https://" });
  }

  const supabase = await clienteServidor();
  let documentoId: string | null = null;

  if (subida) {
    // Ya está en Storage: lo subió el navegador (`prepararSubida`)
    const archivo = await leerSubida(
      supabase,
      "candidaturas",
      "nda",
      subida.ruta,
      subida.nombre,
      `${datos.candidatura_id}/`,
    );
    if ("error" in archivo) return error(archivo.error, { documento: archivo.error });

    const { data: doc, error: falloFicha } = await supabase
      .from("candidatura_documentos")
      .insert({
        candidatura_id: datos.candidatura_id,
        nombre: `NDA firmado fuera de la plataforma · ${archivo.nombre}`,
        storage_path: archivo.ruta,
        mime: archivo.tipo || "application/pdf",
        bytes: archivo.tamano,
        created_by: persona!.id,
      })
      .select("id")
      .single();
    if (falloFicha) {
      await descartarSubida("candidaturas", archivo.ruta);
      return traducirError(falloFicha);
    }
    documentoId = doc.id;
  }

  const { error: falloBase } = await clienteServicio().rpc("registrar_nda_externo", {
    p_candidatura: datos.candidatura_id,
    p_profile: persona!.id,
    p_firmado_on: datos.firmado_on,
    /*
     * Uno de los dos puede faltar, y la función lo admite. Los tipos
     * generados no saben de parámetros que aceptan nulo.
     */
    p_documento: documentoId as string,
    p_url: (datos.url || null) as string,
  });
  if (falloBase) return traducirError(falloBase);

  refrescar(datos.candidatura_id);
  return ok();
}

// -----------------------------------------------------------------------------
// Abrir el PDF: quien pueda verlo lo dice RLS del almacenamiento
// -----------------------------------------------------------------------------

export async function abrirNda(formData: FormData): Promise<Resultado & { url?: string }> {
  const { datos, fallo } = validar(z.object({ candidatura_id: z.string().uuid() }), formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data: firma } = await supabase
    .from("nda_firmas")
    .select("documento_id, evidencia_url, candidatura_documentos(storage_path)")
    .eq("candidatura_id", datos.candidatura_id)
    .maybeSingle();
  if (!firma) return error("No hay NDA firmado todavía.");

  const ruta = (firma.candidatura_documentos as unknown as { storage_path: string } | null)?.storage_path;
  if (!ruta) {
    return firma.evidencia_url
      ? { ok: true, url: firma.evidencia_url }
      : error("El PDF todavía no está generado.");
  }

  const { data, error: falloFirma } = await supabase.storage.from("candidaturas").createSignedUrl(ruta, 300);
  if (falloFirma || !data) return error("No se ha podido abrir el NDA.");
  return { ok: true, url: data.signedUrl };
}

/** El lugar de firma, el marcador {{lugar}}. Solo dirección, por la política de ajustes */
export async function guardarLugarNda(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ lugar: z.string().trim().min(2, "¿Dónde se firma? Por ejemplo, Málaga.") }),
    formData,
  );
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { data, error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: datos.lugar })
    .eq("key", "nda_lugar")
    .select("key");
  if (falloBase) return traducirError(falloBase);
  if (!data?.length) return error("El lugar del NDA lo fija la dirección de IWL.");
  revalidatePath("/admin/programa");
  return ok(`Guardado. Los NDA que se firmen desde ahora dirán «${datos.lugar}».`);
}
