"use client";

import { guardarUmbralesAlta } from "@/lib/acciones/onboarding";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";

/** Cuántos días puede llevar alguien en un paso del alta antes de que se avise */
export function FormularioUmbralesAlta({
  atencion,
  vencido,
}: {
  atencion: number;
  vencido: number;
}) {
  return (
    <Formulario accion={guardarUmbralesAlta} className="px-4 py-4">
      {(r) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Atención a partir de"
              ayuda="Días en el mismo paso"
              error={r.ok ? undefined : r.campos?.atencion_dias}
            >
              <Texto name="atencion_dias" type="number" min="1" max="90" defaultValue={atencion} required />
            </Campo>
            <Campo
              etiqueta="Vencido a partir de"
              ayuda="Días en el mismo paso"
              error={r.ok ? undefined : r.campos?.vencido_dias}
            >
              <Texto name="vencido_dias" type="number" min="1" max="180" defaultValue={vencido} required />
            </Campo>
          </div>
          <div>
            <Boton>Guardar</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
