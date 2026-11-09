"use client";

import { useState } from "react";
import { AreaTexto, Campo, Seleccion, Texto } from "@/components/ui/formulario";
import { FORMAS, SITUACIONES, type DatosSocietarios, type Situacion } from "@/lib/societario";

/**
 * Los campos de la situación societaria, para cualquier formulario.
 *
 * Los de la candidatura, los de firmar, los del alta directa y los de la
 * ficha son los mismos; vivir en cuatro sitios era cambiarlos en tres. Cada
 * situación enseña solo lo suyo: sin sociedad no se pregunta el CIF.
 */
export function CamposSituacion({
  inicial,
  errores,
  obligatorio = true,
  onCambio,
}: {
  inicial?: Partial<DatosSocietarios>;
  errores?: Record<string, string>;
  obligatorio?: boolean;
  /** Para quien tenga que reaccionar, como el bloque de quién firma */
  onCambio?: (s: Situacion | "") => void;
}) {
  const [situacion, setSituacion] = useState<Situacion | "">(inicial?.situacion_societaria ?? "");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo
        etiqueta="Situación societaria"
        obligatorio={obligatorio}
        error={errores?.situacion_societaria}
      >
        <Seleccion
          name="situacion_societaria"
          value={situacion}
          onChange={(e) => {
            const v = e.currentTarget.value as Situacion | "";
            setSituacion(v);
            onCambio?.(v);
          }}
          required={obligatorio}
          error={Boolean(errores?.situacion_societaria)}
        >
          <option value="">Elige…</option>
          <option value="sin_constituir">{SITUACIONES.sin_constituir} · personas físicas</option>
          <option value="en_constitucion">{SITUACIONES.en_constitucion}</option>
          <option value="constituida">{SITUACIONES.constituida}</option>
        </Seleccion>
      </Campo>

      {situacion === "en_constitucion" ? (
        <Campo
          etiqueta="Constitución prevista para"
          ayuda="Será la fecha del hito «Constituir la sociedad»"
          error={errores?.constitucion_prevista}
          obligatorio
        >
          <Texto
            type="date"
            name="constitucion_prevista"
            defaultValue={inicial?.constitucion_prevista ?? ""}
            required
          />
        </Campo>
      ) : null}

      {situacion === "constituida" ? (
        <>
          <Campo etiqueta="Forma jurídica" error={errores?.forma_juridica} obligatorio>
            <Seleccion name="forma_juridica" defaultValue={inicial?.forma_juridica ?? ""} required>
              <option value="">Elige…</option>
              {Object.entries(FORMAS).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </Seleccion>
          </Campo>
          <Campo etiqueta="Denominación social" error={errores?.denominacion_social} obligatorio>
            <Texto name="denominacion_social" defaultValue={inicial?.denominacion_social ?? ""} required />
          </Campo>
          <Campo etiqueta="CIF o NIF" error={errores?.cif} obligatorio>
            <Texto name="cif" defaultValue={inicial?.cif ?? ""} autoComplete="off" required />
          </Campo>
        </>
      ) : null}

      {situacion === "sin_constituir" || situacion === "en_constitucion" ? (
        <p className="text-xs text-secundario sm:col-span-2">
          Sin sociedad, lo societario del due diligence no aplica y se piden en
          su lugar el pacto entre fundadoras y la titularidad de lo construido.
          La hoja de ruta lleva el hito «Constituir la sociedad», y el equity
          queda pendiente de constituirla.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Quién firma el Acuerdo, según la situación.
 *
 * Sin sociedad, las fundadoras a título personal, cada una con su nombre.
 * Con sociedad, quien la representa, y las fundadoras si el Acuerdo lo pide
 * (punto abierto de la Propuesta, §17).
 */
export function CamposFirmantes({
  situacion,
  fundadoras,
  errores,
}: {
  situacion: Situacion | "";
  fundadoras: string;
  errores?: Record<string, string>;
}) {
  if (!situacion) return null;
  const conSociedad = situacion === "constituida";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {conSociedad ? (
        <Campo
          etiqueta="Firma en nombre de la sociedad"
          ayuda="Quien tiene poder para representarla"
          error={errores?.representante}
          obligatorio
        >
          <Texto name="representante" required />
        </Campo>
      ) : null}
      <Campo
        etiqueta={conSociedad ? "Además, a título personal" : "Firman a título personal"}
        ayuda={
          conSociedad
            ? "Opcional: las fundadoras, si el Acuerdo lo pide. Una por línea"
            : "Cada fundadora con su nombre completo, una por línea"
        }
        error={errores?.firmantes}
        obligatorio={!conSociedad}
      >
        <AreaTexto name="firmantes" rows={3} defaultValue={conSociedad ? "" : fundadoras} required={!conSociedad} />
      </Campo>
    </div>
  );
}
