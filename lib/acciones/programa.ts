"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  fechaOpcional,
  idOpcional,
  numeroEscritoAMano,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

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

const esquemaHito = z.object({
  slug: textoObligatorio(),
  id: uuid,
  status: z.enum(["pendiente", "en_curso", "cumplido", "retrasado"]),
  evidence: textoOpcional,
});

export async function cambiarEstadoHito(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaHito, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();

  const cambios =
    datos.evidence === null
      ? { status: datos.status }
      : { status: datos.status, evidence: datos.evidence };

  const { error: falloBase } = await supabase
    .from("milestones")
    .update(cambios)
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.slug);
  return ok();
}

/**
 * Registro rápido de horas.
 *
 * El documento pide tres campos y menos de diez segundos: si cuesta más, no se
 * usa, y un libro de horas que no se rellena no sirve para nada. La fecha es
 * hoy por defecto y las tarifas las pone la base desde `rate_cards`.
 */
const esquemaHoras = z.object({
  slug: textoObligatorio(),
  company_id: uuid,
  annex_id: idOpcional,
  worked_on: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha se escribe como 2026-12-31."),
  person_name: textoObligatorio(2, "¿Quién ha hecho estas horas?"),
  profile_code: textoObligatorio(2, "Elige un perfil."),
  subject_id: uuid,
  description: textoObligatorio(5, "Una línea sobre qué se ha hecho."),
  hours: z.coerce
    .number()
    .positive("Las horas tienen que ser un número mayor que cero.")
    .max(24, "No caben más de 24 horas en un día."),
});

export async function registrarHoras(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaHoras, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  const supabase = await clienteServidor();
  const { slug, ...linea } = datos;

  // La tarifa se copia de `rate_cards`, no se referencia: así un cambio de
  // tarifa mañana no reescribe el valor de estas horas. La base tiene un
  // trigger que hace lo mismo, pero leerla aquí permite dar un mensaje que
  // se entiende si falta.
  const { data: tarifa } = await supabase
    .from("rate_cards")
    .select("id, applied_rate, market_rate")
    .eq("profile_code", linea.profile_code)
    .lte("valid_from", linea.worked_on)
    .or(`valid_to.is.null,valid_to.gte.${linea.worked_on}`)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tarifa) {
    return error(
      `No hay tarifa vigente para el perfil «${linea.profile_code}» el ${linea.worked_on}.`,
      { profile_code: "Sin tarifa para esa fecha." },
    );
  }

  const { error: falloBase } = await supabase.from("contribution_hours").insert({
    ...linea,
    applied_rate: tarifa.applied_rate,
    market_rate: tarifa.market_rate,
    rate_card_id: tarifa.id,
    created_by: persona.id,
  });

  if (falloBase) return traducirError(falloBase);

  refrescar(slug);
  return ok(`${datos.hours} h registradas.`);
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
  entity: z.enum(["contribution_hours", "cash_disbursements", "introductions"]),
  entity_id: uuid,
  reason: textoObligatorio(10, "Explica qué no cuadra."),
});

/**
 * Objeción de la compañía a un registro de aportación.
 *
 * Las horas de IWL no necesitan confirmación previa, para no crear fricción,
 * pero la compañía puede objetar por escrito. Sin este registro, ese derecho
 * sería una frase en un documento.
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

  if (ultima?.status === "borrador") {
    return error("Ya hay un Anexo en borrador. Termina ese y fírmalo.");
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
  ends_on: fechaOpcional,
  committed_hours: numeroEscritoAMano(0, 100_000, "Escribe las horas en número."),
  committed_hours_value: numeroEscritoAMano(0, 10_000_000, "Escribe el valor en número."),
  committed_cash: numeroEscritoAMano(0, 10_000_000, "Escribe el importe en número."),
  committed_seniors: numeroEscritoAMano(0, 100, "Escribe cuántas personas, en número."),
  equity_pct: numeroEscritoAMano(0, 100, "El equity va entre 0 y 100."),
  other_commitments: textoOpcional,
});

export async function guardarAnexo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaAnexo, formData);
  if (fallo) return fallo;

  const noPuede = await soloIwl();
  if (noPuede) return noPuede;

  const { slug, id, ...campos } = datos;
  const supabase = await clienteServidor();

  const { data, error: falloBase } = await supabase
    .from("annexes")
    .update(campos)
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
  if (anexo.status !== "borrador") return error("Ese Anexo ya está firmado.");

  if (!anexo.duration_months || !anexo.committed_hours) {
    return error(
      "Antes de firmar, pon al menos la duración y las horas comprometidas: lo firmado ya no se edita.",
    );
  }

  const { data, error: falloBase } = await supabase
    .from("annexes")
    .update({ status: "firmado", signed_on: datos.signed_on })
    .eq("id", datos.id)
    .eq("status", "borrador")
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
