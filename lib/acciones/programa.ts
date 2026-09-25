"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  fechaOpcional,
  idOpcional,
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
