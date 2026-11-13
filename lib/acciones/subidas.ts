"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { comprobarFichero, sanear, type ClaseSubida } from "@/lib/subidas";
// El de la casa, no `z.string().uuid()`: los ids de la semilla no llevan versión
import { uuid } from "./resultado";

/**
 * La dirección firmada para subir un fichero directamente a Storage.
 *
 * Aquí se decide **adónde** va —la ruta la pone el servidor, nunca la
 * pantalla— y se comprueba lo que la base no sabe: el tamaño y el tipo
 * anunciados. **Quién** puede subir ahí lo decide la base: la dirección se
 * firma con la sesión de quien la pide, y Storage aplica las políticas de
 * `storage.objects` al firmar. Pedir una para la carpeta de otra compañía
 * devuelve «violates row-level security policy», y eso es lo que comprueba
 * `tests/rls/subidas.test.ts`.
 *
 * La dirección sirve una vez y caduca a las dos horas. Si la subida no se
 * llega a registrar, el fichero queda sin documento que lo apunte: ocupa
 * sitio, pero no se ve en ninguna pantalla.
 */

const destino = z.discriminatedUnion("clase", [
  z.object({ clase: z.literal("documento"), companyId: uuid, areaId: uuid }),
  z.object({ clase: z.literal("evidencia"), companyId: uuid }),
  z.object({ clase: z.literal("candidata") }),
  z.object({ clase: z.literal("reunion"), candidaturaId: uuid }),
  z.object({ clase: z.literal("nda"), candidaturaId: uuid }),
  z.object({ clase: z.literal("cv"), profileId: uuid }),
  z.object({ clase: z.literal("logo"), companyId: uuid }),
]);

export type DestinoSubida = z.infer<typeof destino>;

export type SubidaPreparada =
  | { ok: true; bucket: string; ruta: string; url: string }
  | { ok: false; error: string };

const BUCKET: Record<Exclude<ClaseSubida, "foto">, string> = {
  documento: "data-room",
  evidencia: "data-room",
  candidata: "candidaturas",
  reunion: "candidaturas",
  nda: "candidaturas",
  cv: "personas",
  logo: "logos",
};

function extension(nombre: string, porDefecto: string) {
  return (nombre.split(".").pop()?.toLowerCase() ?? porDefecto).replace(/[^a-z0-9]/g, "") || porDefecto;
}

export async function prepararSubida(
  aDonde: DestinoSubida,
  fichero: { nombre: string; tamano: number; tipo: string },
): Promise<SubidaPreparada> {
  const leido = destino.safeParse(aDonde);
  if (!leido.success) return { ok: false, error: "No sabemos adónde va ese fichero." };
  const d = leido.data;

  const persona = await personaActual();
  if (!persona) return { ok: false, error: "Tu sesión ha caducado. Vuelve a entrar." };

  const problema = comprobarFichero(d.clase, fichero);
  if (problema) return { ok: false, error: problema };

  const supabase = await clienteServidor();
  const nombre = sanear(fichero.nombre) || "fichero";
  let ruta: string;

  switch (d.clase) {
    case "documento": {
      const { data: area } = await supabase.from("dd_areas").select("code").eq("id", d.areaId).maybeSingle();
      if (!area) return { ok: false, error: "Esa área de due diligence no existe." };
      // El id del documento va en la ruta: se registra con ese mismo id
      ruta = `${d.companyId}/${area.code}/${randomUUID()}/${nombre}`;
      break;
    }
    case "evidencia":
      ruta = `${d.companyId}/evidencia/${randomUUID()}/${nombre}`;
      break;
    case "candidata": {
      // Qué candidatura es lo dice la sesión, no la pantalla
      const { data: candidaturaId } = await supabase.rpc("mi_candidatura_id");
      if (!candidaturaId) return { ok: false, error: "No encontramos tu candidatura. Escríbenos." };
      ruta = `${candidaturaId}/${Date.now()}-${nombre}`;
      break;
    }
    case "reunion":
      if (!esIwl(persona.role)) return { ok: false, error: "Los adjuntos de una reunión los sube IWL." };
      ruta = `${d.candidaturaId}/${Date.now()}-${nombre}`;
      break;
    case "nda":
      if (persona.role !== "admin_iwl") return { ok: false, error: "Un NDA firmado fuera lo registra dirección." };
      ruta = `${d.candidaturaId}/${Date.now()}-NDA-firmado-fuera-${nombre}`;
      break;
    case "cv":
      if (!esIwl(persona.role) && persona.id !== d.profileId) {
        return { ok: false, error: "Un CV lo sube su dueña o el equipo de IWL." };
      }
      ruta = `${d.profileId}/${Date.now()}.${extension(fichero.nombre, "pdf")}`;
      break;
    case "logo":
      if (!esIwl(persona.role)) return { ok: false, error: "El logo de una compañía lo pone el equipo de IWL." };
      ruta = `${d.companyId}/${Date.now()}.${extension(fichero.nombre, "png")}`;
      break;
  }

  const bucket = BUCKET[d.clase];
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(ruta);
  if (error || !data) {
    return {
      ok: false,
      error: /row-level security/i.test(error?.message ?? "")
        ? "No puedes subir ficheros ahí."
        : `No se ha podido preparar la subida: ${error?.message ?? "sin respuesta"}`,
    };
  }
  return { ok: true, bucket, ruta, url: data.signedUrl };
}
