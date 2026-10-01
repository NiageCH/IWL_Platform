"use client";

import { useState } from "react";
import { configurarConvocatoria } from "@/lib/acciones/candidaturas";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

/**
 * Abrir y cerrar la convocatoria.
 *
 * Es lo que decide si el formulario público admite candidaturas. Solo la
 * dirección: abrir una convocatoria es abrir una puerta a internet.
 */
export function Convocatoria({
  cohortes,
}: {
  cohortes: {
    id: string;
    name: string;
    abierta: boolean;
    cierra: string | null;
  }[];
}) {
  const [elegida, setElegida] = useState(cohortes[0]?.id ?? "");
  const cohorte = cohortes.find((c) => c.id === elegida);

  return (
    <Desplegable titulo="Abrir o cerrar la convocatoria">
      <p className="mb-3 text-sm text-secundario">
        Con la convocatoria abierta, cualquiera puede presentarse en{" "}
        <code className="cifra text-xs text-acento-texto">/presentarse</code>.
        Cerrada, esa página dice que ahora mismo no hay convocatoria y no
        admite nada.
      </p>

      <Formulario accion={configurarConvocatoria}>
        {(r) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Cohorte">
                <Seleccion
                  name="cohort_id"
                  value={elegida}
                  onChange={(e) => setElegida(e.target.value)}
                >
                  {cohortes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.abierta ? " · abierta" : ""}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo etiqueta="Admite candidaturas">
                <Seleccion
                  name="abierta"
                  key={elegida}
                  defaultValue={cohorte?.abierta ? "true" : ""}
                >
                  <option value="">No</option>
                  <option value="true">Sí</option>
                </Seleccion>
              </Campo>
              <Campo
                etiqueta="Cierra el"
                ayuda="Pasada esa fecha deja de admitir, aunque siga marcada."
              >
                <Texto
                  type="date"
                  name="cierra"
                  key={`${elegida}-cierra`}
                  defaultValue={cohorte?.cierra ?? ""}
                />
              </Campo>
            </div>
            <Campo
              etiqueta="Qué lee quien se presenta"
              ayuda="A quién va dirigida y qué se le pide."
              error={r.ok ? undefined : r.campos?.texto}
            >
              <AreaTexto name="texto" rows={4} />
            </Campo>
            <Boton>Guardar</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}
