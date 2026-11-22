import type { ReactNode } from "react";
import { Estado } from "@/components/ui/estado";
import { FILTROS, type Filtro } from "@/lib/candidatura-nueva";

const VALOR: Record<Filtro, "hecho" | "vencido" | "atencion" | "pendiente"> = {
  pasa: "hecho",
  no_pasa: "vencido",
  revision_manual: "atencion",
  espera_recomendacion: "pendiente",
};

/** El resultado del filtro como pastilla: siempre con su palabra */
export function EstadoFiltro({ filtro }: { filtro: Filtro }) {
  return <Estado valor={VALOR[filtro]} rotulo={FILTROS[filtro]} />;
}

/**
 * Lo que ve ella en su enlace mientras el filtro no la ha dejado pasar
 * (REVISION, 22 nov): en qué ha quedado y por qué, en la voz de IWL.
 */
export function ResultadoFiltro({ filtro, motivo }: { filtro: Filtro; motivo: string | null }) {
  const texto: Record<Filtro, string> = {
    pasa: "",
    no_pasa:
      "Hemos revisado la candidatura con las condiciones de entrada de la convocatoria y esta vez no puede seguir adelante.",
    revision_manual: "La hemos recibido. El equipo de IWL la revisa a mano antes de seguir; te escribimos en cuanto la mire.",
    espera_recomendacion:
      "La hemos recibido. Falta que la persona de IWL que os recomienda lo confirme; en cuanto lo haga, seguimos.",
  };
  return (
    <div className="tarjeta mb-6 flex flex-col gap-2 p-5" role="status" data-filtro={filtro}>
      <div>
        <EstadoFiltro filtro={filtro} />
      </div>
      <p className="text-sm text-titular">{texto[filtro]}</p>
      {motivo && filtro === "no_pasa" ? <p className="text-sm text-cuerpo">{motivo}</p> : null}
      {filtro === "no_pasa" ? (
        <p className="text-xs text-metadato">Si alguno de los datos no es correcto, respóndenos al correo y lo miramos.</p>
      ) : null}
    </div>
  );
}

export interface DatosFiltro {
  candidaturaId: string;
  filtro: Filtro;
  motivo: string | null;
  sector: string | null;
  sectorOtro: string | null;
  socios: Array<{ nombre: string; pct: number; mujer: boolean }>;
  mujeresPct: number | null;
  prueba: string | null;
  recomendadaPor: { id: string; nombre: string } | null;
  recomendacion: string | null;
  decision: { quien: string | null; motivo: string } | null;
}

const cifra = (n: number) => String(n).replace(".", ",");

/**
 * El filtro de una candidatura, en su ficha (REVISION, 22 nov · bloque 3):
 * en qué quedó y por qué, con lo que lo decide —el sector, el capital en
 * manos de mujeres, la prueba o quién la recomienda— y lo que se puede
 * hacer a mano según el caso.
 */
export function BloqueFiltro({
  d,
  yo,
  esDireccion,
  acciones,
}: {
  d: DatosFiltro;
  yo: string;
  esDireccion: boolean;
  /** Los formularios, que son de cliente: los pone la página */
  acciones: { decidir: (desde: "revision_manual" | "no_pasa") => ReactNode; responder: ReactNode };
}) {
  const puedeResponder = d.filtro === "espera_recomendacion" && d.recomendadaPor?.id === yo;
  return (
    <section id="filtro" className="tarjeta mb-6 scroll-mt-48">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-filete px-5 py-3">
        <h2 className="text-base font-semibold text-titular">Filtro de entrada</h2>
        <EstadoFiltro filtro={d.filtro} />
      </div>
      <div className="flex flex-col gap-3 px-5 py-4 text-sm">
        {d.motivo ? <p className="text-cuerpo">{d.motivo}</p> : null}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-metadato">Sector</dt>
          <dd className="text-titular">{d.sector === "Otro" ? `Otro: ${d.sectorOtro ?? "—"}` : (d.sector ?? "—")}</dd>
          <dt className="text-metadato">En manos de mujeres</dt>
          <dd className="cifra text-titular">{d.mujeresPct === null ? "—" : `${cifra(d.mujeresPct)} %`}</dd>
          <dt className="text-metadato">Prueba del estadio</dt>
          <dd className="text-titular">{d.prueba ?? (d.recomendadaPor ? "No hace falta: es una idea" : "—")}</dd>
          {d.recomendadaPor ? (
            <>
              <dt className="text-metadato">Recomendada por</dt>
              <dd className="text-titular">
                {d.recomendadaPor.nombre}
                {d.recomendacion === "confirmada" ? " · confirmada" : d.recomendacion === "rechazada" ? " · no la recomienda" : " · sin confirmar"}
              </dd>
            </>
          ) : null}
        </dl>
        {d.socios.length ? (
          <ul className="flex flex-col gap-1 border-t border-filete pt-3" aria-label="Socios">
            {d.socios.map((s, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-cuerpo">
                  {s.nombre}
                  {s.mujer ? <span className="text-metadato"> · mujer</span> : null}
                </span>
                <span className="cifra text-titular">{cifra(s.pct)} %</span>
              </li>
            ))}
          </ul>
        ) : null}
        {d.decision ? (
          <p className="border-t border-filete pt-3 text-xs text-metadato">
            Decidido a mano{d.decision.quien ? ` por ${d.decision.quien}` : ""}: {d.decision.motivo}
          </p>
        ) : null}
        {puedeResponder ? (
          <div className="border-t border-filete pt-3">
            <p className="mb-2 text-sm text-titular">Te ha elegido para recomendar este proyecto en idea. ¿Lo recomiendas?</p>
            {acciones.responder}
          </div>
        ) : null}
      </div>
      {d.filtro === "revision_manual" ? acciones.decidir("revision_manual") : null}
      {d.filtro === "no_pasa" && esDireccion ? acciones.decidir("no_pasa") : null}
    </section>
  );
}
