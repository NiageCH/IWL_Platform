"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import {
  error,
  fechaOpcional,
  ok,
  textoObligatorio,
  textoOpcional,
  traducirError,
  uuid,
  validar,
  type Resultado,
} from "./resultado";

/**
 * El embudo de selección.
 *
 * Todo esto es del equipo de IWL. La comprobación se repite en cada acción
 * aunque RLS ya lo impida: la política devuelve un error de base, y un
 * «permission denied» en pantalla no le dice a nadie qué ha pasado.
 */

const ESTADOS = [
  "presentada",
  "en_revision",
  "reunion",
  "comite",
  "preseleccionada",
  "nda",
  "diligencia",
  "acuerdo",
  "firmada",
  "descartada",
] as const;

const ESTADOS_ENTRADA = [
  "idea",
  "prototipo",
  "mvp",
  "primeros_clientes",
  "facturacion",
] as const;

async function soloIwl() {
  const persona = await personaActual();
  if (!persona) return { fallo: error("Hay que entrar para hacer esto.") };
  if (!esIwl(persona.role)) {
    return { fallo: error("El embudo de selección es del equipo de IWL.") };
  }
  return { persona };
}

function refrescar(id?: string) {
  revalidatePath("/embudo");
  if (id) revalidatePath(`/embudo/${id}`);
}

// -----------------------------------------------------------------------------
// Alta y edición
// -----------------------------------------------------------------------------

/*
 * Un número que puede faltar.
 *
 * `.optional()` va antes del transform, como en `textoOpcional`: es lo que
 * marca la clave como opcional dentro del objeto. Sin eso, un formulario que
 * sencillamente no trae el campo —el alta a mano no pide el tamaño del
 * equipo— falla la validación entera con un «revisa los campos marcados»
 * que no señala ninguno.
 */
const numeroOpcional = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    const recortado = (v ?? "").trim();
    return recortado === "" ? null : Number(recortado);
  })
  .refine((v) => v === null || Number.isFinite(v), "Escribe un número.");

const esquemaCandidatura = z.object({
  cohort_id: uuid,
  nombre: textoObligatorio(1, "¿Cómo se llama la startup?"),
  sector: textoOpcional,
  one_liner: textoOpcional,
  website: textoOpcional,
  pais: textoOpcional,
  contacto_nombre: textoObligatorio(1, "¿Con quién se habla?"),
  contacto_email: z.string().trim().email("Ese correo no parece un correo."),
  contacto_telefono: textoOpcional,
  contacto_cargo: textoOpcional,
  estado_declarado: z.enum(ESTADOS_ENTRADA).nullable().catch(null),
  equipo_personas: numeroOpcional,
  liderazgo_femenino_pct: numeroOpcional,
  origen: textoOpcional,
  notas: textoOpcional,
});

export async function crearCandidatura(formData: FormData): Promise<Resultado> {
  const { fallo, persona } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaCandidatura, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const supabase = await clienteServidor();
  const { error: falloAlta } = await supabase.from("candidaturas").insert({
    ...datos,
    created_by: persona!.id,
  });

  if (falloAlta) return traducirError(falloAlta);

  refrescar();
  return ok(`${datos.nombre} entra en el embudo.`);
}

const esquemaEdicion = esquemaCandidatura
  .omit({ cohort_id: true })
  .extend({ id: uuid });

export async function editarCandidatura(
  formData: FormData,
): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaEdicion, formData);
  if (validado.fallo) return validado.fallo;
  const { id, ...datos } = validado.datos;

  const supabase = await clienteServidor();
  const { error: falloEdicion } = await supabase
    .from("candidaturas")
    .update(datos)
    .eq("id", id);

  if (falloEdicion) return traducirError(falloEdicion);

  refrescar(id);
  return ok("Ficha actualizada.");
}

// -----------------------------------------------------------------------------
// Mover por el embudo
// -----------------------------------------------------------------------------

const esquemaMover = z.object({
  id: uuid,
  estado: z.enum(ESTADOS),
});

export async function moverCandidatura(formData: FormData): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaMover, formData);
  if (validado.fallo) return validado.fallo;
  const { id, estado } = validado.datos;

  /*
   * A `firmada` no se llega moviendo.
   *
   * Firmar crea una compañía, y para eso hacen falta datos que no están en
   * la candidatura: el slug, la etapa de inversión, el perfil técnico. Tiene
   * su propio formulario.
   */
  if (estado === "firmada") {
    return error(
      "Para firmar hay que crear la compañía, y eso pide algún dato más. Usa «Firmar el acuerdo».",
    );
  }

  if (estado === "descartada") {
    return error("Para descartar hace falta el motivo. Usa «Descartar».");
  }

  const supabase = await clienteServidor();
  const { error: falloMover } = await supabase
    .from("candidaturas")
    .update({ estado })
    .eq("id", id);

  if (falloMover) return traducirError(falloMover);

  refrescar(id);
  return ok("Movida.");
}

const esquemaDescarte = z.object({
  id: uuid,
  motivo: textoObligatorio(
    3,
    "Escribe por qué. Dentro de seis meses nadie se acordará.",
  ),
});

export async function descartarCandidatura(
  formData: FormData,
): Promise<Resultado> {
  const { fallo, persona } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaDescarte, formData);
  if (validado.fallo) return validado.fallo;
  const { id, motivo } = validado.datos;

  const supabase = await clienteServidor();

  const { data: antes } = await supabase
    .from("candidaturas")
    .select("estado")
    .eq("id", id)
    .maybeSingle();

  if (!antes) return error("Esa candidatura ya no está.");
  if (antes.estado === "firmada") {
    return error("Esa candidatura ya firmó. No se descarta lo que está dentro.");
  }

  const { error: falloDescarte } = await supabase
    .from("candidaturas")
    .update({
      estado: "descartada",
      // Desde dónde se cayó: es la mitad del valor de descartar
      descartada_desde: antes.estado,
      descartada_motivo: motivo,
      descartada_at: new Date().toISOString(),
      descartada_por: persona!.id,
    })
    .eq("id", id);

  if (falloDescarte) return traducirError(falloDescarte);

  refrescar(id);
  return ok("Descartada, con su motivo.");
}

export async function reabrirCandidatura(
  formData: FormData,
): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const id = String(formData.get("id") ?? "");
  if (!id) return error("Falta saber cuál.");

  const supabase = await clienteServidor();

  const { data: antes } = await supabase
    .from("candidaturas")
    .select("descartada_desde")
    .eq("id", id)
    .maybeSingle();

  /*
   * Vuelve a donde estaba, no al principio. Una candidata que se descartó en
   * comité y se reabre no tiene que repetir la reunión.
   */
  const { error: falloReapertura } = await supabase
    .from("candidaturas")
    .update({
      estado: antes?.descartada_desde ?? "en_revision",
      descartada_desde: null,
      descartada_motivo: null,
      descartada_at: null,
      descartada_por: null,
    })
    .eq("id", id);

  if (falloReapertura) return traducirError(falloReapertura);

  refrescar(id);
  return ok("Reabierta, en el paso donde se quedó.");
}

// -----------------------------------------------------------------------------
// Los hitos del proceso
// -----------------------------------------------------------------------------

const esquemaHitos = z.object({
  id: uuid,
  nda_firmado_on: fechaOpcional,
  acuerdo_propuesto_on: fechaOpcional,
  estado_verificado: z.enum(ESTADOS_ENTRADA).nullable().catch(null),
  equity_pct: numeroOpcional,
  aportacion_propuesta: textoOpcional,
});

export async function guardarAcuerdo(formData: FormData): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaHitos, formData);
  if (validado.fallo) return validado.fallo;
  const { id, ...datos } = validado.datos;

  if (datos.equity_pct !== null && (datos.equity_pct < 0 || datos.equity_pct > 100)) {
    return error("El equity va entre 0 y 100.", { equity_pct: "Entre 0 y 100." });
  }

  const supabase = await clienteServidor();
  const { error: falloGuardar } = await supabase
    .from("candidaturas")
    .update(datos)
    .eq("id", id);

  if (falloGuardar) return traducirError(falloGuardar);

  refrescar(id);
  return ok("Guardado.");
}

// -----------------------------------------------------------------------------
// Enlaces y eventos
// -----------------------------------------------------------------------------

const esquemaEnlace = z.object({
  candidatura_id: uuid,
  titulo: textoObligatorio(1, "¿Qué es este documento?"),
  url: z.string().trim().url("Eso no parece una dirección web."),
  tipo: textoOpcional,
});

export async function anadirEnlace(formData: FormData): Promise<Resultado> {
  const { fallo, persona } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaEnlace, formData);
  if (validado.fallo) return validado.fallo;

  const supabase = await clienteServidor();
  const { error: falloEnlace } = await supabase
    .from("candidatura_enlaces")
    .insert({ ...validado.datos, created_by: persona!.id });

  if (falloEnlace) return traducirError(falloEnlace);

  refrescar(validado.datos.candidatura_id);
  return ok("Enlace añadido.");
}

export async function quitarEnlace(formData: FormData): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const id = String(formData.get("id") ?? "");
  const candidatura = String(formData.get("candidatura_id") ?? "");
  if (!id) return error("Falta saber cuál.");

  const supabase = await clienteServidor();
  const { error: falloQuitar } = await supabase
    .from("candidatura_enlaces")
    .delete()
    .eq("id", id);

  if (falloQuitar) return traducirError(falloQuitar);

  refrescar(candidatura);
  return ok("Enlace quitado.");
}

const esquemaEvento = z.object({
  candidatura_id: uuid,
  tipo: z.enum(["reunion", "comite", "nota"]),
  ocurrido_on: fechaOpcional,
  titulo: textoOpcional,
  detalle: textoObligatorio(3, "Escribe qué pasó."),
});

export async function anotarEvento(formData: FormData): Promise<Resultado> {
  const { fallo, persona } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaEvento, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const supabase = await clienteServidor();
  const { error: falloEvento } = await supabase
    .from("candidatura_eventos")
    .insert({
      ...datos,
      ocurrido_on: datos.ocurrido_on ?? new Date().toISOString().slice(0, 10),
      created_by: persona!.id,
    });

  if (falloEvento) return traducirError(falloEvento);

  refrescar(datos.candidatura_id);
  return ok(
    datos.tipo === "comite" ? "Informe de comité guardado." : "Anotado.",
  );
}

// -----------------------------------------------------------------------------
// Firmar: el final del embudo
// -----------------------------------------------------------------------------

const esquemaFirma = z.object({
  id: uuid,
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Minúsculas, números y guiones. Es lo que irá en la dirección web.",
    ),
  stage: z.enum(["pre_semilla", "semilla", "serie_a"]),
  tech_profile: z.enum(["software", "software_ia", "hardware"]),
  phase_code: textoOpcional,
  roadmap_template: z.string().trim().nullable().catch(null),
  roadmap_start: fechaOpcional,
  firmado_on: fechaOpcional,
});

export async function firmarCandidatura(
  formData: FormData,
): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaFirma, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const supabase = await clienteServidor();
  const { error: falloFirma } = await supabase.rpc("firmar_candidatura", {
    p_candidatura: datos.id,
    p_slug: datos.slug,
    p_stage: datos.stage,
    p_tech_profile: datos.tech_profile,
    p_phase_code: datos.phase_code ?? undefined,
    p_roadmap_template: datos.roadmap_template || undefined,
    p_roadmap_start: datos.roadmap_start ?? undefined,
    p_firmado_on: datos.firmado_on ?? undefined,
  });

  if (falloFirma) return traducirError(falloFirma);

  refrescar(datos.id);
  revalidatePath("/cartera");
  return ok("Firmada. Ya está en la cartera con su hoja de ruta.");
}

// -----------------------------------------------------------------------------
// La convocatoria
// -----------------------------------------------------------------------------

const esquemaConvocatoria = z.object({
  cohort_id: uuid,
  abierta: z.coerce.boolean(),
  cierra: fechaOpcional,
  texto: textoOpcional,
});

export async function configurarConvocatoria(
  formData: FormData,
): Promise<Resultado> {
  const persona = await personaActual();
  if (!persona) return error("Hay que entrar para hacer esto.");
  if (persona.role !== "admin_iwl") {
    return error("Abrir o cerrar la convocatoria es de la dirección de IWL.");
  }

  const validado = validar(esquemaConvocatoria, formData);
  if (validado.fallo) return validado.fallo;
  const { cohort_id, abierta, cierra, texto } = validado.datos;

  const supabase = await clienteServidor();
  const { error: falloConvocatoria } = await supabase
    .from("cohorts")
    .update({
      convocatoria_abierta: abierta,
      convocatoria_cierra: cierra,
      convocatoria_texto: texto,
    })
    .eq("id", cohort_id);

  if (falloConvocatoria) return traducirError(falloConvocatoria);

  revalidatePath("/embudo");
  revalidatePath("/presentarse");
  return ok(abierta ? "Convocatoria abierta." : "Convocatoria cerrada.");
}
