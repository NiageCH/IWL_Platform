import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refresco de sesión y guardia de rutas.
 *
 * En Next 16 este fichero se llama `proxy.ts` y su función se llama `proxy`;
 * el antiguo `middleware.ts` está obsoleto. El runtime es Node.js y no se
 * puede configurar.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAEscribir) {
          for (const { name, value } of cookiesAEscribir) {
            request.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesAEscribir) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser valida el token contra el servidor de auth. No usar getSession
  // aquí: devuelve lo que traiga la cookie sin comprobarlo.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esRutaPublica =
    ruta.startsWith("/entrar") ||
    ruta.startsWith("/auth") ||
    ruta === "/";

  if (!user && !esRutaPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("siguiente", ruta);
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: [
    /*
     * Todas las rutas menos ficheros estáticos e imágenes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
