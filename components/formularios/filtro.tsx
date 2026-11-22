"use client";

import { decidirFiltro, responderRecomendacion } from "@/lib/acciones/filtro";
import { AreaTexto, Boton, Campo, Desplegable, Formulario } from "@/components/ui/formulario";

/**
 * Decidir a mano el filtro (REVISION, 22 nov). En revisión manual, el equipo
 * dice si pasa o no; desde el «no pasa», dirección la puede sacar. Siempre
 * con motivo. El acuse es la ficha cambiada.
 */
export function DecidirFiltro({ candidaturaId, desde }: { candidaturaId: string; desde: "revision_manual" | "no_pasa" }) {
  const titulo = desde === "no_pasa" ? "Sacarla del «no pasa»" : "Decidir la revisión manual";
  return (
    <Desplegable titulo={titulo}>
      <Formulario accion={decidirFiltro} className="gap-3 px-5 py-4">
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <Campo etiqueta="Motivo" ayuda="Queda en la candidatura y en su historia" obligatorio error={r.ok ? undefined : r.campos?.motivo}>
              <AreaTexto name="motivo" rows={2} required />
            </Campo>
            <div className="flex flex-wrap gap-3">
              <Boton name="pasa" value="si">
                Pasa el filtro
              </Boton>
              {desde === "revision_manual" ? (
                <Boton variante="secundario" name="pasa" value="no">
                  No pasa
                </Boton>
              ) : null}
            </div>
            {desde === "revision_manual" ? (
              <p className="text-xs text-metadato">Si no pasa, le llega un correo con el motivo que escribas.</p>
            ) : null}
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/** Confirmar o rechazar la recomendación: solo quien la hizo */
export function ResponderRecomendacion({ candidaturaId }: { candidaturaId: string }) {
  return (
    <Formulario accion={responderRecomendacion} className="gap-3">
      {() => (
        <>
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <div className="flex flex-wrap gap-3">
            <Boton name="confirma" value="si">
              Confirmar la recomendación
            </Boton>
            <Boton variante="secundario" name="confirma" value="no">
              No la recomiendo
            </Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
