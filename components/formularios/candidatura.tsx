"use client";

import { useState } from "react";
import {
  anadirEnlace,
  anotarEvento,
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
              <Texto type="date" name="nda_firmado_on" defaultValue={nda ?? ""} />
            </Campo>
            <Campo etiqueta="Acuerdo propuesto el">
              <Texto
                type="date"
                name="acuerdo_propuesto_on"
                defaultValue={propuesto ?? ""}
              />
            </Campo>
            <Campo
              etiqueta="Estado verificado"
              ayuda="El que sale del due diligence, no el que declaró al presentarse."
            >
              <Seleccion name="estado_verificado" defaultValue={verificado ?? ""}>
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
