"use client";

import { useState } from "react";
import { confirmarSituacion, decidirIncorporacion, decirSituacion } from "@/lib/acciones/entrada";
import { BASES, baseSugerida, mensajeNoIncorporada, type BaseIncorporacion } from "@/lib/entrada";
import type { Via } from "@/lib/comite";
import { CamposSituacion } from "@/components/formularios/situacion";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Seleccion } from "@/components/ui/formulario";

/** Lo primero que se le pregunta a la fundadora, una sola vez */
export function DecirSituacion({ companyId }: { companyId: string }) {
  return (
    <Formulario accion={decirSituacion} className="gap-4">
      {(r) => (
        <>
          <input type="hidden" name="company_id" value={companyId} />
          <CamposSituacion errores={r.ok ? undefined : r.campos} />
          <div>
            <Boton>Guardar la situación</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

export function ConfirmarSituacion({ companyId }: { companyId: string }) {
  return (
    <Formulario accion={confirmarSituacion} className="gap-2">
      {() => (
        <>
          <input type="hidden" name="company_id" value={companyId} />
          <div>
            <Boton variante="secundario">Confirmar la situación</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/**
 * Decidir la incorporación. La base sale propuesta por la vía; el «no»
 * pide además el mensaje para ella, ya redactado y para editar.
 */
export function DecidirIncorporacion({
  companyId,
  via,
  contacto,
  startup,
}: {
  companyId: string;
  via: Via | null;
  contacto: string;
  startup: string;
}) {
  const [decision, setDecision] = useState<"" | "si" | "no">("");

  return (
    <Desplegable titulo="Decidir la incorporación">
      <Formulario accion={decidirIncorporacion} className="gap-4">
        {(r) => (
          <>
            <input type="hidden" name="company_id" value={companyId} />
            <p className="text-xs text-secundario">
              Solo dirección, y una vez: la decisión no se cambia. «No» archiva la compañía
              como «No incorporada»; su expediente se queda.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo etiqueta="Decisión" obligatorio error={r.ok ? undefined : r.campos?.decision}>
                <Seleccion
                  name="decision"
                  value={decision}
                  onChange={(e) => setDecision(e.currentTarget.value as "" | "si" | "no")}
                  required
                >
                  <option value="">Elige…</option>
                  <option value="si">Sí, se incorpora</option>
                  <option value="no">No se incorpora</option>
                </Seleccion>
              </Campo>
              <Campo etiqueta="En qué se basa" obligatorio error={r.ok ? undefined : r.campos?.base}>
                <Seleccion name="base" defaultValue={baseSugerida(via)} required>
                  {(Object.keys(BASES) as BaseIncorporacion[]).map((b) => (
                    <option key={b} value={b}>
                      {BASES[b]}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>
            <Campo etiqueta="Motivo" obligatorio error={r.ok ? undefined : r.campos?.motivo}>
              <AreaTexto name="motivo" rows={3} required />
            </Campo>
            {decision === "no" ? (
              <Campo
                etiqueta="Mensaje para ella"
                ayuda="En la voz de IWL. Cambia lo que haga falta antes de guardar"
                obligatorio
                error={r.ok ? undefined : r.campos?.mensaje}
              >
                <AreaTexto name="mensaje" rows={9} defaultValue={mensajeNoIncorporada(contacto, startup)} />
              </Campo>
            ) : null}
            <div>
              <Boton>Guardar la decisión</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
