"use client";

import { useState, useTransition } from "react";
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
        className="text-sm text-acento-texto underline underline-offset-4 disabled:opacity-50"
      >
        {pendiente ? "Abriendo" : "Abrir"}
      </button>
      {fallo ? <span className="text-xs text-mal">{fallo}</span> : null}
    </span>
  );
}
