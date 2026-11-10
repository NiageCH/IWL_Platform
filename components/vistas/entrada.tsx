import Link from "next/link";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";
import { Estado } from "@/components/ui/estado";
import { ConfirmarSituacion, DecidirIncorporacion, DecirSituacion } from "@/components/formularios/entrada";
import { VIAS, type Via } from "@/lib/comite";
import { BASES, siguientePasoEntrada } from "@/lib/entrada";
import { describirSituacion, type DatosSocietarios } from "@/lib/societario";
import type { DecisionLeida } from "@/lib/datos/entrada";
import { fecha } from "@/lib/utils";
import { EnviarMensajeDescarte } from "@/components/formularios/correo";

interface CompaniaEnEntrada extends Partial<DatosSocietarios> {
  id: string;
  name: string;
  slug: string;
  via: string | null;
  situacion_confirmada_at: string | null;
}

/** La situación, como dato, con si IWL la ha confirmado */
function LineaSituacion({ compania }: { compania: CompaniaEnEntrada }) {
  const dicha = describirSituacion(compania);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-metadato">Situación societaria</span>
      <span className="text-titular">{dicha ?? "Sin decir todavía"}</span>
      {dicha ? (
        compania.situacion_confirmada_at ? (
          <Estado valor="hecho" rotulo="Confirmada" />
        ) : (
          <Estado valor="pendiente" rotulo="Por confirmar" />
        )
      ) : null}
    </div>
  );
}

/**
 * Lo que ve la fundadora mientras su compañía está en entrada.
 *
 * Mi compañía abre con la situación societaria si nadie la ha dicho: de
 * ella dependen sus puntos societarios, quién firma el Acuerdo y el hito
 * de constituir la sociedad. Dicha, el bloque dice el siguiente paso.
 */
export function EntradaFundadora({
  compania,
  propuesta,
}: {
  compania: CompaniaEnEntrada;
  /** El estado del Anexo que ella puede ver: propuesto, comentado o aceptado */
  propuesta?: string | null;
}) {
  const via = compania.via as Via | null;

  if (!compania.situacion_societaria) {
    return (
      <Bloque className="mb-8">
        <TituloBloque accion={<Metadato>Lo primero</Metadato>}>¿Desde dónde partís?</TituloBloque>
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm text-secundario">
            Bienvenida a la plataforma. Antes de nada, dinos si {compania.name} ya tiene sociedad,
            si está en constitución o si todavía no la hay. No hace falta tener sociedad para
            empezar: de esto depende qué documentación societaria tiene sentido pedirte y quién
            firmará el Acuerdo. IWL lo confirmará contigo.
          </p>
          <DecirSituacion companyId={compania.id} />
        </div>
      </Bloque>
    );
  }

  return (
    <Bloque className="mb-8">
      <TituloBloque accion={<Metadato>{via ? `Vía ${VIAS[via]}` : "En entrada"}</Metadato>}>
        En entrada
      </TituloBloque>
      <div className="flex flex-col gap-3 px-5 py-4">
        {propuesta === "propuesto" || propuesta === "comentado" ? (
          <p className="text-sm text-titular">
            Inception Woman Lab te ha propuesto el Acuerdo.{" "}
            <Link href="/proyecto/programa" className="enlace text-acento-texto">
              Léelo en Programa
            </Link>{" "}
            para comentarlo y aceptarlo.
          </p>
        ) : propuesta === "aceptado" ? (
          <p className="text-sm text-cuerpo">Has aceptado la propuesta de Acuerdo. Falta firmarla con IWL.</p>
        ) : (
          <p className="text-sm text-cuerpo">{siguientePasoEntrada(via)}</p>
        )}
        <LineaSituacion compania={compania} />
      </div>
    </Bloque>
  );
}

/**
 * Lo que ve IWL de una compañía en entrada: vía, situación por confirmar y
 * la decisión de incorporación. Cuando no se incorpora, el mensaje para
 * ella se abre en el correo, como el descarte del comité.
 */
export function EntradaIwl({
  compania,
  decision,
  candidatura,
  esDireccion,
  archivada,
}: {
  compania: CompaniaEnEntrada;
  decision: DecisionLeida | null;
  candidatura: { id: string; contacto: string; correo: string } | null;
  esDireccion: boolean;
  archivada: boolean;
}) {
  const via = compania.via as Via | null;

  return (
    <Bloque className="mb-8">
      <TituloBloque accion={<Metadato>{via ? `Vía ${VIAS[via]}` : "Sin vía"}</Metadato>}>
        {decision?.decision === "no" || archivada ? "No incorporada" : "En entrada"}
      </TituloBloque>
      <div className="flex flex-col gap-4 px-5 py-4">
        <p className="text-sm text-secundario">
          Todavía no cuenta en la cartera ni en ninguna media.
          {candidatura ? (
            <>
              {" "}
              <Link href={`/embudo/${candidatura.id}`} className="enlace text-acento-texto">
                Ver su candidatura
              </Link>
            </>
          ) : null}
        </p>

        <div className="flex flex-col gap-2">
          <LineaSituacion compania={compania} />
          {!compania.situacion_societaria ? (
            <p className="text-xs text-metadato">
              Es lo primero que se le pregunta al entrar. Si la sabes, la puedes poner tú en la ficha.
            </p>
          ) : !compania.situacion_confirmada_at ? (
            <ConfirmarSituacion companyId={compania.id} />
          ) : null}
        </div>

        {decision ? (
          <div className="flex flex-col gap-2 border-t border-filete pt-4 text-sm">
            <p className="text-titular">
              {decision.decision === "si" ? "Se incorpora" : "No se incorpora"}
              <span className="text-metadato">
                {" "}
                · base {BASES[decision.base].toLowerCase()} · {fecha(decision.decididoOn)}
                {decision.quien ? ` · ${decision.quien}` : ""}
              </span>
            </p>
            <p className="whitespace-pre-wrap text-secundario">{decision.motivo}</p>
            {decision.decision === "no" && decision.mensaje && candidatura?.correo ? (
              <div>
                <EnviarMensajeDescarte origen="incorporacion" id={compania.id} />
              </div>
            ) : null}
            {decision.decision === "si" ? (
              <p className="text-sm">
                Siguiente: el Acuerdo.{" "}
                <Link href={`/cartera/${compania.slug}/programa`} className="enlace text-acento-texto">
                  Prepararlo y proponérselo en Programa
                </Link>
              </p>
            ) : null}
          </div>
        ) : esDireccion ? (
          <div className="-mx-5 -mb-4">
            <DecidirIncorporacion
              companyId={compania.id}
              via={via}
              contacto={candidatura?.contacto ?? ""}
              startup={compania.name}
            />
          </div>
        ) : (
          <p className="text-xs text-metadato">La incorporación la decide dirección.</p>
        )}
      </div>
    </Bloque>
  );
}
