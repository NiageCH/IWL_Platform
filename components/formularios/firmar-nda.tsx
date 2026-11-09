"use client";

import { firmarNda } from "@/lib/acciones/nda";
import { Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";

/**
 * La candidata lee el NDA y lo firma.
 *
 * Firma electrónica simple: su nombre escrito, la casilla de aceptación, y
 * lo que guarda la plataforma —fecha, hora, IP y navegador—. Se le dice,
 * porque firmar algo sin saber qué queda registrado no es firmar a
 * sabiendas.
 */
export function FirmarNdaCandidata({
  plantillaId,
  version,
  texto,
}: {
  plantillaId: string;
  version: number;
  texto: string;
}) {
  return (
    <Formulario accion={firmarNda} className="gap-5">
      {(r) => (
        <>
          <input type="hidden" name="plantilla_id" value={plantillaId} />
          <div
            className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-filete bg-hundido px-5 py-4 text-sm leading-relaxed text-cuerpo"
            tabIndex={0}
            aria-label={`Texto del NDA, versión ${version}`}
          >
            {texto}
          </div>
          <Campo
            etiqueta="Tu nombre completo"
            ayuda="Como en tu DNI o pasaporte"
            error={r.ok ? undefined : r.campos?.nombre}
            obligatorio
          >
            <Texto name="nombre" autoComplete="name" required />
          </Campo>
          <label className="flex items-start gap-3 text-sm text-titular">
            <input type="checkbox" name="acepto" value="si" required className="mt-1 size-4" />
            <span>
              He leído el NDA y lo acepto.
              {!r.ok && r.campos?.acepto ? (
                <span className="block text-xs text-mal">{r.campos.acepto}</span>
              ) : null}
            </span>
          </label>
          <p className="text-xs text-metadato">
            Al firmar quedan registrados tu nombre, la fecha y la hora, tu
            dirección IP y tu navegador, junto con la versión exacta del texto
            ({version}). Cuando firme también Inception Woman Lab, tendrás el
            PDF con las dos firmas en tu documentación.
          </p>
          <div>
            <Boton>Firmar el NDA</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
