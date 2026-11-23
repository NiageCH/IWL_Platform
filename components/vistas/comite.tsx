import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { Estado } from "@/components/ui/estado";
import { AbrirDocumento } from "@/components/formularios/expediente";
import { EnviarMensajeDescarte } from "@/components/formularios/correo";
import { RegenerarPdfActa, BorrarActa, FirmarActa, RedactarActa } from "@/components/formularios/comite";
import type { Acta } from "@/lib/datos/comite";
import { DECISIONES } from "@/lib/comite";
import { ESTADIOS, type Estadio } from "@/lib/estadios";
import { fecha } from "@/lib/utils";

/**
 * El comité en la ficha de la candidatura: sus actas, quién ha firmado y
 * quién falta, y el PDF cuando firman todos. Firmar es de cada miembro; lo
 * que se firma no se edita.
 */
export function BloqueComite({
  actas,
  candidaturaId,
  yo,
  personas,
  porDefecto,
  estadioPropuesto,
  contacto,
  correo,
  startup,
  abierta,
  esDireccion = false,
  mentores = [],
}: {
  actas: Acta[];
  candidaturaId: string;
  yo: string;
  personas: { id: string; nombre: string }[];
  porDefecto: string[];
  estadioPropuesto: Estadio | null;
  contacto: string;
  correo: string | null;
  startup: string;
  abierta: boolean;
  /** Regenerar el PDF de un acta cerrada es de dirección */
  esDireccion?: boolean;
  mentores?: { id: string; nombre: string }[];
}) {
  return (
    <Bloque id="comite" className="scroll-mt-48">
      <TituloBloque accion={<Metadato>{actas.length}</Metadato>}>Comité</TituloBloque>
      {actas.length === 0 ? (
        <SinDatos>
          Sin acta todavía. Redáctala con la decisión y el estadio; cada miembro la
          firma con su cuenta y, cuando firman todos, se aplica.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {actas.map((a) => {
            const firmadas = a.firmas.filter((f) => f.firmadoAt).length;
            const meToca = a.firmas.some((f) => f.profileId === yo && !f.firmadoAt);
            return (
              <li key={a.id} className="flex flex-col gap-2 px-5 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-titular">Acta del {fecha(a.fecha)}</span>
                  <span className="pastilla">{DECISIONES[a.decision]}</span>
                  {a.estadio ? <span className="pastilla">{ESTADIOS[a.estadio]}</span> : null}
                  <Estado
                    valor={a.cerradaAt ? "hecho" : "curso"}
                    rotulo={a.cerradaAt ? "Firmada por todos" : `${firmadas} de ${a.firmas.length} firmas`}
                  />
                </div>
                <p className="whitespace-pre-wrap text-secundario [overflow-wrap:anywhere]">{a.resumen}</p>
                {a.mentor ? <p className="text-xs text-metadato">Mentor principal: {a.mentor}</p> : null}
                {a.estadioMotivo ? <p className="text-xs text-metadato">Otro estadio porque: {a.estadioMotivo}</p> : null}
                {a.motivo ? <p className="text-xs text-metadato">Motivo: {a.motivo}</p> : null}
                {a.revisionOn ? <p className="text-xs text-metadato">Se revisa el {fecha(a.revisionOn)}</p> : null}
                <p className="text-xs text-metadato">
                  {a.firmas
                    .map((f) => `${f.nombre}: ${f.firmadoAt ? `firmó el ${fecha(f.firmadoAt)}` : "falta"}`)
                    .join(" · ")}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {meToca ? <FirmarActa actaId={a.id} candidaturaId={candidaturaId} /> : null}
                  {firmadas === 0 ? <BorrarActa actaId={a.id} candidaturaId={candidaturaId} /> : null}
                  {a.documento ? <AbrirDocumento documento={a.documento} /> : null}
                  {a.cerradaAt && esDireccion ? <RegenerarPdfActa actaId={a.id} candidaturaId={candidaturaId} /> : null}
                  {a.cerradaAt && a.decision === "descartada" && a.mensaje && correo ? (
                    <EnviarMensajeDescarte origen="acta" id={a.id} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {abierta ? (
        <RedactarActa
          candidaturaId={candidaturaId}
          personas={personas}
          porDefecto={porDefecto}
          estadioPropuesto={estadioPropuesto}
          contacto={contacto}
          startup={startup}
          mentores={mentores}
        />
      ) : null}
    </Bloque>
  );
}
