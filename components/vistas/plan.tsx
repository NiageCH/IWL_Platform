import { clienteServidor } from "@/lib/supabase/servidor";
import type { ResumenCompania } from "@/lib/datos/compania";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { EditorSeccion, NuevoComentario } from "@/components/formularios/plan";
import { fecha } from "@/lib/utils";

/**
 * Business plan vivo (§4.2).
 *
 * Cada sección con su estado, su versión, sus hipótesis y los comentarios
 * anclados. El plan financiero enseña el real frente al previsto tomando los
 * KPI ya cargados, sin volver a pedirlos.
 */

const ESTADOS: Record<string, string> = {
  borrador: "Borrador",
  en_revision: "En revisión",
  validada: "Validada por IWL",
};

const ESTADOS_HIPOTESIS: Record<string, string> = {
  sin_contrastar: "Sin contrastar",
  en_contraste: "En contraste",
  confirmada: "Confirmada",
  refutada: "Refutada",
};

export async function VistaPlan({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const supabase = await clienteServidor();
  const companyId = resumen.compania.id;
  const { permisos, compania } = resumen;

  const [secciones, hipotesis, comentarios] = await Promise.all([
    supabase
      .from("bp_sections")
      .select(
        `id, content, status, current_version, updated_at, validated_at,
         bp_section_templates ( code, name, guidance, order_index ),
         profiles:updated_by ( full_name )`,
      )
      .eq("company_id", companyId),
    supabase
      .from("hypotheses")
      .select("id, section_id, statement, validation_criteria, status, evidence_links ( id, label, kind )")
      .eq("company_id", companyId),
    supabase
      .from("comments")
      .select("id, entity_id, body, created_at, profiles:author_id ( full_name )")
      .eq("company_id", companyId)
      .eq("entity", "bp_section")
      .order("created_at"),
  ]);

  const ordenadas = (secciones.data ?? []).sort(
    (a, b) =>
      (a.bp_section_templates?.order_index ?? 0) -
      (b.bp_section_templates?.order_index ?? 0),
  );

  const hipotesisPorSeccion = agrupar(hipotesis.data ?? [], (h) => h.section_id);
  const comentariosPorSeccion = agrupar(comentarios.data ?? [], (c) => c.entity_id);

  const validadas = ordenadas.filter((s) => s.status === "validada").length;

  if (ordenadas.length === 0) {
    return (
      <Bloque>
        <TituloBloque>Business plan</TituloBloque>
        <SinDatos>
          Las secciones se crean al incorporar la compañía al programa.
        </SinDatos>
      </Bloque>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {validadas} de {ordenadas.length} validadas
            </Metadato>
          }
        >
          Estado del plan
        </TituloBloque>
        <ul className="divide-y divide-filete">
          {ordenadas.map((s) => (
            <li key={s.id} className="flex items-baseline gap-3 px-4 py-2.5">
              <span className="flex-1 text-sm text-titular">
                {s.bp_section_templates?.name}
              </span>
              {s.content ? null : <Metadato>Sin redactar</Metadato>}
              <Etiqueta>{ESTADOS[s.status] ?? s.status}</Etiqueta>
            </li>
          ))}
        </ul>
      </Bloque>

      {ordenadas.map((seccion) => {
        const plantilla = seccion.bp_section_templates;
        const susHipotesis = hipotesisPorSeccion.get(seccion.id) ?? [];
        const susComentarios = comentariosPorSeccion.get(seccion.id) ?? [];

        return (
          <Bloque key={seccion.id}>
            <TituloBloque
              accion={
                <span className="flex items-center gap-3">
                  <Metadato>v{seccion.current_version}</Metadato>
                  <Etiqueta>{ESTADOS[seccion.status] ?? seccion.status}</Etiqueta>
                </span>
              }
            >
              {plantilla?.name}
            </TituloBloque>

            <div className="px-4 py-4">
              {seccion.content ? (
                <p className="max-w-3xl text-sm leading-relaxed text-secundario">
                  {seccion.content}
                </p>
              ) : (
                <p className="max-w-3xl text-sm text-metadato">
                  {plantilla?.guidance ?? "Sección sin redactar."}
                </p>
              )}

              {seccion.updated_at && seccion.content ? (
                <p className="mt-3 text-xs text-metadato">
                  Última edición {fecha(seccion.updated_at)}
                  {seccion.profiles?.full_name
                    ? ` · ${seccion.profiles.full_name}`
                    : ""}
                </p>
              ) : null}
            </div>

            {susHipotesis.length > 0 ? (
              <div className="border-t border-filete px-4 py-3">
                <Metadato>Hipótesis</Metadato>
                <ul className="mt-2 flex flex-col gap-3">
                  {susHipotesis.map((h) => (
                    <li key={h.id}>
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-sm text-titular">{h.statement}</span>
                        <Etiqueta>{ESTADOS_HIPOTESIS[h.status] ?? h.status}</Etiqueta>
                      </div>
                      {h.validation_criteria ? (
                        <p className="text-xs text-secundario">
                          Se confirma si: {h.validation_criteria}
                        </p>
                      ) : null}
                      {h.evidence_links?.length ? (
                        <p className="mt-1 text-xs text-metadato">
                          Evidencia: {h.evidence_links.map((e) => e.label).join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {permisos.puedeEscribir ? (
              <EditorSeccion
                slug={compania.slug}
                id={seccion.id}
                contenido={seccion.content}
                estado={seccion.status}
                guia={plantilla?.guidance ?? null}
                puedeValidar={permisos.puedeValidar}
              />
            ) : null}

            <div className="border-t border-filete px-4 py-3">
              <Metadato>Comentarios</Metadato>
              {susComentarios.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {susComentarios.map((c) => (
                    <li key={c.id} className="border-l-2 border-filete pl-3">
                      <p className="text-sm text-titular">{c.body}</p>
                      <p className="text-xs text-metadato">
                        {c.profiles?.full_name ?? "IWL"} · {fecha(c.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-metadato">
                  Sin comentarios en esta sección.
                </p>
              )}

              <NuevoComentario
                slug={compania.slug}
                companyId={companyId}
                entidad="bp_section"
                entidadId={seccion.id}
              />
            </div>
          </Bloque>
        );
      })}
    </div>
  );
}

function agrupar<T>(filas: T[], clave: (fila: T) => string | null) {
  const mapa = new Map<string, T[]>();
  for (const fila of filas) {
    const k = clave(fila);
    if (!k) continue;
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k)!.push(fila);
  }
  return mapa;
}
