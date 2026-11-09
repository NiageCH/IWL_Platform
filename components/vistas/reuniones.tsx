import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { AbrirDocumento } from "@/components/formularios/expediente";
import { AnotarReunion, ProponerReunion } from "@/components/formularios/reuniones";
import type { Reunion } from "@/lib/datos/reuniones";
import { CONCLUSIONES, describirFranja } from "@/lib/reuniones";
import { fecha } from "@/lib/utils";

/**
 * Las reuniones de una candidatura: las propuestas, con sus franjas, y las
 * celebradas, con quién estuvo, qué se habló y cómo quedó. La conclusión
 * va escrita, no en un color: es una decisión, no un estado de trabajo.
 */
export function BloqueReuniones({
  reuniones,
  candidaturaId,
  contacto,
  correo,
  startup,
  abierta,
}: {
  reuniones: Reunion[];
  candidaturaId: string;
  contacto: string;
  correo: string | null;
  startup: string;
  /** Firmada o descartada, ya no se proponen reuniones */
  abierta: boolean;
}) {
  return (
    <Bloque>
      <TituloBloque accion={<Metadato>{reuniones.length}</Metadato>}>Reuniones</TituloBloque>
      {reuniones.length === 0 ? (
        <SinDatos>
          Todavía no hay ninguna. Propón dos o tres franjas y se abre el correo
          ya escrito para {contacto}.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {reuniones.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 px-5 py-3 text-sm">
              {r.celebradaOn ? (
                <>
                  <p className="text-titular">
                    Celebrada el {fecha(r.celebradaOn)}
                    {r.conclusion ? (
                      <span className="pastilla ml-2">{CONCLUSIONES[r.conclusion]}</span>
                    ) : null}
                  </p>
                  {r.asistentes.length ? (
                    <p className="text-xs text-metadato">
                      {r.asistentes.map((a) => `${a.nombre} (${a.de === "iwl" ? "IWL" : "candidatura"})`).join(" · ")}
                    </p>
                  ) : null}
                  {r.notas ? (
                    <p className="whitespace-pre-wrap text-secundario [overflow-wrap:anywhere]">{r.notas}</p>
                  ) : null}
                  {r.adjuntos.length ? (
                    <ul className="flex flex-col gap-1">
                      {r.adjuntos.map((a) => (
                        <li key={a.id}>
                          <AbrirDocumento documento={a} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-titular">
                    Propuesta el {fecha(r.propuestaAt)}, sin celebrar
                  </p>
                  <ul className="text-xs text-secundario">
                    {r.franjas.map((f) => (
                      <li key={f.inicio}>· {describirFranja(f)}</li>
                    ))}
                  </ul>
                  {abierta ? (
                    <AnotarReunion candidaturaId={candidaturaId} reunionId={r.id} contacto={contacto} />
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {abierta ? (
        <>
          <ProponerReunion candidaturaId={candidaturaId} contacto={contacto} correo={correo} startup={startup} />
          <AnotarReunion candidaturaId={candidaturaId} contacto={contacto} />
        </>
      ) : null}
    </Bloque>
  );
}

/** Si ha abierto su enlace privado, y cuándo: lo que dirección quiere saber antes de insistir */
export function AperturaEnlace({
  abierto,
  visto,
}: {
  abierto: string | null;
  visto: string | null;
}) {
  if (!abierto) {
    return <p className="text-xs text-metadato">Todavía no ha abierto su enlace.</p>;
  }
  return (
    <p className="text-xs text-metadato">
      Abrió su enlace el {fecha(abierto)}
      {visto && visto.slice(0, 10) !== abierto.slice(0, 10) ? ` · la última vez, el ${fecha(visto)}` : ""}
    </p>
  );
}
