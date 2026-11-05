import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rutaRenombrada } from "@/lib/renombres";

/**
 * Refresco de sesión y guardia de rutas.
 *
 * En Next 16 este fichero se llama `proxy.ts` y su función se llama `proxy`;
 * el antiguo `middleware.ts` está obsoleto. El runtime es Node.js y no se
 * puede configurar.
 */
export async function proxy(request: NextRequest) {
  /*
   * Una sola dirección pública. Quien abra la vieja de Vercel acaba en la
   * del dominio propio, con la misma ruta.
   *
   * Solo se enciende con `DOMINIO_CANONICO`, que se pone en Vercel cuando el
   * DNS ya responde: si redirigiera antes, mandaría a una dirección que no
   * existe todavía. Solo en producción, para no arrastrar las vistas
   * previas. Y `/auth` no se toca: un enlace de entrada que salió con la
   * dirección vieja lleva su verificación en una cookie de esa dirección, y
   * redirigirlo a mitad lo dejaría sin ella.
   */
  const canonico = process.env.DOMINIO_CANONICO;
  if (
    canonico &&
    process.env.VERCEL_ENV === "production" &&
    request.nextUrl.hostname !== canonico &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const destino = request.nextUrl.clone();
    destino.protocol = "https:";
    destino.hostname = canonico;
    destino.port = "";
    return NextResponse.redirect(destino, 308);
  }

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

  /*
   * Una compañía que cambió de nombre.
   *
   * Antes de la guardia de sesión, para que el enlace viejo funcione
   * igual lo abra quien lo abra: si cayera después, a quien no tuviera
   * sesión lo mandaríamos a entrar y luego al identificador viejo, que ya
   * no existe.
   */
  const renombrada = rutaRenombrada(ruta);
  if (renombrada) {
    const destino = request.nextUrl.clone();
    destino.pathname = renombrada;
    return NextResponse.redirect(destino, 308);
  }

  const esRutaPublica =
    ruta.startsWith("/entrar") ||
    ruta.startsWith("/auth") ||
    // El formulario de candidatura: quien se presenta no tiene cuenta.
    ruta.startsWith("/presentarse") ||
    /*
     * Y su enlace privado, que lleva el testigo en la propia dirección.
     *
     * Con la barra: `/candidatura/<testigo>` es público, pero `/candidatura`
     * a secas es la pantalla de quien ya tiene cuenta y sí pide sesión. Sin
     * la barra, esta regla abriría las dos.
     */
    ruta.startsWith("/candidatura/") ||
    ruta === "/";

  if (!user && !esRutaPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("siguiente", ruta);
    return NextResponse.redirect(destino);
  }

  /*
   * Una contraseña que puso otra persona no es de quien entra con ella.
   * Hasta que la cambie, solo puede cambiarla o salir.
   *
   * La marca se lee de `getUser`, que pregunta al servidor, y no del token:
   * el token conserva la marca hasta que se renueva, y quien acaba de
   * cambiarla se quedaría encerrado una hora en la pantalla de cambio.
   */
  if (
    user?.app_metadata?.debe_cambiar_password === true &&
    ruta !== "/cambiar-contrasena" &&
    !ruta.startsWith("/auth")
  ) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/cambiar-contrasena";
    destino.search = "";
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
