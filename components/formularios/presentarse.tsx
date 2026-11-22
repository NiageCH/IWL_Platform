"use client";

import { useState } from "react";
import { aceptarNda } from "@/lib/acciones/presentarse";
import { Boton, Campo, Formulario, Seleccion, Texto } from "@/components/ui/formulario";
import { TextoNda } from "@/components/vistas/texto-nda";
import { CORREO_DUDAS_NDA } from "@/lib/contacto";
import { camposQuePide, completarNda, huecos, type CampoDeElla } from "@/lib/nda-texto";

const CAMPOS: Record<CampoDeElla, { etiqueta: string; ayuda?: string; autoComplete?: string }> = {
  documento: { etiqueta: "Tu DNI, NIE o pasaporte" },
  domicilio: { etiqueta: "Domicilio", ayuda: "Calle, número, código postal y ciudad", autoComplete: "street-address" },
  denominacion: { etiqueta: "Denominación de la sociedad", ayuda: "Como en la escritura, con SL o SA" },
  nif: { etiqueta: "NIF de la sociedad" },
  cargo: { etiqueta: "Tu cargo en la sociedad", ayuda: "Por ejemplo, administradora única" },
};

/**
 * El primer paso de todo (REVISION, 22 nov · bloque 2): antes de contar nada
 * del proyecto, sus datos y el NDA.
 *
 * El texto se completa mientras escribe, con el mismo código que usa el
 * servidor al aceptarlo, y se pinta con el mismo intérprete de marcas que el
 * PDF: lo que lee es lo que acepta, y su hash es el de ese texto. La casilla
 * va después del texto entero, que está a la vista antes de marcarla.
 *
 * Aceptado, la lleva a su enlace privado, que es donde presenta el
 * proyecto: el acuse es la pantalla siguiente.
 */
export function FormularioPresentarse({
  plantillaId,
  version,
  texto,
  lugar,
}: {
  plantillaId: string;
  version: number;
  texto: string;
  lugar: string;
}) {
  const [startup, setStartup] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [como, setComo] = useState<"" | "persona" | "sociedad">("");
  const [valores, setValores] = useState<Partial<Record<CampoDeElla, string>>>({});
  const esSociedad = como === "sociedad";

  const pide = como ? camposQuePide(texto, esSociedad) : [];
  const completado = completarNda(texto, {
    startup: startup.trim(),
    contraparte_nombre: `${nombre.trim()} ${apellidos.trim()}`.trim(),
    lugar,
    es_sociedad: esSociedad,
    ...valores,
  });
  const faltan = huecos(completado);
  const listo = Boolean(como && startup.trim() && nombre.trim() && apellidos.trim()) && faltan.length === 0;

  return (
    <Formulario
      accion={async (datos) => {
        const r = await aceptarNda(datos);
        // Navegación completa: la página siguiente es su enlace privado, sin sesión que esperar
        if (r.ok && r.enlace) window.location.assign(r.enlace);
        return r;
      }}
      className="gap-5"
    >
      {(r) => (
        <>
          <input type="hidden" name="plantilla_id" value={plantillaId} />
          {/*
            La trampa para los robots: un campo que nadie ve y que un
            navegador de verdad deja vacío. Si viene relleno, la acción lo
            descarta sin decir por qué.
          */}
          <div aria-hidden="true" className="absolute left-[-9999px]">
            <label>
              No rellenes esto
              <input type="text" name="apodo" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <p className="text-sm text-secundario">
            Antes de contarnos nada, firmamos un acuerdo de confidencialidad, en las dos
            direcciones: lo que nos cuentes queda protegido desde el primer momento. Primero
            tus datos; abajo tienes el NDA ya completado con ellos.
          </p>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 text-sm font-semibold text-titular">Tus datos</legend>
            <Campo etiqueta="Tu startup" obligatorio error={r.ok ? undefined : r.campos?.startup}>
              <Texto
                name="startup"
                required
                autoComplete="organization"
                onChange={(e) => setStartup(e.currentTarget.value)}
              />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre" ayuda="Como en tu documento" obligatorio error={r.ok ? undefined : r.campos?.nombre}>
                <Texto name="nombre" required autoComplete="given-name" onChange={(e) => setNombre(e.currentTarget.value)} />
              </Campo>
              <Campo etiqueta="Apellidos" obligatorio error={r.ok ? undefined : r.campos?.apellidos}>
                <Texto name="apellidos" required autoComplete="family-name" onChange={(e) => setApellidos(e.currentTarget.value)} />
              </Campo>
            </div>
            <Campo
              etiqueta="Correo"
              ayuda="Ahí te mandamos el NDA en PDF y tu enlace privado"
              obligatorio
              error={r.ok ? undefined : r.campos?.correo}
            >
              <Texto name="correo" type="email" required autoComplete="email" />
            </Campo>
            <Campo etiqueta="Aceptas" obligatorio error={r.ok ? undefined : r.campos?.como}>
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
          </fieldset>

          <div>
            <p className="mb-2 text-xs text-metadato">
              El NDA, con tus datos{faltan.length ? ". Los huecos se rellenan al escribir arriba" : ""}:
            </p>
            <div
              className="max-h-[28rem] overflow-y-auto rounded-lg border border-filete bg-hundido py-5 pr-5 pl-2"
              tabIndex={0}
              aria-label={`Texto del NDA, versión ${version}`}
            >
              <TextoNda texto={completado} />
            </div>
          </div>

          <p className="text-sm text-cuerpo">
            ¿Alguna duda sobre el NDA? Escríbenos a{" "}
            <a href={`mailto:${CORREO_DUDAS_NDA}`} className="enlace text-acento-texto">
              {CORREO_DUDAS_NDA}
            </a>{" "}
            antes de aceptarlo.
          </p>
          <label className="flex items-start gap-3 text-sm text-titular">
            <input type="checkbox" name="acepto" value="si" required className="mt-1 size-4" />
            <span>
              He leído el NDA y lo acepto.
              {!r.ok && r.campos?.acepto ? <span className="block text-xs text-mal">{r.campos.acepto}</span> : null}
            </span>
          </label>
          <p className="text-xs text-metadato">
            Al aceptarlo quedan registrados tus datos, la fecha y la hora, tu dirección IP y tu
            navegador, junto con la versión del texto ({version}) y su huella. Te mandamos el PDF
            por correo. Después nos cuentas el proyecto.
          </p>
          {!listo ? (
            <p className="text-sm text-cuerpo" role="status">
              Para aceptarlo, rellena lo de arriba.
            </p>
          ) : null}
          <div>
            <Boton disabled={!listo}>Aceptar el NDA y seguir</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
