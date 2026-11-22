import "server-only";
import { headers } from "next/headers";
import { clienteServicio } from "@/lib/supabase/servicio";

/**
 * Lo que necesitan firmar y aceptar el NDA y solo sabe el servidor. Vive
 * aquí y no en un fichero de acciones: exportado desde un `"use server"`
 * cualquiera podría llamarlo desde el navegador.
 */

/** De dónde viene la petición: la IP de verdad la pone el proxy delante */
export async function origen() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  return { ip, ua: h.get("user-agent") };
}

/** El lugar de firma, que se fija en Programa; Málaga si no hay ninguno */
export async function lugarDelNda(): Promise<string> {
  const { data } = await clienteServicio()
    .from("platform_settings")
    .select("value")
    .eq("key", "nda_lugar")
    .maybeSingle();
  return typeof data?.value === "string" && data.value.trim() ? data.value.trim() : "Málaga";
}
