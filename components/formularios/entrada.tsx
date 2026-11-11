"use client";

import { useState } from "react";
import {
  confirmarSituacion,
  decidirIncorporacion,
  decirSituacion,
  guardarHorquilla,
  guardarTarifaAnexo,
  guardarTopeEntrada,
} from "@/lib/acciones/entrada";
import { BASES, baseSugerida, mensajeNoIncorporada, type BaseIncorporacion } from "@/lib/entrada";
import type { Via } from "@/lib/comite";
import { CamposSituacion } from "@/components/formularios/situacion";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Seleccion, Texto } from "@/components/ui/formulario";

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

/** El tope del tramo de entrada en Construcción, en días */
export function TopeEntrada({ dias }: { dias: number }) {
  return (
    <Formulario accion={guardarTopeEntrada} className="gap-3 px-4 py-4">
      {(r) => (
        <>
          <Campo etiqueta="Días en entrada antes de avisar" error={r.ok ? undefined : r.campos?.dias}>
            <Texto name="dias" inputMode="numeric" defaultValue={String(dias)} className="w-24" />
          </Campo>
          <div>
            <Boton variante="secundario">Guardar el tope</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** La tarifa del programa para valorar las horas del Anexo */
export function TarifaAnexo({ eurosHora }: { eurosHora: number | null }) {
  return (
    <Formulario accion={guardarTarifaAnexo} className="gap-3 px-4 py-4">
      {(r) => (
        <>
          <Campo
            etiqueta="Tarifa para valorar el Anexo (€/h)"
            ayuda="«Valoradas en» se calcula con ella. Vacía, se escribe a mano"
            error={r.ok ? undefined : r.campos?.euros_hora}
          >
            <Texto
              name="euros_hora"
              inputMode="decimal"
              defaultValue={eurosHora === null ? "" : String(eurosHora)}
              className="w-32"
            />
          </Campo>
          <div>
            <Boton variante="secundario">Guardar la tarifa del Anexo</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

type Horquillas = Record<"aceleracion" | "construccion", { min: number | null; max: number | null }>;

/** La horquilla de equity de cada vía. Vacía, no se comprueba nada */
export function HorquillaEquity({ horquillas }: { horquillas: Partial<Horquillas> }) {
  const valor = (via: "aceleracion" | "construccion", lado: "min" | "max") => {
    const v = horquillas[via]?.[lado];
    return typeof v === "number" ? String(v) : "";
  };
  return (
    <Formulario accion={guardarHorquilla} className="gap-4 px-4 py-4">
      {(r) => (
        <>
          {(["aceleracion", "construccion"] as const).map((via) => (
            <fieldset key={via} className="grid grid-cols-2 gap-3 sm:max-w-md">
              <legend className="mb-1 text-sm font-medium text-titular">
                {via === "aceleracion" ? "Aceleración" : "Construcción"}
              </legend>
              <Campo etiqueta="Desde (%)" error={r.ok ? undefined : r.campos?.[`${via}_min`]}>
                <Texto name={`${via}_min`} inputMode="decimal" defaultValue={valor(via, "min")} />
              </Campo>
              <Campo etiqueta="Hasta (%)" error={r.ok ? undefined : r.campos?.[`${via}_max`]}>
                <Texto name={`${via}_max`} inputMode="decimal" defaultValue={valor(via, "max")} />
              </Campo>
            </fieldset>
          ))}
          <div>
            <Boton variante="secundario">Guardar la horquilla</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
