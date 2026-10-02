"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { enlaceDocumento, subirDocumento } from "@/lib/acciones/documentos";
import {
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/**
 * Subida de un documento al data room.
 *
 * Se puede enlazar con un punto del checklist: al hacerlo, ese punto pasa a
 * entregado y hereda la caducidad del documento. Es el camino normal, porque
 * evita que la fundadora tenga que decir dos veces que ha entregado algo.
 */
export function SubirDocumento({
  slug,
  companyId,
  areas,
  puntos,
}: {
  slug: string;
  companyId: string;
  areas: Array<{ id: string; nombre: string }>;
  puntos: Array<{ id: string; titulo: string; areaId: string }>;
}) {
  const [area, setArea] = useState(areas[0]?.id ?? "");

  const puntosDelArea = puntos.filter((p) => p.areaId === area);

  return (
    <Desplegable titulo="Subir un documento">
      <Formulario accion={subirDocumento}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="company_id" value={companyId} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Área">
                <Seleccion
                  name="area_id"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo
                etiqueta="Punto del checklist"
                ayuda="Al enlazarlo, ese punto pasa a entregado"
              >
                <Seleccion name="dd_item_id" defaultValue="">
                  <option value="">Sin enlazar</option>
                  {puntosDelArea.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.titulo}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>

            <Campo
              etiqueta="Nombre del documento"
              error={!resultado.ok ? resultado.campos?.name : undefined}
            >
              <Texto
                name="name"
                required
                placeholder="Cuentas anuales 2025"
                error={!resultado.ok && Boolean(resultado.campos?.name)}
              />
            </Campo>

            <Campo
              etiqueta="Fichero"
              ayuda="PDF, hoja de cálculo, documento, CSV o imagen. Hasta 25 MB"
              error={!resultado.ok ? resultado.campos?.fichero : undefined}
            >
              <input
                type="file"
                name="fichero"
                required
                accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,.png,.jpg,.jpeg"
                className="text-sm text-secundario file:mr-3 file:border file:border-filete file:bg-papel file:px-3 file:py-1.5 file:text-sm file:text-titular"
              />
            </Campo>

            <Campo
              etiqueta="Caduca el"
              ayuda="Al vencer, el punto vuelve a pendiente. Déjalo vacío si no caduca"
            >
              <Texto name="expires_on" type="date" className="w-48" />
            </Campo>

            <div>
              <Boton>Subir al data room</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * Subir el documento de **un** punto, desde su propia línea.
 *
 * El data room tenía un solo formulario, al final de la página, donde había
 * que volver a elegir el área y el punto que ya estabas mirando. Para una
 * checklist de treinta líneas eso es bajar, buscar en un desplegable, subir
 * y repetir treinta veces.
 *
 * Aquí el punto y el área ya se saben: solo queda el fichero. El nombre del
 * documento se toma del título del punto, que es como se va a buscar
 * después. Al subirlo, el punto pasa a revisión.
 */
export function SubirAlPunto({
  slug,
  companyId,
  areaId,
  puntoId,
  titulo,
}: {
  slug: string;
  companyId: string;
  areaId: string;
  puntoId: string;
  titulo: string;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion shrink-0 text-xs"
      >
        <Upload aria-hidden="true" className="size-3.5 text-acento-texto" />
        Subir
      </button>
    );
  }

  return (
    <div className="w-full border-t border-filete pt-3">
      {/*
        No se cierra solo al acabar: el acuse vive dentro del formulario, y
        un panel que se desmonta al tener éxito se lleva su propia
        confirmación. Se cierra con Hecho, o al pulsar Cancelar antes.
      */}
      <Formulario accion={subirDocumento} className="gap-3">
        {(resultado) => {
          const subido = resultado.ok && Boolean(resultado.mensaje);

          return (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="company_id" value={companyId} />
              <input type="hidden" name="area_id" value={areaId} />
              <input type="hidden" name="dd_item_id" value={puntoId} />
              <input type="hidden" name="name" value={titulo} />

              {subido ? null : (
                <>
                  <Campo
                    etiqueta={`Fichero para «${titulo}»`}
                    ayuda="PDF, hoja de cálculo, documento, CSV o imagen. Hasta 25 MB"
                    error={!resultado.ok ? resultado.campos?.fichero : undefined}
                  >
                    <input
                      type="file"
                      name="fichero"
                      required
                      accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,.png,.jpg,.jpeg"
                      className="text-sm text-secundario file:mr-3 file:border file:border-filete file:bg-papel file:px-3 file:py-1.5 file:text-sm file:text-titular"
                    />
                  </Campo>

                  <Campo
                    etiqueta="Caduca el"
                    ayuda="Al vencer, el punto vuelve a pendiente. Vacío si no caduca"
                  >
                    <Texto name="expires_on" type="date" className="w-48" />
                  </Campo>
                </>
              )}

              <div className="flex gap-2">
                {subido ? null : <Boton>Subir</Boton>}
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm text-secundario"
                >
                  {subido ? "Hecho" : "Cancelar"}
                </button>
              </div>
            </>
          );
        }}
      </Formulario>
    </div>
  );
}

/**
 * Abre un documento con un enlace firmado de un minuto.
 *
 * El bucket es privado y no hay URL pública: cada consulta se firma en el
 * momento y queda en el registro de accesos.
 */
export function AbrirDocumento({ documentId }: { documentId: string }) {
  const [pendiente, empezar] = useTransition();
  const [fallo, setFallo] = useState<string | null>(null);

  function abrir() {
    empezar(async () => {
      const salida = await enlaceDocumento(documentId);
      if (salida.ok) {
        window.open(salida.url, "_blank", "noopener,noreferrer");
        setFallo(null);
      } else {
        setFallo(salida.error);
      }
    });
  }

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        onClick={abrir}
        disabled={pendiente}
        className="accion text-sm text-acento-texto disabled:opacity-50"
      >
        {pendiente ? "Abriendo" : "Abrir"}
      </button>
      {fallo ? <span className="text-xs text-mal">{fallo}</span> : null}
    </span>
  );
}

/**
 * Adjuntar el business plan ya escrito.
 *
 * «Poder cargar un archivo ya hecho de business plan», que pedía Rodrigo.
 * Se valoró que el sistema lo leyera y repartiera su contenido por las
 * secciones —hace falta una IA leyendo documentos, con su coste— y se
 * decidió que de momento no: el archivo se adjunta y las secciones se
 * siguen escribiendo a mano.
 *
 * Es singular: subir otro reemplaza al anterior.
 */
export function AdjuntarBusinessPlan({
  slug,
  companyId,
  areaId,
  hayUno,
}: {
  slug: string;
  companyId: string;
  areaId: string;
  hayUno: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs"
      >
        <Upload aria-hidden="true" className="size-3.5 text-acento-texto" />
        {hayUno ? "Subir otra versión" : "Adjuntar el business plan"}
      </button>
    );
  }

  return (
    <div className="w-full px-4 py-4">
      <Formulario accion={subirDocumento} className="gap-3">
        {(resultado) => {
          const subido = resultado.ok && Boolean(resultado.mensaje);

          return (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="company_id" value={companyId} />
              <input type="hidden" name="area_id" value={areaId} />
              <input type="hidden" name="kind" value="business_plan" />
              <input type="hidden" name="name" value="Business plan" />

              {subido ? null : (
                <Campo
                  etiqueta="El documento"
                  ayuda={
                    hayUno
                      ? "PDF, Word o presentación. Reemplaza al que hay"
                      : "PDF, Word o presentación. Hasta 25 MB"
                  }
                  error={!resultado.ok ? resultado.campos?.fichero : undefined}
                >
                  <input
                    type="file"
                    name="fichero"
                    required
                    accept=".pdf,.docx,.doc,.xlsx,.xls"
                    className="text-sm text-secundario file:mr-3 file:border file:border-filete file:bg-papel file:px-3 file:py-1.5 file:text-sm file:text-titular"
                  />
                </Campo>
              )}

              <div className="flex gap-2">
                {subido ? null : <Boton>Adjuntar</Boton>}
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm text-secundario"
                >
                  {subido ? "Hecho" : "Cancelar"}
                </button>
              </div>
            </>
          );
        }}
      </Formulario>
    </div>
  );
}
