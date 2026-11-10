"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/supabase/servicio";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { notificar, type Evento } from "@/lib/correo";
import { direccionBase } from "@/lib/direccion";
import {
  CONCLUSIONES,
  FORMATOS,
  describirFranja,
  franjaDesdeFormulario,
  leerAsistentes,
  type Franja,
  type Formato,
} from "@/lib/reuniones";

/**
 * Las reuniones con una candidata: se acuerdan en la plataforma.
 *
 * IWL propone franjas, acepta una de las suyas, la cambia o la cancela, y
 * la anota cuando se celebra: con el cliente de sesión, porque las
 * reuniones son de IWL por RLS. Ella elige una franja o propone otras por
 * las funciones de la base (`reunion_elegir`, `reunion_contraproponer`),
 * con su testigo o con su sesión.
 *
 * Cada paso deja su evento en el historial y, si a ella le afecta, un
 * correo (`notificar`). Si el correo no sale, el paso no falla.
 */

async function soloIwl() {
  const persona = await personaActual();
  if (!persona) return { persona: null, fallo: error("Tu sesión ha caducado. Vuelve a entrar.") };
  if (!esIwl(persona.role)) return { persona: null, fallo: error("Las reuniones las lleva el equipo de IWL.") };
  return { persona, fallo: null };
}

const uuid = z.string().uuid();

function refrescar(candidaturaId: string) {
  revalidatePath(`/embudo/${candidaturaId}`);
  revalidatePath("/candidatura", "layout");
  revalidatePath("/cartera");
}

function franjasDe(formData: FormData, minutos: number): Franja[] {
  return [1, 2, 3]
    .map((n) => String(formData.get(`franja_${n}`) ?? ""))
    .map((f) => (f ? franjaDesdeFormulario(f, minutos) : null))
    .filter((f): f is Franja => f !== null);
}

/**
 * El correo a ella, con el enlace por el que entra: el privado si todavía
 * no tiene cuenta, «Tu candidatura» si ya la tiene.
 */
async function avisarla(
  candidaturaId: string,
  evento: Evento,
  datos: Record<string, string | null | undefined>,
  autor?: string | null,
): Promise<"enviado" | "sin_enviar" | null> {
  const { data: c } = await clienteServicio()
    .from("candidaturas")
    .select("nombre, contacto_nombre, contacto_email, token, token_anulado_at, profile_id")
    .eq("id", candidaturaId)
    .maybeSingle();
  if (!c?.contacto_email) return null;
  const base = direccionBase();
  const enlace = c.profile_id || !c.token || c.token_anulado_at ? `${base}/candidatura` : `${base}/candidatura/${c.token}`;
  const r = await notificar(
    { correo: c.contacto_email, nombre: c.contacto_nombre, profileId: c.profile_id },
    evento,
    { nombre: c.contacto_nombre, startup: c.nombre, enlace, ...datos },
    { candidaturaId, autor },
  );
  return r.estado;
}

/*
 * Sin mensaje de vuelta en lo que hace IWL: el acuse es la reunión
 * cambiada, y el formulario que la cambió deja de tener sitio —una
 * propuesta no se propone dos veces, una cancelada no se cancela—. Si el
 * correo salió o no, lo dice el bloque «Correos» de la misma ficha.
 */

/** Cierra los avisos de reunión de una candidatura: IWL ya ha respondido */
async function cerrarAvisos(candidaturaId: string, quien: string) {
  const supabase = await clienteServidor();
  await supabase
    .from("avisos")
    .update({ cerrado_at: new Date().toISOString(), cerrado_por: quien })
    .eq("candidatura_id", candidaturaId)
    .in("tipo", ["reunion_elegida", "reunion_contrapropuesta", "reunion_caducada"])
    .is("cerrado_at", null);
}

// -----------------------------------------------------------------------------
// IWL
// -----------------------------------------------------------------------------

const esquemaPropuesta = z.object({
  candidatura_id: uuid,
  duracion: z.coerce.number().int().min(15).max(240),
  formato: z.enum(["videollamada", "presencial"], { message: "¿Por videollamada o en persona?" }),
  enlace: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  nota: z.string().trim().max(600).optional(),
  motivo: z.string().trim().max(600).optional(),
});

/**
 * Proponer fechas. Si ya hay una reunión en juego, estas la sustituyen:
 * otras fechas tras su contrapropuesta, o un cambio de una confirmada, que
 * vuelve a propuesta y se le avisa.
 */
export async function proponerReunion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPropuesta, formData);
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const franjas = franjasDe(formData, datos.duracion);
  if (franjas.length < 2) {
    return error("Propón al menos dos franjas: con una sola, si no le va, hay que volver a empezar.", {
      franja_2: "Hace falta una segunda franja.",
    });
  }
  if (franjas.some((f) => new Date(f.inicio) <= new Date())) {
    return error("Alguna de las franjas ya ha pasado.", { franja_1: "Tienen que ser fechas por venir." });
  }
  if (datos.formato === "videollamada" && !datos.enlace) {
    return error("Falta el enlace de la videollamada.", { enlace: "¿Dónde os conectáis?" });
  }
  if (datos.formato === "presencial" && !datos.direccion) {
    return error("Falta la dirección.", { direccion: "¿Dónde os veis?" });
  }
  // Un id con forma de uuid; sin exigir versión, que los de la semilla no la llevan
  const personasIwl = formData
    .getAll("iwl")
    .map(String)
    .filter((v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));
  if (!personasIwl.length) return error("¿Quién va de IWL?", { iwl: "Marca al menos a una persona." });

  const supabase = await clienteServidor();
  const { data: enJuego } = await supabase
    .from("candidatura_reuniones")
    .select("id, estado")
    .eq("candidatura_id", datos.candidatura_id)
    .in("estado", ["propuesta", "contrapropuesta", "confirmada"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fila = {
    estado: "propuesta",
    propuesta_de: "iwl",
    propuesta_at: new Date().toISOString(),
    propuesta_por: persona!.id,
    franjas,
    formato: datos.formato,
    enlace: datos.formato === "videollamada" ? datos.enlace : null,
    direccion: datos.formato === "presencial" ? datos.direccion : null,
    nota: datos.nota || null,
    personas_iwl: personasIwl,
    elegida: null,
    confirmada_at: null,
    caducada_avisada_at: null,
  };
  const { error: falloBase } = enJuego
    ? await supabase.from("candidatura_reuniones").update(fila).eq("id", enJuego.id)
    : await supabase
        .from("candidatura_reuniones")
        .insert({ ...fila, candidatura_id: datos.candidatura_id, created_by: persona!.id });
  if (falloBase) return traducirError(falloBase);

  const cambio = enJuego?.estado === "confirmada";
  await supabase.from("candidatura_eventos").insert({
    candidatura_id: datos.candidatura_id,
    tipo: "reunion",
    titulo: cambio ? "Reunión cambiada: fechas nuevas" : enJuego ? "Otras fechas para la reunión" : "Reunión propuesta",
    detalle: `${franjas.map(describirFranja).join(" · ")} (Madrid), ${FORMATOS[datos.formato as Formato]}.${datos.motivo ? ` ${datos.motivo}` : ""}`,
    created_by: persona!.id,
  });
  await cerrarAvisos(datos.candidatura_id, persona!.id);

  await avisarla(
    datos.candidatura_id,
    cambio ? "reunion_cambiada" : "reunion_propuesta",
    { nota: datos.nota, motivo: datos.motivo },
    persona!.id,
  );
  refrescar(datos.candidatura_id);
  return ok();
}

/** Aceptar una de las franjas que propuso ella: queda confirmada */
export async function aceptarFranja(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(z.object({ reunion_id: uuid, candidatura_id: uuid, inicio: z.string() }), formData);
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { data: r } = await supabase
    .from("candidatura_reuniones")
    .select("estado, franjas, formato, enlace, direccion")
    .eq("id", datos.reunion_id)
    .maybeSingle();
  if (!r || r.estado !== "contrapropuesta") return error("Esa reunión ya no espera respuesta. Vuelve a cargar la página.");
  const franja = (r.franjas as unknown as Franja[]).find((f) => f.inicio === datos.inicio);
  if (!franja) return error("Esa no es una de sus franjas.");
  if (new Date(franja.inicio) <= new Date()) return error("Esa franja ya ha pasado. Propón otras.");

  const { error: falloBase } = await supabase
    .from("candidatura_reuniones")
    .update({ estado: "confirmada", elegida: franja, confirmada_at: new Date().toISOString() })
    .eq("id", datos.reunion_id);
  if (falloBase) return traducirError(falloBase);

  await supabase.from("candidatura_eventos").insert({
    candidatura_id: datos.candidatura_id,
    tipo: "reunion",
    titulo: "Reunión confirmada: IWL acepta una de sus fechas",
    detalle: `${describirFranja(franja)} (Madrid)`,
    created_by: persona!.id,
  });
  await cerrarAvisos(datos.candidatura_id, persona!.id);

  await avisarla(
    datos.candidatura_id,
    "reunion_confirmada",
    {
      cuando: describirFranja(franja),
      formato: r.formato ? FORMATOS[r.formato as Formato] : "",
      lugar: r.enlace ?? r.direccion,
    },
    persona!.id,
  );
  refrescar(datos.candidatura_id);
  return ok();
}

/** Cancelar, con motivo. Se le avisa */
export async function cancelarReunion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ reunion_id: uuid, candidatura_id: uuid, motivo: z.string().trim().min(3, "¿Por qué se cancela?") }),
    formData,
  );
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const supabase = await clienteServidor();
  const { data: r } = await supabase
    .from("candidatura_reuniones")
    .select("estado, elegida")
    .eq("id", datos.reunion_id)
    .maybeSingle();
  if (!r || !["propuesta", "contrapropuesta", "confirmada"].includes(r.estado)) {
    return error("Esa reunión ya no está en juego.");
  }
  const { error: falloBase } = await supabase
    .from("candidatura_reuniones")
    .update({ estado: "cancelada", cancelada_at: new Date().toISOString(), cancelada_motivo: datos.motivo })
    .eq("id", datos.reunion_id);
  if (falloBase) return traducirError(falloBase);

  await supabase.from("candidatura_eventos").insert({
    candidatura_id: datos.candidatura_id,
    tipo: "reunion",
    titulo: "Reunión cancelada",
    detalle: datos.motivo,
    created_by: persona!.id,
  });
  await cerrarAvisos(datos.candidatura_id, persona!.id);

  const elegida = r.elegida as unknown as Franja | null;
  await avisarla(
    datos.candidatura_id,
    "reunion_cancelada",
    { cuando: elegida ? describirFranja(elegida) : "que teníamos pendiente", motivo: datos.motivo },
    persona!.id,
  );
  refrescar(datos.candidatura_id);
  return ok();
}

// -----------------------------------------------------------------------------
// Ella
// -----------------------------------------------------------------------------

/** Con su testigo, el cliente sin sesión; sin él, el de su sesión */
async function clienteDeElla(token: string | undefined) {
  return token
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false },
      })
    : await clienteServidor();
}

/** La candidatura de quien responde, para el correo: lo resuelve la reunión, que ya ha validado la base */
async function candidaturaDeReunion(reunionId: string) {
  const { data } = await clienteServicio()
    .from("candidatura_reuniones")
    .select("candidatura_id, elegida, formato, enlace, direccion")
    .eq("id", reunionId)
    .maybeSingle();
  return data;
}

/** Ella elige una de las franjas: queda confirmada */
export async function elegirFranja(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({ reunion_id: uuid, inicio: z.string().min(10), token: z.string().optional() }),
    formData,
  );
  if (fallo) return fallo;

  const supabase = await clienteDeElla(datos.token || undefined);
  const { error: falloBase } = await supabase.rpc("reunion_elegir", {
    p_reunion: datos.reunion_id,
    p_inicio: datos.inicio,
    p_token: datos.token || undefined,
  });
  if (falloBase) return traducirError(falloBase);

  // Su confirmación por correo, con lo que necesita para ir
  const r = await candidaturaDeReunion(datos.reunion_id);
  if (r?.elegida) {
    await avisarla(r.candidatura_id, "reunion_confirmada", {
      cuando: describirFranja(r.elegida as unknown as Franja),
      formato: r.formato ? FORMATOS[r.formato as Formato] : "",
      lugar: r.enlace ?? r.direccion,
    });
    refrescar(r.candidatura_id);
  }
  revalidatePath(`/candidatura/${datos.token ?? ""}`);
  // El acuse es la tarjeta cambiada a «Reunión confirmada»
  return ok();
}

/** Ninguna le va: propone dos o tres franjas suyas */
export async function contraproponerReunion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(
    z.object({
      reunion_id: uuid,
      duracion: z.coerce.number().int().min(15).max(240),
      nota: z.string().trim().max(600).optional(),
      token: z.string().optional(),
    }),
    formData,
  );
  if (fallo) return fallo;

  const franjas = franjasDe(formData, datos.duracion);
  if (franjas.length < 2) {
    return error("Propón al menos dos fechas.", { franja_2: "Hace falta una segunda fecha." });
  }
  if (franjas.some((f) => new Date(f.inicio) <= new Date())) {
    return error("Alguna de las fechas ya ha pasado.", { franja_1: "Tienen que ser fechas por venir." });
  }

  const supabase = await clienteDeElla(datos.token || undefined);
  const { error: falloBase } = await supabase.rpc("reunion_contraproponer", {
    p_reunion: datos.reunion_id,
    p_franjas: franjas,
    p_nota: datos.nota || undefined,
    p_token: datos.token || undefined,
  });
  if (falloBase) return traducirError(falloBase);

  const r = await candidaturaDeReunion(datos.reunion_id);
  if (r) refrescar(r.candidatura_id);
  revalidatePath(`/candidatura/${datos.token ?? ""}`);
  // El acuse es la tarjeta cambiada: «Has propuesto otras fechas»
  return ok();
}

// -----------------------------------------------------------------------------
// Anotarla, cuando se celebra
// -----------------------------------------------------------------------------

const esquemaAnotar = z.object({
  candidatura_id: uuid,
  reunion_id: uuid.optional().or(z.literal("")),
  celebrada_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "¿Qué día fue?"),
  de_iwl: z.string().optional(),
  de_candidatura: z.string().optional(),
  notas: z.string().trim().min(10, "Escribe qué se habló: es lo que leerá el comité."),
  conclusion: z.enum(["seguir", "no_seguir", "pendiente"], { message: "¿Cómo quedó?" }),
});

export async function anotarReunion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaAnotar, formData);
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const asistentes = leerAsistentes(datos.de_iwl ?? null, datos.de_candidatura ?? null);
  if (!asistentes.length) {
    return error("¿Quién estuvo?", { de_iwl: "Al menos una persona." });
  }

  const supabase = await clienteServidor();
  const fila = {
    estado: "celebrada",
    celebrada_on: datos.celebrada_on,
    asistentes,
    notas: datos.notas,
    conclusion: datos.conclusion,
  };

  // Anotar la confirmada, o una reunión que no se acordó desde aquí
  const { data: reunion, error: falloBase } = datos.reunion_id
    ? await supabase.from("candidatura_reuniones").update(fila).eq("id", datos.reunion_id).select("id").single()
    : await supabase
        .from("candidatura_reuniones")
        .insert({ ...fila, candidatura_id: datos.candidatura_id, created_by: persona!.id })
        .select("id")
        .single();
  if (falloBase || !reunion) return falloBase ? traducirError(falloBase) : error("Esa reunión ya no está.");

  // Los adjuntos, al expediente, colgando de la reunión
  for (const fichero of formData.getAll("adjuntos")) {
    if (!(fichero instanceof File) || fichero.size === 0) continue;
    if (fichero.size > 50 * 1024 * 1024) return error(`${fichero.name} pasa de 50 MB.`);
    const seguro = fichero.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
    const ruta = `${datos.candidatura_id}/${Date.now()}-${seguro}`;
    const { error: falloSubida } = await supabase.storage
      .from("candidaturas")
      .upload(ruta, fichero, { contentType: fichero.type || undefined });
    if (falloSubida) return error(`No se ha podido subir ${fichero.name}: ${falloSubida.message}`);
    const { error: falloFicha } = await supabase.from("candidatura_documentos").insert({
      candidatura_id: datos.candidatura_id,
      reunion_id: reunion.id,
      nombre: fichero.name,
      storage_path: ruta,
      mime: fichero.type || null,
      bytes: fichero.size,
      created_by: persona!.id,
    });
    if (falloFicha) {
      await supabase.storage.from("candidaturas").remove([ruta]);
      return traducirError(falloFicha);
    }
  }

  await supabase.from("candidatura_eventos").insert({
    candidatura_id: datos.candidatura_id,
    tipo: "reunion",
    ocurrido_on: datos.celebrada_on,
    titulo: `Reunión · ${CONCLUSIONES[datos.conclusion]}`,
    detalle: datos.notas,
    created_by: persona!.id,
  });

  refrescar(datos.candidatura_id);
  return ok();
}
