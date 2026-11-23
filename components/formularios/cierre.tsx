"use client";

import { useState } from "react";
import { cerrarCompania, reabrirCompania } from "@/lib/acciones/cierre";
import { CIERRES, motivoNoGradua, type Cierre, type HitosParaGraduar } from "@/lib/cierre";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Texto } from "@/components/ui/formulario";

/**
 * Cerrar la compañía, desde su ficha, para dirección (REVISION, 22 nov ·
 * bloque 8). Tres salidas, con motivo y fecha. Si fue un error, dirección
 * la reabre desde el Histórico.
 */
export function CerrarCompania({
  companyId,
  nombre,
  sugerida,
  paraGraduar,
  hoy,
}: {
  companyId: string;
  nombre: string;
  /** Si cerró el tramo 4, lo normal es graduarla */
  sugerida: Cierre | null;
  /** Los hitos que condicionan invertible: sin todos validados no se gradúa */
  paraGraduar: HitosParaGraduar | null;
  hoy: string;
}) {
  const [cierre, setCierre] = useState<Cierre | "">(sugerida ?? "");
  const noGradua = motivoNoGradua(paraGraduar);
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
                {(Object.keys(CIERRES) as Cierre[]).map((c) => {
                  // La base lo impide igual (`app.guard_graduada`); aquí se dice por qué
                  const bloqueada = c === "graduada" && noGradua !== null;
                  return (
                    <label
                      key={c}
                      className={`flex items-start gap-2 text-sm ${bloqueada ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <input
                        type="radio"
                        name="cierre"
                        value={c}
                        checked={cierre === c}
                        onChange={() => setCierre(c)}
                        disabled={bloqueada}
                        aria-describedby={bloqueada ? "no-gradua" : undefined}
                        className="mt-0.5"
                        required
                      />
                      <span>
                        <span className="text-titular">{CIERRES[c].nombre}</span>
                        <span className="text-secundario"> · {CIERRES[c].explicacion}</span>
                        {bloqueada ? (
                          <span id="no-gradua" className="es-atencion texto-estado block text-xs">
                            {noGradua}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
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
                dirección la ve, en Administración → Histórico, y desde allí puede reabrirla si fue un error. La
                fundadora pierde el acceso y conserva la descarga de sus documentos firmados.
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

/**
 * Reabrir una compañía cerrada (REVISION, 23 nov): dirección, con motivo.
 * Vuelve con su hoja de ruta, su equipo y sus accesos; los avisos que se
 * cerraron con ella siguen cerrados.
 */
export function ReabrirCompania({ companyId, slug, nombre }: { companyId: string; slug: string; nombre: string }) {
  return (
    <Desplegable titulo="Reabrir la compañía">
      <Formulario accion={reabrirCompania} className="gap-4 px-4 py-4">
        {(r) => (
          <>
            <input type="hidden" name="company_id" value={companyId} />
            <input type="hidden" name="slug" value={slug} />
            <Campo
              etiqueta="Por qué se reabre"
              obligatorio
              error={r.ok ? undefined : r.campos?.motivo}
              ayuda="Queda en el registro, junto a cómo estaba cerrada"
            >
              <AreaTexto name="motivo" rows={2} required minLength={10} />
            </Campo>
            <p className="text-sm text-secundario">
              {nombre} vuelve a la cartera como estaba al cerrarse, con su hoja de ruta, su equipo y sus accesos. Los
              avisos que se cerraron al cerrarla no se reabren.
            </p>
            <div>
              <Boton variante="secundario">Reabrir la compañía</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
