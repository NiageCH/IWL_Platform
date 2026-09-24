import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Destino del enlace mágico.
 *
 * El flujo normal de la aplicación es PKCE: el enlace trae `?code=` y el
 * intercambio se hace aquí, en servidor. Algunos enlaces llegan en flujo
 * implícito, con el token en el fragmento de la URL; el fragmento no viaja al
 * servidor, así que esos se derivan a `/auth/sesion`, que lo lee en el
 * navegador. Sin una cosa ni la otra, el enlace no sirve.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const codigo = searchParams.get("code");
  const siguiente = searchParams.get("siguiente") ?? "/";

  if (!codigo) {
    const destino = new URL("/auth/sesion", origin);
    destino.searchParams.set("siguiente", siguiente);
    return NextResponse.redirect(destino);
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(codigo);

  if (error) {
    return NextResponse.redirect(`${origin}/entrar?error=enlace_caducado`);
  }

  return NextResponse.redirect(`${origin}${siguiente}`);
}
