import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { leerAjusteModoPruebas, type ModoPruebas } from "@/lib/correo/modo-pruebas";

/** El modo pruebas del correo, para pintarlo. Lo lee cualquiera con sesión */
export const leerModoPruebasPantalla = cache(async (): Promise<ModoPruebas & { quitadoPorNombre: string | null }> => {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("platform_settings").select("value").eq("key", "correo_modo_pruebas").maybeSingle();
  const modo = leerAjusteModoPruebas(data?.value);
  let quitadoPorNombre: string | null = null;
  if (modo.quitadoPor) {
    const { data: p } = await supabase.from("profiles").select("full_name, email").eq("id", modo.quitadoPor).maybeSingle();
    quitadoPorNombre = p?.full_name ?? p?.email ?? null;
  }
  return { ...modo, quitadoPorNombre };
});
