"use client";

import { useState } from "react";
import { cerrarCompania } from "@/lib/acciones/cierre";
import { CIERRES, type Cierre } from "@/lib/cierre";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Texto } from "@/components/ui/formulario";

/**
 * Cerrar la compañía, desde su ficha, para dirección (REVISION, 22 nov ·
 * bloque 8). Tres salidas, con motivo y fecha. No tiene vuelta atrás en
 * pantalla: se dice antes de pulsar.
 */
export function CerrarCompania({
  companyId,
  nombre,
  sugerida,
  hoy,
}: {
  companyId: string;
  nombre: string;
  /** Si cerró el tramo 4, lo normal es graduarla */
  sugerida: Cierre | null;
  hoy: string;
}) {
  const [cierre, setCierre] = useState<Cierre | "">(sugerida ?? "");
  return (
    <Desplegable titulo="Cerrar la compañía">
      <Formulario accion={cerrarCompania} className="gap-4 px-4 py-4">
        {(r) => {
          const e = (n: string) => (r.ok ? undefined : r.campos?.[n]);
          return (
            <>
              <input type="hidden" name="company_id" value={companyId} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm text-titular">Cómo termina</legend>
                {(Object.keys(CIERRES) as Cierre[]).map((c) => (
                  <label key={c} className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="cierre"
                      value={c}
                      checked={cierre === c}
                      onChange={() => setCierre(c)}
                      className="mt-0.5"
                      required
                    />
                    <span>
                      <span className="text-titular">{CIERRES[c].nombre}</span>
                      <span className="text-secundario"> · {CIERRES[c].explicacion}</span>
                    </span>
                  </label>
                ))}
                {e("cierre") ? <p className="text-xs text-mal">{e("cierre")}</p> : null}
              </fieldset>
              <Campo etiqueta="Fecha del cierre" obligatorio error={e("fecha")}>
                <Texto type="date" name="fecha" defaultValue={hoy} max={hoy} required className="w-48" />
              </Campo>
              <Campo
                etiqueta="Motivo"
                obligatorio
                error={e("motivo")}
                ayuda="Queda en el Histórico, junto a quién la cerró y cuándo"
              >
                <AreaTexto name="motivo" rows={3} required minLength={10} />
              </Campo>
              <p className="es-atencion texto-estado text-sm">
                Al cerrarla, {nombre} desaparece de la cartera, de los menús, de los avisos y de los resúmenes para todo
                el mundo, mentores y equipo incluidos. Sus avisos abiertos se cierran, y nadie la puede editar. Solo
                dirección la ve, en Administración → Histórico. La fundadora pierde el acceso y conserva la descarga de
                sus documentos firmados.
              </p>
              <div>
                <Boton disabled={!cierre}>Cerrar la compañía</Boton>
              </div>
            </>
          );
        }}
      </Formulario>
    </Desplegable>
  );
}
