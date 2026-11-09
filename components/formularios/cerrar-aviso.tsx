"use client";

import { cerrarAviso } from "@/lib/acciones/onboarding";
import { Formulario } from "@/components/ui/formulario";

/**
 * Dar un aviso por visto. Sin mensaje de vuelta: el acuse es que el aviso
 * desaparece de la lista y el contador de la barra baja.
 */
export function CerrarAviso({ id }: { id: string }) {
  return (
    <Formulario accion={cerrarAviso}>
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <button type="submit" className="accion text-xs">
            Entendido
          </button>
        </>
      )}
    </Formulario>
  );
}
