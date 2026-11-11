import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { CambiarContrasena } from "@/components/formularios/perfil";
import { BotonSalir } from "@/components/boton-salir";

export const metadata = { title: "Tu contraseña · Plataforma IWL" };

/**
 * Elegir contraseña, en dos casos:
 *
 *   · La primera entrada, con una contraseña que puso otra persona. Aquí
 *     solo se puede cambiarla o salir: el proxy no deja ir a ningún otro
 *     sitio mientras la cuenta lleve la marca.
 *   · Al volver del enlace de «¿Has olvidado tu contraseña?»
 *     (`?recuperar=1`). Que alguien con sesión llegue aquí a mano no le da
 *     nada nuevo: desde Mi cuenta ya puede cambiarla.
 *
 * Va con el aspecto de la entrada, sin barra ni navegación.
 */
export default async function CambiarContrasenaPage({ searchParams }: PageProps<"/cambiar-contrasena">) {
  const { recuperar } = await searchParams;
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");
  const primera = user.app_metadata?.debe_cambiar_password === true;
  // Quien llega sin la marca y sin venir del enlace, por una dirección guardada, no tiene nada que hacer aquí
  if (!primera && recuperar !== "1") redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-10 border-l-2 border-acento pl-4">
        <h1 className="titular-marca text-2xl text-titular">
          {primera ? "Elige tu contraseña" : "Elige tu nueva contraseña"}
        </h1>
        <p className="mt-2 text-sm text-secundario">
          {primera
            ? "La que tienes te la dio el equipo de IWL, así que también la conocen ellos. Pon una que solo sepas tú para seguir."
            : "Pon una que solo sepas tú. Desde ahora entrarás con ella; la de antes deja de valer."}
        </p>
        <p className="cifra mt-3 text-xs text-metadato">{user.email}</p>
      </div>

      <CambiarContrasena primera />

      <div className="mt-8">
        <BotonSalir />
      </div>
    </main>
  );
}
