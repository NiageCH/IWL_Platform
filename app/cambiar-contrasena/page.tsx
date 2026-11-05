import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { CambiarContrasena } from "@/components/formularios/perfil";
import { BotonSalir } from "@/components/boton-salir";

export const metadata = { title: "Tu contraseña · Plataforma IWL" };

/**
 * La primera entrada con una contraseña que puso otra persona.
 *
 * Aquí solo se puede cambiarla o salir: el proxy no deja ir a ningún otro
 * sitio mientras la cuenta lleve la marca. Va con el aspecto de la
 * entrada, sin barra ni navegación, porque todavía no se ha entrado.
 */
export default async function CambiarContrasenaPage() {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");
  // Quien llega sin la marca, por un enlace guardado, no tiene nada que hacer aquí
  if (user.app_metadata?.debe_cambiar_password !== true) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-10 border-l-2 border-acento pl-4">
        <h1 className="titular-marca text-2xl text-titular">Elige tu contraseña</h1>
        <p className="mt-2 text-sm text-secundario">
          La que tienes te la dio el equipo de IWL, así que también la conocen
          ellos. Pon una que solo sepas tú para seguir.
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
