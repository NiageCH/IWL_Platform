import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { Estado } from "@/components/ui/estado";
import { AbrirDocumento } from "@/components/formularios/expediente";
import {
  AceptarFranja,
  AnotarReunion,
  CancelarReunion,
  ProponerReunion,
} from "@/components/formularios/reuniones";
import type { Reunion } from "@/lib/datos/reuniones";
import { estadoVisual } from "@/lib/estados";
import { CONCLUSIONES, FORMATOS, ROTULO_REUNION, caducada, describirFranja } from "@/lib/reuniones";
import { fecha } from "@/lib/utils";

/**
 * Las reuniones de una candidatura, acordadas en la plataforma.
 *
 * La que está en juego enseña lo que toca hacer: esperar su respuesta,
 * aceptar una de sus fechas, cambiarla o cancelarla, y anotarla cuando se
 * celebre. Las celebradas, con quién estuvo, qué se habló y cómo quedó; la
 * conclusión va escrita, no en un color: es una decisión, no un estado de
 * trabajo.
 */
export function BloqueReuniones({
  reuniones,
  candidaturaId,
  contacto,
  personas,
  abierta,
}: {
  reuniones: Reunion[];
  candidaturaId: string;
  contacto: string;
  /** Las personas de IWL, para elegir quién va */
  personas: { id: string; nombre: string }[];
  /** Firmada o descartada, ya no se proponen reuniones */
  abierta: boolean;
}) {
  const enJuego = reuniones.find((r) => ["propuesta", "contrapropuesta", "confirmada"].includes(r.estado));
  return (
    <Bloque>
      <TituloBloque accion={<Metadato>{reuniones.length}</Metadato>}>Reuniones</TituloBloque>
      {reuniones.length === 0 ? (
        <SinDatos>
          Todavía no hay ninguna. Propón dos o tres fechas: {contacto || "ella"} las verá en su
          página, elegirá una o propondrá otras, y le llegará un correo.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {reuniones.map((r) => {
            const vencida = caducada(r.estado, r.franjas);
            const cabecera = (
              <div className="flex flex-wrap items-center gap-2">
                <Estado
                  valor={estadoVisual("reunion", { estado: r.estado, caducada: vencida })}
                  rotulo={vencida ? "Caducada" : ROTULO_REUNION[r.estado]}
                />
                {r.formato ? <span className="text-xs text-metadato">{FORMATOS[r.formato]}</span> : null}
                {r.personasIwl.length ? (
                  <span className="text-xs text-metadato">· van {r.personasIwl.join(", ")}</span>
                ) : null}
              </div>
            );
            return (
              <li key={r.id} className="flex flex-col gap-2 px-5 py-3 text-sm">
                {r.estado === "celebrada" ? (
                  <>
                    <p className="text-titular">
                      Celebrada el {fecha(r.celebradaOn!)}
                      {r.conclusion ? <span className="pastilla ml-2">{CONCLUSIONES[r.conclusion]}</span> : null}
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
                ) : r.estado === "cancelada" ? (
                  <>
                    {cabecera}
                    <p className="text-xs text-metadato">{r.canceladaMotivo}</p>
                  </>
                ) : r.estado === "confirmada" && r.elegida ? (
                  <>
                    {cabecera}
                    <p className="text-titular first-letter:uppercase">
                      {describirFranja(r.elegida)} <span className="text-xs text-metadato">(Madrid)</span>
                    </p>
                    {r.enlace || r.direccion ? (
                      <p className="text-xs text-secundario [overflow-wrap:anywhere]">{r.enlace ?? r.direccion}</p>
                    ) : null}
                    {abierta ? (
                      <div className="flex flex-col gap-1">
                        <AnotarReunion candidaturaId={candidaturaId} reunionId={r.id} contacto={contacto} />
                        <ProponerReunion
                          candidaturaId={candidaturaId}
                          personas={personas}
                          titulo="Cambiar la reunión"
                          cambio
                        />
                        <CancelarReunion reunionId={r.id} candidaturaId={candidaturaId} />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {cabecera}
                    <p className="text-xs text-metadato">
                      {r.estado === "contrapropuesta"
                        ? `${contacto || "Ella"} propone otras fechas${vencida ? ", y ya han pasado" : ""}:`
                        : vencida
                          ? "Han pasado todas las fechas sin que eligiera: propón otras."
                          : `Esperando a que elija, desde el ${fecha(r.propuestaAt!)}:`}
                    </p>
                    <ul className="flex flex-col gap-1">
                      {r.franjas.map((f) => (
                        <li key={f.inicio} className="flex flex-wrap items-center gap-3 text-xs text-secundario">
                          <span className="first-letter:uppercase">{describirFranja(f)}</span>
                          {r.estado === "contrapropuesta" && abierta && new Date(f.inicio) > new Date() ? (
                            <AceptarFranja reunionId={r.id} candidaturaId={candidaturaId} inicio={f.inicio} />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {r.notaCandidata ? (
                      <p className="whitespace-pre-wrap text-xs text-cuerpo">Su nota: {r.notaCandidata}</p>
                    ) : null}
                    {abierta ? (
                      <div className="flex flex-col gap-1">
                        <ProponerReunion candidaturaId={candidaturaId} personas={personas} titulo="Proponer otras fechas" />
                        <CancelarReunion reunionId={r.id} candidaturaId={candidaturaId} />
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {abierta && !enJuego ? (
        <>
          <ProponerReunion candidaturaId={candidaturaId} personas={personas} />
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
