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
  const [enlace, setEnlace] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [copiado, setCopiado] = useState(false);

  if (enviada) {
    const completo =
      typeof window !== "undefined" && enlace
        ? `${window.location.origin}${enlace}`
        : enlace;

    return (
      <div>
        <p className="text-base text-titular">Recibida. Gracias.</p>
        <p className="mt-2 text-sm text-secundario">
          La revisamos y te escribimos al correo que nos has dejado.
        </p>

        {/*
          Y su enlace, que es lo que faltaba.
          
          Sin esto se quedaba sin forma de volver: le decíamos «te
          escribimos al correo» y su candidatura desaparecía de su vista en
          cuanto cerrara la pestaña.
        */}
        {completo ? (
          <div className="mt-5">
            <p className="text-sm text-titular">
              Guarda esta dirección. Es tuya y privada: ahí puedes ver cómo va
              y añadir lo que se te haya quedado por mandar.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-filete bg-hundido px-3 py-2 text-xs text-secundario">
                {completo}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(completo);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
                className="boton-marca shrink-0 px-4 py-2 text-xs"
              >
                {copiado ? "Copiada" : "Copiar"}
              </button>
            </div>
            <a href={enlace!} className="enlace mt-3 inline-block text-sm text-acento-texto">
              Abrir mi candidatura
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Formulario
      accion={async (datos) => {
        const r = await presentarse(datos);
        if (r.ok && r.enlace) setEnlace(r.enlace);
        return r;
      }}
      onOk={() => setEnviada(true)}
    >
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
            <Campo etiqueta="Sector" error={r.ok ? undefined : r.campos?.sector}>
              <Texto name="sector" placeholder="Salud, logística…" />
            </Campo>
            <Campo etiqueta="País" error={r.ok ? undefined : r.campos?.pais}>
              <Texto name="pais" autoComplete="country-name" />
            </Campo>
          </div>

          <Campo
            etiqueta="¿En qué punto estáis?"
            ayuda="Lo comprobamos después contigo; esto solo nos ayuda a situaros."
            error={r.ok ? undefined : r.campos?.estado_declarado}
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
            <Campo
              etiqueta="Cuántas personas sois"
              error={r.ok ? undefined : r.campos?.equipo_personas}
            >
              <Texto name="equipo_personas" inputMode="numeric" />
            </Campo>
            <Campo
              etiqueta="Liderazgo femenino (%)"
              ayuda="Qué parte del equipo fundador y de dirección."
              error={r.ok ? undefined : r.campos?.liderazgo_femenino_pct}
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
            <Campo
              etiqueta="Tu cargo"
              error={r.ok ? undefined : r.campos?.contacto_cargo}
            >
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
            <Campo
              etiqueta="Teléfono"
              error={r.ok ? undefined : r.campos?.contacto_telefono}
            >
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
            <Campo
              etiqueta="Enlace al pitch o la presentación"
              error={r.ok ? undefined : r.campos?.enlace_1}
            >
              <Texto name="enlace_1" placeholder="https://" />
            </Campo>
            <Campo
              etiqueta="Enlace al caso de negocio"
              error={r.ok ? undefined : r.campos?.enlace_2}
            >
              <Texto name="enlace_2" placeholder="https://" />
            </Campo>
          </div>
          <Campo
            etiqueta="Algo más que quieras enseñarnos"
            error={r.ok ? undefined : r.campos?.enlace_3}
          >
            <Texto name="enlace_3" placeholder="https://" />
          </Campo>

          <Campo
            etiqueta="¿Cómo nos has conocido?"
            error={r.ok ? undefined : r.campos?.origen}
          >
            <Texto name="origen" />
          </Campo>

          <Boton>Enviar la candidatura</Boton>
        </>
      )}
    </Formulario>
  );
}
