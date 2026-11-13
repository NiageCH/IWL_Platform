import { redirect } from "next/navigation";
import { Marco } from "@/components/marco";
import { BarraSuperior } from "@/components/barra-superior";
import { CambiarContrasena, MisDatos, ResumenAvisos } from "@/components/formularios/perfil";
import { MiFoto } from "@/components/formularios/foto";
import { firmarFotos } from "@/lib/datos/logos";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";

export const metadata = { title: "Mi cuenta · Plataforma IWL" };

/**
 * La cuenta de quien mira.
 *
 * Nombre y apellidos —con ellos se firma por IWL—, la foto, el LinkedIn y la contraseña que
 * puso la dirección al dar de alta. Mientras nadie la cambie, la dirección la conoce, y eso vale para
 * empezar pero no para quedarse.
 *
 * El tema lo decide quién entra, igual que en el resto: consola oscura para
 * IWL, papel para la compañía.
 */
export default async function Perfil() {
  const persona = await personaActual();
  if (!persona) redirect("/entrar?siguiente=/perfil");
  const { data: preferencias } = await (await clienteServidor())
    .from("profiles")
    .select("resumen_avisos, linkedin_url")
    .eq("id", persona.id)
    .single();
  const foto = persona.photo_path
    ? (await firmarFotos([persona.photo_path])).get(persona.photo_path)
    : null;

  return (
    <Marco tema="claro">
      <BarraSuperior />

      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="relative mb-6 pl-4">
          <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
          <h1 className="titular-marca text-xl text-titular">Mi cuenta</h1>
          <p className="mt-2 text-sm text-secundario">
            {[persona.full_name, persona.last_name].filter(Boolean).join(" ") || persona.email}
          </p>
        </div>

        <Bloque className="mb-6">
          <TituloBloque>Tus datos</TituloBloque>
          <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
            Como en tu documento de identidad.
            {persona.role === "admin_iwl"
              ? " Con ellos firmas por Inception Woman Lab: sin apellidos no se puede contrafirmar un NDA."
              : ""}
          </p>
          <div className="flex flex-col gap-6 px-4 py-4">
            <MisDatos
              nombre={persona.full_name ?? ""}
              apellidos={persona.last_name ?? ""}
              linkedin={preferencias?.linkedin_url ?? ""}
            />
            {/*
              La foto sale donde sale la persona dentro de la plataforma:
              barra lateral, equipos, mentores, comentarios. No en los PDF
              ni en los correos.
            */}
            <div className="border-t border-filete pt-4">
              <MiFoto nombre={persona.full_name ?? persona.email ?? ""} foto={foto} />
            </div>
          </div>
        </Bloque>

        {esIwl(persona.role) ? (
          <Bloque className="mb-6">
            <TituloBloque>Resumen de avisos por correo</TituloBloque>
            <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
              Un correo al día con los avisos que tengas abiertos —quién ha
              firmado, comentado o entrado—, en vez de uno por aviso.
            </p>
            <div className="px-4 py-4">
              <ResumenAvisos actual={(preferencias?.resumen_avisos as "diario" | "nunca") ?? "diario"} />
            </div>
          </Bloque>
        ) : null}

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
