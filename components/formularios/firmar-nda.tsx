"use client";

import { useState } from "react";
import { firmarNda } from "@/lib/acciones/nda";
import { Boton, Campo, Formulario, Seleccion, Texto } from "@/components/ui/formulario";
import {
  FECHA_EFECTO_PENDIENTE,
  camposQuePide,
  completarNda,
  huecos,
  type CampoDeElla,
} from "@/lib/nda-texto";

const CAMPOS: Record<CampoDeElla, { etiqueta: string; ayuda?: string; autoComplete?: string }> = {
  documento: { etiqueta: "Tu DNI, NIE o pasaporte" },
  domicilio: { etiqueta: "Domicilio", ayuda: "Calle, número, código postal y ciudad", autoComplete: "street-address" },
  denominacion: { etiqueta: "Denominación de la sociedad", ayuda: "Como en la escritura, con SL o SA" },
  nif: { etiqueta: "NIF de la sociedad" },
  cargo: { etiqueta: "Tu cargo en la sociedad", ayuda: "Por ejemplo, administradora única" },
};

/**
 * La candidata rellena lo que falta del NDA, lo lee ya completado y lo firma.
 *
 * El texto de abajo se completa mientras escribe, con el mismo código que
 * usa el servidor al firmar: lo que ve es lo que firma, y su hash es el de
 * ese texto. Mientras quede un hueco, se dice cuál y no se puede firmar.
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
  base,
}: {
  plantillaId: string;
  version: number;
  texto: string;
  /** Lo que completa el texto sin que lo escriba ella */
  base: { startup: string; contraparte_nombre: string; situacion_societaria: string | null; lugar: string };
}) {
  const sabida = base.situacion_societaria;
  const [como, setComo] = useState<"" | "persona" | "sociedad">(
    sabida ? (sabida === "constituida" ? "sociedad" : "persona") : "",
  );
  const [valores, setValores] = useState<Partial<Record<CampoDeElla, string>>>({});
  const esSociedad = como === "sociedad";

  const pide = como ? camposQuePide(texto, esSociedad) : [];
  const completado = completarNda(texto, {
    startup: base.startup,
    contraparte_nombre: base.contraparte_nombre,
    lugar: base.lugar,
    fecha_efecto: FECHA_EFECTO_PENDIENTE,
    es_sociedad: esSociedad,
    ...valores,
  });
  const faltan = como ? huecos(completado) : [];

  return (
    <Formulario accion={firmarNda} className="gap-5">
      {(r) => (
        <>
          <input type="hidden" name="plantilla_id" value={plantillaId} />

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 text-sm font-semibold text-titular">Tus datos para el NDA</legend>
            {!sabida ? (
              <Campo
                etiqueta="Firmas"
                obligatorio
                error={r.ok ? undefined : r.campos?.como}
              >
                <Seleccion
                  name="como"
                  value={como}
                  onChange={(e) => setComo(e.currentTarget.value as "" | "persona" | "sociedad")}
                  required
                >
                  <option value="">Elige…</option>
                  <option value="persona">Como persona física</option>
                  <option value="sociedad">En nombre de una sociedad constituida</option>
                </Seleccion>
              </Campo>
            ) : null}
            {pide.map((c) => (
              <Campo
                key={c}
                etiqueta={CAMPOS[c].etiqueta}
                ayuda={CAMPOS[c].ayuda}
                obligatorio
                error={r.ok ? undefined : r.campos?.[c]}
              >
                <Texto
                  name={c}
                  autoComplete={CAMPOS[c].autoComplete ?? "off"}
                  required
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setValores((antes) => ({ ...antes, [c]: v }));
                  }}
                />
              </Campo>
            ))}
            {como && !pide.length ? (
              <p className="text-xs text-metadato">Este NDA no te pide más datos.</p>
            ) : null}
          </fieldset>

          <div>
            <p className="mb-2 text-xs text-metadato">
              El texto que firmas, con tus datos{faltan.length ? ". Los huecos se rellenan al escribir arriba" : ""}:
            </p>
            <div
              className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-lg border border-filete bg-hundido px-5 py-4 text-sm leading-relaxed text-cuerpo"
              tabIndex={0}
              aria-label={`Texto del NDA, versión ${version}`}
            >
              {completado}
            </div>
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
            Al firmar quedan registrados tu nombre, tus datos de arriba, la fecha
            y la hora, tu dirección IP y tu navegador, junto con la versión del
            texto ({version}) y su huella. Cuando firme también Inception Woman
            Lab, tendrás el PDF con las dos firmas en tu documentación, con la
            fecha de efecto ya escrita.
          </p>
          {faltan.length ? (
            <p className="text-sm text-cuerpo" role="status">
              Para firmar falta rellenar lo de arriba.
            </p>
          ) : null}
          <div>
            <Boton disabled={!como || faltan.length > 0}>Firmar el NDA</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
