"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  fechaOpcional,
  numeroEscritoAMano,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";
import { finAnexo, tarifaAnexo, valorHoras } from "@/lib/anexo";

/**
 * Acciones del programa: hitos y registro de aportación.
 *
 * Como en el resto, quién puede hacer qué lo deciden las políticas y los
 * triggers de la base. Confirmar un hito como cumplido es de IWL; moverlo a
 * «en curso» y aportar evidencia es trabajo de la compañía.
 */

function refrescar(slug: string) {
  revalidatePath("/proyecto", "layout");
  revalidatePath(`/cartera/${slug}`, "layout");
  revalidatePath("/cartera");
  /*
   * Y administración, que enseña si una compañía se puede borrar.
   *
   * Cualquier cosa que se registre aquí —un Anexo, un hito, un documento,
   * horas, un KPI— cambia esa respuesta. Sin esto, la lista seguía
   * ofreciendo un borrado a secas que la base iba a rechazar.
   */
  revalidatePath("/admin", "layout");
}

const esquemaIntroduccion = z.object({
  slug: textoObligatorio(),
  id: uuid,
  status: z.enum([
    "presentada",
    "reunion_celebrada",
    "en_negociacion",
    "cerrada",
    "descartada",
  ]),
  outcome: textoOpcional,
  amount: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      const t = (v ?? "").toString().trim().replace(",", ".");
      return t === "" ? null : Number(t);
    })
    .refine((v) => v === null || Number.isFinite(v), "Escribe un importe."),
  closed_on: fechaOpcional,
});

/** La compañía actualiza el resultado de una introducción; crearla es de IWL */
export async function actualizarIntroduccion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaIntroduccion, formData);
  if (fallo) return fallo;

  if (datos.status === "cerrada" && !datos.closed_on) {
    return error("Una introducción cerrada necesita su fecha de cierre.", {
      closed_on: "¿Cuándo se cerró?",
    });
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("introductions")
    .update({
      status: datos.status,
      outcome: datos.outcome,
      amount: datos.amount,
      closed_on: datos.closed_on,
    })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

const esquemaObjecion = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  // Las horas ya no se objetan: se dice «No cuadra» en su sesión (REVISION, 13 nov)
  entity: z.enum(["cash_disbursements", "introductions"]),
  entity_id: uuid,
  reason: textoObligatorio(10, "Explica qué no cuadra."),
});

/**
 * Objeción de la compañía a un registro de aportación.
 *
 * Para la caja y las introducciones. Las horas tienen su propio circuito:
 * ella las confirma o dice que no cuadran, en su sesión (REVISION, 13 nov).
 */
export async function objetar(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaObjecion, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { slug, ...objecion } = datos;

  const { error: falloBase } = await supabase
    .from("objections")
    .insert({ ...objecion, raised_by: persona.id });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok("Objeción registrada. El equipo de IWL la revisará.");
}

// -----------------------------------------------------------------------------
// El Anexo de Programa: abrirlo, rellenarlo y firmarlo
//
// Faltaba entero, y era un callejón sin salida como el del due diligence
// técnico: la pantalla decía «todavía no hay Anexo firmado» y no había por
// dónde empezar uno. Los tres de la semilla existían; cualquier compañía
// nueva se quedaba sin Programa, sin Aportación y sin poder imputar horas,
// que es la mitad de la plataforma.
// -----------------------------------------------------------------------------

/** Abrir el Anexo exige ser IWL: es el documento que fija el equity */
async function soloIwl(): Promise<Resultado | null> {
  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (persona.role !== "admin_iwl" && persona.role !== "equipo_iwl") {
    return error("El Anexo de Programa lo lleva el equipo de IWL.");
  }
  return null;
}

export async function abrirAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ slug: textoObligatorio(), company_id: uuid }),
    formData,
  );
  if (fallo) return fallo;

  const noPuede = await soloIwl();
  if (noPuede) return noPuede;

  const supabase = await clienteServidor();

  /*
   * La versión siguiente, no siempre la 1.
   *
   * Un Anexo firmado no se reescribe: se firma otra versión. Así que abrir
   * uno nuevo cuando ya hay uno firmado es lo normal al renovar, y la
   * versión tiene que subir —hay un único por (compañía, versión)—.
   */
  const { data: ultima } = await supabase
    .from("annexes")
    .select("version, status")
    .eq("company_id", datos.company_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ultima && ultima.status !== "firmado" && ultima.status !== "cerrado") {
    return error("Ya hay un Anexo sin firmar. Termina ese antes de abrir otro.");
  }

  const { error: falloBase } = await supabase.from("annexes").insert({
    company_id: datos.company_id,
    version: (ultima?.version ?? 0) + 1,
    status: "borrador",
  });

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);

  /*
   * Sin mensaje: el formulario que llama a esto vive dentro de «si no hay
   * Anexo», condición que su propio éxito vuelve falsa. El acuse es la
   * pantalla, donde aparece el Anexo en borrador con sus campos.
   */
  return ok();
}

const esquemaAnexo = z.object({
  slug: textoObligatorio(),
  id: uuid,
  duration_months: numeroEscritoAMano(1, 60, "La duración va de 1 a 60 meses."),
  starts_on: fechaOpcional,
  committed_hours: numeroEscritoAMano(0, 100_000, "Escribe las horas en número."),
  committed_hours_value: numeroEscritoAMano(0, 10_000_000, "Escribe el valor en número."),
  // Con tarifa en Programa, el valor se calcula; escribir otro pide el motivo
  valor_a_mano: z.preprocess((v) => v === "on", z.boolean()),
  committed_hours_value_motivo: textoOpcional,
  committed_cash: numeroEscritoAMano(0, 10_000_000, "Escribe el importe en número."),
  equity_pct: numeroEscritoAMano(0, 100, "El equity va entre 0 y 100."),
  other_commitments: textoOpcional,
});

export async function guardarAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaAnexo, formData);
  if (fallo) return fallo;

  const noPuede = await soloIwl();
  if (noPuede) return noPuede;

  const { slug, id, valor_a_mano, committed_hours_value_motivo, ...campos } = datos;
  const supabase = await clienteServidor();

  /*
   * «Termina el» no se teclea: sale del inicio y la duración. Y con tarifa
   * en Programa, «Valoradas en» tampoco, salvo que se escriba otro valor y
   * se diga por qué: el motivo va con la propuesta.
   */
  const { data: ajuste } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "anexo_tarifa_hora")
    .maybeSingle();
  const tarifa = tarifaAnexo(ajuste?.value);
  let valor = campos.committed_hours_value;
  let motivo: string | null = null;
  if (tarifa !== null && !valor_a_mano) {
    valor = valorHoras(campos.committed_hours, tarifa);
  } else if (tarifa !== null && valor !== valorHoras(campos.committed_hours, tarifa)) {
    if (!committed_hours_value_motivo) {
      return error("Falta el motivo.", {
        committed_hours_value_motivo: "Escribe por qué no es el valor calculado con la tarifa del programa.",
      });
    }
    motivo = committed_hours_value_motivo;
  }

  const { data, error: falloBase } = await supabase
    .from("annexes")
    .update({
      ...campos,
      committed_hours_value: valor,
      committed_hours_value_motivo: motivo,
      ends_on: finAnexo(campos.starts_on, campos.duration_months),
    })
    .eq("id", id)
    .eq("status", "borrador")
    .select("id");

  if (falloBase) return traducirError(falloBase);

  /*
   * Cero filas y sin error es lo que pasa cuando una política no deja
   * pasar el `update`, o cuando el Anexo ya está firmado. En los dos casos
   * hay que decirlo: es la peor forma de fallar, la que parece que ha ido
   * bien, y ya ha salido tres veces en este proyecto.
   */
  if (!data || data.length === 0) {
    return error(
      "No se ha guardado. Si el Anexo ya está firmado, no se edita: abre una versión nueva.",
    );
  }

  refrescar(slug);
  return ok("Anexo guardado.");
}

export async function firmarAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      slug: textoObligatorio(),
      id: uuid,
      signed_on: textoObligatorio(1, "¿Qué día se firma?"),
    }),
    formData,
  );
  if (fallo) return fallo;

  const noPuede = await soloIwl();
  if (noPuede) return noPuede;

  const supabase = await clienteServidor();

  /*
   * Se pide lo mínimo para que el Anexo signifique algo: la duración y lo
   * que IWL compromete. Firmar un documento vacío lo deja firmado y sin
   * decir nada, y a partir de ahí no se puede editar.
   */
  const { data: anexo } = await supabase
    .from("annexes")
    .select("duration_months, committed_hours, status")
    .eq("id", datos.id)
    .maybeSingle();

  if (!anexo) return error("Ese Anexo no existe o no está a tu alcance.");
  // Solo aceptado por ella: un Anexo no se firma sin su aceptación (REVISION, 10 nov)
  if (anexo.status !== "aceptado") {
    return error("Ese Anexo no está para firmar: se firma cuando ella ha aceptado la propuesta.");
  }

  if (!anexo.duration_months || !anexo.committed_hours) {
    return error(
      "Antes de firmar, pon al menos la duración y las horas comprometidas: lo firmado ya no se edita.",
    );
  }

  const { data, error: falloBase } = await supabase
    .from("annexes")
    .update({ status: "firmado", signed_on: datos.signed_on })
    .eq("id", datos.id)
    .eq("status", "aceptado")
    .select("id");

  if (falloBase) return traducirError(falloBase);
  if (!data || data.length === 0) {
    return error("No se ha podido firmar: no te deja tocar este Anexo.");
  }

  refrescar(datos.slug);

  /*
   * Sin mensaje, igual que al abrirlo: el formulario de firma solo se monta
   * mientras el Anexo está en borrador, y firmarlo vuelve esa condición
   * falsa. Un mensaje aquí no lo leería nadie.
   *
   * El acuse es la pantalla: la pastilla pasa de «Borrador» a «Firmado el
   * …» y el formulario de edición desaparece, que es exactamente lo que ha
   * cambiado.
   */
  return ok();
}
