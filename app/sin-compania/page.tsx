import { BarraSuperior } from "@/components/barra-superior";
import { personaActual } from "@/lib/supabase/servidor";

export const metadata = { title: "Sin compañía asignada · Plataforma IWL" };

/**
 * Callejón de una cuenta que existe pero no está vinculada a ninguna compañía.
 *
 * En desarrollo se explica además cómo salir de aquí, porque es donde acaba
 * quien entra con un correo que no está en los datos semilla.
 */
export default async function SinCompania() {
  const persona = await personaActual();
  const esDesarrollo = process.env.NODE_ENV === "development";

  return (
    <>
      <BarraSuperior />
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="relative pl-4">
          <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
          <h1 className="text-lg font-semibold tracking-tight text-titular">
            Sin compañía asignada
          </h1>
          <p className="mt-2 text-sm text-secundario">
            Tu cuenta existe pero todavía no está vinculada a ninguna compañía de
            la cohorte. El equipo de IWL la asigna al incorporar el proyecto al
            programa.
          </p>
          {persona ? (
            <p className="mt-3 text-xs text-metadato">
              Has entrado como{" "}
              <span className="cifra">{persona.email}</span>, con el papel de{" "}
              <span className="cifra">{persona.role}</span>.
            </p>
          ) : null}
        </div>

        {esDesarrollo ? (
          <div className="mt-8 border border-filete px-4 py-4">
            <p className="cifra text-xs uppercase tracking-wide text-metadato">
              Entorno de desarrollo
            </p>
            <p className="mt-2 text-sm text-secundario">
              Esto pasa al entrar con un correo que no está en los datos semilla.
              Tienes dos salidas:
            </p>
            <ul className="mt-3 flex flex-col gap-3 text-sm text-secundario">
              <li>
                Entrar con una de las personas de la semilla, por ejemplo{" "}
                <span className="cifra text-titular">fundadora@marea.test</span> o{" "}
                <span className="cifra text-titular">programa@iwl.test</span>.
              </li>
              <li>
                Dar de alta tu cuenta con el papel que quieras:
                <code className="mt-1 block bg-elevado px-3 py-2 text-xs text-titular">
                  npm run alta -- {persona?.email ?? "tu@correo.com"} equipo_iwl
                </code>
                <span className="mt-1 block text-xs text-metadato">
                  O con compañía:{" "}
                  <span className="cifra">
                    npm run alta -- {persona?.email ?? "tu@correo.com"} fundadora
                    marea-clinica fundadora
                  </span>
                </span>
              </li>
            </ul>
          </div>
        ) : null}
      </main>
    </>
  );
}
