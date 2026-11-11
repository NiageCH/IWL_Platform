import { nombreCompleto } from "@/lib/etiquetas";
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
import {
  AbrirDocumento,
  AdjuntarBusinessPlan,
} from "@/components/formularios/documentos";
import { Estado } from "@/components/ui/estado";
import { Avance } from "@/components/ui/avance";
import { estadoVisual, type EstadoVisual } from "@/lib/estados";
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

/** El estado de una sección, con sus comentarios sin responder encima */
function visualSeccion(
  seccion: { status: string },
  sinResponder: number,
): EstadoVisual {
  return estadoVisual("seccion_bp", {
    estado: seccion.status,
    comentariosSinResponder: sinResponder,
  });
}

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

  const [secciones, hipotesis, comentarios, original, areaPlan] =
    await Promise.all([
    supabase
      .from("bp_sections")
      .select(
        `id, content, status, current_version, updated_at, validated_at,
         bp_section_templates ( code, name, guidance, order_index ),
         profiles:updated_by ( full_name, last_name )`,
      )
      .eq("company_id", companyId),
    supabase
      .from("hypotheses")
      .select("id, section_id, statement, validation_criteria, status, evidence_links ( id, label, kind )")
      .eq("company_id", companyId),
    supabase
      .from("comments")
      .select(
        "id, entity_id, body, created_at, resolved_at, profiles:author_id ( full_name, last_name )",
      )
      .eq("company_id", companyId)
      .eq("entity", "bp_section")
      .order("created_at"),
    /* El business plan ya escrito, si lo han adjuntado */
    supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("company_id", companyId)
      .eq("kind", "business_plan")
      .maybeSingle(),
    supabase
      .from("dd_areas")
      .select("id")
      .eq("code", "comercial_traccion")
      .maybeSingle(),
  ]);

  const ordenadas = (secciones.data ?? []).sort(
    (a, b) =>
      (a.bp_section_templates?.order_index ?? 0) -
      (b.bp_section_templates?.order_index ?? 0),
  );

  const hipotesisPorSeccion = agrupar(hipotesis.data ?? [], (h) => h.section_id);
  const comentariosPorSeccion = agrupar(comentarios.data ?? [], (c) => c.entity_id);

  /*
   * Sin responder, no «todos».
   *
   * Un comentario ya resuelto es histórico y no frena nada. Lo que pone
   * una sección en ámbar es el que sigue esperando respuesta.
   */
  const sinResponderDe = (seccionId: string) =>
    (comentariosPorSeccion.get(seccionId) ?? []).filter(
      (c) => c.resolved_at === null,
    ).length;

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
      {/*
        El documento de siempre, arriba.
        
        Casi todas llegan con un business plan ya escrito en PDF o en Word.
        Antes había que volver a teclearlo aquí sección a sección para que
        la plataforma tuviera algo; ahora se adjunta y se lee de un clic,
        y las secciones se van escribiendo cuando toque.
      */}
      <Bloque>
        <TituloBloque
          accion={
            areaPlan.data && permisos.puedeEscribir ? (
              <AdjuntarBusinessPlan
                slug={compania.slug}
                companyId={companyId}
                areaId={areaPlan.data.id}
                hayUno={Boolean(original.data)}
              />
            ) : null
          }
        >
          El documento original
        </TituloBloque>
        {original.data ? (
          <div className="flex flex-wrap items-baseline gap-3 px-4 py-3">
            <span className="flex-1 text-sm text-titular">
              {original.data.name}
            </span>
            <Metadato>adjuntado el {fecha(original.data.created_at)}</Metadato>
            <AbrirDocumento documentId={original.data.id} />
          </div>
        ) : (
          <SinDatos>
            Si ya tenéis el business plan escrito, adjuntadlo aquí. Las
            secciones de abajo se siguen rellenando a mano: el documento es
            para tenerlo a mano, no lo sustituye.
          </SinDatos>
        )}
      </Bloque>

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

        {/*
          El plan entero, de un vistazo y antes de la lista.

          Cuántas validadas sobre el total, y debajo solo lo que se ha
          salido. Un comentario sin responder pone su sección en ámbar
          aunque la sección en sí vaya bien, porque es lo que de verdad
          frena.
        */}
        <div className="border-b border-filete px-4 py-3">
          <Avance
            etiqueta="Secciones del business plan"
            elementos={ordenadas.map((s) => ({
              id: s.id,
              estado: visualSeccion(s, sinResponderDe(s.id)),
              rotulo: s.bp_section_templates?.name ?? "Sección",
            }))}
          />
        </div>

        <ul className="divide-y divide-filete">
          {ordenadas.map((s) => {
            const sinResponder = sinResponderDe(s.id);
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <a
                  href={`#seccion-${s.id}`}
                  className="enlace flex-1 text-sm text-titular"
                >
                  {s.bp_section_templates?.name}
                </a>
                {s.content ? null : <Metadato>Sin redactar</Metadato>}
                {sinResponder > 0 ? (
                  <Metadato>
                    {sinResponder}{" "}
                    {sinResponder === 1
                      ? "comentario sin responder"
                      : "comentarios sin responder"}
                  </Metadato>
                ) : null}
                <Estado
                  valor={visualSeccion(s, sinResponder)}
                  rotulo={ESTADOS[s.status] ?? s.status}
                />
              </li>
            );
          })}
        </ul>
      </Bloque>

      {ordenadas.map((seccion) => {
        const plantilla = seccion.bp_section_templates;
        const susHipotesis = hipotesisPorSeccion.get(seccion.id) ?? [];
        const susComentarios = comentariosPorSeccion.get(seccion.id) ?? [];

        return (
          <Bloque
            key={seccion.id}
            id={`seccion-${seccion.id}`}
            className="scroll-mt-24"
          >
            <TituloBloque
              accion={
                <span className="flex items-center gap-3">
                  <Metadato>v{seccion.current_version}</Metadato>
                  <Estado
                    valor={visualSeccion(seccion, sinResponderDe(seccion.id))}
                    rotulo={ESTADOS[seccion.status] ?? seccion.status}
                  />
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
                    ? ` · ${nombreCompleto(seccion.profiles.full_name, seccion.profiles.last_name)}`
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
                        {(nombreCompleto(c.profiles?.full_name, c.profiles?.last_name) || "IWL")} · {fecha(c.created_at)}
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
