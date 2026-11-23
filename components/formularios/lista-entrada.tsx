"use client";

import { useState } from "react";
import { responderLista, verificarLista, generarHoja, rehacerHoja, quitarHito } from "@/lib/acciones/hoja";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Texto } from "@/components/ui/formulario";
import { BarraSubida, useSubidas } from "@/components/ui/subida";
import { textoLimite } from "@/lib/subidas";

/**
 * Ella contesta un hito de su lista (REVISION, 22 nov): «Ya lo tenemos», con
 * su archivo, que es obligatorio, o «Todavía no». El archivo va a la carpeta
 * de evidencias de su compañía. El acuse es la lista cambiada.
 */
export function ContestarHito({
  companyId,
  hitoId,
  respuesta,
  actual,
}: {
  companyId: string;
  hitoId: string;
  respuesta: "si" | "no" | null;
  /** El archivo que ya subió, si lo hay: se queda si no sube otro */
  actual: { ruta: string; nombre: string } | null;
}) {
  const [eleccion, setEleccion] = useState<"si" | "no" | "">(respuesta ?? "");
  const { progreso, conSubidas } = useSubidas();
  return (
    <Formulario
      accion={conSubidas(responderLista, [
        { campo: "evidencia", clase: "evidencia", destino: () => ({ clase: "evidencia", companyId }) },
      ])}
      className="gap-3"
    >
      {(r) => (
        <>
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="hito_id" value={hitoId} />
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <legend className="sr-only">¿Lo tenéis?</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="respuesta" value="si" checked={eleccion === "si"} onChange={() => setEleccion("si")} />
              Ya lo tenemos
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="respuesta" value="no" checked={eleccion === "no"} onChange={() => setEleccion("no")} />
              Todavía no
            </label>
          </fieldset>
          {eleccion === "si" ? (
            <Campo
              etiqueta={actual ? "Cambiar el archivo" : "El archivo que lo demuestra"}
              ayuda={actual ? `Se queda «${actual.nombre}» si no subes otro. ${textoLimite("evidencia")}` : textoLimite("evidencia")}
              obligatorio={!actual}
              error={r.ok ? undefined : r.campos?.evidencia}
            >
              <input
                type="file"
                name="evidencia"
                required={!actual}
                className="text-sm text-secundario file:mr-3 file:border file:border-filete file:bg-papel file:px-3 file:py-1.5 file:text-sm file:text-titular"
              />
            </Campo>
          ) : null}
          {actual ? (
            <>
              <input type="hidden" name="ruta_actual" value={actual.ruta} />
              <input type="hidden" name="nombre_actual" value={actual.nombre} />
            </>
          ) : null}
          <BarraSubida progreso={progreso} />
          <div>
            <Boton variante="secundario" disabled={!eleccion}>
              Guardar
            </Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** El mentor (o dirección) verifica un «ya lo tenemos»: verificado, o «no basta» con su comentario */
export function VerificarHito({ checkId, slug }: { checkId: string; slug: string }) {
  const [noBasta, setNoBasta] = useState(false);
  return (
    <Formulario accion={verificarLista} className="gap-2">
      {(r) => (
        <>
          <input type="hidden" name="check_id" value={checkId} />
          <input type="hidden" name="slug" value={slug} />
          {noBasta ? (
            <Campo etiqueta="Por qué no basta" obligatorio error={r.ok ? undefined : r.campos?.comentario}>
              <AreaTexto name="comentario" rows={2} required />
            </Campo>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {noBasta ? (
              <>
                <Boton variante="secundario" name="verificado" value="no">
                  Enviar «no basta»
                </Boton>
                <button type="button" className="accion text-xs" onClick={() => setNoBasta(false)}>
                  Volver
                </button>
              </>
            ) : (
              <>
                <Boton name="verificado" value="si">
                  Verificado
                </Boton>
                <button type="button" className="accion text-xs" onClick={() => setNoBasta(true)}>
                  No basta
                </button>
              </>
            )}
          </div>
        </>
      )}
    </Formulario>
  );
}

/** Paso 2 del asistente: generar el borrador desde su tramo de entrada */
export function GenerarHoja({ companyId, slug, hoy }: { companyId: string; slug: string; hoy: string }) {
  return (
    <Formulario accion={generarHoja} className="gap-3">
      {(r) => (
        <>
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="slug" value={slug} />
          <Campo
            etiqueta="Empieza el"
            ayuda="Las fechas de cada tramo se reparten desde aquí, por su duración. Se mueven después"
            error={r.ok ? undefined : r.campos?.inicio}
          >
            <Texto type="date" name="inicio" defaultValue={hoy} className="w-48" />
          </Campo>
          <div>
            <Boton>Generar la hoja de ruta</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** Rehacerla desde la lista, mientras sea borrador */
export function RehacerHoja({ companyId, slug }: { companyId: string; slug: string }) {
  return (
    <Desplegable titulo="Rehacerla desde la lista">
      <Formulario accion={rehacerHoja} className="gap-3 px-4 py-3">
        {() => (
          <>
            <input type="hidden" name="company_id" value={companyId} />
            <input type="hidden" name="slug" value={slug} />
            <p className="text-xs text-secundario">
              Se borra el borrador entero, con lo que hayas ajustado, y vuelves al paso 2. Útil si la
              lista ha cambiado.
            </p>
            <div>
              <Boton variante="secundario">Borrar el borrador</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/** Quitar un hito: uno propio, sin más; uno fundamental, solo dirección y con motivo */
export function QuitarHito({ id, slug, fundamental }: { id: string; slug: string; fundamental: boolean }) {
  return (
    <Desplegable titulo="Quitar el hito">
      <Formulario accion={quitarHito} className="gap-3 px-4 py-3">
        {(r) => (
          <>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="slug" value={slug} />
            {fundamental ? (
              <Campo
                etiqueta="Por qué se quita"
                ayuda="Es un hito fundamental: solo lo quita dirección, y el motivo queda en el registro"
                obligatorio
                error={r.ok ? undefined : r.campos?.motivo}
              >
                <AreaTexto name="motivo" rows={2} required />
              </Campo>
            ) : (
              <p className="text-xs text-secundario">Es un hito propio de esta hoja de ruta: se quita sin más.</p>
            )}
            <div>
              <Boton variante="secundario">Quitar el hito</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
