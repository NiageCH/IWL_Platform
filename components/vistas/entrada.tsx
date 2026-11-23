import Link from "next/link";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";
import { Estado } from "@/components/ui/estado";
import { ConfirmarSituacion, DecidirIncorporacion, DecirSituacion, MentorPrincipal } from "@/components/formularios/entrada";
import { estadioYPrograma, type Estadio } from "@/lib/estadios";
import { BASES, siguientePasoEntrada } from "@/lib/entrada";
import { describirSituacion, type DatosSocietarios } from "@/lib/societario";
import type { DecisionLeida, FichaEntrada } from "@/lib/datos/entrada";
import { ESTADIOS } from "@/lib/estadios";
import { DECISIONES } from "@/lib/comite";
import { fecha } from "@/lib/utils";
import { EnviarMensajeDescarte } from "@/components/formularios/correo";

interface CompaniaEnEntrada extends Partial<DatosSocietarios> {
  id: string;
  name: string;
  slug: string;
  entry_state: string | null;
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
  const estadio = compania.entry_state as Estadio | null;

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
      <TituloBloque accion={<Metadato>{estadio ? estadioYPrograma(estadio) : "En entrada"}</Metadato>}>
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
          <p className="text-sm text-cuerpo">{siguientePasoEntrada(estadio)}</p>
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
  mentor = null,
  mentores = [],
}: {
  compania: CompaniaEnEntrada;
  decision: DecisionLeida | null;
  candidatura: { id: string; contacto: string; correo: string } | null;
  esDireccion: boolean;
  archivada: boolean;
  mentor?: { id: string; nombre: string } | null;
  mentores?: { id: string; nombre: string }[];
}) {
  const estadio = compania.entry_state as Estadio | null;

  return (
    <Bloque id="situacion" className="mb-8 scroll-mt-48">
      <TituloBloque accion={<Metadato>{estadio ? estadioYPrograma(estadio) : "Sin estadio"}</Metadato>}>
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

        <div className="border-t border-filete pt-4">
          <MentorPrincipal
            companyId={compania.id}
            actual={mentor}
            mentores={mentores}
            puedeCambiar={esDireccion && decision?.decision !== "no"}
          />
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
          <div id="incorporacion" className="-mx-5 -mb-4 scroll-mt-48">
            <DecidirIncorporacion
              companyId={compania.id}
              estadio={estadio}
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

/**
 * Lo que el mentor ve de la candidatura mientras la compañía está en
 * entrada (REVISION, 23 nov): lo que presentó ella y el resultado del
 * comité con el estadio confirmado. Ni las notas de las reuniones, ni la
 * deliberación, ni el due diligence: eso sigue siendo de IWL.
 */
export function FichaEntradaMentor({ ficha }: { ficha: FichaEntrada }) {
  const sector = ficha.sector === "Otro" && ficha.sector_otro ? ficha.sector_otro : ficha.sector;
  return (
    <Bloque id="ficha-entrada" className="mb-8 scroll-mt-48">
      <TituloBloque accion={<Metadato>Lo que presentó</Metadato>}>Ficha de entrada</TituloBloque>
      <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
        {ficha.one_liner ? (
          <div className="sm:col-span-2">
            <dt className="text-metadato">Qué hacen</dt>
            <dd className="text-titular">{ficha.one_liner}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-metadato">Sector</dt>
          <dd className="text-titular">{sector ?? "Sin decir"}</dd>
        </div>
        <div>
          <dt className="text-metadato">Estadio que declaró</dt>
          <dd className="text-titular">{ficha.estadio_declarado ? ESTADIOS[ficha.estadio_declarado] : "Sin declarar"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-metadato">Socios</dt>
          <dd className="text-titular">
            {ficha.socios.length
              ? ficha.socios.map((x) => `${x.nombre} (${x.pct} %${x.mujer ? ", mujer" : ""})`).join(" · ")
              : "Sin decir"}
          </dd>
        </div>
        <div>
          <dt className="text-metadato">Prueba del estadio</dt>
          <dd className="text-titular">{ficha.prueba ?? "No adjuntó"}</dd>
        </div>
        <div>
          <dt className="text-metadato">Comité</dt>
          <dd className="text-titular">
            {ficha.comite
              ? `${DECISIONES[ficha.comite.decision as keyof typeof DECISIONES] ?? ficha.comite.decision} el ${fecha(ficha.comite.fecha)}${
                  ficha.comite.estadio ? ` · estadio confirmado: ${ESTADIOS[ficha.comite.estadio]}` : ""
                }`
              : "Sin acta cerrada"}
          </dd>
        </div>
      </dl>
    </Bloque>
  );
}
