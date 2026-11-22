"use server";

import { z } from "zod";
import { notificar } from "@/lib/correo";
import { clienteServicio } from "@/lib/supabase/servicio";

/**
 * «¿Has olvidado tu contraseña?» (REVISION, 21 nov).
 *
 * Lo mandaba Supabase Auth desde el navegador, por fuera de la plataforma,
 * y así no había forma de que respetara el modo pruebas. Ahora el enlace se
 * genera aquí y sale por `notificar`, como el del NDA: con el modo pruebas
 * activo y una dirección de fuera de la lista, queda retenido.
 *
 * Contesta siempre lo mismo, exista la cuenta o no: si no, serviría para
 * averiguar qué correos están dados de alta. Usa la clave de servicio
 * porque quien lo pide no tiene sesión; lo único que puede provocar es un
 * correo a la propia dirección de una cuenta.
 */
export async function pedirEnlaceContrasena(correo: string): Promise<{ ok: boolean }> {
  const leido = z.string().trim().toLowerCase().email().safeParse(correo);
  if (!leido.success) return { ok: false };
  const direccion = leido.data;

  const servicio = clienteServicio();
  const { data: perfil } = await servicio
    .from("profiles")
    .select("id, full_name, is_active")
    .ilike("email", direccion)
    .maybeSingle();
  if (!perfil?.is_active) return { ok: true };

  // Uno por minuto y dirección, lo que hacía Supabase Auth: no se usa para bombardear a nadie
  const haceUnMinuto = new Date(Date.now() - 60_000).toISOString();
  const { count } = await servicio
    .from("correos")
    .select("id", { count: "exact", head: true })
    .eq("evento", "recuperar_contrasena")
    .eq("profile_id", perfil.id)
    .gte("created_at", haceUnMinuto);
  if (count) return { ok: true };

  await notificar({ correo: direccion, nombre: perfil.full_name, profileId: perfil.id }, "recuperar_contrasena", {});
  return { ok: true };
}
