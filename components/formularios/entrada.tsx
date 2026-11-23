"use client";

import { useState } from "react";
import {
  cambiarMentorPrincipal,
  confirmarSituacion,
  decidirIncorporacion,
  decirSituacion,
  guardarHorquilla,
  guardarTarifaAnexo,
  guardarDiasAvance,
  guardarTopeEntrada,
} from "@/lib/acciones/entrada";
import { BASES, baseSugerida, mensajeNoIncorporada, type BaseIncorporacion } from "@/lib/entrada";
import { cifraEquity } from "@/lib/utils";
import { ESTADIOS, ORDEN_ESTADIOS, type Estadio } from "@/lib/estadios";
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
 * Decidir la incorporación. La base sale propuesta por el estadio; el «no»
 * pide además el mensaje para ella, ya redactado y para editar.
 */
export function DecidirIncorporacion({
  companyId,
  estadio,
  contacto,
  startup,
}: {
  companyId: string;
  estadio: Estadio | null;
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
                <Seleccion name="base" defaultValue={baseSugerida(estadio)} required>
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

/** El tope de la entrada con diagnóstico (idea), en días */
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

/** Desde qué día se le pide el avance del mes, y cuándo vence */
export function DiasAvance({ aviso, limite }: { aviso: number; limite: number }) {
  return (
    <Formulario accion={guardarDiasAvance} className="gap-3 px-4 py-4">
      {(r) => (
        <>
          <div className="flex flex-wrap gap-4">
            <Campo etiqueta="Se le pide desde el día" ayuda="Del mes que cuenta" error={r.ok ? undefined : r.campos?.aviso}>
              <Texto name="aviso" inputMode="numeric" defaultValue={String(aviso)} className="w-24" />
            </Campo>
            <Campo etiqueta="Vence el día" ayuda="Del mes siguiente" error={r.ok ? undefined : r.campos?.limite}>
              <Texto name="limite" inputMode="numeric" defaultValue={String(limite)} className="w-24" />
            </Campo>
          </div>
          <div>
            <Boton variante="secundario">Guardar los días del avance</Boton>
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

type Horquillas = Record<Estadio, { min: number | null; max: number | null }>;

/** La horquilla de equity de cada estadio. Vacía, no se comprueba nada */
export function HorquillaEquity({ horquillas }: { horquillas: Partial<Horquillas> }) {
  const valor = (estadio: Estadio, lado: "min" | "max") => {
    const v = horquillas[estadio]?.[lado];
    return typeof v === "number" ? cifraEquity(v) : "";
  };
  return (
    <Formulario accion={guardarHorquilla} className="gap-4 px-4 py-4">
      {(r) => (
        <>
          {ORDEN_ESTADIOS.map((e) => (
            <fieldset key={e} className="grid grid-cols-2 gap-3 sm:max-w-md">
              <legend className="mb-1 text-sm font-medium text-titular">{ESTADIOS[e]}</legend>
              <Campo etiqueta="Desde (%)" error={r.ok ? undefined : r.campos?.[`${e}_min`]}>
                <Texto name={`${e}_min`} inputMode="decimal" defaultValue={valor(e, "min")} />
              </Campo>
              <Campo etiqueta="Hasta (%)" error={r.ok ? undefined : r.campos?.[`${e}_max`]}>
                <Texto name={`${e}_max`} inputMode="decimal" defaultValue={valor(e, "max")} />
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

/**
 * El mentor principal, en la decisión de incorporación (REVISION, 23 nov):
 * el actual con un «Cambiar» al lado, para que dirección lo confirme a la
 * vez que decide. El acuse es el nombre cambiado.
 */
export function MentorPrincipal({
  companyId,
  actual,
  mentores,
  puedeCambiar,
}: {
  companyId: string;
  actual: { id: string; nombre: string } | null;
  mentores: { id: string; nombre: string }[];
  puedeCambiar: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-metadato">Mentor principal</span>
        <span className="text-titular">{actual?.nombre ?? "Sin asignar"}</span>
        {puedeCambiar && !abierto ? (
          <button type="button" className="accion text-xs" onClick={() => setAbierto(true)}>
            {actual ? "Cambiar" : "Asignar"}
          </button>
        ) : null}
      </div>
      {abierto ? (
        <Formulario accion={cambiarMentorPrincipal} onOk={() => setAbierto(false)} className="gap-3">
          {(r) => (
            <>
              <input type="hidden" name="company_id" value={companyId} />
              <Campo
                etiqueta="Quién"
                ayuda="Lo que ya se hizo es de la compañía: el nuevo lo hereda tal cual"
                error={r.ok ? undefined : r.campos?.mentor_id}
              >
                <Seleccion name="mentor_id" defaultValue={actual?.id ?? ""} required>
                  <option value="">Elige…</option>
                  {mentores.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <div className="flex flex-wrap gap-2">
                <Boton variante="secundario">Guardar</Boton>
                <button type="button" className="accion text-xs" onClick={() => setAbierto(false)}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </Formulario>
      ) : null}
    </div>
  );
}
