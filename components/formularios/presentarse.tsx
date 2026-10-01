"use client";

import { useState } from "react";
import { presentarse } from "@/lib/acciones/presentarse";
import {
  AreaTexto,
  Boton,
  Campo,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

const ESTADOS = [
  { codigo: "idea", nombre: "Idea: todavía no hay producto" },
  { codigo: "prototipo", nombre: "Prototipo: algo que se puede enseñar" },
  { codigo: "mvp", nombre: "MVP: funciona y alguien lo usa" },
  { codigo: "primeros_clientes", nombre: "Primeros clientes" },
  { codigo: "facturacion", nombre: "Facturación: ya cobramos" },
];

/**
 * El formulario de candidatura.
 *
 * Corto a propósito. Lo que de verdad sitúa a una startup está en los
 * documentos que ya tiene hechos —el pitch, el caso de negocio—, no en
 * campos que obliguen a redactar otra vez lo mismo en una caja de texto.
 *
 * Al enviarse no se redirige: se queda con el acuse puesto. Quien rellena un
 * formulario necesita ver que ha llegado, y una pantalla nueva que diga
 * «gracias» se lee menos que la confirmación donde estaba mirando.
 */
export function FormularioPresentarse() {
  const [enviada, setEnviada] = useState(false);

  if (enviada) {
    return (
      <div>
        <p className="text-base text-titular">Recibida. Gracias.</p>
        <p className="mt-2 text-sm text-secundario">
          La revisamos y te escribimos al correo que nos has dejado. Si te
          falta algo por mandarnos, respóndenos a ese mismo hilo.
        </p>
      </div>
    );
  }

  return (
    <Formulario accion={presentarse} onOk={() => setEnviada(true)}>
      {(r) => (
        <>
          {/*
            La trampa para los robots.

            Un campo que nadie ve y que un navegador de verdad deja vacío.
            Si viene relleno, la acción lo descarta sin decir por qué: un
            mensaje de error le enseñaría al robot cómo evitarlo.
          */}
          <div aria-hidden="true" className="absolute left-[-9999px]">
            <label>
              No rellenes esto
              <input
                type="text"
                name="apodo"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Tu startup"
              error={r.ok ? undefined : r.campos?.nombre}
            >
              <Texto name="nombre" required autoComplete="organization" />
            </Campo>
            <Campo etiqueta="Web" error={r.ok ? undefined : r.campos?.website}>
              <Texto name="website" placeholder="https://" />
            </Campo>
          </div>

          <Campo
            etiqueta="En una frase, qué hacéis"
            error={r.ok ? undefined : r.campos?.one_liner}
          >
            <AreaTexto name="one_liner" rows={2} />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Sector">
              <Texto name="sector" placeholder="Salud, logística…" />
            </Campo>
            <Campo etiqueta="País">
              <Texto name="pais" autoComplete="country-name" />
            </Campo>
          </div>

          <Campo
            etiqueta="¿En qué punto estáis?"
            ayuda="Lo comprobamos después contigo; esto solo nos ayuda a situaros."
          >
            <Seleccion name="estado_declarado" defaultValue="">
              <option value="">Prefiero no decirlo</option>
              {ESTADOS.map((e) => (
                <option key={e.codigo} value={e.codigo}>
                  {e.nombre}
                </option>
              ))}
            </Seleccion>
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Cuántas personas sois">
              <Texto name="equipo_personas" inputMode="numeric" />
            </Campo>
            <Campo
              etiqueta="Liderazgo femenino (%)"
              ayuda="Qué parte del equipo fundador y de dirección."
            >
              <Texto name="liderazgo_femenino_pct" inputMode="decimal" />
            </Campo>
          </div>

          <hr className="border-0 border-t border-filete" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Tu nombre"
              error={r.ok ? undefined : r.campos?.contacto_nombre}
            >
              <Texto name="contacto_nombre" required autoComplete="name" />
            </Campo>
            <Campo etiqueta="Tu cargo">
              <Texto name="contacto_cargo" placeholder="CEO, CTO…" />
            </Campo>
            <Campo
              etiqueta="Tu correo"
              error={r.ok ? undefined : r.campos?.contacto_email}
            >
              <Texto
                name="contacto_email"
                type="email"
                required
                autoComplete="email"
              />
            </Campo>
            <Campo etiqueta="Teléfono">
              <Texto name="contacto_telefono" autoComplete="tel" />
            </Campo>
          </div>

          <hr className="border-0 border-t border-filete" />

          <p className="text-sm text-secundario">
            Déjanos lo que ya tengas hecho: el pitch, el caso de negocio, una
            presentación. Un enlace de Drive, Notion o lo que uséis, con
            permiso de lectura.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Enlace al pitch o la presentación">
              <Texto name="enlace_1" placeholder="https://" />
            </Campo>
            <Campo etiqueta="Enlace al caso de negocio">
              <Texto name="enlace_2" placeholder="https://" />
            </Campo>
          </div>
          <Campo etiqueta="Algo más que quieras enseñarnos">
            <Texto name="enlace_3" placeholder="https://" />
          </Campo>

          <Campo etiqueta="¿Cómo nos has conocido?">
            <Texto name="origen" />
          </Campo>

          <Boton>Enviar la candidatura</Boton>
        </>
      )}
    </Formulario>
  );
}
