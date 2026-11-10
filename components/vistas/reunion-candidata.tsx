import { Estado } from "@/components/ui/estado";
import { ElegirFranja, ProponerOtras } from "@/components/formularios/reunion-candidata";
import type { ReunionDeElla } from "@/lib/datos/reuniones";
import { estadoVisual } from "@/lib/estados";
import { FORMATOS, ROTULO_REUNION, caducada, describirFranja, franjasVigentes, ics } from "@/lib/reuniones";

/**
 * La reunión, en la página de ella: arriba, como siguiente paso. La misma
 * tarjeta en su enlace privado (con su testigo) y en «Tu candidatura» (con
 * su sesión).
 *
 *   · Propuesta: las franjas, para elegir una, o «Ninguna me va».
 *   · Contrapropuesta: las suyas, a la espera de IWL.
 *   · Confirmada: cuándo, cómo y dónde, y «Añadir a mi calendario».
 *   · Cancelada: el motivo.
 *
 * La hora va siempre en hora de Madrid, dicho: ella puede no estar allí.
 */
export function TarjetaReunion({ reunion: r, token }: { reunion: ReunionDeElla; token?: string }) {
  const vencida = caducada(r.estado, r.franjas);
  const visual = estadoVisual("reunion", { estado: r.estado, caducada: vencida });
  const como = r.formato ? FORMATOS[r.formato] : null;
  const quien = r.personas_iwl.length ? `Por IWL: ${r.personas_iwl.join(", ")}.` : null;

  const titulo =
    r.estado === "confirmada"
      ? "Reunión confirmada"
      : r.estado === "cancelada"
        ? "Reunión cancelada"
        : r.estado === "contrapropuesta"
          ? "Has propuesto otras fechas"
          : "Te proponemos reunirnos";

  return (
    <section className="tarjeta mb-6 flex flex-col gap-4 p-6" aria-label="Reunión">
      <div>
        <p className="mb-1 text-xs text-metadato">Siguiente paso</p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="titular-marca text-2xl text-titular">{titulo}</h2>
          <Estado valor={visual} rotulo={vencida ? "Caducada" : ROTULO_REUNION[r.estado]} />
        </div>
      </div>

      {r.estado === "propuesta" ? (
        vencida ? (
          <p className="text-sm text-secundario">
            Las fechas que te propusimos ya han pasado. Te propondremos otras enseguida.
          </p>
        ) : (
          <>
            <p className="text-sm text-secundario">
              Nos gustaría conoceros{como ? `, ${como}` : ""}. Elige la fecha que te venga bien, en hora
              de Madrid, o propón otras si ninguna te va. {quien}
            </p>
            {r.nota ? <p className="whitespace-pre-wrap text-sm text-cuerpo">{r.nota}</p> : null}
            <ul className="flex flex-col gap-2">
              {franjasVigentes(r.franjas).map((f) => (
                <li
                  key={f.inicio}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-filete px-4 py-3"
                >
                  <span className="text-sm text-titular first-letter:uppercase">{describirFranja(f)}</span>
                  <ElegirFranja reunionId={r.id} inicio={f.inicio} token={token} />
                </li>
              ))}
            </ul>
            <ProponerOtras
              reunionId={r.id}
              duracion={Math.round((new Date(r.franjas[0].fin).getTime() - new Date(r.franjas[0].inicio).getTime()) / 60_000)}
              token={token}
            />
          </>
        )
      ) : null}

      {r.estado === "contrapropuesta" ? (
        <>
          <p className="text-sm text-secundario">
            {vencida
              ? "Las fechas que propusiste ya han pasado. Te propondremos otras."
              : "Te diremos cuál nos va, o te propondremos otras. Te llegará un correo."}
          </p>
          <ul className="flex flex-col gap-1 text-sm text-cuerpo">
            {r.franjas.map((f) => (
              <li key={f.inicio} className="first-letter:uppercase">
                · {describirFranja(f)}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {r.estado === "confirmada" && r.elegida ? (
        <>
          <p className="text-lg text-titular first-letter:uppercase">
            {describirFranja(r.elegida)} <span className="text-sm text-metadato">(hora de Madrid)</span>
          </p>
          <dl className="flex flex-col gap-1 text-sm">
            {como ? (
              <div>
                <dt className="inline text-metadato">Cómo: </dt>
                <dd className="inline text-cuerpo">{r.formato === "videollamada" ? "Videollamada" : "En persona"}</dd>
              </div>
            ) : null}
            {r.enlace ? (
              <div>
                <dt className="inline text-metadato">Enlace: </dt>
                <dd className="inline [overflow-wrap:anywhere]">
                  <a href={r.enlace} className="enlace text-acento-texto" target="_blank" rel="noreferrer">
                    {r.enlace}
                  </a>
                </dd>
              </div>
            ) : null}
            {r.direccion ? (
              <div>
                <dt className="inline text-metadato">Dónde: </dt>
                <dd className="inline text-cuerpo">{r.direccion}</dd>
              </div>
            ) : null}
            {quien ? <p className="text-cuerpo">{quien}</p> : null}
          </dl>
          <div>
            <a
              href={`data:text/calendar;charset=utf-8,${encodeURIComponent(
                ics({
                  uid: r.id,
                  franja: r.elegida,
                  titulo: "Reunión con Inception Woman Lab",
                  descripcion: [r.nota, quien].filter(Boolean).join("\n") || null,
                  lugar: r.enlace ?? r.direccion,
                }),
              )}`}
              download="reunion-inception-woman-lab.ics"
              className="accion text-sm"
            >
              Añadir a mi calendario
            </a>
          </div>
        </>
      ) : null}

      {r.estado === "cancelada" ? (
        <p className="text-sm text-secundario">
          Hemos cancelado la reunión.{r.cancelada_motivo ? ` ${r.cancelada_motivo}` : ""}
        </p>
      ) : null}
    </section>
  );
}
