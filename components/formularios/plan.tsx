"use client";

import { useState } from "react";
import { comentar, guardarSeccion } from "@/lib/acciones/plan";
import {
  AreaTexto,
  Boton,
  Campo,
  Formulario,
  Seleccion,
} from "@/components/ui/formulario";

/**
 * Edición de una sección del business plan.
 *
 * La fundadora escribe y la manda a revisión; validar es de IWL. Al que no
 * puede validar no se le ofrece el estado «validada»: lo cortaría el trigger,
 * pero enseñar una opción que va a fallar es una mala interfaz.
 */
export function EditorSeccion({
  slug,
  id,
  contenido,
  estado,
  guia,
  puedeValidar,
}: {
  slug: string;
  id: string;
  contenido: string | null;
  estado: string;
  guia: string | null;
  puedeValidar: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <div className="border-t border-filete px-4 py-2.5">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="text-sm text-secundario transition-colors hover:text-titular"
        >
          {contenido ? "Editar la sección" : "Redactar la sección"}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-filete px-4 py-4">
      <Formulario accion={guardarSeccion} onOk={() => setAbierto(false)}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={id} />

            <Campo
              etiqueta="Contenido"
              ayuda={guia ?? undefined}
              error={!resultado.ok ? resultado.campos?.content : undefined}
            >
              <AreaTexto
                name="content"
                rows={8}
                defaultValue={contenido ?? ""}
                error={!resultado.ok && Boolean(resultado.campos?.content)}
              />
            </Campo>

            <div className="flex flex-wrap items-end gap-3">
              <Campo etiqueta="Estado">
                <Seleccion key={estado} name="status" defaultValue={estado}>
                  <option value="borrador">Borrador</option>
                  <option value="en_revision">En revisión</option>
                  {puedeValidar ? (
                    <option value="validada">Validada por IWL</option>
                  ) : null}
                </Seleccion>
              </Campo>

              <Boton>Guardar</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="px-3 py-2 text-sm text-secundario transition-colors hover:text-titular"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/** Comentario anclado. Lo puede dejar cualquiera que vea la compañía */
export function NuevoComentario({
  slug,
  companyId,
  entidad,
  entidadId,
}: {
  slug: string;
  companyId: string;
  entidad: "bp_section" | "dd_item" | "tech_finding";
  entidadId: string;
}) {
  return (
    <Formulario accion={comentar} className="mt-2 gap-2">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="entity" value={entidad} />
          <input type="hidden" name="entity_id" value={entidadId} />
          <AreaTexto
            name="body"
            rows={2}
            required
            placeholder="Escribe un comentario"
            error={!resultado.ok && Boolean(resultado.campos?.body)}
          />
          <div>
            <Boton variante="secundario">Comentar</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
