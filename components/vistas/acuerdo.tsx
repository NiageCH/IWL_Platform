import { clienteServidor } from "@/lib/supabase/servidor";
import { nombreCompleto } from "@/lib/etiquetas";
import {
  AceptarAnexo,
  ComentarAnexo,
  DarAccesoFundadora,
  FirmarAnexoAceptado,
  FirmarAcuerdoCompania,
  PasarAAceleracion,
  ProponerAnexo,
  ResponderComentarioAnexo,
  VolverABorrador,
} from "@/components/formularios/acuerdo";
import { Metadato } from "@/components/ui/primitivas";
import type { Situacion } from "@/lib/societario";
import { fecha } from "@/lib/utils";
import { horquillaDe } from "@/lib/entrada";
import type { Via } from "@/lib/comite";

/** Cómo se llama cada estado del Anexo, para quien lo lee */
export const ESTADOS_ANEXO: Record<string, string> = {
  borrador: "Borrador",
  propuesto: "Propuesto",
  comentado: "Comentado",
  aceptado: "Aceptado",
  firmado: "Firmado",
  cerrado: "Cerrado",
};

interface Firmante {
  nombre: string;
  calidad: "representante" | "personal";
}

interface AnexoLeido {
  id: string;
  status: string;
  firmantes: unknown;
  equity_pct: number | string | null;
  equity_fuera_motivo?: string | null;
  propuesto_at: string | null;
  aceptado_at: string | null;
}

interface Compania {
  id: string;
  slug: string;
  tramo: string;
  via: string | null;
  situacion_societaria: string | null;
}

/**
 * El Anexo como propuesta de Acuerdo: lo que va debajo de sus cifras según
 * el estado y quién mira.
 *
 * · IWL, en borrador: proponérselo, con quién firma. Si ella no tiene
 *   cuenta, el motivo y «Dar acceso» en su lugar.
 * · Propuesto o comentado: ella comenta y acepta; IWL responde y, si hay
 *   que cambiar algo, lo devuelve a borrador.
 * · Aceptado: en entrada, IWL firma el Acuerdo, que la pasa a incubación;
 *   en incubación, firma el Anexo renovado.
 */
export async function PropuestaAcuerdo({
  anexo,
  compania,
  esIwl,
  esFundadora,
}: {
  anexo: AnexoLeido;
  compania: Compania;
  esIwl: boolean;
  esFundadora: boolean;
}) {
  const supabase = await clienteServidor();
  const enEntrada = compania.tramo === "entrada";
  const propuesto = anexo.status === "propuesto" || anexo.status === "comentado";
  const aceptado = anexo.status === "aceptado";

  const borrador = esIwl && anexo.status === "borrador";
  const [comentarios, candidatura, fundadoras, plantillas, fases, horquillas, hito] = await Promise.all([
    supabase
      .from("anexo_comentarios")
      .select("id, texto, created_at, respuesta, respondido_at")
      .eq("annex_id", anexo.id)
      .order("created_at"),
    borrador
      ? supabase.from("candidaturas").select("contacto_nombre, contacto_apellidos").eq("company_id", compania.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Sin una fundadora con cuenta no se propone: lo dice la base, y aquí se ofrece el remedio
    borrador
      ? supabase.from("company_members").select("id").eq("company_id", compania.id).eq("member_role", "fundadora")
      : Promise.resolve({ data: [] as { id: string }[] }),
    esIwl && enEntrada && aceptado
      ? supabase.from("roadmap_templates").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    esIwl && enEntrada && aceptado
      ? supabase.from("phases").select("code, name").order("order_index")
      : Promise.resolve({ data: [] as { code: string; name: string }[] }),
    // La horquilla de su vía, como referencia al proponer
    borrador
      ? supabase.from("platform_settings").select("value").eq("key", "equity_horquilla").maybeSingle()
      : Promise.resolve({ data: null }),
    // Sin sociedad, la fecha prevista de constituirla: la pide proponer
    borrador
      ? supabase.from("milestones").select("due_date").eq("company_id", compania.id).eq("origin", "societario").maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const firmantes = (Array.isArray(anexo.firmantes) ? anexo.firmantes : []) as Firmante[];
  const lista = comentarios.data ?? [];

  return (
    <div className="flex flex-col gap-4 border-t border-filete px-4 py-4">
      {anexo.status !== "borrador" && anexo.status !== "firmado" && anexo.status !== "cerrado" ? (
        <p className="text-sm text-cuerpo">
          {aceptado
            ? `Propuesta de Acuerdo aceptada el ${fecha(anexo.aceptado_at)}. Falta firmarla.`
            : `Propuesta de Acuerdo del ${fecha(anexo.propuesto_at)}.${esFundadora ? " Léela, coméntala si algo no te encaja y acéptala cuando esté bien." : " Falta que ella la acepte."}`}
        </p>
      ) : null}

      {anexo.equity_fuera_motivo && anexo.status !== "borrador" ? (
        <p className="text-sm text-secundario">
          <span className="text-metadato">El equity se sale de la horquilla de su vía: </span>
          {anexo.equity_fuera_motivo}
        </p>
      ) : null}

      {firmantes.length && anexo.status !== "borrador" ? (
        <div>
          <Metadato>Firman el Acuerdo</Metadato>
          <ul className="mt-1 text-sm text-titular">
            {firmantes.map((f) => (
              <li key={`${f.calidad}-${f.nombre}`}>
                {f.nombre}
                <span className="text-metadato">
                  {f.calidad === "representante" ? " · en nombre de la sociedad" : " · a título personal"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lista.length ? (
        <ul className="flex flex-col gap-3">
          {lista.map((c) => (
            <li key={c.id} className="flex flex-col gap-1.5 rounded-lg border border-filete px-4 py-3 text-sm">
              <p className="text-xs text-metadato">Comentario del {fecha(c.created_at)}</p>
              <p className="whitespace-pre-wrap text-titular [overflow-wrap:anywhere]">{c.texto}</p>
              {c.respuesta ? (
                <div className="border-l-2 border-filete pl-3">
                  <p className="text-xs text-metadato">
                    Respuesta de Inception Woman Lab{c.respondido_at ? ` el ${fecha(c.respondido_at)}` : ""}
                  </p>
                  <p className="whitespace-pre-wrap text-secundario [overflow-wrap:anywhere]">{c.respuesta}</p>
                </div>
              ) : esIwl ? (
                <ResponderComentarioAnexo id={c.id} slug={compania.slug} />
              ) : (
                <p className="text-xs text-metadato">Sin responder todavía</p>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {esFundadora && propuesto ? (
        <>
          <ComentarAnexo annexId={anexo.id} companyId={compania.id} slug={compania.slug} />
          <AceptarAnexo id={anexo.id} slug={compania.slug} />
        </>
      ) : null}

      {/*
        Montado siempre que hay borrador, no solo «sin cuenta»: darle la
        cuenta vuelve falsa esa condición, y el formulario se llevaría la
        contraseña antes de que nadie la copiara.
      */}
      {borrador ? (
        <DarAccesoFundadora
          companyId={compania.id}
          slug={compania.slug}
          tieneCuenta={Boolean((fundadoras.data ?? []).length)}
        />
      ) : null}

      {borrador && (fundadoras.data ?? []).length ? (
        <div className="-mx-4 -mb-4">
          <ProponerAnexo
            id={anexo.id}
            slug={compania.slug}
            situacion={(compania.situacion_societaria as Situacion | null) ?? null}
            fundadoras={nombreCompleto(candidatura.data?.contacto_nombre, candidatura.data?.contacto_apellidos)}
            horquilla={horquillaDe(horquillas.data?.value, compania.via as Via | null)}
            via={compania.via}
            equity={anexo.equity_pct === null ? null : Number(anexo.equity_pct)}
            fechaHito={hito.data?.due_date ?? null}
          />
        </div>
      ) : null}

      {esIwl && (propuesto || aceptado) ? <VolverABorrador id={anexo.id} slug={compania.slug} aceptado={aceptado} /> : null}

      {esIwl && !enEntrada && aceptado ? <FirmarAnexoAceptado id={anexo.id} slug={compania.slug} /> : null}

      {esIwl && enEntrada && aceptado ? (
        <div className="-mx-4 -mb-4">
          <FirmarAcuerdoCompania
            companyId={compania.id}
            slug={compania.slug}
            plantillas={plantillas.data ?? []}
            fases={fases.data ?? []}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * La vía de entrada, con el último cambio y su motivo, y pasar de
 * Construcción a Aceleración (solo dirección). El motivo sale del registro,
 * que es donde lo deja la base.
 */
export async function BloqueVia({
  compania,
  esAdmin,
}: {
  compania: Compania;
  esAdmin: boolean;
}) {
  if (!compania.via) return null;
  const supabase = await clienteServidor();
  const { data: cambio } = await supabase
    .from("activity_log")
    .select("created_at, detail")
    .eq("company_id", compania.id)
    .eq("action", "cambio_via")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const motivo = (cambio?.detail as { motivo?: string } | null)?.motivo;

  return (
    <div className="flex flex-col gap-2 border-t border-filete px-4 py-3">
      <p className="text-sm">
        <span className="text-metadato">Vía de entrada </span>
        <span className="text-titular">{compania.via === "aceleracion" ? "Aceleración" : "Construcción"}</span>
      </p>
      {cambio && motivo ? (
        <p className="text-sm text-secundario">
          Pasó de Construcción a Aceleración el {fecha(cambio.created_at)}: {motivo}
        </p>
      ) : null}
      {esAdmin && compania.via === "construccion" ? (
        <div className="-mx-4 -mb-3">
          <PasarAAceleracion companyId={compania.id} slug={compania.slug} />
        </div>
      ) : null}
    </div>
  );
}
