import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Borra los ficheros sueltos: subidos a Storage y nunca registrados.
 *
 * Qué es «suelto» lo decide la base (`app.ficheros_sueltos`): sin fila que
 * lo apunte, con más de 24 horas, sin pinta de documento firmado, y fuera de
 * la carpeta de una candidatura descartada o una compañía archivada. Aquí
 * solo se borra lo que ella devuelve, por la API de Storage —con SQL no se puede—, y se deja constancia en el registro de
 * actividad: cuántos, qué rutas y cuánto ocupaban.
 *
 * La llama el cron diario (`app/api/cron/resumen-avisos`), con la clave de
 * servicio: no hay nadie con sesión a esa hora.
 */

/** Lo que se espera antes de dar por abandonada una subida */
export const ESPERA_HORAS = 24;

export interface Limpieza {
  borrados: number;
  bytes: number;
  fallidos: number;
}

export async function limpiarFicherosSueltos(
  servicio: SupabaseClient,
  ahora: Date = new Date(),
): Promise<Limpieza> {
  const antes = new Date(ahora.getTime() - ESPERA_HORAS * 3600 * 1000);
  const { data, error } = await servicio.rpc("ficheros_sueltos", { p_antes: antes.toISOString() });
  if (error) throw new Error(`No se han podido listar los ficheros sueltos: ${error.message}`);

  const sueltos = (data ?? []) as Array<{ bucket: string; ruta: string; bytes: number; creado: string }>;
  if (sueltos.length === 0) return { borrados: 0, bytes: 0, fallidos: 0 };

  const porBucket = new Map<string, typeof sueltos>();
  for (const f of sueltos) porBucket.set(f.bucket, [...(porBucket.get(f.bucket) ?? []), f]);

  const borrados: typeof sueltos = [];
  let fallidos = 0;
  for (const [bucket, ficheros] of porBucket) {
    // De cien en cien: la API admite listas, no sin límite
    for (let i = 0; i < ficheros.length; i += 100) {
      const tanda = ficheros.slice(i, i + 100);
      const { data: hechos, error: fallo } = await servicio.storage.from(bucket).remove(tanda.map((f) => f.ruta));
      if (fallo) {
        fallidos += tanda.length;
        continue;
      }
      const quitados = new Set((hechos ?? []).map((h) => h.name));
      for (const f of tanda) {
        if (quitados.has(f.ruta)) borrados.push(f);
        else fallidos += 1;
      }
    }
  }

  const bytes = borrados.reduce((n, f) => n + Number(f.bytes), 0);
  if (borrados.length > 0 || fallidos > 0) {
    await servicio.from("activity_log").insert({
      entity: "storage",
      action: "ficheros_sueltos_borrados",
      detail: {
        cuantos: borrados.length,
        bytes,
        fallidos,
        espera_horas: ESPERA_HORAS,
        rutas: borrados.map((f) => ({ bucket: f.bucket, ruta: f.ruta, bytes: Number(f.bytes), subido: f.creado })),
      },
    });
  }

  return { borrados: borrados.length, bytes, fallidos };
}
