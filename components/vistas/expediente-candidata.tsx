import { CheckCircle2, Circle, FileText } from "lucide-react";
import { Metadato } from "@/components/ui/primitivas";
import { AbrirDocumento, PedirDocumento } from "@/components/formularios/expediente";
import { cn } from "@/lib/utils";

type Peticion = {
  id: string | null;
  area: string | null;
  titulo: string | null;
  detalle: string | null;
  obligatoria: boolean | null;
  documentos: number | null;
};

type Documento = {
  id: string;
  peticion_id: string | null;
  nombre: string;
  storage_path: string;
  bytes: number | null;
  created_at: string;
};

/**
 * El expediente de due diligence de una candidata, visto por IWL.
 *
 * Lo que se le ha pedido, agrupado por área, y qué ha entregado de cada
 * cosa. La pregunta que se hace todos los días mientras dura un due
 * diligence es «qué falta», y por eso lo que no está entregado se ve antes
 * que lo que sí.
 */
export function ExpedienteCandidata({
  candidaturaId,
  peticiones,
  documentos,
  avance,
}: {
  candidaturaId: string;
  peticiones: Peticion[];
  documentos: Documento[];
  avance: { cumplidas: number; total: number } | null;
}) {
  if (peticiones.length === 0) {
    return (
      <div className="px-5 py-4">
        <p className="text-sm text-secundario">
          Todavía no se le ha pedido nada. El checklist completo se le pide
          solo al pasarla a <strong>NDA firmado</strong>, que es cuando hay
          confidencialidad que lo cubra.
        </p>
        <div className="mt-4">
          <PedirDocumento candidaturaId={candidaturaId} />
        </div>
      </div>
    );
  }

  const porArea = new Map<string, Peticion[]>();
  for (const p of peticiones) {
    const area = p.area ?? "Sin área";
    porArea.set(area, [...(porArea.get(area) ?? []), p]);
  }

  const sueltos = documentos.filter((d) => !d.peticion_id);

  return (
    <div>
      {avance ? (
        <div className="border-b border-filete px-5 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="cifra text-2xl leading-none text-titular">
              {avance.cumplidas} de {avance.total}
            </span>
            <Metadato>Puntos obligatorios entregados</Metadato>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-elevado">
            <div
              className="barra-acento h-full rounded-full"
              style={{
                width: `${(avance.cumplidas / avance.total) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {[...porArea.entries()].map(([area, items]) => (
        <section key={area} className="border-b border-filete last:border-b-0">
          <h3 className="bg-elevado/40 px-5 py-2 text-xs font-semibold text-secundario">
            {area}
          </h3>
          <ul className="divide-y divide-filete">
            {items.map((p) => {
              const entregado = (p.documentos ?? 0) > 0;
              const suyos = documentos.filter((d) => d.peticion_id === p.id);

              return (
                <li key={p.id} className="flex gap-3 px-5 py-3">
                  {entregado ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-bien"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        p.obligatoria ? "text-aviso" : "text-metadato",
                      )}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-titular">
                      {p.titulo}
                      {!p.obligatoria ? (
                        <span className="ml-2 text-xs text-metadato">
                          opcional
                        </span>
                      ) : null}
                    </p>
                    {!entregado ? (
                      <p className="text-xs text-metadato">
                        {p.detalle ?? "Sin entregar"}
                      </p>
                    ) : null}
                    {suyos.map((d) => (
                      <AbrirDocumento key={d.id} documento={d} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {sueltos.length > 0 ? (
        <section className="border-t border-filete">
          <h3 className="bg-elevado/40 px-5 py-2 text-xs font-semibold text-secundario">
            Mandado por su cuenta
          </h3>
          <ul className="divide-y divide-filete">
            {sueltos.map((d) => (
              <li key={d.id} className="flex gap-3 px-5 py-3">
                <FileText
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-metadato"
                />
                <AbrirDocumento documento={d} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="border-t border-filete">
        <PedirDocumento candidaturaId={candidaturaId} />
      </div>
    </div>
  );
}
