"use client";

import Link from "next/link";

import { useState } from "react";
import { cifraEquity } from "@/lib/utils";
import { Pencil } from "lucide-react";
import {
  anadirEnlace,
  anotarEvento,
  crearCandidatura,
  darAccesoCandidata,
  descartarCandidatura,
  editarCandidatura,
  firmarCandidatura,
  guardarAcuerdo,
  guardarSituacionCandidatura,
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
import { identificadorDe } from "@/lib/identificador";
import { textoEnvioNda } from "@/lib/onboarding";
import type { DatosSocietarios, Situacion } from "@/lib/societario";
import { CamposFirmantes, CamposSituacion } from "@/components/formularios/situacion";

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
                etiqueta="Persona de contacto: nombre"
                error={r.ok ? undefined : r.campos?.contacto_nombre}
              >
                <Texto name="contacto_nombre" required />
              </Campo>
              <Campo
                etiqueta="Sus apellidos"
                error={r.ok ? undefined : r.campos?.contacto_apellidos}
              >
                <Texto name="contacto_apellidos" required />
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
                defaultValue={cifraEquity(equity)}
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
  situacion,
  fundadoras,
}: {
  id: string;
  nombre: string;
  plantillas: { id: string; name: string }[];
  fases: { code: string; name: string }[];
  /** Lo que ya se dijo de la sociedad en la candidatura, para no volver a pedirlo */
  situacion?: Partial<DatosSocietarios>;
  /** Quién firmaría a título personal si no hay sociedad: la persona de contacto */
  fundadoras: string;
}) {
  const [elegida, setElegida] = useState<Situacion | "">(situacion?.situacion_societaria ?? "");

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
                etiqueta="Web de la compañía"
                ayuda="Opcional. Como la escribas: siren.es, www.siren.es…"
                error={r.ok ? undefined : r.campos?.website}
              >
                <Texto name="website" placeholder="siren.es" autoComplete="off" />
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
              <Campo
                etiqueta="Empieza el"
                error={r.ok ? undefined : r.campos?.roadmap_start}
              >
                <Texto type="date" name="roadmap_start" />
              </Campo>
            </div>
            <Campo
              etiqueta="Acuerdo firmado el"
              error={r.ok ? undefined : r.campos?.firmado_on}
            >
              <Texto type="date" name="firmado_on" />
            </Campo>

            {/*
              Desde dónde parte y quién firma. Obligatorio: sin sociedad,
              lo que se le pide y quién firma cambian.
            */}
            <div className="border-t border-filete pt-4">
              <CamposSituacion
                inicial={situacion}
                errores={r.ok ? undefined : r.campos}
                onCambio={setElegida}
              />
            </div>
            <CamposFirmantes
              situacion={elegida}
              fundadoras={fundadoras}
              errores={r.ok ? undefined : r.campos}
            />

            {/*
              El identificador no se le pide a nadie: sale del nombre. Se
              pedía, rotulado «Dirección web», y quien escribía la web se
              quedaba sin poder firmar. Si el error es suyo, se abre solo:
              un error dentro de algo plegado es un error que no se ve.
            */}
            <details className="text-sm" open={!r.ok && Boolean(r.campos?.slug)}>
              <summary className="accion cursor-pointer text-xs text-secundario">
                Opciones avanzadas
              </summary>
              <div className="mt-3">
                <Campo
                  etiqueta="Identificador en la plataforma, no es la web"
                  ayuda={`Vacío, se usa ${identificadorDe(nombre) || "uno sacado del nombre"}. Es lo que sale en la dirección de su ficha y no se puede cambiar después.`}
                  error={r.ok ? undefined : r.campos?.slug}
                >
                  <Texto name="slug" placeholder={identificadorDe(nombre)} autoComplete="off" />
                </Campo>
              </div>
            </details>

            <Boton>Firmar y crear la compañía</Boton>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * El acceso, para dárselo por otro canal: el correo de la plataforma lleva
 * un enlace para que elija su contraseña, nunca la contraseña. Esto la
 * lleva, así que se queda puesto hasta que alguien pulse «Hecho».
 */
function MensajeEnvioNda({
  nombre,
  correo,
  clave,
  base,
  alTerminar,
}: {
  nombre: string;
  correo: string;
  clave: string;
  base: string;
  alTerminar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const { cuerpo } = textoEnvioNda(nombre, correo, clave, base);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-filete bg-elevado p-3">
      <textarea
        readOnly
        value={cuerpo}
        rows={9}
        aria-label="Su acceso, para mandárselo por otro canal"
        className="w-full rounded-md border border-filete bg-papel px-3 py-2 text-xs text-titular"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(cuerpo);
            setCopiado(true);
          }}
          className="accion text-xs"
        >
          {copiado ? "Copiado" : "Copiar para WhatsApp"}
        </button>
        <button type="button" onClick={alTerminar} className="accion text-xs">
          Hecho
        </button>
      </div>
    </div>
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
  estado,
  problemaNda = null,
}: {
  id: string;
  token: string | null;
  tieneCuenta: boolean;
  correo: string;
  /** La dirección de la plataforma, para componer el enlace entero */
  base: string;
  /** En qué paso está: el NDA se envía desde Preseleccionada */
  estado: string;
  /**
   * Por qué no se le puede enviar el NDA: sin plantilla, o con huecos que
   * nadie va a rellenar. Darle cuenta así la dejaba sin su enlace y sin
   * nada que firmar; pasó en producción. La base lo impide también.
   */
  problemaNda?: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const [hecho, setHecho] = useState(false);
  const antesDelComite = ["presentada", "en_revision", "reunion", "comite"].includes(estado);
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
        {(r) => {
          // Lo que se enseña una sola vez se cierra a mano, con «Hecho»
          if (r.ok && r.datos?.clave) {
            return hecho ? null : (
              <MensajeEnvioNda
                nombre={r.datos.nombre}
                correo={r.datos.correo}
                clave={r.datos.clave}
                base={base}
                alTerminar={() => setHecho(true)}
              />
            );
          }
          if (tieneCuenta) return null;
          if (antesDelComite) {
            return (
              <p className="text-sm text-secundario">
                El NDA se envía cuando el comité la preselecciona: con el acta
                firmada, aquí saldrá «Enviar el NDA».
              </p>
            );
          }
          const enviar = estado === "preseleccionada";
          if ((enviar || estado === "nda") && problemaNda) {
            return (
              <>
                <p className="text-sm text-cuerpo">
                  {problemaNda} Hasta entonces no se le envía: no tendría nada que firmar, y
                  darle la cuenta anula su enlace privado.{" "}
                  <Link href="/admin/programa" className="enlace text-acento-texto">
                    Ir a la plantilla, en Administración → Programa
                  </Link>
                </p>
                <div>
                  <Boton variante="secundario" disabled>
                    {enviar ? "Enviar el NDA" : "Darle cuenta para el due diligence"}
                  </Boton>
                </div>
              </>
            );
          }
          return (
            <>
              <input type="hidden" name="id" value={id} />
              <p className="text-sm text-secundario">
                {enviar ? "Enviar el NDA le crea la cuenta" : "Se le crea la cuenta"} con{" "}
                <strong>{correo}</strong>, enseña una contraseña{" "}
                <strong>una sola vez</strong> y anula el enlace privado
                {enviar ? ", y la candidatura pasa a «NDA enviado»" : ""}.
                {" "}Le llega un correo con un enlace para entrar y elegir su contraseña; la
                temporal queda para dársela por otro canal si hace falta.
                {enviar || estado === "nda"
                  ? " Lo primero que verá al entrar es el NDA, para comentarlo o firmarlo."
                  : ""}
              </p>
              <Boton variante="secundario">
                {enviar ? "Enviar el NDA" : "Darle cuenta para el due diligence"}
              </Boton>
            </>
          );
        }}
      </Formulario>
    </div>
  );
}

/**
 * Corregir los datos de una candidatura.
 *
 * `editarCandidatura` existía desde el principio y **no tenía botón**: en el
 * embudo, una startup con el nombre mal escrito o el correo equivocado se
 * quedaba así hasta firmar. Es la misma familia de fallo que `borrarEtapa` y
 * `moverHito`: la acción está, con sus tipos y su validación, y no se puede
 * llamar desde ninguna pantalla.
 *
 * No incluye la cohorte ni el estado: la cohorte se decide al darla de alta
 * y el paso se mueve con sus botones, que además dejan rastro en el
 * historial. Esto es para corregir datos, no para saltarse el proceso.
 */
export function EditarCandidatura({
  candidatura,
}: {
  candidatura: {
    id: string;
    nombre: string;
    sector: string | null;
    one_liner: string | null;
    website: string | null;
    pais: string | null;
    contacto_nombre: string | null;
    contacto_apellidos: string | null;
    contacto_email: string | null;
    contacto_telefono: string | null;
    contacto_cargo: string | null;
    estado_declarado: string | null;
    equipo_personas: number | null;
    liderazgo_femenino_pct: number | string | null;
    origen: string | null;
    notas: string | null;
  };
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs"
      >
        <Pencil aria-hidden="true" className="size-3.5 text-acento-texto" />
        Corregir los datos
      </button>
    );
  }

  return (
    <div className="w-full border-t border-filete pt-4">
      <Formulario accion={editarCandidatura}>
        {(r) => (
          <>
            <input type="hidden" name="id" value={candidatura.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Startup"
                obligatorio
                error={r.ok ? undefined : r.campos?.nombre}
              >
                <Texto name="nombre" required defaultValue={candidatura.nombre} />
              </Campo>
              <Campo etiqueta="Sector" error={r.ok ? undefined : r.campos?.sector}>
                <Texto name="sector" defaultValue={candidatura.sector ?? ""} />
              </Campo>
              <Campo etiqueta="Web" error={r.ok ? undefined : r.campos?.website}>
                <Texto
                  name="website"
                  placeholder="https://"
                  defaultValue={candidatura.website ?? ""}
                />
              </Campo>
              <Campo etiqueta="País" error={r.ok ? undefined : r.campos?.pais}>
                <Texto name="pais" defaultValue={candidatura.pais ?? ""} />
              </Campo>
            </div>

            <Campo
              etiqueta="En una frase"
              error={r.ok ? undefined : r.campos?.one_liner}
            >
              <AreaTexto
                name="one_liner"
                rows={2}
                defaultValue={candidatura.one_liner ?? ""}
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Persona de contacto: nombre"
                obligatorio
                error={r.ok ? undefined : r.campos?.contacto_nombre}
              >
                <Texto
                  name="contacto_nombre"
                  required
                  defaultValue={candidatura.contacto_nombre ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Sus apellidos"
                error={r.ok ? undefined : r.campos?.contacto_apellidos}
              >
                <Texto
                  name="contacto_apellidos"
                  defaultValue={candidatura.contacto_apellidos ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Su cargo"
                error={r.ok ? undefined : r.campos?.contacto_cargo}
              >
                <Texto
                  name="contacto_cargo"
                  defaultValue={candidatura.contacto_cargo ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Su correo"
                obligatorio
                error={r.ok ? undefined : r.campos?.contacto_email}
              >
                <Texto
                  name="contacto_email"
                  type="email"
                  required
                  defaultValue={candidatura.contacto_email ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Su teléfono"
                error={r.ok ? undefined : r.campos?.contacto_telefono}
              >
                <Texto
                  name="contacto_telefono"
                  defaultValue={candidatura.contacto_telefono ?? ""}
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Campo
                etiqueta="Dice estar en"
                error={r.ok ? undefined : r.campos?.estado_declarado}
              >
                <Seleccion
                  key={candidatura.estado_declarado ?? "sin-fijar"}
                  name="estado_declarado"
                  defaultValue={candidatura.estado_declarado ?? ""}
                >
                  <option value="">Sin decir</option>
                  {ESTADOS_ENTRADA.map((e) => (
                    <option key={e.codigo} value={e.codigo}>
                      {e.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo
                etiqueta="Cuántas personas"
                error={r.ok ? undefined : r.campos?.equipo_personas}
              >
                <Texto
                  name="equipo_personas"
                  inputMode="numeric"
                  defaultValue={candidatura.equipo_personas ?? ""}
                />
              </Campo>
              <Campo
                etiqueta="Liderazgo femenino (%)"
                error={r.ok ? undefined : r.campos?.liderazgo_femenino_pct}
              >
                <Texto
                  name="liderazgo_femenino_pct"
                  inputMode="decimal"
                  defaultValue={candidatura.liderazgo_femenino_pct ?? ""}
                />
              </Campo>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Cómo llegó" error={r.ok ? undefined : r.campos?.origen}>
                <Texto name="origen" defaultValue={candidatura.origen ?? ""} />
              </Campo>
              <Campo etiqueta="Notas" error={r.ok ? undefined : r.campos?.notas}>
                <Texto name="notas" defaultValue={candidatura.notas ?? ""} />
              </Campo>
            </div>

            <div className="flex gap-2">
              <Boton>Guardar</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm text-secundario"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/** La situación societaria de la candidatura, antes de firmar */
export function SituacionCandidatura({
  id,
  inicial,
}: {
  id: string;
  inicial?: Partial<DatosSocietarios>;
}) {
  return (
    <Formulario accion={guardarSituacionCandidatura} className="px-4 py-4">
      {(r) => (
        <>
          <input type="hidden" name="id" value={id} />
          <CamposSituacion inicial={inicial} errores={r.ok ? undefined : r.campos} />
          <div>
            <Boton variante="secundario">Guardar la situación</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
