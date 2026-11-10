"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio, marcarContrasenaTemporal } from "@/lib/supabase/servicio";
import { generarClave } from "@/lib/claves";
import {
  FORMA_IDENTIFICADOR,
  identificadorDe,
  normalizarWeb,
  primeroLibre,
} from "@/lib/identificador";
import { camposSocietarios, exigir, leerFirmantes, paraGuardar } from "@/lib/societario";
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
  "entrada",
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
  const { id, ...todos } = validado.datos;

  /*
   * Solo lo que trae el formulario.
   *
   * El esquema es el del alta, y un campo opcional que no llega se queda en
   * nulo. Guardar la ficha borraba así lo que el formulario de edición no
   * enseña —cómo llegó, en qué punto dice estar, cuántas son, las notas—,
   * en silencio y cada vez.
   */
  const datos = Object.fromEntries(
    Object.entries(todos).filter(([campo]) => formData.has(campo)),
  ) as Partial<typeof todos>;

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
  /*
   * El identificador en la plataforma. Normalmente vacío: sale del nombre.
   * Solo se escribe a mano en «Opciones avanzadas».
   */
  slug: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine(
      (v) => v === "" || FORMA_IDENTIFICADOR.test(v),
      "Solo minúsculas, números y guiones, como siren o la-pepi. No es la web: esa va en su campo.",
    ),
  /** La web de la compañía, como se escriba. Se normaliza en la acción */
  website: z.union([z.string(), z.null()]).optional(),
  /** Quién firma: las personales una por línea, y quien representa a la sociedad */
  firmantes: z.union([z.string(), z.null()]).optional(),
  representante: z.union([z.string(), z.null()]).optional(),
  stage: z.enum(["pre_semilla", "semilla", "serie_a"]),
  tech_profile: z.enum(["software", "software_ia", "hardware"]),
  phase_code: textoOpcional,
  roadmap_template: z.string().trim().nullable().catch(null),
  roadmap_start: fechaOpcional,
  firmado_on: fechaOpcional,
})
  .merge(camposSocietarios)
  .superRefine((d, ctx) => {
    exigir(d, ctx);
    const firmantes = leerFirmantes(d.situacion_societaria, d.firmantes, d.representante);
    if (d.situacion_societaria === "constituida" && !d.representante?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["representante"],
        message: "Falta quién firma en nombre de la sociedad.",
      });
    } else if (firmantes.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["firmantes"],
        message: "Sin sociedad firman las fundadoras a título personal: escribe sus nombres.",
      });
    }
  });

export async function firmarCandidatura(
  formData: FormData,
): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaFirma, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  let web: string | null;
  try {
    web = normalizarWeb(datos.website);
  } catch (e) {
    return error("Revisa este campo: la web de la compañía.", {
      website: (e as Error).message,
    });
  }

  const supabase = await clienteServidor();

  const { data: candidatura } = await supabase
    .from("candidaturas")
    .select("nombre")
    .eq("id", datos.id)
    .maybeSingle();
  if (!candidatura) return error("Esa candidatura ya no está.");

  /*
   * El identificador: el escrito a mano tal cual, o el que sale del nombre
   * con el primer número libre. Escrito a mano y ocupado, se dice en su
   * campo; generado, no se le pregunta a nadie.
   */
  const base = datos.slug || identificadorDe(candidatura.nombre);
  if (!base) {
    return error("Revisa este campo: el identificador en la plataforma.", {
      slug: "El nombre no da para un identificador. Escríbelo en «Opciones avanzadas».",
    });
  }
  const { data: parecidos } = await supabase
    .from("companies")
    .select("slug")
    .like("slug", `${base}%`);
  const ocupados = (parecidos ?? []).map((c) => c.slug);

  if (datos.slug && ocupados.includes(datos.slug)) {
    return error("Revisa este campo: el identificador en la plataforma.", {
      slug: `Ya hay una compañía con «${datos.slug}». Prueba con ${primeroLibre(datos.slug, ocupados)}.`,
    });
  }
  const slug = datos.slug || primeroLibre(base, ocupados);

  /*
   * La web, la situación societaria y quién firma se escriben en la
   * candidatura, y la firma los pasa a la compañía. La base se niega a
   * firmar sin situación ni firmantes, así que no depende de esta pantalla.
   */
  const { error: falloDatos } = await supabase
    .from("candidaturas")
    .update({
      ...(web ? { website: web } : {}),
      ...paraGuardar(datos),
      acuerdo_firmantes: leerFirmantes(datos.situacion_societaria, datos.firmantes, datos.representante),
    })
    .eq("id", datos.id);
  if (falloDatos) return traducirError(falloDatos);

  const { error: falloFirma } = await supabase.rpc("firmar_candidatura", {
    p_candidatura: datos.id,
    p_slug: slug,
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

  /*
   * Con `select`, para saber si de verdad ha cambiado algo.
   *
   * Un `update` que una política no deja pasar afecta a cero filas y
   * **no devuelve error**: PostgREST lo da por correcto. Sin esta
   * comprobación, la pantalla decía «convocatoria abierta» y la
   * convocatoria seguía cerrada, que es la peor forma de fallar: la que
   * parece que ha funcionado.
   */
  const { data: tocadas, error: falloConvocatoria } = await supabase
    .from("cohorts")
    .update({
      convocatoria_abierta: abierta,
      convocatoria_cierra: cierra,
      convocatoria_texto: texto,
    })
    .eq("id", cohort_id)
    .select("id");

  if (falloConvocatoria) return traducirError(falloConvocatoria);

  if (!tocadas || tocadas.length === 0) {
    return error(
      "No se ha podido cambiar la convocatoria. Puede que esa cohorte ya no exista o que tu cuenta no tenga permiso.",
    );
  }

  revalidatePath("/embudo");
  revalidatePath("/presentarse");
  return ok(abierta ? "Convocatoria abierta." : "Convocatoria cerrada.");
}

// -----------------------------------------------------------------------------
// El acceso de la candidata
// -----------------------------------------------------------------------------

/**
 * Enviar el NDA, desde Preseleccionada: darle cuenta y pasar a «NDA
 * enviado» en un paso. Fuera de Preseleccionada solo le da la cuenta, como
 * antes: hay candidaturas que llegaron a NDA a mano.
 *
 * Darle cuenta, al firmar el NDA.
 *
 * Es el momento en que empieza a entregar material del due diligence, y el
 * momento en que un enlace deja de bastar: una dirección se reenvía y no se
 * puede retirar. Al dar la cuenta, el enlace se anula; las dos cosas van
 * juntas en la misma función de la base para que nadie pueda hacer una sin
 * la otra.
 */
export async function darAccesoCandidata(
  formData: FormData,
): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const id = String(formData.get("id") ?? "");
  if (!id) return error("Falta saber cuál.");

  const supabase = await clienteServidor();

  const { data: candidatura } = await supabase
    .from("candidaturas")
    .select("nombre, contacto_email, contacto_nombre, profile_id, estado")
    .eq("id", id)
    .maybeSingle();

  if (!candidatura) return error("Esa candidatura ya no está.");
  if (candidatura.profile_id) return error("Esa candidata ya tiene acceso.");

  const servicio = clienteServicio();
  const clave = generarClave();

  const { data: creada, error: falloAlta } = await servicio.auth.admin.createUser(
    {
      email: candidatura.contacto_email!,
      email_confirm: true,
      password: clave,
      user_metadata: { full_name: candidatura.contacto_nombre },
    },
  );

  let profileId = creada?.user?.id;

  // La pone IWL, así que la candidata la cambia al entrar por primera vez
  if (profileId) {
    const { error: falloMarca } = await marcarContrasenaTemporal(servicio, profileId);
    if (falloMarca) return error(`No se ha podido preparar la cuenta: ${falloMarca.message}`);
  }

  if (falloAlta) {
    if (!/already|registered|exists/i.test(falloAlta.message)) {
      return error(`No se ha podido crear la cuenta: ${falloAlta.message}`);
    }
    // Ya tenía cuenta de antes: se reutiliza
    const { data: existente } = await servicio
      .from("profiles")
      .select("id")
      .eq("email", candidatura.contacto_email!)
      .maybeSingle();
    if (!existente) return error("Esa cuenta existe pero no se recupera.");
    profileId = existente.id;
  }

  const { error: falloAcceso } = await supabase.rpc("dar_acceso_candidatura", {
    p_candidatura: id,
    p_profile: profileId!,
  });

  if (falloAcceso) return traducirError(falloAcceso);

  // El cambio de paso deja su evento en el historial por sí solo
  const enviado = candidatura.estado === "preseleccionada";
  if (enviado) {
    const { error: falloPaso } = await supabase.from("candidaturas").update({ estado: "nda" }).eq("id", id);
    if (falloPaso) {
      return error(
        `Tiene cuenta, pero no ha pasado a «NDA enviado»: ${falloPaso.message}. Su contraseña es ${clave} — cópiala ahora, no se vuelve a enseñar.`,
      );
    }
  }

  refrescar(id);
  return {
    ok: true,
    mensaje: enviado
      ? `NDA enviado a ${candidatura.contacto_email}. Su contraseña es ${clave} — cópiala ahora, no se vuelve a enseñar. El enlace privado queda anulado.`
      : `Acceso dado a ${candidatura.contacto_email}. Su contraseña es ${clave} — cópiala ahora, no se vuelve a enseñar. El enlace privado queda anulado.`,
    datos: {
      correo: candidatura.contacto_email!,
      nombre: candidatura.contacto_nombre ?? "",
      clave,
    },
  };
}

/**
 * La candidata entrega un documento.
 *
 * El fichero va a su carpeta de Storage y el metadato a la base, apuntando
 * —si procede— al punto del checklist que responde. Las dos cosas: el
 * fichero suelto en un bucket no permite contestar «qué falta», que es la
 * pregunta que se hace todos los días mientras dura un due diligence.
 *
 * Qué candidatura es lo resuelve la base por la sesión, no el formulario.
 * Si viniera en el formulario, alguien podría cambiarlo por otra.
 */
export async function subirDocumentoCandidata(
  formData: FormData,
): Promise<Resultado> {
  const persona = await personaActual();
  if (!persona) return error("Hay que entrar para hacer esto.");

  const fichero = formData.get("documento");
  if (!(fichero instanceof File) || fichero.size === 0) {
    return error("Elige un fichero.");
  }

  if (fichero.size > 50 * 1024 * 1024) {
    return error(
      `Ese fichero pesa ${(fichero.size / 1024 / 1024).toFixed(0)} MB y el máximo son 50. Si es un vídeo, mándanos el enlace.`,
    );
  }

  const peticion = String(formData.get("peticion_id") ?? "") || null;

  const supabase = await clienteServidor();

  const { data: candidaturaId } = await supabase.rpc("mi_candidatura_id");
  if (!candidaturaId) {
    return error("No encontramos tu candidatura. Escríbenos.");
  }

  const seguro = fichero.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  const ruta = `${candidaturaId}/${Date.now()}-${seguro}`;

  const { error: falloSubida } = await supabase.storage
    .from("candidaturas")
    .upload(ruta, fichero, { contentType: fichero.type || undefined });

  if (falloSubida) {
    return error(`No se ha podido subir: ${falloSubida.message}`);
  }

  const { error: falloFicha } = await supabase
    .from("candidatura_documentos")
    .insert({
      candidatura_id: candidaturaId,
      peticion_id: peticion,
      nombre: fichero.name,
      storage_path: ruta,
      mime: fichero.type || null,
      bytes: fichero.size,
      created_by: persona.id,
    });

  if (falloFicha) {
    // Sin metadato, el fichero no se encuentra: no se deja suelto
    await supabase.storage.from("candidaturas").remove([ruta]);
    return traducirError(falloFicha);
  }

  revalidatePath("/candidatura");
  return ok(`${fichero.name} entregado. Gracias.`);
}

/**
 * IWL abre un documento entregado.
 *
 * El bucket es privado, así que se firma una dirección que dura un rato.
 * No se deja fija: una dirección permanente a documentación de due
 * diligence es una dirección que acaba en un correo reenviado.
 */
export async function abrirDocumentoCandidata(
  formData: FormData,
): Promise<Resultado & { url?: string }> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const ruta = String(formData.get("storage_path") ?? "");
  if (!ruta) return error("Falta saber cuál.");

  const supabase = await clienteServidor();
  const { data, error: falloFirma } = await supabase.storage
    .from("candidaturas")
    .createSignedUrl(ruta, 300);

  if (falloFirma || !data) {
    return error("No se ha podido abrir el documento.");
  }

  return { ok: true, url: data.signedUrl };
}

/** IWL pide algo que no está en la plantilla */
const esquemaPeticion = z.object({
  candidatura_id: uuid,
  titulo: textoObligatorio(1, "¿Qué le pides?"),
  detalle: textoOpcional,
});

export async function pedirDocumento(formData: FormData): Promise<Resultado> {
  const { fallo, persona } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaPeticion, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const supabase = await clienteServidor();
  const { error: falloPeticion } = await supabase
    .from("candidatura_peticiones")
    .insert({
      ...datos,
      area: "A medida",
      // Al final de la lista: lo que se pide sobre la marcha va después de
      // lo que se pide siempre
      orden: 9999,
      created_by: persona!.id,
    });

  if (falloPeticion) return traducirError(falloPeticion);

  refrescar(datos.candidatura_id);
  return ok("Pedido. Lo verá en su lista.");
}

/**
 * La situación societaria de una candidatura, antes de firmar.
 *
 * Conviene decirla pronto: el due diligence de selección se pide al llegar
 * al NDA, y sin sociedad no tiene sentido pedirle la escritura. Al guardarla,
 * la base ajusta lo que se le pide (`ajustar_peticiones_societarias`).
 */
const esquemaSituacion = z
  .object({ id: uuid })
  .merge(camposSocietarios)
  .superRefine((d, ctx) => exigir(d, ctx));

export async function guardarSituacionCandidatura(formData: FormData): Promise<Resultado> {
  const { fallo } = await soloIwl();
  if (fallo) return fallo;

  const validado = validar(esquemaSituacion, formData);
  if (validado.fallo) return validado.fallo;
  const datos = validado.datos;

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase
    .from("candidaturas")
    .update(paraGuardar(datos))
    .eq("id", datos.id);

  if (falloBase) return traducirError(falloBase);

  refrescar(datos.id);
  return ok("Guardada. Lo que se le pide del due diligence ya va según esta situación.");
}
