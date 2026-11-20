import Link from "next/link";
import { redirect } from "next/navigation";
import { Marco } from "@/components/marco";
import { BarraSuperior } from "@/components/barra-superior";
import { Bloque } from "@/components/ui/primitivas";
import { TextoGuia } from "@/components/vistas/guia";
import { leerGuiaDe } from "@/lib/datos/guia";
import { inicioDe } from "@/lib/permisos";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";

export const metadata = { title: "Guía · Plataforma IWL" };

/**
 * La guía del rol de quien mira (REVISION, 13 nov): qué es la plataforma,
 * qué le toca, de qué depende y cómo se hace cada cosa, con el nombre
 * exacto de los botones. La primera vez se abre sola, desde `/`; con
 * verla queda apuntado.
 */
export default async function Guia({ searchParams }: { searchParams: Promise<{ primera?: string }> }) {
  const persona = await personaActual();
  if (!persona) redirect("/entrar?siguiente=/guia");
  const { primera } = await searchParams;
  const bloques = await leerGuiaDe(persona.role);
  await (await clienteServidor()).rpc("marcar_guia_vista");
  const titulo = bloques?.find((b) => b.tipo === "titulo" && b.nivel === 1);
  const inicio = inicioDe(persona.role);

  return (
    <Marco tema="claro">
      <BarraSuperior />
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="relative mb-6 pl-4">
          <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
          <h1 className="titular-marca text-xl text-titular">{titulo?.tipo === "titulo" ? titulo.texto : "Guía"}</h1>
        </div>

        {primera ? (
          <Bloque className="mb-6">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <p className="min-w-0 flex-1 text-sm text-secundario">
                Es la primera vez que entras: esta es tu guía. Siempre la tienes en <strong className="text-titular">Guía</strong>, en el menú.
              </p>
              <Link href={inicio} className="boton-marca px-4 py-1.5 text-xs">
                Ir a lo mío
              </Link>
            </div>
          </Bloque>
        ) : null}

        <Bloque>
          <div className="px-4 py-4">
            {bloques ? (
              <TextoGuia bloques={bloques} />
            ) : (
              <p className="text-sm text-secundario">
                Todavía no hay guía para tu papel. Si algo no sabes cómo se hace, pregunta a tu contacto en IWL.
              </p>
            )}
          </div>
        </Bloque>

        {primera ? null : (
          <p className="mt-6 text-sm">
            <Link href={inicio} className="enlace text-acento-texto">
              Volver a tu inicio
            </Link>
          </p>
        )}
      </main>
    </Marco>
  );
}
