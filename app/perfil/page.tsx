import { redirect } from "next/navigation";
import { personaActual } from "@/lib/supabase/servidor";
import { Marco } from "@/components/marco";
import { BarraSuperior } from "@/components/barra-superior";
import { CambiarContrasena } from "@/components/formularios/perfil";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";

export const metadata = { title: "Mi cuenta · Plataforma IWL" };

/**
 * La cuenta de quien mira.
 *
 * Existe para una cosa: cambiar la contraseña que puso la dirección al dar
 * de alta. Mientras nadie la cambie, la dirección la conoce, y eso vale para
 * empezar pero no para quedarse.
 *
 * El tema lo decide quién entra, igual que en el resto: consola oscura para
 * IWL, papel para la compañía.
 */
export default async function Perfil() {
  const persona = await personaActual();
  if (!persona) redirect("/entrar?siguiente=/perfil");

  return (
    <Marco tema="claro">
      <BarraSuperior />

      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="relative mb-6 pl-4">
          <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
          <h1 className="titular-marca text-xl text-titular">Mi cuenta</h1>
          <p className="mt-2 text-sm text-secundario">
            {persona.full_name ?? persona.email}
          </p>
        </div>

        <Bloque>
          <TituloBloque accion={<Metadato>{persona.email}</Metadato>}>
            Contraseña
          </TituloBloque>

          <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
            Si tu contraseña te la dio el equipo de IWL, cámbiala: mientras no
            lo hagas, ellos la conocen. La nueva solo la sabrás tú, y si la
            pierdes se pone otra desde administración.
          </p>

          <div className="px-4 py-4">
            <CambiarContrasena />
          </div>
        </Bloque>
      </main>
    </Marco>
  );
}
