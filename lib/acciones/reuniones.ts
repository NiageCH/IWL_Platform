"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { error, ok, traducirError, validar, type Resultado } from "@/lib/acciones/resultado";
import { CONCLUSIONES, franjaDesdeFormulario, leerAsistentes } from "@/lib/reuniones";

/**
 * Las reuniones con una candidata: proponerla y anotarla.
 *
 * Con el cliente de sesión: las reuniones son de IWL por RLS. Cada una deja
 * su evento en el historial del expediente, que es donde se lee qué ha
 * pasado con una candidatura.
 */

async function soloIwl() {
  const persona = await personaActual();
  if (!persona) return { persona: null, fallo: error("Tu sesión ha caducado. Vuelve a entrar.") };
  if (!esIwl(persona.role)) return { persona: null, fallo: error("Las reuniones las lleva el equipo de IWL.") };
  return { persona, fallo: null };
}

const uuid = z.string().uuid();

const esquemaPropuesta = z.object({
  candidatura_id: uuid,
  duracion: z.coerce.number().int().min(15).max(240),
  franja_1: z.string().optional(),
  franja_2: z.string().optional(),
  franja_3: z.string().optional(),
});

export async function proponerReunion(formData: FormData): Promise<Resultado> {
  const { datos, fallo } = validar(esquemaPropuesta, formData);
  if (fallo) return fallo;
  const { persona, fallo: sinPermiso } = await soloIwl();
  if (sinPermiso) return sinPermiso;

  const franjas = [datos.franja_1, datos.franja_2, datos.franja_3]
    .map((f) => (f ? franjaDesdeFormulario(f, datos.duracion) : null))
    .filter((f): f is NonNullable<typeof f> => f !== null);

  if (franjas.length < 2) {
    return error("Propón al menos dos franjas: con una sola, si no le va, se pierde un correo.", {
      franja_2: "Hace falta una segunda franja.",
    });
  }

  const supabase = await clienteServidor();
  const { error: falloBase } = await supabase.from("candidatura_reuniones").insert({
    candidatura_id: datos.candidatura_id,
    propuesta_at: new Date().toISOString(),
    propuesta_por: persona!.id,
    franjas,
    created_by: persona!.id,
  });
  if (falloBase) return traducirError(falloBase);

  await supabase.from("candidatura_eventos").insert({
    candidatura_id: datos.candidatura_id,
    tipo: "reunion",
    titulo: "Reunión propuesta",
    detalle: `${franjas.length} franjas, de ${datos.duracion} minutos.`,
    created_by: persona!.id,
  });

  revalidatePath(`/embudo/${datos.candidatura_id}`);
  return ok();
}

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
    celebrada_on: datos.celebrada_on,
    asistentes,
    notas: datos.notas,
    conclusion: datos.conclusion,
  };

  // Anotar la propuesta, o una reunión que no se propuso desde aquí
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

  revalidatePath(`/embudo/${datos.candidatura_id}`);
  return ok();
}
