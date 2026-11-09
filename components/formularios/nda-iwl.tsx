"use client";

import { useState } from "react";
import {
  contrafirmarNda,
  guardarPlantillaNda,
  regenerarPdfNda,
  registrarNdaExterno,
} from "@/lib/acciones/nda";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Texto } from "@/components/ui/formulario";

/**
 * La firma de IWL, con su nombre. Sin mensaje de vuelta: el acuse es la
 * pantalla cambiada —el aviso desaparece y el NDA pasa a firmado—. Si el
 * PDF no se genera, sí devuelve mensaje y el formulario se queda.
 */
export function ContrafirmarNda({ candidaturaId }: { candidaturaId: string }) {
  return (
    <Formulario accion={contrafirmarNda}>
      {() => (
        <>
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <button type="submit" className="accion text-xs font-medium text-titular">
            Firmar por IWL
          </button>
        </>
      )}
    </Formulario>
  );
}

export function RegenerarPdfNda({ candidaturaId }: { candidaturaId: string }) {
  return (
    <Formulario accion={regenerarPdfNda}>
      {() => (
        <>
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <button type="submit" className="accion text-xs">
            Generar el PDF otra vez
          </button>
        </>
      )}
    </Formulario>
  );
}

/**
 * Un NDA firmado fuera: en papel o por otro sistema. Como `<Evidencia>`,
 * con el documento o con un enlace; aquí va al data room de la candidatura
 * porque todavía no hay compañía, y al firmar el Acuerdo le llega con el
 * resto de su expediente.
 */
export function RegistrarNdaExterno({ candidaturaId }: { candidaturaId: string }) {
  const [modo, setModo] = useState<"archivo" | "enlace">("archivo");

  return (
    <Desplegable titulo="Se firmó fuera de la plataforma">
      <Formulario accion={registrarNdaExterno} className="gap-4">
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <p className="text-sm text-secundario">
              En papel o por otro sistema. Cuenta igual: la candidatura pasa a
              «NDA firmado» y ella deja de ver la firma pendiente.
            </p>
            <div className="flex gap-2">
              {(["archivo", "enlace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={modo === m ? "pestana pestana-activa" : "pestana"}
                >
                  {m === "archivo" ? "Subir el PDF" : "Pegar un enlace"}
                </button>
              ))}
            </div>
            {modo === "archivo" ? (
              <Campo etiqueta="El NDA firmado" error={r.ok ? undefined : r.campos?.documento}>
                <Texto type="file" name="documento" accept="application/pdf,image/*" />
              </Campo>
            ) : (
              <Campo etiqueta="Dónde está" error={r.ok ? undefined : r.campos?.url}>
                <Texto type="url" name="url" placeholder="https://" />
              </Campo>
            )}
            <Campo etiqueta="Se firmó el" error={r.ok ? undefined : r.campos?.firmado_on} obligatorio>
              <Texto type="date" name="firmado_on" required />
            </Campo>
            <div>
              <Boton variante="secundario">Darlo por firmado</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * La plantilla del NDA. Guardar crea una versión nueva; la anterior queda
 * como estaba, y las firmas hechas siguen apuntando a la suya.
 */
export function PlantillaNda({ vigente }: { vigente: string }) {
  return (
    <Formulario accion={guardarPlantillaNda} className="px-4 py-4">
      {(r) => (
        <>
          <Campo
            etiqueta="Texto del NDA"
            ayuda="Pega el texto validado. Guardarlo crea una versión nueva: las firmas hechas no cambian."
            error={r.ok ? undefined : r.campos?.texto}
          >
            <AreaTexto name="texto" rows={14} defaultValue={vigente} />
          </Campo>
          <div>
            <Boton>Guardar como versión nueva</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
