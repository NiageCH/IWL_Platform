"use client";

import {
  anadirMaterial,
  completarCandidatura,
} from "@/lib/acciones/presentarse";
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
 * Añadir un documento desde el enlace privado.
 *
 * Es la razón principal por la que existe el enlace: lo que más pasa después
 * de mandar una candidatura es acordarse de algo que faltaba.
 */
export function AnadirMaterial({ token }: { token: string }) {
  return (
    <Desplegable titulo="Añadir un documento">
      <Formulario accion={anadirMaterial}>
        {(r) => (
          <>
            <input type="hidden" name="token" value={token} />
            <Campo
              etiqueta="Qué es"
              error={r.ok ? undefined : r.campos?.titulo}
            >
              <Texto name="titulo" placeholder="Pitch actualizado" required />
            </Campo>
            <Campo
              etiqueta="Enlace"
              ayuda="De Drive, Notion o donde lo tengas, con permiso de lectura."
              error={r.ok ? undefined : r.campos?.url}
            >
              <Texto name="url" placeholder="https://" required />
            </Campo>
            <Boton>Añadir</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * La candidata cuenta quién es, desde su enlace.
 *
 * El mismo juego de campos que el formulario público. Es lo que faltaba en
 * el camino de la invitación: IWL la da de alta con el nombre y un correo,
 * le manda el enlace, y hasta ahora no había ningún sitio donde ella
 * pudiera presentarse.
 */
export function CompletarFicha({
  token,
  ficha,
}: {
  token: string;
  /*
   * Los campos llegan opcionales porque la vista los declara así: la
   * función de la base podría no devolverlos en una versión antigua, y un
   * formulario que se cae por un campo que falta es peor que uno vacío.
   */
  ficha: {
    sector?: string | null;
    one_liner?: string | null;
    website?: string | null;
    pais?: string | null;
    contacto_cargo?: string | null;
    contacto_telefono?: string | null;
    estado_declarado?: string | null;
    equipo_personas?: number | null;
    liderazgo_femenino_pct?: number | null;
  };
}) {
  return (
    <Formulario accion={completarCandidatura}>
      {(r) => (
        <>
          <input type="hidden" name="token" value={token} />

          <Campo
            etiqueta="En una frase, qué hacéis"
            error={r.ok ? undefined : r.campos?.one_liner}
          >
            <AreaTexto
              name="one_liner"
              rows={2}
              defaultValue={ficha.one_liner ?? ""}
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Sector">
              <Texto name="sector" defaultValue={ficha.sector ?? ""} />
            </Campo>
            <Campo etiqueta="Web">
              <Texto
                name="website"
                placeholder="https://"
                defaultValue={ficha.website ?? ""}
              />
            </Campo>
            <Campo etiqueta="País">
              <Texto name="pais" defaultValue={ficha.pais ?? ""} />
            </Campo>
            <Campo etiqueta="Tu cargo">
              <Texto
                name="contacto_cargo"
                placeholder="CEO, CTO…"
                defaultValue={ficha.contacto_cargo ?? ""}
              />
            </Campo>
          </div>

          <Campo
            etiqueta="¿En qué punto estáis?"
            ayuda="Lo comprobamos después contigo; esto solo nos ayuda a situaros."
          >
            <Seleccion
              name="estado_declarado"
              defaultValue={ficha.estado_declarado ?? ""}
            >
              <option value="" disabled>
                Elige una
              </option>
              <option value="idea">Idea: todavía no hay producto</option>
              <option value="prototipo">
                Prototipo: algo que se puede enseñar
              </option>
              <option value="mvp">MVP: funciona y alguien lo usa</option>
              <option value="primeros_clientes">Primeros clientes</option>
              <option value="facturacion">Facturación: ya cobramos</option>
            </Seleccion>
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Cuántas personas sois">
              <Texto
                name="equipo_personas"
                inputMode="numeric"
                defaultValue={
                  ficha.equipo_personas === null
                    ? ""
                    : String(ficha.equipo_personas)
                }
              />
            </Campo>
            <Campo
              etiqueta="Liderazgo femenino (%)"
              ayuda="Qué parte del equipo fundador y de dirección."
            >
              <Texto
                name="liderazgo_femenino_pct"
                inputMode="decimal"
                defaultValue={
                  ficha.liderazgo_femenino_pct === null
                    ? ""
                    : String(ficha.liderazgo_femenino_pct)
                }
              />
            </Campo>
            <Campo etiqueta="Teléfono">
              <Texto
                name="contacto_telefono"
                defaultValue={ficha.contacto_telefono ?? ""}
              />
            </Campo>
          </div>

          <Boton>Guardar</Boton>
        </>
      )}
    </Formulario>
  );
}
