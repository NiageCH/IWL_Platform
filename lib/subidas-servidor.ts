import type { SupabaseClient } from "@supabase/supabase-js";
import { clienteServicio } from "@/lib/supabase/servicio";
import { comprobarFichero, type ClaseSubida } from "@/lib/subidas";

/**
 * Lo que una acción necesita saber de un fichero que el navegador ya ha
 * subido con una dirección firmada (`prepararSubida`).
 *
 * El formulario manda la ruta y el nombre original. Lo demás —que exista,
 * cuánto pesa, de qué tipo es— se lee de Storage, no del formulario: el
 * formulario lo puede escribir cualquiera.
 *
 * `prefijo` es la carpeta donde la acción espera el fichero. Una ruta de
 * otra carpeta se rechaza, aunque exista: es la forma de que nadie registre
 * como suyo un fichero que subió para otra cosa.
 */
export interface FicheroSubido {
  ruta: string;
  nombre: string;
  tipo: string | null;
  tamano: number;
}

export async function leerSubida(
  supabase: SupabaseClient,
  bucket: string,
  clase: ClaseSubida,
  ruta: string,
  nombre: string,
  prefijo: string,
): Promise<FicheroSubido | { error: string }> {
  if (!ruta.startsWith(prefijo) || ruta.includes("..")) {
    return { error: "Ese fichero no es de aquí. Vuelve a elegirlo." };
  }

  const { data, error } = await supabase.storage.from(bucket).info(ruta);
  if (error || !data) {
    return { error: "No encontramos el fichero subido. Vuelve a elegirlo." };
  }

  const fichero: FicheroSubido = {
    ruta,
    nombre: nombre.trim().slice(0, 200) || ruta.split("/").pop()!,
    tipo: data.contentType ?? null,
    tamano: Number(data.size ?? 0),
  };

  const problema = comprobarFichero(clase, { nombre: fichero.nombre, tamano: fichero.tamano, tipo: fichero.tipo ?? "" });
  if (problema) {
    await descartarSubida(bucket, ruta);
    return { error: problema };
  }
  return fichero;
}

/**
 * Quitar un fichero recién subido que no se va a registrar.
 *
 * Con la clave de servicio: quien lo subió no siempre puede borrar en ese
 * bucket —una fundadora no borra en el data room—, y dejarlo suelto solo
 * ocupa sitio. No es una autorización: el fichero lo acaba de subir esta
 * misma petición y no lo apunta nada.
 */
export async function descartarSubida(bucket: string, ruta: string): Promise<void> {
  await clienteServicio().storage.from(bucket).remove([ruta]);
}

/** Las rutas de un campo: una por fichero, con su nombre original al lado */
export function subidasDe(formData: FormData, campo: string): Array<{ ruta: string; nombre: string }> {
  const rutas = formData.getAll(campo).filter((v): v is string => typeof v === "string" && v.length > 0);
  const nombres = formData.getAll(`${campo}_nombre`).map(String);
  return rutas.map((ruta, i) => ({ ruta, nombre: nombres[i] ?? "" }));
}
