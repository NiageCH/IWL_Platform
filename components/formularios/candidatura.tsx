"use client";

import { useState } from "react";
import {
  anadirEnlace,
  anotarEvento,
  darAccesoCandidata,
  crearCandidatura,
  descartarCandidatura,
  firmarCandidatura,
  guardarAcuerdo,
  moverCandidatura,
  quitarEnlace,
  reabrirCandidatura,
} from "@/lib/acciones/candidaturas";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";
import {
  PASOS_ABIERTOS,
  nombrePaso,
  siguientePaso,
  type EstadoCandidatura,
} from "@/lib/embudo";

const ESTADOS_ENTRADA = [
  { codigo: "idea", nombre: "Idea" },
  { codigo: "prototipo", nombre: "Prototipo" },
  { codigo: "mvp", nombre: "MVP" },
  { codigo: "primeros_clientes", nombre: "Primeros clientes" },
  { codigo: "facturacion", nombre: "Facturación" },
];

/** Alta a mano, para lo que llega por fuera del formulario */
export function NuevaCandidatura({
  cohortes,
}: {
  cohortes: { id: string; name: string }[];
}) {
  return (
    <Desplegable titulo="Dar de alta una candidatura a mano">
      <p className="mb-3 text-sm text-secundario">
        Para lo que llega por otro camino: una presentación en un evento, una
        recomendación, o alguien que escribió por correo.
      </p>
      <Formulario accion={crearCandidatura}>
        {(r) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Cohorte"
                error={r.ok ? undefined : r.campos?.cohort_id}
              >
                <Seleccion name="cohort_id" required>
                  {cohortes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo
                etiqueta="Startup"
                error={r.ok ? undefined : r.campos?.nombre}
              >
                <Texto name="nombre" required />
              </Campo>
              <Campo etiqueta="Sector">
                <Texto name="sector" />
              </Campo>
              <Campo etiqueta="Web">
                <Texto name="website" placeholder="https://" />
              </Campo>
              <Campo
                etiqueta="Persona de contacto"
                error={r.ok ? undefined : r.campos?.contacto_nombre}
              >
                <Texto name="contacto_nombre" required />
              </Campo>
              <Campo
                etiqueta="Su correo"
                error={r.ok ? undefined : r.campos?.contacto_email}
              >
                <Texto name="contacto_email" type="email" required />
              </Campo>
              <Campo etiqueta="Dice estar en">
                <Seleccion name="estado_declarado" defaultValue="">
                  <option value="">Sin decir</option>
                  {ESTADOS_ENTRADA.map((e) => (
                    <option key={e.codigo} value={e.codigo}>
                      {e.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo etiqueta="Cómo ha llegado">
                <Texto name="origen" placeholder="Evento, recomendación…" />
              </Campo>
            </div>
            <Campo etiqueta="En una frase">
              <Texto name="one_liner" />
            </Campo>
            <Boton>Dar de alta</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/** Mover por el embudo: el siguiente paso en un clic, y el resto en la lista */
export function MoverCandidatura({
  id,
  estado,
}: {
  id: string;
  estado: EstadoCandidatura;
}) {
  const siguiente = siguientePaso(estado);

  return (
    <div className="flex flex-wrap items-end gap-4">
      {siguiente && siguiente !== "firmada" ? (
        <Formulario accion={moverCandidatura}>
          {() => (
            <>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="estado" value={siguiente} />
              <Boton>Pasar a {nombrePaso(siguiente).toLowerCase()}</Boton>
            </>
          )}
        </Formulario>
      ) : null}

      <Formulario accion={moverCandidatura} className="flex-row items-end gap-2">
        {() => (
          <>
            <input type="hidden" name="id" value={id} />
            <Campo etiqueta="O moverla a">
              <Seleccion name="estado" defaultValue={estado}>
                {PASOS_ABIERTOS.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Boton variante="secundario">Mover</Boton>
          </>
        )}
      </Formulario>
    </div>
  );
}

export function DescartarCandidatura({ id }: { id: string }) {
  return (
    <Desplegable titulo="Descartar esta candidatura">
      <Formulario accion={descartarCandidatura}>
        {(r) => (
          <>
            <input type="hidden" name="id" value={id} />
            <Campo
              etiqueta="Por qué"
              ayuda="Se guarda también desde qué paso se cae, que es la mitad del valor de descartar."
              error={r.ok ? undefined : r.campos?.motivo}
            >
              <AreaTexto name="motivo" rows={3} required />
            </Campo>
            <Boton variante="secundario">Descartar</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

export function ReabrirCandidatura({ id }: { id: string }) {
  return (
    <Formulario accion={reabrirCandidatura}>
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <Boton variante="secundario">
            Reabrir, en el paso donde se quedó
          </Boton>
        </>
      )}
    </Formulario>
  );
}

/** Los hitos del acuerdo: NDA, estado verificado, equity */
export function AcuerdoCandidatura({
  id,
  nda,
  propuesto,
  verificado,
  equity,
  aportacion,
}: {
  id: string;
  nda: string | null;
  propuesto: string | null;
  verificado: string | null;
  equity: number | null;
  aportacion: string | null;
}) {
  return (
    <Formulario accion={guardarAcuerdo}>
      {(r) => (
        <>
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="NDA firmado el">
              <Texto
                key={nda ?? "sin-nda"}
                type="date"
                name="nda_firmado_on"
                defaultValue={nda ?? ""}
              />
            </Campo>
            <Campo etiqueta="Acuerdo propuesto el">
              <Texto
                key={propuesto ?? "sin-propuesta"}
                type="date"
                name="acuerdo_propuesto_on"
                defaultValue={propuesto ?? ""}
              />
            </Campo>
            <Campo
              etiqueta="Etapa, tras el due diligence"
              ayuda="En qué punto está de verdad, no el que declaró al presentarse. Es la que hereda la compañía al firmar."
            >
              {/*
                La `key` con el valor fuerza a React a volver a montar el
                desplegable cuando el servidor devuelve otro. Sin ella, un
                campo no controlado conserva el valor con el que se montó:
                se guardaba bien y la pantalla seguía enseñando el anterior,
                que es justo lo que se vio al probar —«si recargas la página
                sí quedó guardado»—.
              */}
              <Seleccion
                key={verificado ?? "sin-fijar"}
                name="estado_verificado"
                defaultValue={verificado ?? ""}
              >
                <option value="">Sin fijar</option>
                {ESTADOS_ENTRADA.map((e) => (
                  <option key={e.codigo} value={e.codigo}>
                    {e.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo
              etiqueta="Equity que se pide (%)"
              error={r.ok ? undefined : r.campos?.equity_pct}
            >
              <Texto
                key={equity === null ? "sin-equity" : String(equity)}
                name="equity_pct"
                inputMode="decimal"
                defaultValue={equity === null ? "" : String(equity)}
              />
            </Campo>
          </div>
          <Campo etiqueta="Qué aporta IWL">
            <AreaTexto
              name="aportacion_propuesta"
              rows={3}
              defaultValue={aportacion ?? ""}
            />
          </Campo>
          <Boton>Guardar</Boton>
        </>
      )}
    </Formulario>
  );
}

export function EnlacesCandidatura({
  candidaturaId,
  enlaces,
}: {
  candidaturaId: string;
  enlaces: { id: string; titulo: string; url: string; tipo: string | null }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {enlaces.length > 0 ? (
        <ul className="divide-y divide-filete">
          {enlaces.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="enlace block truncate text-sm text-titular"
                >
                  {e.titulo}
                </a>
                <span className="block truncate text-xs text-metadato">
                  {e.tipo ? `${e.tipo} · ` : ""}
                  {e.url}
                </span>
              </span>
              <Formulario accion={quitarEnlace}>
                {() => (
                  <>
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      type="hidden"
                      name="candidatura_id"
                      value={candidaturaId}
                    />
                    <button
                      type="submit"
                      className="accion accion-riesgo text-xs text-metadato"
                    >
                      quitar
                    </button>
                  </>
                )}
              </Formulario>
            </li>
          ))}
        </ul>
      ) : null}

      <Desplegable titulo="Añadir un enlace">
        <Formulario accion={anadirEnlace}>
          {(r) => (
            <>
              <input
                type="hidden"
                name="candidatura_id"
                value={candidaturaId}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Qué es"
                  error={r.ok ? undefined : r.campos?.titulo}
                >
                  <Texto name="titulo" placeholder="Pitch deck" required />
                </Campo>
                <Campo etiqueta="Tipo">
                  <Texto name="tipo" placeholder="Presentación, plan…" />
                </Campo>
              </div>
              <Campo
                etiqueta="Dirección"
                ayuda="El enlace de Drive, o de donde esté."
                error={r.ok ? undefined : r.campos?.url}
              >
                <Texto name="url" placeholder="https://" required />
              </Campo>
              <Boton>Añadir</Boton>
            </>
          )}
        </Formulario>
      </Desplegable>
    </div>
  );
}

export function AnotarEvento({ candidaturaId }: { candidaturaId: string }) {
  const [tipo, setTipo] = useState("reunion");

  return (
    <Desplegable titulo="Anotar una reunión, un comité o una nota">
      <Formulario accion={anotarEvento}>
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Qué ha sido">
                <Seleccion
                  name="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="reunion">Reunión</option>
                  <option value="comite">Comité</option>
                  <option value="nota">Nota</option>
                </Seleccion>
              </Campo>
              <Campo etiqueta="Cuándo">
                <Texto type="date" name="ocurrido_on" />
              </Campo>
            </div>
            <Campo etiqueta="Título">
              <Texto
                name="titulo"
                placeholder={
                  tipo === "comite" ? "Decisión del comité" : "De qué se habló"
                }
              />
            </Campo>
            <Campo
              etiqueta={tipo === "comite" ? "El informe" : "Qué pasó"}
              ayuda={
                tipo === "comite"
                  ? "Lo que se decidió y por qué. Es lo que se mira al revisar la convocatoria."
                  : undefined
              }
              error={r.ok ? undefined : r.campos?.detalle}
            >
              <AreaTexto name="detalle" rows={tipo === "comite" ? 6 : 3} required />
            </Campo>
            <Boton>Anotar</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/** El final del embudo: crea la compañía */
export function FirmarAcuerdo({
  id,
  nombre,
  plantillas,
  fases,
}: {
  id: string;
  nombre: string;
  plantillas: { id: string; name: string }[];
  fases: { code: string; name: string }[];
}) {
  return (
    <Desplegable titulo={`Firmar el acuerdo y crear la compañía`}>
      <p className="mb-3 text-sm text-secundario">
        Esto crea <strong>{nombre}</strong> en la cartera, con su hoja de ruta.
        Pide los datos que una candidatura no tiene y una compañía necesita.
      </p>
      <Formulario accion={firmarCandidatura}>
        {(r) => (
          <>
            <input type="hidden" name="id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Dirección web"
                ayuda="Minúsculas y guiones. Es lo que irá en la URL."
                error={r.ok ? undefined : r.campos?.slug}
              >
                <Texto
                  name="slug"
                  placeholder={nombre
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[̀-ͯ]/g, "")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")}
                  required
                />
              </Campo>
              <Campo etiqueta="Etapa de inversión">
                <Seleccion name="stage" defaultValue="pre_semilla">
                  <option value="pre_semilla">Pre-semilla</option>
                  <option value="semilla">Semilla</option>
                  <option value="serie_a">Serie A</option>
                </Seleccion>
              </Campo>
              <Campo etiqueta="Perfil técnico">
                <Seleccion name="tech_profile" defaultValue="software">
                  <option value="software">Software</option>
                  <option value="software_ia">Software con IA</option>
                  <option value="hardware">Hardware</option>
                </Seleccion>
              </Campo>
              <Campo etiqueta="Fase del programa">
                <Seleccion name="phase_code" defaultValue="">
                  <option value="">Sin fase</option>
                  {fases.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.name}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo etiqueta="Recorrido">
                <Seleccion name="roadmap_template" defaultValue="">
                  <option value="">Sin hoja de ruta todavía</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo etiqueta="Empieza el">
                <Texto type="date" name="roadmap_start" />
              </Campo>
            </div>
            <Campo etiqueta="Acuerdo firmado el">
              <Texto type="date" name="firmado_on" />
            </Campo>
            <Boton>Firmar y crear la compañía</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * El acceso de la candidata: el enlace privado y, llegado el NDA, su cuenta.
 *
 * El enlace se enseña para copiarlo y mandarlo a mano, porque todavía no hay
 * envío de correo. El día que lo haya, esto sigue valiendo igual.
 */
export function AccesoCandidata({
  id,
  token,
  tieneCuenta,
  correo,
  base,
}: {
  id: string;
  token: string | null;
  tieneCuenta: boolean;
  correo: string;
  /** La dirección de la plataforma, para componer el enlace entero */
  base: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const enlace = token ? `${base}/candidatura/${token}` : null;

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      {tieneCuenta ? (
        <div>
          <p className="text-sm text-cuerpo">
            Entra con <strong>{correo}</strong> y carga su documentación desde
            la plataforma.
          </p>
          <p className="mt-1 text-xs text-metadato">
            El enlace privado quedó anulado al darle la cuenta: a partir del
            NDA el acceso tiene que poder retirarse, y una dirección
            reenviada no se retira.
          </p>
        </div>
      ) : enlace ? (
        <>
          <div>
            <p className="text-sm text-cuerpo">
              Su enlace privado. Mándaselo tú de momento: todavía no hay
              envío de correo.
            </p>
            <p className="mt-1 text-xs text-metadato">
              Ahí ve en qué punto está y puede añadir lo que se le olvidó.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-filete bg-hundido px-3 py-2 text-xs text-secundario">
              {enlace}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(enlace);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="boton-marca shrink-0 px-4 py-2 text-xs"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-secundario">
          Esta candidatura no tiene enlace activo ni cuenta.
        </p>
      )}

      {/*
        El formulario se monta siempre, y lo que aparece y desaparece es su
        contenido.

        Aquí no es solo cuestión de que se lea la confirmación: **el mensaje
        lleva la contraseña**, y se enseña una sola vez. Si el formulario
        viviera dentro de la rama `!tieneCuenta`, darle la cuenta la haría
        falsa y se llevaría la contraseña con ella antes de que nadie
        pudiera copiarla.
      */}
      <Formulario accion={darAccesoCandidata}>
        {() =>
          tieneCuenta ? null : (
            <>
              <input type="hidden" name="id" value={id} />
              <p className="text-sm text-secundario">
                Al firmar el NDA, dale cuenta: se la crea con{" "}
                <strong>{correo}</strong>, enseña una contraseña{" "}
                <strong>una sola vez</strong> y anula el enlace privado.
              </p>
              <Boton variante="secundario">
                Darle cuenta para el due diligence
              </Boton>
            </>
          )
        }
      </Formulario>
    </div>
  );
}
