import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { Estado } from "@/components/ui/estado";
import { AbrirDocumento } from "@/components/formularios/expediente";
import { BorrarActa, FirmarActa, RedactarActa } from "@/components/formularios/comite";
import type { Acta } from "@/lib/datos/comite";
import { DECISIONES, VIAS, type Via } from "@/lib/comite";
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
  viaPropuesta,
  contacto,
  correo,
  startup,
  abierta,
}: {
  actas: Acta[];
  candidaturaId: string;
  yo: string;
  personas: { id: string; nombre: string }[];
  porDefecto: string[];
  viaPropuesta: Via | null;
  contacto: string;
  correo: string | null;
  startup: string;
  abierta: boolean;
}) {
  return (
    <Bloque>
      <TituloBloque accion={<Metadato>{actas.length}</Metadato>}>Comité</TituloBloque>
      {actas.length === 0 ? (
        <SinDatos>
          Sin acta todavía. Redáctala con la decisión y la vía; cada miembro la
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
                  {a.via ? <span className="pastilla">{VIAS[a.via]}</span> : null}
                  <Estado
                    valor={a.cerradaAt ? "hecho" : "curso"}
                    rotulo={a.cerradaAt ? "Firmada por todos" : `${firmadas} de ${a.firmas.length} firmas`}
                  />
                </div>
                <p className="whitespace-pre-wrap text-secundario [overflow-wrap:anywhere]">{a.resumen}</p>
                {a.viaMotivo ? <p className="text-xs text-metadato">Otra vía porque: {a.viaMotivo}</p> : null}
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
                  {a.cerradaAt && a.decision === "descartada" && a.mensaje && correo ? (
                    <a
                      href={`mailto:${correo}?subject=${encodeURIComponent(`${startup} · Inception Woman Lab`)}&body=${encodeURIComponent(a.mensaje)}`}
                      className="accion text-xs"
                    >
                      Enviarle el mensaje
                    </a>
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
          viaPropuesta={viaPropuesta}
          contacto={contacto}
          startup={startup}
        />
      ) : null}
    </Bloque>
  );
}
