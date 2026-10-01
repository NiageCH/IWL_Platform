"use client";

import { anadirMaterial } from "@/lib/acciones/presentarse";
import {
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Texto,
} from "@/components/ui/formulario";

/**
 * Añadir un documento desde el enlace privado.
 *
 * Es la razón principal por la que existe el enlace: lo que más pasa después
 * de mandar una candidatura es acordarse de algo que faltaba.
 */
export function AnadirMaterial({ token }: { token: string }) {
  return (
    <Desplegable titulo="Añadir un documento">
      <Formulario accion={anadirMaterial}>
        {(r) => (
          <>
            <input type="hidden" name="token" value={token} />
            <Campo
              etiqueta="Qué es"
              error={r.ok ? undefined : r.campos?.titulo}
            >
              <Texto name="titulo" placeholder="Pitch actualizado" required />
            </Campo>
            <Campo
              etiqueta="Enlace"
              ayuda="De Drive, Notion o donde lo tengas, con permiso de lectura."
              error={r.ok ? undefined : r.campos?.url}
            >
              <Texto name="url" placeholder="https://" required />
            </Campo>
            <Boton>Añadir</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
