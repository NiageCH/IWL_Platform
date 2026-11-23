import { clienteServidor } from "@/lib/supabase/servidor";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { Estado } from "@/components/ui/estado";
import { nombreCierre } from "@/lib/cierre";
import { estadioYPrograma, type Estadio } from "@/lib/estadios";
import { nombrePersona } from "@/lib/etiquetas";
import { fecha } from "@/lib/utils";
import { ReabrirCompania } from "@/components/formularios/cierre";

export const metadata = { title: "Histórico · Administración" };

/**
 * Las compañías cerradas (REVISION, 22 nov · bloque 8): graduadas,
 * finalizadas por salida y dadas de baja. Solo las ve dirección, y en solo
 * lectura: la base ya no acepta cambios en ellas. Es lo único que queda de
 * ellas en la plataforma, así que dice cómo terminaron, cuándo, quién las
 * cerró y por qué, y deja el Anexo firmado a mano. Desde aquí se reabre
 * una cerrada por error.
 */
export default async function Historico({
  searchParams,
}: {
  searchParams: Promise<{ cerrada?: string }>;
}) {
  const { cerrada } = await searchParams;
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("companies")
    .select(
      "id, slug, name, entry_state, cierre, cerrada_on, cierre_motivo, cerrada_at, quien:profiles!companies_cerrada_por_fkey(full_name, last_name, email), annexes(id, version, status, signed_on)",
    )
    .not("cierre", "is", null)
    .order("cerrada_on", { ascending: false });
  const cerradas = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque accion={<Metadato>{cerradas.length} cerradas</Metadato>}>Histórico</TituloBloque>
        <p className="px-4 py-3 text-sm text-secundario">
          Las compañías que terminaron en el programa. No salen en ninguna lista, menú, aviso ni resumen, y nadie las
          puede editar: esto es lo que queda de ellas, para consultarlo. Si se cerró una por error, se reabre desde aquí.
        </p>
        {cerrada ? (
          <p className="border-t border-filete px-4 py-3 text-sm text-titular" role="status">
            Cerrada. Ya no aparece en la cartera; queda aquí.
          </p>
        ) : null}
      </Bloque>

      {cerradas.length === 0 ? (
        <Bloque>
          <SinDatos>
            Todavía no se ha cerrado ninguna compañía. Se cierra desde su ficha, en el bloque Cierre, cuando termina
            en el programa.
          </SinDatos>
        </Bloque>
      ) : null}

      {cerradas.map((c) => {
        const quien = c.quien as unknown as { full_name: string | null; last_name: string | null; email: string | null } | null;
        const firmados = ((c.annexes ?? []) as Array<{ id: string; version: number; status: string; signed_on: string | null }>)
          .filter((a) => a.status === "firmado" || a.status === "cerrado")
          .sort((a, b) => a.version - b.version);
        return (
          <Bloque key={c.id} id={c.slug} className="scroll-mt-48">
            <TituloBloque accion={<Estado valor={c.cierre === "graduada" ? "hecho" : "no_aplica"} rotulo={nombreCierre(c.cierre)} />}>
              {c.name}
            </TituloBloque>
            <dl className="grid gap-x-6 gap-y-3 px-4 py-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-metadato">Cerrada el</dt>
                <dd className="text-titular">
                  {fecha(c.cerrada_on)}
                  {quien ? ` · por ${nombrePersona(quien)}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-metadato">Entró en</dt>
                <dd className="text-titular">{c.entry_state ? estadioYPrograma(c.entry_state as Estadio) : "Sin estadio"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-metadato">Motivo</dt>
                <dd className="whitespace-pre-wrap text-titular">{c.cierre_motivo}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-metadato">Anexo firmado</dt>
                <dd>
                  {firmados.length ? (
                    <ul className="flex flex-col gap-1">
                      {firmados.map((a) => (
                        <li key={a.id}>
                          <a href={`/anexo/${a.id}`} className="enlace text-acento-texto" target="_blank" rel="noreferrer">
                            Versión {a.version}
                            {a.signed_on ? `, firmada el ${fecha(a.signed_on)}` : ""} (PDF)
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-secundario">No llegó a firmar ninguno.</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className="border-t border-filete px-4 py-3">
              <ReabrirCompania companyId={c.id} slug={c.slug} nombre={c.name} />
            </div>
          </Bloque>
        );
      })}
    </div>
  );
}
