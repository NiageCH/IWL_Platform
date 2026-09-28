"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/supabase/servicio";
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
 * Acciones de administración.
 *
 * Lo que hasta ahora se hacía por SQL o por script. Todo lo que se pueda hacer
 * con el cliente de sesión se hace así, para que mande RLS. La clave de
 * servicio aparece en un solo sitio, el alta de personas, porque crear una
 * cuenta en `auth.users` no se puede hacer de otra manera; ahí la
 * autorización se comprueba a mano y se dice por qué.
 */

function refrescar() {
  revalidatePath("/cartera", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/proyecto", "layout");
}

const ETAPAS = ["pre_semilla", "semilla", "serie_a"] as const;
const PERFILES = ["software", "software_ia", "hardware"] as const;

/*
 * El estado de entrada no es la etapa de inversión.
 *
 * `stage` responde a «cuánto ha levantado» y esto a «qué tiene construido».
 * Son independientes —se puede facturar sin haber levantado nada— y es este
 * el que decide qué hoja de ruta le corresponde.
 */
const ESTADOS_ENTRADA_VALIDOS = [
  "idea",
  "prototipo",
  "mvp",
  "primeros_clientes",
  "facturacion",
] as const;

const esquemaCompania = z.object({
  name: textoObligatorio(2, "¿Cómo se llama la compañía?"),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "En minúsculas y con guiones, como «marea-clinica».",
    ),
  sector: textoOpcional,
  one_liner: textoOpcional,
  stage: z.enum(ETAPAS),
  tech_profile: z.enum(PERFILES),
  entry_state: z.enum(ESTADOS_ENTRADA_VALIDOS),
  phase_code: textoObligatorio(),
  /*
   * La hoja de ruta es opcional en el alta.
   *
   * Se puede diseñar aquí, con la plantilla del estado de entrada, o más
   * tarde desde la ficha: un proyecto recién entrado todavía no tiene plan, y
   * forzar uno antes del diagnóstico es inventárselo.
   */
  roadmap_template: idOpcional,
  roadmap_start: fechaOpcional,
  cohort_id: idOpcional,
  female_leadership_pct: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      const t = (v ?? "").toString().trim().replace(",", ".");
      return t === "" ? null : Number(t);
    })
    .refine(
      (v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 100),
      "Un porcentaje entre 0 y 100.",
    ),
  founded_on: fechaOpcional,
  website: textoOpcional,
});

/**
 * Alta de una compañía.
 *
 * La función de la base instancia además el checklist, las secciones del
 * business plan y los KPI del núcleo, todo en la misma transacción: una
 * compañía a medias no es una compañía, es una ficha vacía.
 */
export async function crearCompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaCompania, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();

  const { error: falloBase } = await supabase.rpc("crear_compania", {
    p_name: datos.name,
    p_slug: datos.slug,
    // Los opcionales se envían como undefined y no como null: la función
    // los declara con valor por defecto
    p_sector: datos.sector ?? undefined,
    p_one_liner: datos.one_liner ?? undefined,
    p_stage: datos.stage,
    p_tech_profile: datos.tech_profile,
    p_entry_state: datos.entry_state,
    p_phase_code: datos.phase_code,
    p_roadmap_template: datos.roadmap_template ?? undefined,
    p_roadmap_start: datos.roadmap_start ?? undefined,
    p_cohort_id: datos.cohort_id ?? undefined,
    p_female_leadership_pct: datos.female_leadership_pct ?? undefined,
    p_founded_on: datos.founded_on ?? undefined,
    p_website: datos.website ?? undefined,
  });

  if (falloBase) {
    if (falloBase.code === "23505") {
      return error("Ya hay una compañía con ese identificador.", {
        slug: "Ese identificador está ocupado.",
      });
    }
    return traducirError(falloBase);
  }

  refrescar();
  return ok(
    datos.roadmap_template
      ? `${datos.name} dada de alta, con su checklist, sus KPI y su hoja de ruta listos.`
      : `${datos.name} dada de alta, con su checklist y sus KPI listos. Su hoja de ruta se diseña desde la ficha.`,
  );
}

const esquemaFicha = z.object({
  id: uuid,
  slug: textoObligatorio(),
  name: textoObligatorio(2),
  sector: textoOpcional,
  one_liner: textoOpcional,
  stage: z.enum(ETAPAS),
  tech_profile: z.enum(PERFILES),
  /*
   * El estado de entrada se puede corregir.
   *
   * No cambia con el tiempo —es el estado del día que entró, y por eso el
   * recorrido que se le diseñó tiene sentido— pero se puede haber clasificado
   * mal al darla de alta, o quedar sin fijar en las que son anteriores a este
   * campo.
   */
  entry_state: z.enum(ESTADOS_ENTRADA_VALIDOS).nullish(),
  phase_id: idOpcional,
  cohort_id: idOpcional,
});

/** La etapa y la fase las mueve IWL: deciden el nivel objetivo y el score */
export async function editarCompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaFicha, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { id, slug, ...cambios } = datos;

  const { error: falloBase } = await supabase
    .from("companies")
    .update(cambios)
    .eq("id", id);

  if (falloBase) return traducirError(falloBase);

  revalidatePath(`/cartera/${slug}`, "layout");
  refrescar();
  return ok("Ficha actualizada.");
}

const ROLES = [
  "admin_iwl",
  "equipo_iwl",
  "revisor_niage",
  "fundadora",
  "mentor",
  "lector_externo",
] as const;

/*
 * El papel dentro de una compañía, que no es el rol de la persona.
 *
 * `mentor` a secas ya no se ofrece: el papel de un mentor depende del
 * proyecto, y la misma persona coordina uno y entra de apoyo en otro. El
 * valor sigue en el enum porque Postgres no deja quitarlo sin recrear el
 * tipo, pero ninguna pantalla lo propone.
 */
const PAPELES = [
  "fundadora",
  "responsable_iwl",
  "revisor_niage",
  "mentor_principal",
  "mentor_secundario",
] as const;

const esquemaPersona = z.object({
  email: z.string().trim().email("Eso no parece un correo."),
  full_name: textoObligatorio(2, "¿Cómo se llama?"),
  role: z.enum(ROLES),
  company_id: idOpcional,
  member_role: z
    .union([z.enum(PAPELES), z.literal(""), z.null(), z.undefined()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

/**
 * Alta de una persona.
 *
 * Crear una cuenta en `auth.users` necesita la clave de servicio: no hay otra
 * forma. Por eso aquí, y solo aquí, se comprueba la autorización a mano antes
 * de usarla. En todo lo demás escribe el cliente de sesión y manda RLS.
 */
export async function crearPersona(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPersona, formData);
  if (fallo) return fallo;

  if (datos.company_id && !datos.member_role) {
    return error("Al asignar una compañía hace falta decir con qué papel.", {
      member_role: "Elige el papel en la compañía.",
    });
  }

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (persona.role !== "admin_iwl") {
    return error("Dar de alta a una persona es de la dirección de IWL.");
  }

  const servicio = clienteServicio();

  const { data: creada, error: falloAlta } = await servicio.auth.admin.createUser({
    email: datos.email,
    email_confirm: true,
    user_metadata: { full_name: datos.full_name, role: datos.role },
  });

  let usuarioId = creada?.user?.id;

  if (falloAlta) {
    if (!/already|registered|exists/i.test(falloAlta.message)) {
      return error(`No se ha podido crear la cuenta: ${falloAlta.message}`);
    }
    // Ya existía: se actualiza su rol y se sigue con la asignación
    const { data: existente } = await servicio
      .from("profiles")
      .select("id")
      .eq("email", datos.email)
      .maybeSingle();

    if (!existente) {
      return error("Esa cuenta existe pero no se ha podido recuperar.");
    }
    usuarioId = existente.id;
  }

  const { error: falloPerfil } = await servicio
    .from("profiles")
    .update({ full_name: datos.full_name, role: datos.role })
    .eq("id", usuarioId!);

  if (falloPerfil) return traducirError(falloPerfil);

  if (datos.company_id && datos.member_role) {
    const supabase = await clienteServidor();
    const { error: falloAsignacion } = await supabase.from("company_members").insert({
      company_id: datos.company_id,
      profile_id: usuarioId!,
      member_role: datos.member_role,
    });

    if (falloAsignacion && falloAsignacion.code !== "23505") {
      return traducirError(falloAsignacion);
    }
  }

  refrescar();
  return ok(
    falloAlta
      ? `${datos.email} ya tenía cuenta. Se ha actualizado su rol.`
      : `${datos.email} dada de alta. Ya puede pedir su enlace de entrada.`,
  );
}

const horasOpcionales = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, "No puede ser un número negativo.");

const esquemaAsignacion = z.object({
  profile_id: uuid,
  company_id: uuid,
  member_role: z.enum(PAPELES),
  title: textoOpcional,
  assigned_hours: horasOpcionales,
  rate_profile: textoOpcional,
  starts_on: fechaOpcional,
  ends_on: fechaOpcional,
});

/** Quitar una asignación solo necesita saber cuál */
const esquemaQuitar = z.object({
  profile_id: uuid,
  company_id: uuid,
  member_role: z.enum(PAPELES),
});

export async function asignarACompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaAsignacion, formData);
  if (fallo) return fallo;

  if (datos.starts_on && datos.ends_on && datos.ends_on < datos.starts_on) {
    return error("La asignación no puede terminar antes de empezar.", {
      ends_on: "Antes del inicio.",
    });
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.from("company_members").insert(datos);

  if (falloBase) {
    if (falloBase.code === "23505") {
      return error(
        "Esa persona ya tiene ese papel en esa compañía. Si quieres cambiarle las horas, edita la asignación que ya tiene.",
      );
    }
    return traducirError(falloBase);
  }

  refrescar();
  return ok("Asignada.");
}

export async function quitarAsignacion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaQuitar, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("company_members")
    .delete()
    .eq("profile_id", datos.profile_id)
    .eq("company_id", datos.company_id)
    .eq("member_role", datos.member_role);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Asignación retirada.");
}

const esquemaRol = z.object({
  profile_id: uuid,
  role: z.enum(ROLES),
  is_active: z
    .union([z.literal("on"), z.literal("off"), z.null(), z.undefined()])
    .optional()
    .transform((v) => v === "on"),
});

export async function cambiarRol(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaRol, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");

  if (persona.id === datos.profile_id && datos.role !== "admin_iwl") {
    return error(
      "No puedes quitarte a ti misma la administración: te quedarías fuera. Que lo haga otra persona con ese rol.",
    );
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("profiles")
    .update({ role: datos.role, is_active: datos.is_active })
    .eq("id", datos.profile_id);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Rol actualizado.");
}

// -----------------------------------------------------------------------------
// Configuración
// -----------------------------------------------------------------------------

const esquemaObjetivo = z.object({
  id: uuid,
  target_level: z.coerce.number().int().min(0).max(4),
});

/**
 * Nivel objetivo de una dimensión en una etapa.
 *
 * Mover esto cambia el score de todas las compañías de esa etapa, pero **no**
 * cambia las instantáneas ya tomadas: el histórico está congelado. Es lo que
 * permite tocar la configuración sin que el recorrido de nadie se reescriba.
 */
export async function guardarObjetivo(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaObjetivo, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("tech_stage_targets")
    .update({ target_level: datos.target_level })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok();
}

const esquemaPeso = z.object({
  id: uuid,
  weight: z.coerce.number().min(0).max(10),
});

export async function guardarPesoDimension(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPeso, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("tech_dimension_weights")
    .update({ weight: datos.weight })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok();
}

export async function guardarPesoArea(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPeso, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("dd_areas")
    .update({ weight: datos.weight })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok();
}

const esquemaUmbrales = z.object({
  score_tecnico_minimo: z.coerce.number().min(0).max(100),
  score_preparacion_minimo: z.coerce.number().min(0).max(100),
  runway_minimo_meses: z.coerce.number().min(0).max(60),
});

export async function guardarUmbrales(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaUmbrales, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: datos })
    .eq("key", "umbrales_invertible");

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Umbrales guardados. El estado invertible se recalcula al leerlo.");
}

const esquemaBandas = z.object({
  inicio_hasta: z.coerce.number().min(0).max(100),
  desarrollo_hasta: z.coerce.number().min(0).max(100),
  consolidada_hasta: z.coerce.number().min(0).max(100),
});

export async function guardarBandas(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaBandas, formData);
  if (fallo) return fallo;

  if (
    !(datos.inicio_hasta < datos.desarrollo_hasta) ||
    !(datos.desarrollo_hasta < datos.consolidada_hasta)
  ) {
    return error("Los cortes tienen que ir de menor a mayor.");
  }

  const bandas = [
    { codigo: "inicio", nombre: "Inicio", desde: 0, hasta: datos.inicio_hasta },
    {
      codigo: "en_desarrollo",
      nombre: "En desarrollo",
      desde: datos.inicio_hasta,
      hasta: datos.desarrollo_hasta,
    },
    {
      codigo: "consolidada",
      nombre: "Consolidada",
      desde: datos.desarrollo_hasta,
      hasta: datos.consolidada_hasta,
    },
    {
      codigo: "preparada",
      nombre: "Preparada",
      desde: datos.consolidada_hasta,
      hasta: 100,
    },
  ];

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: bandas })
    .eq("key", "bandas_preparacion");

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Bandas guardadas.");
}

const esquemaTarifa = z.object({
  id: uuid,
  applied_rate: z.coerce.number().min(0).max(1000),
  market_rate: z.coerce.number().min(0).max(1000),
});

/**
 * Cambiar una tarifa no toca las horas ya imputadas: cada línea guardó la
 * suya el día que se registró. Lo que cambia es lo que se aplicará de aquí en
 * adelante.
 */
export async function guardarTarifa(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaTarifa, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("rate_cards")
    .update({ applied_rate: datos.applied_rate, market_rate: datos.market_rate })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Tarifa guardada. Las horas ya imputadas conservan la suya.");
}

const esquemaCohorte = z.object({
  name: textoObligatorio(2, "¿Cómo se llama la cohorte?"),
  start_date: fechaOpcional,
  end_date: fechaOpcional,
  investable_target: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      const t = (v ?? "").toString().trim();
      return t === "" ? null : Number(t);
    })
    .refine((v) => v === null || Number.isInteger(v), "Un número entero."),
});

export async function crearCohorte(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaCohorte, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();

  const { data: organizacion } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "iwl")
    .maybeSingle();

  if (!organizacion) return error("No existe la organización de IWL.");

  const { error: falloBase } = await supabase.from("cohorts").insert({
    organization_id: organizacion.id,
    ...datos,
  });

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Cohorte creada.");
}

/**
 * Pesos de los ejes de madurez.
 *
 * No tienen que sumar cien: el índice se reparte sobre el peso de los ejes
 * que de verdad tienen datos, así que lo que importa es la proporción entre
 * ellos. Poner un eje a cero lo saca del cálculo sin borrarlo.
 */
const esquemaPesosMadurez = z.object({
  tecnologia: z.coerce.number().min(0).max(100),
  gobierno: z.coerce.number().min(0).max(100),
  plan: z.coerce.number().min(0).max(100),
  traccion: z.coerce.number().min(0).max(100),
  solidez: z.coerce.number().min(0).max(100),
});

export async function guardarPesosMadurez(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPesosMadurez, formData);
  if (fallo) return fallo;

  const total = Object.values(datos).reduce((t, v) => t + v, 0);
  if (total === 0) {
    return error("Al menos un eje tiene que pesar algo, o no hay índice.");
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: datos })
    .eq("key", "pesos_madurez");

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok(
    "Pesos guardados. La madurez se recalcula al leerla, también la del día de partida: se compara siempre con la misma vara.",
  );
}

const esquemaObjetivosTraccion = z.object({
  pre_semilla: z.coerce.number().min(0),
  semilla: z.coerce.number().min(0),
  serie_a: z.coerce.number().min(0),
});

export async function guardarObjetivosTraccion(
  formData: FormData,
): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaObjetivosTraccion, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("platform_settings")
    .update({ value: datos })
    .eq("key", "objetivos_traccion");

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Objetivos de tracción guardados.");
}

// -----------------------------------------------------------------------------
// Ciclo de vida de una compañía
//
// Archivar saca de la cartera y conserva el histórico. Borrar es para lo que
// se creó por error: la base comprueba que no hay nada dentro antes de
// dejarlo, porque una comprobación que vive en el formulario se salta con una
// llamada directa y esto no tiene deshacer.
// -----------------------------------------------------------------------------

const esquemaArchivar = z.object({
  id: uuid,
  slug: textoObligatorio(),
  motivo: textoOpcional,
});

export async function archivarCompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaArchivar, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("archivar_compania", {
    target_company: datos.id,
    ...(datos.motivo ? { motivo: datos.motivo } : {}),
  });

  if (falloBase) return traducirError(falloBase);

  revalidatePath(`/cartera/${datos.slug}`, "layout");
  refrescar();
  return ok(
    "Compañía archivada. Sale de la cartera y su equipo deja de verla, pero su histórico sigue entero y se puede restaurar.",
  );
}

export async function restaurarCompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ id: uuid }), formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("restaurar_compania", {
    target_company: datos.id,
  });

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Compañía restaurada. Vuelve a la cartera y su equipo la ve otra vez.");
}

/**
 * Borrado real.
 *
 * Pide escribir el identificador de la compañía. No es teatro: es lo único
 * que separa un clic accidental de una decisión, y la acción no tiene
 * deshacer aunque la base se niegue a borrar lo que tiene contenido.
 */
const esquemaBorrar = z.object({
  id: uuid,
  slug: textoObligatorio(),
  confirmacion: textoObligatorio(1, "Escribe el identificador para confirmar."),
});

export async function borrarCompania(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaBorrar, formData);
  if (fallo) return fallo;

  if (datos.confirmacion.trim() !== datos.slug) {
    return error(
      `Para borrarla, escribe «${datos.slug}» exactamente. Si lo que quieres es sacarla del programa sin perder su historial, archívala.`,
      { confirmacion: "No coincide con el identificador." },
    );
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.rpc("borrar_compania", {
    target_company: datos.id,
  });

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok(`${datos.slug} borrada. No tenía nada registrado.`);
}

// -----------------------------------------------------------------------------
// Ciclo de vida de una persona
// -----------------------------------------------------------------------------

/**
 * Editar los datos de una persona.
 *
 * El correo no se toca: es su identidad en `auth.users` y cambiarlo la
 * dejaría sin poder entrar. Si alguien cambia de correo, se le da de alta con
 * el nuevo y se archiva el viejo.
 */
const esquemaEditarPersona = z.object({
  id: uuid,
  full_name: textoObligatorio(2, "¿Cómo se llama?"),
  role: z.enum(ROLES),
});

export async function editarPersona(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaEditarPersona, formData);
  if (fallo) return fallo;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("profiles")
    .update({ full_name: datos.full_name, role: datos.role })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok("Datos actualizados.");
}

/**
 * Archivar a una persona.
 *
 * Deja de poder entrar y desaparece de los desplegables, pero sus horas, sus
 * validaciones y sus tareas siguen llevando su nombre. Un extracto de
 * aportación donde las horas las puso «alguien que ya no está» no justifica
 * nada.
 */
const esquemaArchivarPersona = z.object({ id: uuid, activa: z.enum(["si", "no"]) });

export async function archivarPersona(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaArchivarPersona, formData);
  if (fallo) return fallo;

  const persona = await personaActual();
  if (persona?.id === datos.id && datos.activa === "no") {
    return error("No puedes archivarte a ti misma: te quedarías fuera.");
  }

  const supabase = await clienteServidor();
  const archivar = datos.activa === "no";

  const { error: falloBase } = await supabase
    .from("profiles")
    .update({
      is_active: !archivar,
      archived_at: archivar ? new Date().toISOString() : null,
    })
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar();
  return ok(
    archivar
      ? "Persona archivada. Deja de entrar, pero su trabajo sigue registrado a su nombre."
      : "Persona reactivada.",
  );
}

/**
 * Borrado real de una persona.
 *
 * Solo si no ha dejado rastro. Hay que quitar la cuenta de `auth.users`, que
 * necesita la clave de servicio, así que la autorización se comprueba aquí a
 * mano igual que en el alta.
 */
const esquemaBorrarPersona = z.object({
  id: uuid,
  email: textoObligatorio(),
  confirmacion: textoObligatorio(1, "Escribe el correo para confirmar."),
});

export async function borrarPersona(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaBorrarPersona, formData);
  if (fallo) return fallo;

  if (datos.confirmacion.trim().toLowerCase() !== datos.email.toLowerCase()) {
    return error(
      `Para borrarla, escribe «${datos.email}» exactamente. Si solo quieres que deje de entrar, archívala.`,
      { confirmacion: "No coincide con el correo." },
    );
  }

  const persona = await personaActual();
  if (!persona) return error("Tu sesión ha caducado. Vuelve a entrar.");
  if (persona.role !== "admin_iwl") {
    return error("Borrar a una persona es de la dirección de IWL.");
  }
  if (persona.id === datos.id) {
    return error("No puedes borrarte a ti misma.");
  }

  const supabase = await clienteServidor();
  const { data: tieneActividad, error: falloConsulta } = await supabase.rpc(
    "persona_tiene_actividad",
    { target_profile: datos.id },
  );

  if (falloConsulta) return traducirError(falloConsulta);

  if (tieneActividad) {
    return error(
      "Esta persona tiene trabajo registrado a su nombre y no se puede borrar. Archívala: deja de entrar y su historial se mantiene.",
    );
  }

  const servicio = clienteServicio();
  const { error: falloBorrado } = await servicio.auth.admin.deleteUser(datos.id);
  if (falloBorrado) return error(falloBorrado.message);

  refrescar();
  return ok(`${datos.email} borrada. No tenía nada registrado.`);
}
