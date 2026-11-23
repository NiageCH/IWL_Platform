"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { responderLista, verificarLista, generarHoja, rehacerHoja, quitarHito, fecharHito } from "@/lib/acciones/hoja";
import { fecha } from "@/lib/utils";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Texto } from "@/components/ui/formulario";
import { BarraSubida, SelectorArchivo, useSubidas } from "@/components/ui/subida";
import { textoLimite } from "@/lib/subidas";

/**
 * Ella contesta un hito de su lista (REVISION, 22 y 23 nov): «Ya lo
 * tenemos», con su archivo, que es obligatorio, o «Todavía no». No hay
 * botón de Guardar: «Todavía no» se guarda al elegirlo y «Ya lo tenemos»
 * al terminar de subir el archivo. Sin archivo no se guarda, y lo dice.
 * El acuse es un «Guardado» discreto y la lista cambiada.
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
  /** El archivo que ya subió, si lo hay */
  actual: { ruta: string; nombre: string; url: string | null } | null;
}) {
  const [eleccion, setEleccion] = useState<"si" | "no" | null>(respuesta);
  const [estado, setEstado] = useState<"guardado" | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();
  const { progreso, conSubidas } = useSubidas();

  function guardar(respuestaNueva: "si" | "no", fichero?: File) {
    const datos = new FormData();
    datos.set("company_id", companyId);
    datos.set("hito_id", hitoId);
    datos.set("respuesta", respuestaNueva);
    if (fichero) datos.set("evidencia", fichero);
    setEstado(null);
    setFallo(null);
    empezar(async () => {
      const accion = conSubidas(responderLista, [
        { campo: "evidencia", clase: "evidencia", destino: () => ({ clase: "evidencia", companyId }) },
      ]);
      const r = await accion(datos);
      if (r.ok) setEstado("guardado");
      else setFallo(r.error);
    });
  }

  // «Ya lo tenemos» sin archivo: elegido en pantalla, pero sin guardar
  const faltaArchivo = eleccion === "si" && !(respuesta === "si" && actual);
  const nombre = `respuesta-${hitoId}`;

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2 text-sm" disabled={guardando}>
        <legend className="sr-only">¿Lo tenéis?</legend>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="radio" name={nombre} checked={eleccion === "si"} onChange={() => setEleccion("si")} />
          Ya lo tenemos
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={nombre}
            checked={eleccion === "no"}
            onChange={() => {
              setEleccion("no");
              if (respuesta !== "no") guardar("no");
            }}
          />
          Todavía no
        </label>
      </fieldset>

      {eleccion === "si" ? (
        <div className="flex flex-col gap-1.5">
          {/* Con archivo ya subido: su nombre y «Cambiar». Subir otro lo devuelve a «Por verificar» */}
          {actual && respuesta === "si" ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              {actual.url ? (
                <a href={actual.url} className="enlace text-acento-texto" target="_blank" rel="noreferrer">
                  {actual.nombre}
                </a>
              ) : (
                <span className="text-cuerpo">{actual.nombre}</span>
              )}
              <span aria-hidden="true" className="text-metadato">
                ·
              </span>
              <SelectorArchivo
                name="evidencia"
                texto="Cambiar"
                sinNombre
                onElegir={(f, input) => {
                  if (!f) return;
                  guardar("si", f);
                  input.value = "";
                }}
              />
            </div>
          ) : null}
          {actual && respuesta === "si" ? null : (
          <SelectorArchivo
            name="evidencia"
            texto="Subir el archivo"
            onElegir={(f, input) => {
              if (!f) return;
              guardar("si", f);
              // El mismo fichero otra vez tiene que volver a disparar
              input.value = "";
            }}
          />
          )}
          {faltaArchivo && !guardando ? (
            <p className="es-atencion texto-estado text-xs">
              Falta el archivo: sin él no se guarda. {textoLimite("evidencia")}
            </p>
          ) : null}
        </div>
      ) : null}

      <BarraSubida progreso={progreso} />
      {/* Vacío no ocupa sitio: el hueco reservado se veía bajo cada hito */}
      <p className="text-xs text-secundario empty:hidden" aria-live="polite">
        {guardando && !progreso ? "Guardando…" : null}
        {!guardando && estado === "guardado" ? (
          <span className="inline-flex items-center gap-1">
            <Check aria-hidden="true" className="size-3.5" />
            Guardado
          </span>
        ) : null}
      </p>
      {fallo ? (
        <p role="alert" className="es-vencido texto-estado text-xs">
          {fallo}
        </p>
      ) : null}
    </div>
  );
}

/**
 * El mentor (o dirección) verifica un «ya lo tenemos». Dos botones iguales,
 * con su verbo (REVISION, 23 nov): «Verificar» y «No basta». «No basta»
 * pide el comentario, que es obligatorio: es lo que ella va a completar.
 */
export function VerificarHito({ checkId, slug }: { checkId: string; slug: string }) {
  const [noBasta, setNoBasta] = useState(false);
  return (
    <Formulario accion={verificarLista} className="gap-2">
      {(r) => (
        <>
          <input type="hidden" name="check_id" value={checkId} />
          <input type="hidden" name="slug" value={slug} />
          {noBasta ? (
            <>
              <Campo
                etiqueta="Qué falta"
                ayuda="Ella lo lee al lado del hito: dile qué tiene que completar"
                obligatorio
                error={r.ok ? undefined : r.campos?.comentario}
              >
                <AreaTexto name="comentario" rows={2} required minLength={5} />
              </Campo>
              <div className="flex flex-wrap gap-2">
                <Boton variante="secundario" name="verificado" value="no">
                  Enviar «no basta»
                </Boton>
                <button type="button" className="accion text-xs" onClick={() => setNoBasta(false)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Boton variante="secundario" name="verificado" value="si">
                Verificar
              </Boton>
              <Boton variante="secundario" type="button" onClick={() => setNoBasta(true)}>
                No basta
              </Boton>
            </div>
          )}
        </>
      )}
    </Formulario>
  );
}

/**
 * Generar el borrador desde su tramo de entrada. Las fechas cuentan desde
 * la firma, como el plazo (REVISION, 23 nov): antes de firmar, desde la
 * fecha prevista; al firmar se corren todas a la fecha de verdad.
 */
export function GenerarHoja({ companyId, slug, hoy }: { companyId: string; slug: string; hoy: string }) {
  return (
    <Formulario accion={generarHoja} className="gap-3">
      {(r) => (
        <>
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="slug" value={slug} />
          <Campo
            etiqueta="Fecha prevista de firma"
            ayuda="Los tramos y el plazo cuentan desde la firma. Al firmar, las fechas se mueven solas a la de verdad"
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
              Se borra el borrador entero, con lo que hayas ajustado, y se vuelve a generar desde aquí.
              Útil si la lista ha cambiado.
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

/**
 * Quitar un hito, en la misma línea que su título (REVISION, 23 nov). Uno
 * propio se quita al pulsar; uno fundamental abre el motivo debajo, a lo
 * ancho de la fila, y solo lo ve dirección. Va dentro de una fila con
 * `flex-wrap`: el panel ocupa la línea entera con `basis-full`.
 */
export function QuitarHito({ id, slug, fundamental }: { id: string; slug: string; fundamental: boolean }) {
  const [abierto, setAbierto] = useState(false);
  if (!fundamental) {
    return (
      <Formulario accion={quitarHito} className="gap-1">
        {() => (
          <>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="slug" value={slug} />
            <button className="accion accion-riesgo text-xs">Quitar</button>
          </>
        )}
      </Formulario>
    );
  }
  return (
    <>
      <button
        type="button"
        className="accion accion-riesgo text-xs"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        Quitar
      </button>
      {abierto ? (
        <div className="basis-full">
          <Formulario accion={quitarHito} className="gap-3 rounded-md border border-filete bg-hundido px-3 py-3">
            {(r) => (
              <>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="slug" value={slug} />
                <Campo
                  etiqueta="Por qué se quita"
                  ayuda="Es un hito fundamental: el motivo queda en el registro"
                  obligatorio
                  error={r.ok ? undefined : r.campos?.motivo}
                >
                  <AreaTexto name="motivo" rows={2} required minLength={10} />
                </Campo>
                <div className="flex flex-wrap gap-2">
                  <Boton variante="secundario">Quitar el hito</Boton>
                  <button type="button" className="accion text-xs" onClick={() => setAbierto(false)}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </Formulario>
        </div>
      ) : null}
    </>
  );
}

/**
 * La fecha de un hito (REVISION, 23 nov). Si cae más allá del plazo del
 * programa lo avisa antes de guardar; la base solo la acepta de dirección.
 * Con el Acuerdo firmado, la de un hito fundamental pide motivo, que queda
 * en el registro.
 */
export function FechaHito({
  id,
  slug,
  actual,
  finPlazo,
  esDireccion,
  pideMotivo = false,
}: {
  id: string;
  slug: string;
  actual: string | null;
  finPlazo: string | null;
  esDireccion: boolean;
  pideMotivo?: boolean;
}) {
  const [valor, setValor] = useState(actual ?? "");
  const fuera = Boolean(finPlazo && valor && valor > finPlazo);
  const cambiada = valor !== (actual ?? "");
  return (
    <Formulario accion={fecharHito} className="gap-1.5">
      {(r) => (
        <>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="slug" value={slug} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`fecha-${id}`}>
              Fecha prevista
            </label>
            <Texto
              id={`fecha-${id}`}
              type="date"
              name="due_date"
              value={valor}
              onChange={(e) => setValor(e.currentTarget.value)}
              className="w-40 py-1 text-xs"
            />
            {cambiada ? (
              <Boton variante="secundario" className="px-3 py-1 text-xs" disabled={fuera && !esDireccion}>
                Cambiar
              </Boton>
            ) : null}
          </div>
          {cambiada && pideMotivo ? (
            <Campo
              etiqueta="Por qué cambia"
              ayuda="El Acuerdo está firmado: queda en el registro"
              obligatorio
              error={r.ok ? undefined : r.campos?.motivo}
            >
              <AreaTexto name="motivo" rows={2} required minLength={10} />
            </Campo>
          ) : null}
          {fuera ? (
            <p className="es-atencion texto-estado max-w-64 text-xs">
              Fuera del plazo del programa: acaba el {fecha(finPlazo)}.{" "}
              {esDireccion ? "Como dirección, puedes guardarla igual." : "Solo dirección puede guardarla."}
            </p>
          ) : null}
        </>
      )}
    </Formulario>
  );
}
