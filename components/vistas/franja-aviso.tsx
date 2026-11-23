import { ResponderRecomendacion } from "@/components/formularios/filtro";
import Link from "next/link";
import type { ReactNode } from "react";
import { presentarAviso, type DatosAviso, type TipoAviso } from "@/lib/avisos";
import { leerAviso } from "@/lib/datos/onboarding";
import { leerRevisionesComite } from "@/lib/datos/comite";
import { PASO_EMBUDO, traza } from "@/lib/recorridos";
import { leerEnEntrada, porDecidir, porProponer } from "@/lib/datos/entrada";
import { personaActual, esIwl } from "@/lib/supabase/servidor";
import { fecha } from "@/lib/utils";
import type { QuienMueve } from "@/lib/entrada";
import { ConfirmarSituacion } from "@/components/formularios/entrada";
import { ContrafirmarNda } from "@/components/formularios/nda-iwl";
import { CerrarAviso } from "@/components/formularios/cerrar-aviso";
import { SiguientePaso } from "@/components/formularios/candidatura";
import { FirmarActa } from "@/components/formularios/comite";
import { RevisarPunto } from "@/components/formularios/diligencia";
import { ReintentarTodos } from "@/components/formularios/correo";
import { CambiarSituacion, Destino, IrA } from "@/components/formularios/destino-aviso";
import { Traza } from "@/components/vistas/avisos";

/**
 * «Has venido a: …» (REVISION, 18 nov).
 *
 * Arriba de la página a la que lleva un aviso, pegada al borde para que se
 * vea a la vez que el bloque resaltado, sin buscar. Dice a qué se ha
 * venido, con el dato, y pone la acción ahí mismo:
 *   · la de un clic, entera —confirmar la situación, contrafirmar—;
 *   · la que pide escribir o elegir, como un botón que lleva al formulario
 *     del bloque y pone el cursor en él.
 *
 * Hecha la acción, el aviso se cierra y la franja dice qué viene después y
 * quién lo hace, con su botón si le toca a quien mira.
 *
 * `aviso` es el id de un aviso guardado, o `comite`, `incorporacion` y `proponer` para
 * los que se calculan y no tienen fila (`tope`, el nombre de antes, sigue
 * valiendo para los enlaces que ya estén en un correo).
 */

export interface ContextoFranja {
  companyId?: string;
  slug?: string;
  candidaturaId?: string;
  nombre?: string;
}

const QUIEN: Record<QuienMueve | "mentor", string> = {
  ella: "lo hace ella",
  iwl: "lo hace IWL",
  direccion: "lo hace dirección",
  mentor: "lo hace el mentor",
};

/** Quién mueve el paso de después, en los que no salen de `pasoEntrada` */
const QUIEN_DESPUES: Partial<Record<TipoAviso, QuienMueve | "mentor">> = {
  nda_firmado: "ella",
  reunion_contrapropuesta: "iwl",
  reunion_caducada: "ella",
  reunion_anotar: "iwl",
  hito_entregado: "ella",
  hito_sin_revisar: "ella",
  cambio_estadio: "ella",
  candidatura_nueva: "iwl",
  recomendacion_pendiente: "iwl",
  tramo_cerrado: "ella",
  tramo_cerrado_ella: "ella",
  listo_para_invertible: "direccion",
  plazo_vencido: "direccion",
  acta_por_firmar: "iwl",
  documento_entregado: "ella",
};

export async function FranjaAviso({ aviso, contexto = {} }: { aviso?: string | string[]; contexto?: ContextoFranja }) {
  const clave = Array.isArray(aviso) ? aviso[0] : aviso;
  if (!clave) return null;
  const persona = await personaActual();
  if (!persona) return null;

  if (clave === "comite") return <FranjaComite contexto={contexto} />;
  if (clave === "incorporacion" || clave === "tope") {
    return <FranjaIncorporacion contexto={contexto} esDireccion={persona.role === "admin_iwl"} />;
  }
  // El aviso va a dirección; el botón, a cualquiera de IWL, que es quien puede proponerlo
  if (clave === "proponer") return <FranjaProponer contexto={contexto} puede={esIwl(persona.role)} />;

  const a = await leerAviso(clave);
  if (!a) return null;
  const p = presentarAviso(a);

  if (a.cerradoAt) {
    const siguiente = await siguienteTras(a, p.despues);
    const mio =
      siguiente &&
      ((siguiente.quien === "direccion" && persona.role === "admin_iwl") ||
        (siguiente.quien === "iwl" && esIwl(persona.role)));
    return (
      <Marco hecho>
        <p className="text-sm text-titular">
          <strong className="font-semibold">Hecho.</strong>{" "}
          {a.cerradoPor ? `Lo hizo ${a.cerradoPor} el ${fecha(a.cerradoAt)}.` : `Cerrado el ${fecha(a.cerradoAt)}.`}
          {siguiente ? (
            <>
              {" "}
              Siguiente: {siguiente.texto.charAt(0).toLowerCase() + siguiente.texto.slice(1)} ·{" "}
              {QUIEN[siguiente.quien]}
            </>
          ) : null}
        </p>
        {mio && siguiente?.href ? (
          <Link href={siguiente.href} className="boton-marca self-start px-4 py-1.5 text-xs">
            {siguiente.texto}
          </Link>
        ) : null}
      </Marco>
    );
  }

  return (
    <Marco>
      <p className="text-sm text-titular">
        <strong className="font-semibold">Has venido a:</strong> {p.hasVenidoA}
      </p>
      <p className="text-xs text-secundario">{p.paso}</p>
      <div className="flex flex-wrap items-center gap-3">
        {await acciones(a, p.verbo, p.ancla, contexto, !persona.last_name?.trim())}
      </div>
      {p.vieneDe || p.despues ? <Traza vieneDe={p.vieneDe} despues={p.despues} /> : null}
      <Destino ancla={p.ancla} />
    </Marco>
  );
}

function Marco({ children, hecho = false }: { children: ReactNode; hecho?: boolean }) {
  return (
    <div
      role="region"
      aria-label={hecho ? "Hecho" : "Has venido a"}
      data-franja-aviso
      className={
        "sticky top-0 z-30 mb-6 flex flex-col gap-2 rounded-b-lg border border-t-0 border-filete bg-elevado px-5 py-3 shadow-md " +
        (hecho ? "border-l-4 border-l-[var(--color-bien)]" : "border-l-4 border-l-acento")
      }
    >
      {children}
    </div>
  );
}

async function acciones(
  a: DatosAviso,
  verbo: string,
  ancla: string,
  contexto: ContextoFranja,
  sinApellidos: boolean,
): Promise<ReactNode> {
  switch (a.tipo) {
    case "situacion_dicha":
      return contexto.companyId ? (
        <>
          <ConfirmarSituacion companyId={contexto.companyId} />
          <CambiarSituacion companyId={contexto.companyId} />
        </>
      ) : null;
    case "nda_firmado":
      return a.candidaturaId ? <ContrafirmarNda candidaturaId={a.candidaturaId} sinApellidos={sinApellidos} /> : null;
    case "candidatura_nueva":
      return a.candidaturaId ? <SiguientePaso id={a.candidaturaId} estado="presentada" /> : null;
    case "recomendacion_pendiente":
      return a.candidaturaId ? <ResponderRecomendacion candidaturaId={a.candidaturaId} /> : null;
    case "acta_por_firmar":
      return a.actaId && a.candidaturaId ? <FirmarActa actaId={a.actaId} candidaturaId={a.candidaturaId} /> : null;
    case "documento_entregado": {
      const slug = contexto.slug ?? a.companiaSlug;
      return slug && a.punto ? <RevisarPunto slug={slug} id={a.punto.id} /> : null;
    }
    case "correos_sin_enviar":
      return <ReintentarTodos cuantos={a.cuantos ?? 0} />;
    case "cambio_estadio":
      return (
        <>
          <IrA ancla={ancla} verbo={verbo} />
          {/* No hay un hecho que lo cierre solo: lo cierra quien lo revisa */}
          <CerrarAviso id={a.id} rotulo="Revisado" />
        </>
      );
    default:
      return <IrA ancla={ancla} verbo={verbo} />;
  }
}

/**
 * Lo que viene después de un aviso hecho. En la entrada de una compañía,
 * lo que dice `pasoEntrada` ahora mismo; en lo demás, el paso siguiente de
 * su recorrido.
 */
async function siguienteTras(
  a: DatosAviso,
  despues: string | null,
): Promise<{ texto: string; quien: QuienMueve | "mentor"; href?: string } | null> {
  if (
    (a.tipo === "situacion_dicha" || a.tipo === "anexo_comentario" || a.tipo === "anexo_aceptado") &&
    a.companiaSlug
  ) {
    const fila = (await leerEnEntrada()).find((f) => f.slug === a.companiaSlug);
    // Firmado el Acuerdo, ya no está en entrada: no queda paso de entrada
    if (fila) return { ...fila.paso, href: hrefEntrada(fila.slug, fila.paso.texto) };
  }
  if (!despues) return null;
  return { texto: despues, quien: QUIEN_DESPUES[a.tipo] ?? "iwl" };
}

function hrefEntrada(slug: string, texto: string): string {
  if (/situaci/i.test(texto)) return `/cartera/${slug}#situacion`;
  if (/incorporaci/i.test(texto)) return `/cartera/${slug}#incorporacion`;
  return `/cartera/${slug}/programa#anexo`;
}

/** Revisión en comité: no tiene fila; sigue pendiente mientras esté en la lista */
async function FranjaComite({ contexto }: { contexto: ContextoFranja }) {
  if (!contexto.candidaturaId) return null;
  const pendientes = await leerRevisionesComite();
  const pendiente = pendientes.find((r) => r.candidaturaId === contexto.candidaturaId);
  const t = traza("embudo", PASO_EMBUDO.comite);
  if (!pendiente) {
    return (
      <Marco hecho>
        <p className="text-sm text-titular">
          <strong className="font-semibold">Hecho.</strong> Ya no está pendiente de comité. Siguiente:{" "}
          {t.despues?.toLowerCase()} · {QUIEN.direccion}
        </p>
      </Marco>
    );
  }
  return (
    <Marco>
      <p className="text-sm text-titular">
        <strong className="font-semibold">Has venido a:</strong> redactar el acta de comité de {pendiente.nombre}
      </p>
      <p className="text-xs text-secundario">Quedó aplazada hasta el {fecha(pendiente.revisionOn)}</p>
      <div className="flex flex-wrap items-center gap-3">
        <IrA ancla="comite" verbo="Redactar el acta" />
      </div>
      <Traza {...t} />
      <Destino ancla="comite" />
    </Marco>
  );
}

/**
 * Decidir la incorporación: pendiente mientras `pasoEntrada` lo diga. Con
 * due diligence, con lo obligatorio validado; en idea, con la situación
 * confirmada. Si ha pasado el tope, lo lleva dicho.
 */
async function FranjaIncorporacion({ contexto, esDireccion }: { contexto: ContextoFranja; esDireccion: boolean }) {
  if (!contexto.slug) return null;
  const filas = await leerEnEntrada();
  const fila = filas.find((f) => f.slug === contexto.slug);
  const pendiente = porDecidir(filas).find((p) => p.slug === contexto.slug);
  const t = traza("entrada", 2);
  if (!pendiente) {
    return (
      <Marco hecho>
        <p className="text-sm text-titular">
          <strong className="font-semibold">Hecho.</strong>
          {fila ? ` Siguiente: ${fila.paso.texto.toLowerCase()} · ${QUIEN[fila.paso.quien]}` : " Ya no está en entrada."}
        </p>
        {fila && fila.paso.quien !== "ella" && esDireccion ? (
          <Link href={hrefEntrada(fila.slug, fila.paso.texto)} className="boton-marca self-start px-4 py-1.5 text-xs">
            {fila.paso.texto}
          </Link>
        ) : null}
      </Marco>
    );
  }
  return (
    <Marco>
      <p className="text-sm text-titular">
        <strong className="font-semibold">Has venido a:</strong> decidir la incorporación de {pendiente.nombre}
      </p>
      <p className="text-xs text-secundario">
        {pendiente.paso}
        {pendiente.tope && !pendiente.paso.includes("días") ? ` · lleva ${pendiente.dias} días en entrada` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {esDireccion ? (
          <IrA ancla="incorporacion" verbo="Decidir la incorporación" />
        ) : (
          <span className="text-xs text-metadato">La decide dirección.</span>
        )}
      </div>
      <Traza {...t} />
      <Destino ancla="incorporacion" />
    </Marco>
  );
}

/**
 * Proponerle el Acuerdo (REVISION, 20 nov): pendiente mientras la
 * incorporación esté decidida y no haya Anexo propuesto. El botón está en
 * el bloque del Anexo, en Programa.
 */
async function FranjaProponer({ contexto, puede }: { contexto: ContextoFranja; puede: boolean }) {
  if (!contexto.slug) return null;
  const filas = await leerEnEntrada();
  const fila = filas.find((f) => f.slug === contexto.slug);
  const pendiente = porProponer(filas).find((p) => p.slug === contexto.slug);
  const t = traza("entrada", 3);
  if (!pendiente) {
    return (
      <Marco hecho>
        <p className="text-sm text-titular">
          <strong className="font-semibold">Hecho.</strong>
          {fila ? ` Siguiente: ${fila.paso.texto.toLowerCase()} · ${QUIEN[fila.paso.quien]}` : " Ya no está en entrada."}
        </p>
      </Marco>
    );
  }
  return (
    <Marco>
      <p className="text-sm text-titular">
        <strong className="font-semibold">Has venido a:</strong> proponerle el Acuerdo a {pendiente.nombre}
      </p>
      <p className="text-xs text-secundario">{pendiente.paso}</p>
      <div className="flex flex-wrap items-center gap-3">
        {puede ? <IrA ancla="anexo" verbo="Proponer el Acuerdo" /> : <span className="text-xs text-metadato">Lo propone IWL.</span>}
      </div>
      <Traza {...t} />
      <Destino ancla="anexo" />
    </Marco>
  );
}
