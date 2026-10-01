"use client";

import { subirDocumentoCandidata } from "@/lib/acciones/candidaturas";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";

/**
 * La sala de datos de una candidata.
 *
 * El formulario se queda puesto después de subir: lo normal es mandar
 * varios documentos seguidos, y cerrarlo obligaría a abrirlo otra vez por
 * cada uno. El acuse se lee donde estaba mirando.
 */
export function SalaDeDatosCandidata({
  candidaturaId,
}: {
  candidaturaId: string;
}) {
  return (
    <Formulario accion={subirDocumentoCandidata}>
      {(r) => (
        <>
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <Campo
            etiqueta="Documento"
            ayuda="Hasta 50 MB por fichero. Puedes subir varios, de uno en uno."
            error={r.ok ? undefined : r.campos?.documento}
          >
            <Texto type="file" name="documento" required />
          </Campo>
          <Boton>Subir</Boton>
        </>
      )}
    </Formulario>
  );
}
