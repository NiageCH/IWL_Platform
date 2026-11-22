"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/supabase/servicio";
import { enlaceOpcional, error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { descartarSubida, leerSubida, subidasDe } from "@/lib/subidas-servidor";
import { generarPdfNda } from "@/lib/nda-pdf";
import { lugarDelNda, origen } from "@/lib/nda-servidor";
import { faltanMarcas } from "@/lib/nda-formato";
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
  url: enlaceOpcional.transform((v) => v ?? ""),
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
