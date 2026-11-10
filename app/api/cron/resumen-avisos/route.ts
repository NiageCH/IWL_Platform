import { NextResponse, type NextRequest } from "next/server";
import { enviarResumenes } from "@/lib/correo/resumen";

/**
 * El resumen diario de avisos, que llama el cron de Vercel (`vercel.json`).
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
  const resultado = await enviarResumenes();
  return NextResponse.json(resultado);
}
