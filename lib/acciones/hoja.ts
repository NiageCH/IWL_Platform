"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { leerSubida } from "@/lib/subidas-servidor";
import { error, ok, traducirError, uuid, validar, type Resultado } from "@/lib/acciones/resultado";

/**
 * La hoja de ruta en cuatro tramos (REVISION, 22 y 23 nov · bloque 5): la
 * lista de entrada, generarla, rehacerla y quitar un hito. Quién puede cada
 * cosa lo dice la base (`responder_lista_entrada`, `verificar_lista_entrada`,
 * `generar_hoja_de_ruta`, `borrar_borrador_hoja_de_ruta`, `quitar_hito`).
 */

function refrescar(slug?: string) {
  revalidatePath("/proyecto", "layout");
  if (slug) revalidatePath(`/cartera/${slug}`, "layout");
}

async function conSesion() {
  return (await personaActual()) ? null : error("Tu sesión ha caducado. Vuelve a entrar.");
}

/**
 * Ella contesta un hito de la lista: «ya lo tenemos», con su archivo, o
 * «todavía no». El archivo se sube antes, con dirección firmada, a la
 * carpeta de evidencias de su compañía; aquí se comprueba que está ahí.
 */
export async function responderLista(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      company_id: uuid,
      hito_id: uuid,
      respuesta: z.enum(["si", "no"], { message: "Di si ya lo tenéis o todavía no." }),
      evidencia: z.string().optional(),
      evidencia_nombre: z.string().optional(),
      // Si ya había subido uno y no cambia, se queda el mismo
      ruta_actual: z.string().optional(),
      nombre_actual: z.string().optional(),
    }),
    formData,
  );
  if (fallo) return fallo;
  const sinSesion = await conSesion();
  if (sinSesion) return sinSesion;

  const supabase = await clienteServidor();
  let ruta: string | null = null;
  let nombre: string | null = null;
  if (datos.respuesta === "si") {
    if (datos.evidencia) {
      const subido = await leerSubida(
        supabase,
        "data-room",
        "evidencia",
        datos.evidencia,
        datos.evidencia_nombre || "Archivo",
        `${datos.company_id}/evidencia/`,
      );
      if ("error" in subido) return error(subido.error, { evidencia: subido.error });
      ruta = subido.ruta;
      nombre = subido.nombre;
    } else if (datos.ruta_actual) {
      ruta = datos.ruta_actual;
      nombre = datos.nombre_actual || null;
    } else {
      return error("Si ya lo tenéis, adjunta el archivo que lo demuestra.", {
        evidencia: "Adjunta el archivo.",
      });
    }
  }

  const { error: falloBase } = await supabase.rpc("responder_lista_entrada", {
    p_company: datos.company_id,
    p_hito: datos.hito_id,
    p_respuesta: datos.respuesta,
    p_ruta: ruta as string,
    p_nombre: nombre as string,
  });
  if (falloBase) return traducirError(falloBase);
  refrescar();
  return ok();
}

/** El mentor verifica un «ya lo tenemos»: verificado, o «no basta» con su comentario */
export async function verificarLista(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      check_id: uuid,
      slug: z.string(),
      verificado: z.enum(["si", "no"]),
      comentario: z.string().trim().optional(),
    }),
    formData,
  );
  if (fallo) return fallo;
  if (datos.verificado === "no" && (datos.comentario ?? "").length < 5) {
    return error("Dile por qué no basta: es lo que ella va a completar.", { comentario: "Escribe por qué." });
  }
  const sinSesion = await conSesion();
  if (sinSesion) return sinSesion;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("verificar_lista_entrada", {
    p_check: datos.check_id,
    p_verificado: datos.verificado === "si",
    p_comentario: datos.comentario ?? "",
  });
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  return ok();
}

/** Paso 2 del asistente: generar el borrador, desde su tramo de entrada */
export async function generarHoja(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      company_id: uuid,
      slug: z.string(),
      inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "¿Desde qué día cuenta?"),
    }),
    formData,
  );
  if (fallo) return fallo;
  const sinSesion = await conSesion();
  if (sinSesion) return sinSesion;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("generar_hoja_de_ruta", {
    p_company: datos.company_id,
    p_inicio: datos.inicio,
  });
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  return ok();
}

/** Rehacerla mientras no se ha propuesto ni firmado */
export async function rehacerHoja(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ company_id: uuid, slug: z.string() }), formData);
  if (fallo) return fallo;
  const sinSesion = await conSesion();
  if (sinSesion) return sinSesion;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("borrar_borrador_hoja_de_ruta", { p_company: datos.company_id });
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  return ok();
}

/** Quitar un hito: uno propio, quien coordina; uno fundamental, solo dirección y con motivo */
export async function quitarHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ id: uuid, slug: z.string(), motivo: z.string().trim().optional() }),
    formData,
  );
  if (fallo) return fallo;
  const sinSesion = await conSesion();
  if (sinSesion) return sinSesion;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("quitar_hito", { p_hito: datos.id, p_motivo: datos.motivo ?? "" });
  if (falloBase) return traducirError(falloBase);
  refrescar(datos.slug);
  return ok();
}
