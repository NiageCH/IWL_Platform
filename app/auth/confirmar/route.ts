import { NextResponse, type NextRequest } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

/**
 * Destino del enlace mágico. Canjea el código por una sesión y manda a cada
 * persona a su vista.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const codigo = searchParams.get("code");
  const siguiente = searchParams.get("siguiente") ?? "/";

  if (!codigo) {
    return NextResponse.redirect(`${origin}/entrar?error=sin_codigo`);
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(codigo);

  if (error) {
    return NextResponse.redirect(`${origin}/entrar?error=enlace_caducado`);
  }

  return NextResponse.redirect(`${origin}${siguiente}`);
}
