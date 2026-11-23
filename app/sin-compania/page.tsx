import { BarraSuperior } from "@/components/barra-superior";
import { Marco } from "@/components/marco";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { nombreCierre } from "@/lib/cierre";
import { fecha } from "@/lib/utils";

interface CerradaConDocumentos {
  compania: string;
  cierre: string;
  cerrada_on: string;
  nda: string | null;
  anexos: Array<{ id: string; version: number; firmado_on: string | null }>;
}

/**
 * Lo que conserva una fundadora de una compañía cerrada (bloque 8): sus
 * documentos firmados. La base dice cuáles (`documentos_tras_cierre`); el
 * NDA se firma con la sesión, y el Anexo sale de su copia firmada.
 */
async function leerCerradas(): Promise<Array<CerradaConDocumentos & { ndaUrl: string | null }>> {
  const supabase = await clienteServidor();
  const { data } = await supabase.rpc("documentos_tras_cierre");
  const filas = (data ?? []) as unknown as CerradaConDocumentos[];
  return Promise.all(
    filas.map(async (f) => {
      if (!f.nda) return { ...f, ndaUrl: null };
      const { data: firmada } = await supabase.storage.from("candidaturas").createSignedUrl(f.nda, 600);
      return { ...f, ndaUrl: firmada?.signedUrl ?? null };
    }),
  );
}

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
  const cerradas = persona?.role === "fundadora" ? await leerCerradas() : [];

  if (cerradas.length) {
    return (
      <Marco tema="claro">
        <BarraSuperior />
        <main className="mx-auto w-full max-w-2xl px-6 py-16">
          <div className="relative pl-4">
            <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
            <h1 className="text-lg font-semibold tracking-tight text-titular">Tu paso por el programa ha terminado</h1>
            <p className="mt-2 text-sm text-secundario">
              La compañía ya no está en la plataforma. Te quedan tus documentos firmados, para descargarlos cuando los
              necesites.
            </p>
          </div>
          {cerradas.map((c) => (
            <section key={c.compania} className="tarjeta mt-8 flex flex-col gap-3 px-5 py-4" aria-label={c.compania}>
              <p className="text-sm">
                <span className="font-medium text-titular">{c.compania}</span>
                <span className="text-metadato">
                  {" "}
                  · {nombreCierre(c.cierre)} el {fecha(c.cerrada_on)}
                </span>
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                {c.ndaUrl ? (
                  <li>
                    <a href={c.ndaUrl} className="enlace text-acento-texto" target="_blank" rel="noreferrer">
                      NDA aceptado (PDF)
                    </a>
                  </li>
                ) : null}
                {c.anexos.map((a) => (
                  <li key={a.id}>
                    <a href={`/anexo/${a.id}`} className="enlace text-acento-texto" target="_blank" rel="noreferrer">
                      Acuerdo y Anexo de Programa, versión {a.version}
                      {a.firmado_on ? `, firmado el ${fecha(a.firmado_on)}` : ""} (PDF)
                    </a>
                  </li>
                ))}
                {!c.ndaUrl && !c.anexos.length ? (
                  <li className="text-secundario">No hay documentos firmados guardados. Si necesitas alguno, pídeselo a IWL.</li>
                ) : null}
              </ul>
            </section>
          ))}
        </main>
      </Marco>
    );
  }

  return (
    <Marco tema="claro">
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
    </Marco>
  );
}
