"use client";

import { contraproponerReunion, elegirFranja } from "@/lib/acciones/reuniones";
import { AreaTexto, Boton, Campo, Desplegable, Formulario } from "@/components/ui/formulario";
import { CamposFranjas } from "@/components/formularios/reuniones";

/**
 * Lo que hace ella con una reunión propuesta: elegir una franja, o
 * proponer otras. Desde su enlace privado va con su testigo; con cuenta,
 * con su sesión. El acuse es la tarjeta cambiada.
 */

export function ElegirFranja({
  reunionId,
  inicio,
  token,
}: {
  reunionId: string;
  inicio: string;
  token?: string;
}) {
  return (
    <Formulario accion={elegirFranja}>
      {() => (
        <>
          <input type="hidden" name="reunion_id" value={reunionId} />
          <input type="hidden" name="inicio" value={inicio} />
          {token ? <input type="hidden" name="token" value={token} /> : null}
          <Boton variante="secundario">Elegir esta</Boton>
        </>
      )}
    </Formulario>
  );
}

export function ProponerOtras({
  reunionId,
  duracion,
  token,
}: {
  reunionId: string;
  /** La de la propuesta de IWL, en minutos */
  duracion: number;
  token?: string;
}) {
  return (
    <Desplegable titulo="Ninguna me va">
      <Formulario accion={contraproponerReunion} className="gap-4 px-4 pb-4">
        {(r) => (
          <>
            <input type="hidden" name="reunion_id" value={reunionId} />
            {token ? <input type="hidden" name="token" value={token} /> : null}
            <p className="text-sm text-secundario">
              Propón dos o tres fechas que te vengan bien, en hora de Madrid. Elegiremos una, o te
              propondremos otras.
            </p>
            <CamposFranjas campos={r.ok ? undefined : r.campos} duracionFija={duracion} />
            <Campo etiqueta="Nota" ayuda="Opcional: lo que quieras que sepamos">
              <AreaTexto name="nota" rows={2} />
            </Campo>
            <div>
              <Boton variante="secundario">Proponer estas fechas</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
