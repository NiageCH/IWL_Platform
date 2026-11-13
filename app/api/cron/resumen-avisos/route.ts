import { NextResponse, type NextRequest } from "next/server";
import { enviarResumenes } from "@/lib/correo/resumen";
import { clienteServicio } from "@/lib/supabase/servicio";
import { limpiarFicherosSueltos, type Limpieza } from "@/lib/limpieza";

/**
 * El resumen diario de avisos, que llama el cron de Vercel (`vercel.json`).
 * Antes, avisa de las reuniones cuyas fechas han pasado todas sin elegir.
 * Después, borra los ficheros sueltos (`lib/limpieza.ts`).
 *
 * Todo en el mismo cron, y no uno por tarea: el plan de Vercel limita
 * cuántos se pueden tener.
 *
 * Es la única ruta de servidor que no pide sesión, y por eso la deja pasar
 * el proxy: la llama Vercel, no una persona. Lo que la protege es el
 * secreto: Vercel manda `Authorization: Bearer <CRON_SECRET>`, y sin él,
 * o sin secreto configurado, no hace nada.
 */
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Antes del resumen, las reuniones caducadas dejan su aviso: así entran en él
  const { data: caducadas } = await clienteServicio().rpc("avisar_reuniones_caducadas");
  const resultado = await enviarResumenes();

  /*
   * La limpieza, al final y por su cuenta: si falla, el resumen ya ha
   * salido, y mañana se vuelve a intentar con los mismos ficheros.
   */
  let limpieza: Limpieza | { error: string };
  try {
    limpieza = await limpiarFicherosSueltos(clienteServicio());
  } catch (e) {
    limpieza = { error: e instanceof Error ? e.message : "fallo desconocido" };
  }

  return NextResponse.json({ ...resultado, reunionesCaducadas: caducadas ?? 0, ficherosSueltos: limpieza });
}
