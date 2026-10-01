"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { subirDocumentoCandidata } from "@/lib/acciones/candidaturas";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";
import { cn } from "@/lib/utils";

type Peticion = {
  id: string;
  area: string | null;
  titulo: string;
  detalle: string | null;
  obligatoria: boolean;
  entregados: number;
};

/**
 * Lo que la candidata tiene que entregar, y cómo lo entrega.
 *
 * Cada punto lleva su propia subida. Un único campo «sube aquí tus
 * documentos» obligaría a las dos partes a adivinar qué responde a qué: a
 * ella a nombrar bien los ficheros y a IWL a abrirlos para saberlo.
 *
 * Lo que falta va arriba. Lo entregado se queda, pero apagado: lo que se
 * mira al abrir esta página es qué queda por hacer.
 */
export function SalaDeDatosCandidata({
  peticiones,
}: {
  peticiones: Peticion[];
}) {
  const pendientes = peticiones.filter((p) => p.entregados === 0);
  const hechas = peticiones.filter((p) => p.entregados > 0);
  const obligatorias = peticiones.filter((p) => p.obligatoria);
  const cumplidas = obligatorias.filter((p) => p.entregados > 0).length;

  if (peticiones.length === 0) {
    return (
      <div>
        <p className="text-sm text-secundario">
          Todavía no te hemos pedido nada concreto. Si quieres adelantarnos
          algo, súbelo aquí.
        </p>
        <div className="mt-4">
          <SubirSuelto />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {obligatorias.length > 0 ? (
        <div>
          <p className="cifra text-2xl leading-none text-titular">
            {cumplidas} de {obligatorias.length}
          </p>
          <p className="mt-1 text-xs text-metadato">
            Documentos obligatorios entregados
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-elevado">
            <div
              className="barra-acento h-full rounded-full"
              style={{ width: `${(cumplidas / obligatorias.length) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {pendientes.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-titular">
            Nos falta esto
          </h3>
          <ul className="divide-y divide-filete">
            {pendientes.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex gap-3">
                  <Circle
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      p.obligatoria ? "text-aviso" : "text-metadato",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-titular">
                      {p.titulo}
                      {!p.obligatoria ? (
                        <span className="ml-2 text-xs text-metadato">
                          si lo tienes
                        </span>
                      ) : null}
                    </p>
                    {p.detalle ? (
                      <p className="text-xs leading-snug text-metadato">
                        {p.detalle}
                      </p>
                    ) : null}
                    {p.area ? (
                      <span className="pastilla mt-2">{p.area}</span>
                    ) : null}

                    <div className="mt-2">
                      <SubirParaPeticion peticionId={p.id} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-bien">
          Ya nos has mandado todo lo que te pedimos. Gracias.
        </p>
      )}

      {hechas.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-secundario">
            Ya entregado
          </h3>
          <ul className="flex flex-col gap-1">
            {hechas.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 text-sm text-metadato"
              >
                <CheckCircle2 aria-hidden="true" className="size-4 text-bien" />
                {p.titulo}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-filete pt-4">
        <h3 className="mb-2 text-sm font-semibold text-titular">
          Mandarnos algo más
        </h3>
        <p className="mb-3 text-xs text-metadato">
          Si hay algo que crees que deberíamos ver y no está en la lista.
        </p>
        <SubirSuelto />
      </section>
    </div>
  );
}

function SubirParaPeticion({ peticionId }: { peticionId: string }) {
  return (
    <Formulario accion={subirDocumentoCandidata} className="gap-2">
      {(r) => (
        <>
          <input type="hidden" name="peticion_id" value={peticionId} />
          <div className="flex flex-wrap items-end gap-2">
            <Texto type="file" name="documento" required className="text-xs" />
            <Boton variante="secundario" className="text-xs">
              Entregar
            </Boton>
          </div>
          {!r.ok && r.campos?.documento ? (
            <span className="text-xs text-mal">{r.campos.documento}</span>
          ) : null}
        </>
      )}
    </Formulario>
  );
}

function SubirSuelto() {
  return (
    <Formulario accion={subirDocumentoCandidata}>
      {() => (
        <>
          <Campo
            etiqueta="Documento"
            ayuda="Hasta 50 MB por fichero. De uno en uno."
          >
            <Texto type="file" name="documento" required />
          </Campo>
          <Boton>Subir</Boton>
        </>
      )}
    </Formulario>
  );
}
