"use client";

import { useState } from "react";
import {
  archivarPersona,
  asignarACompania,
  borrarPersona,
  cambiarRol,
  corregirCorreo,
  crearCohorte,
  crearCompania,
  editarPersona,
  fijarContrasena,
  guardarObjetivosTraccion,
  guardarPesosMadurez,
  crearPersona,
  guardarBandas,
  guardarObjetivo,
  guardarPesoArea,
  guardarPesoDimension,
  guardarTarifa,
  guardarUmbrales,
  quitarAsignacion,
} from "@/lib/acciones/admin";
import {
  AreaTexto,
  Boton,
  Campo,
  Desplegable,
  Formulario,
  Seleccion,
  Texto,
} from "@/components/ui/formulario";

const ETAPAS = [
  { valor: "pre_semilla", texto: "Pre-semilla" },
  { valor: "semilla", texto: "Semilla" },
  { valor: "serie_a", texto: "Serie A" },
];

const ESTADOS_ENTRADA = [
  { valor: "idea", texto: "Idea" },
  { valor: "prototipo", texto: "Prototipo" },
  { valor: "mvp", texto: "MVP" },
  { valor: "primeros_clientes", texto: "Primeros clientes" },
  { valor: "facturacion", texto: "Facturación" },
];

const PERFILES = [
  { valor: "software", texto: "Software" },
  { valor: "software_ia", texto: "Software con IA" },
  { valor: "hardware", texto: "Hardware" },
];

const ROLES = [
  { valor: "fundadora", texto: "Fundadora · solo su compañía" },
  { valor: "equipo_iwl", texto: "Equipo IWL · toda la cartera" },
  { valor: "admin_iwl", texto: "Dirección IWL · todo y la configuración" },
  { valor: "revisor_niage", texto: "Ingeniería Niage · compañías asignadas" },
  { valor: "mentor", texto: "Mentoría · compañías asignadas" },
  { valor: "lector_externo", texto: "Lectura externa" },
  { valor: "candidata", texto: "Candidata · se asigna desde el embudo" },
];

/*
 * El papel dentro de un proyecto, que no es el rol de la persona.
 *
 * La misma mentora coordina un proyecto y entra de apoyo en otro, y en cada
 * uno puede lo que su papel allí le deja. Por eso «mentoría» a secas ya no se
 * ofrece: no dice lo bastante.
 */
const PAPELES = [
  { valor: "fundadora", texto: "Equipo fundador" },
  { valor: "responsable_iwl", texto: "Responsable de IWL" },
  { valor: "revisor_niage", texto: "Revisora técnica de Niage" },
  { valor: "mentor_principal", texto: "Mentoría · coordina el proyecto" },
  { valor: "mentor_secundario", texto: "Mentoría · apoyo" },
];

const PERFILES_TARIFA = [
  "socio",
  "ingenieria",
  "senior",
  "especialista",
  "operacion",
  "mentor",
];

/**
 * Alta de compañía.
 *
 * Crear la fila es lo de menos: la función de la base instancia además el
 * checklist, las secciones del business plan y los KPI del núcleo. Sin eso, la
 * compañía nace sin nada en lo que trabajar.
 */
export function FormularioCompania({
  fases,
  cohortes,
  plantillas,
}: {
  fases: Array<{ code: string; name: string }>;
  cohortes: Array<{ id: string; name: string }>;
  plantillas: Array<{
    id: string;
    nombre: string;
    estadoEntrada: string;
    etapas: number;
    hitos: number;
  }>;
}) {
  return (
    <Desplegable titulo="Dar de alta una compañía">
      <Formulario accion={crearCompania}>
        {(resultado) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Nombre"
                error={!resultado.ok ? resultado.campos?.name : undefined}
              >
                <Texto
                  name="name"
                  required
                  placeholder="Marea Clínica"
                  error={!resultado.ok && Boolean(resultado.campos?.name)}
                />
              </Campo>

              <Campo
                etiqueta="Identificador"
                ayuda="Va en la dirección web. En minúsculas y con guiones"
                error={!resultado.ok ? resultado.campos?.slug : undefined}
              >
                <Texto
                  name="slug"
                  required
                  placeholder="marea-clinica"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  error={!resultado.ok && Boolean(resultado.campos?.slug)}
                />
              </Campo>

              <Campo etiqueta="Sector">
                <Texto name="sector" placeholder="Salud digital" />
              </Campo>

              <Campo
                etiqueta="Etapa"
                ayuda="Decide el nivel objetivo de cada dimensión técnica"
              >
                <Seleccion name="stage" required defaultValue="pre_semilla">
                  {ETAPAS.map((e) => (
                    <option key={e.valor} value={e.valor}>
                      {e.texto}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo
                etiqueta="Estado de entrada"
                ayuda="Qué tiene construido al entrar. Decide su hoja de ruta"
              >
                <Seleccion name="entry_state" required defaultValue="idea">
                  {ESTADOS_ENTRADA.map((e) => (
                    <option key={e.valor} value={e.valor}>
                      {e.texto}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo
                etiqueta="Perfil tecnológico"
                ayuda="Decide qué dimensiones «si aplica» se activan"
              >
                <Seleccion name="tech_profile" required defaultValue="software">
                  {PERFILES.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.texto}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo etiqueta="Fase del programa">
                <Seleccion name="phase_code" required defaultValue="fase_0">
                  {fases.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.name}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo etiqueta="Cohorte">
                <Seleccion name="cohort_id" defaultValue="">
                  <option value="">Sin cohorte</option>
                  {cohortes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo
                etiqueta="Liderazgo femenino"
                ayuda="Porcentaje en el equipo fundador"
                error={
                  !resultado.ok ? resultado.campos?.female_leadership_pct : undefined
                }
              >
                <Texto name="female_leadership_pct" inputMode="decimal" placeholder="75" />
              </Campo>
            </div>

            <Campo etiqueta="En una frase">
              <AreaTexto
                name="one_liner"
                rows={2}
                placeholder="Qué hace la compañía, para quién y con qué producto."
              />
            </Campo>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Constituida el">
                <Texto name="founded_on" type="date" />
              </Campo>
              <Campo etiqueta="Web">
                <Texto name="website" type="url" placeholder="https://" />
              </Campo>
            </div>

            <div className="grid gap-4 border-t border-filete pt-4 sm:grid-cols-2">
              <Campo
                etiqueta="Hoja de ruta"
                ayuda="Opcional. También se puede diseñar después, desde la ficha"
              >
                <Seleccion name="roadmap_template" defaultValue="">
                  <option value="">Diseñarla más tarde</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {p.etapas} etapas, {p.hitos} hitos
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo
                etiqueta="Arranque de la hoja de ruta"
                ayuda="Desde aquí se encadenan los plazos"
              >
                <Texto name="roadmap_start" type="date" />
              </Campo>
            </div>

            <div>
              <Boton>Dar de alta</Boton>
            </div>

            <p className="text-xs text-metadato">
              Al darla de alta se crean su checklist de due diligence, las nueve
              secciones del business plan y los KPI que le corresponden por
              perfil. La plantilla de hoja de ruta, si se elige, se copia: a
              partir de ahí las etapas son de este proyecto y editarlas no toca
              la plantilla.
            </p>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

export function FormularioCohorte() {
  return (
    <Desplegable titulo="Crear una cohorte">
      <Formulario accion={crearCohorte}>
        {(resultado) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Nombre"
                error={!resultado.ok ? resultado.campos?.name : undefined}
              >
                <Texto name="name" required placeholder="Cohorte 2027" />
              </Campo>
              <Campo
                etiqueta="Objetivo de invertibles"
                ayuda="Cuántas compañías se espera que lleguen"
              >
                <Texto name="investable_target" inputMode="numeric" placeholder="2" />
              </Campo>
              <Campo etiqueta="Empieza">
                <Texto name="start_date" type="date" />
              </Campo>
              <Campo etiqueta="Termina">
                <Texto name="end_date" type="date" />
              </Campo>
            </div>
            <div>
              <Boton>Crear cohorte</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * Alta de persona.
 *
 * El rol dice qué puede hacer en la plataforma; la asignación, en qué
 * compañías. Un revisor de Niage sin asignación no ve nada, que es lo
 * correcto: el rol da capacidad, no acceso.
 */
export function FormularioPersona({
  companias,
}: {
  companias: Array<{ id: string; name: string }>;
}) {
  const [conCompania, setConCompania] = useState(false);

  return (
    <Desplegable titulo="Dar de alta a una persona">
      <Formulario accion={crearPersona}>
        {(resultado) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Correo"
                error={!resultado.ok ? resultado.campos?.email : undefined}
              >
                <Texto
                  name="email"
                  type="email"
                  required
                  error={!resultado.ok && Boolean(resultado.campos?.email)}
                />
              </Campo>

              <Campo
                etiqueta="Nombre"
                error={!resultado.ok ? resultado.campos?.full_name : undefined}
              >
                <Texto
                  name="full_name"
                  required
                  error={!resultado.ok && Boolean(resultado.campos?.full_name)}
                />
              </Campo>

              <Campo etiqueta="Rol en la plataforma">
                <Seleccion name="role" required defaultValue="fundadora">
                  {ROLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.texto}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              <Campo etiqueta="Cargo" ayuda="En su organización, no en la plataforma">
                <Texto name="job_title" placeholder="Cofundadora y CEO" />
              </Campo>

              <Campo
                etiqueta="En qué entra"
                ayuda="Separadas por comas. Se usan al montar el equipo de un proyecto"
              >
                <Texto
                  name="expertise"
                  placeholder="Fondeo, Legal, Impacto social"
                />
              </Campo>

              <Campo
                etiqueta="Contraseña"
                ayuda="Si la dejas en blanco se genera una y se enseña al guardar"
                error={!resultado.ok ? resultado.campos?.password : undefined}
              >
                <Texto
                  name="password"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Se genera sola"
                  className="font-mono"
                />
              </Campo>

              <Campo etiqueta="Compañía" ayuda="Opcional: se puede asignar después">
                <Seleccion
                  name="company_id"
                  defaultValue=""
                  onChange={(e) => setConCompania(e.target.value !== "")}
                >
                  <option value="">Sin asignar</option>
                  {companias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Seleccion>
              </Campo>

              {conCompania ? (
                <Campo
                  etiqueta="Papel en esa compañía"
                  error={!resultado.ok ? resultado.campos?.member_role : undefined}
                >
                  <Seleccion name="member_role" defaultValue="fundadora">
                    {PAPELES.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.texto}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
              ) : null}
            </div>

            <div>
              <Boton>Dar de alta</Boton>
            </div>

            <p className="text-xs text-metadato">
              No se envía nada automáticamente. La persona entra pidiendo su
              enlace en la pantalla de entrada.
            </p>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

export function CambiarRol({
  profileId,
  rol,
  activa,
}: {
  profileId: string;
  rol: string;
  activa: boolean;
}) {
  return (
    <Formulario accion={cambiarRol} className="gap-0">
      {(resultado) => (
        <>
          <input type="hidden" name="profile_id" value={profileId} />
          <input type="hidden" name="is_active" value={activa ? "on" : "off"} />
          <Seleccion
            key={rol}
            name="role"
            defaultValue={rol}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="py-1 text-xs"
            error={!resultado.ok}
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.texto}
              </option>
            ))}
          </Seleccion>
        </>
      )}
    </Formulario>
  );
}

/**
 * Asignar una persona a un proyecto.
 *
 * Con su papel allí y, si es mentoría, las horas acordadas y con qué tarifa
 * se valoran. Sin las horas acordadas no hay contra qué medir su dedicación,
 * y la aportación del programa se acaba sabiendo solo a posteriori.
 */
export function Asignar({
  profileId,
  companias,
}: {
  profileId: string;
  companias: Array<{ id: string; name: string }>;
}) {
  const [papel, setPapel] = useState("fundadora");
  const esMentoria = papel.startsWith("mentor");

  return (
    <Formulario accion={asignarACompania} className="gap-2">
      {(resultado) => (
        <>
          <input type="hidden" name="profile_id" value={profileId} />

          <div className="flex flex-wrap items-end gap-2">
            <Campo etiqueta="Compañía">
              <Seleccion
                name="company_id"
                required
                defaultValue=""
                className="py-1 text-xs"
              >
                <option value="" disabled>
                  Elige una
                </option>
                {companias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Seleccion>
            </Campo>

            <Campo etiqueta="Papel">
              <Seleccion
                name="member_role"
                required
                value={papel}
                onChange={(e) => setPapel(e.currentTarget.value)}
                className="py-1 text-xs"
              >
                {PAPELES.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.texto}
                  </option>
                ))}
              </Seleccion>
            </Campo>

            {esMentoria ? (
              <>
                <Campo etiqueta="Horas">
                  <Texto
                    name="assigned_hours"
                    type="number"
                    min="0"
                    step="5"
                    placeholder="120"
                    className="w-24 py-1 text-xs"
                  />
                </Campo>
                <Campo etiqueta="Tarifa">
                  <Seleccion
                    name="rate_profile"
                    defaultValue="especialista"
                    className="py-1 text-xs"
                  >
                    {PERFILES_TARIFA.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
              </>
            ) : null}

            <Boton variante="secundario">Asignar</Boton>
          </div>

          {esMentoria ? (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <Campo etiqueta="Desde" error={!resultado.ok ? resultado.campos?.starts_on : undefined}>
                  <Texto name="starts_on" type="date" className="py-1 text-xs" />
                </Campo>
                <Campo etiqueta="Hasta" error={!resultado.ok ? resultado.campos?.ends_on : undefined}>
                  <Texto name="ends_on" type="date" className="py-1 text-xs" />
                </Campo>
                <Campo etiqueta="En qué entra">
                  <Texto
                    name="title"
                    placeholder="Estrategia comercial"
                    className="py-1 text-xs"
                  />
                </Campo>
              </div>
              <p className="text-xs text-metadato">
                {papel === "mentor_principal"
                  ? "Quien coordina responde del avance del proyecto: puntúa el due diligence, confirma hitos y mueve el plan. Solo en este proyecto."
                  : "El apoyo ve el proyecto entero, imputa sus horas y cierra sus tareas. No puntúa ni confirma hitos."}
              </p>
            </>
          ) : null}
        </>
      )}
    </Formulario>
  );
}

export function QuitarAsignacion({
  profileId,
  companyId,
  memberRole,
}: {
  profileId: string;
  companyId: string;
  memberRole: string;
}) {
  return (
    <Formulario accion={quitarAsignacion} className="gap-0">
      {() => (
        <>
          <input type="hidden" name="profile_id" value={profileId} />
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="member_role" value={memberRole} />
          <button
            type="submit"
            className="accion accion-riesgo text-xs text-metadato"
          >
            quitar
          </button>
        </>
      )}
    </Formulario>
  );
}

/** Una celda editable que se guarda al perder el foco */
export function CeldaNumero({
  accion,
  id,
  campo,
  valor,
  paso = "1",
  min = "0",
  max,
  ancho = "w-16",
}: {
  accion: (formData: FormData) => Promise<import("@/lib/acciones/resultado").Resultado>;
  id: string;
  campo: string;
  valor: number;
  paso?: string;
  min?: string;
  max?: string;
  ancho?: string;
}) {
  return (
    <Formulario accion={accion} className="gap-0">
      {(resultado) => (
        <>
          <input type="hidden" name="id" value={id} />
          <Texto
            key={valor}
            name={campo}
            type="number"
            step={paso}
            min={min}
            max={max}
            defaultValue={valor}
            onBlur={(e) => {
              if (Number(e.currentTarget.value) !== valor) {
                e.currentTarget.form?.requestSubmit();
              }
            }}
            className={`${ancho} py-1 text-xs`}
            error={!resultado.ok}
          />
        </>
      )}
    </Formulario>
  );
}

export const guardarObjetivoAccion = guardarObjetivo;
export const guardarPesoDimensionAccion = guardarPesoDimension;
export const guardarPesoAreaAccion = guardarPesoArea;

export function FormularioUmbrales({
  tecnico,
  preparacion,
  runway,
}: {
  tecnico: number;
  preparacion: number;
  runway: number;
}) {
  return (
    <Formulario accion={guardarUmbrales} className="px-4 py-4">
      {(resultado) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              etiqueta="Score técnico mínimo"
              error={
                !resultado.ok ? resultado.campos?.score_tecnico_minimo : undefined
              }
            >
              <Texto
                name="score_tecnico_minimo"
                type="number"
                min="0"
                max="100"
                defaultValue={tecnico}
                required
              />
            </Campo>
            <Campo etiqueta="Preparación mínima">
              <Texto
                name="score_preparacion_minimo"
                type="number"
                min="0"
                max="100"
                defaultValue={preparacion}
                required
              />
            </Campo>
            <Campo etiqueta="Runway mínimo" ayuda="En meses">
              <Texto
                name="runway_minimo_meses"
                type="number"
                min="0"
                max="60"
                defaultValue={runway}
                required
              />
            </Campo>
          </div>
          <div>
            <Boton>Guardar umbrales</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

export function FormularioBandas({
  cortes,
}: {
  cortes: { inicio: number; desarrollo: number; consolidada: number };
}) {
  return (
    <Formulario accion={guardarBandas} className="px-4 py-4">
      {(resultado) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Inicio hasta">
              <Texto
                name="inicio_hasta"
                type="number"
                min="0"
                max="100"
                defaultValue={cortes.inicio}
                required
              />
            </Campo>
            <Campo etiqueta="En desarrollo hasta">
              <Texto
                name="desarrollo_hasta"
                type="number"
                min="0"
                max="100"
                defaultValue={cortes.desarrollo}
                required
              />
            </Campo>
            <Campo etiqueta="Consolidada hasta">
              <Texto
                name="consolidada_hasta"
                type="number"
                min="0"
                max="100"
                defaultValue={cortes.consolidada}
                required
              />
            </Campo>
          </div>
          {!resultado.ok ? null : null}
          <div>
            <Boton>Guardar bandas</Boton>
          </div>
          <p className="text-xs text-metadato">
            De ahí arriba, «preparada». Estar en la banda alta no es lo mismo
            que ser invertible.
          </p>
        </>
      )}
    </Formulario>
  );
}

export function FilaTarifa({
  id,
  aplicada,
  mercado,
}: {
  id: string;
  aplicada: number;
  mercado: number;
}) {
  return (
    <Formulario accion={guardarTarifa} className="gap-0">
      {(resultado) => (
        <>
          <input type="hidden" name="id" value={id} />
          <div className="flex items-center gap-2">
            <Texto
              key={`a-${aplicada}`}
              name="applied_rate"
              type="number"
              step="5"
              min="0"
              defaultValue={aplicada}
              className="w-20 py-1 text-xs"
              error={!resultado.ok}
            />
            <span className="text-xs text-metadato">aplicada</span>
            <Texto
              key={`m-${mercado}`}
              name="market_rate"
              type="number"
              step="5"
              min="0"
              defaultValue={mercado}
              className="w-20 py-1 text-xs"
              error={!resultado.ok}
            />
            <span className="text-xs text-metadato">mercado</span>
            <Boton variante="secundario" className="py-1 text-xs">
              Guardar
            </Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

const EJES_MADUREZ = [
  { campo: "tecnologia", nombre: "Tecnología", ayuda: "El score técnico" },
  { campo: "gobierno", nombre: "Gobierno", ayuda: "El score de preparación" },
  { campo: "plan", nombre: "Plan", ayuda: "Hitos ya exigibles cumplidos" },
  { campo: "traccion", nombre: "Tracción", ayuda: "Ingreso frente al objetivo" },
  { campo: "solidez", nombre: "Solidez", ayuda: "Runway frente al mínimo" },
] as const;

/**
 * Pesos de los ejes de madurez.
 *
 * No hace falta que sumen cien: el índice se reparte sobre el peso de los
 * ejes que tienen datos, así que lo que cuenta es la proporción. Un eje a
 * cero queda fuera del cálculo sin desaparecer de la pantalla.
 */
export function FormularioPesosMadurez({
  pesos,
}: {
  pesos: Record<string, number>;
}) {
  const total = EJES_MADUREZ.reduce((t, e) => t + (pesos[e.campo] ?? 0), 0);

  return (
    <Formulario accion={guardarPesosMadurez} className="px-4 py-4">
      {() => (
        <>
          <div className="grid gap-4 sm:grid-cols-5">
            {EJES_MADUREZ.map((e) => (
              <Campo key={e.campo} etiqueta={e.nombre} ayuda={e.ayuda}>
                <Texto
                  name={e.campo}
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={pesos[e.campo] ?? 0}
                  required
                />
              </Campo>
            ))}
          </div>
          <p className="text-xs text-metadato">
            Suman {total}. No tienen por qué sumar cien: cuenta la proporción
            entre ellos, porque el índice se reparte solo sobre los ejes que
            tienen datos. Un eje que no se mide no resta.
          </p>
          <div>
            <Boton>Guardar pesos</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** Ingreso recurrente esperado en cada etapa: la referencia del eje de tracción */
export function FormularioObjetivosTraccion({
  objetivos,
}: {
  objetivos: Record<string, number>;
}) {
  return (
    <Formulario accion={guardarObjetivosTraccion} className="px-4 py-4">
      {() => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {ETAPAS.map((e) => (
              <Campo key={e.valor} etiqueta={e.texto} ayuda="MRR esperado, en euros">
                <Texto
                  name={e.valor}
                  type="number"
                  min="0"
                  step="500"
                  defaultValue={objetivos[e.valor] ?? 0}
                  required
                />
              </Campo>
            ))}
          </div>
          <div>
            <Boton>Guardar objetivos</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** Editar el nombre y el rol de una persona. El correo es su identidad y no se toca */
export function EditarPersona({
  persona,
}: {
  persona: {
    id: string;
    full_name: string | null;
    role: string;
    job_title: string | null;
    expertise: string[] | null;
    bio: string | null;
  };
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs text-secundario"
      >
        Editar
      </button>
    );
  }

  return (
    <div className="mt-2 w-full border-t border-filete pt-3">
      <Formulario accion={editarPersona} onOk={() => setAbierto(false)}>
        {(resultado) => (
          <>
            <input type="hidden" name="id" value={persona.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Nombre"
                error={!resultado.ok ? resultado.campos?.full_name : undefined}
              >
                <Texto name="full_name" defaultValue={persona.full_name ?? ""} required />
              </Campo>
              <Campo
                etiqueta="Rol"
                ayuda="Qué puede hacer en general. Dónde lo hace lo dicen sus asignaciones"
              >
                <Seleccion key={persona.role} name="role" defaultValue={persona.role}>
                  {ROLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.texto}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo etiqueta="Cargo">
                <Texto name="job_title" defaultValue={persona.job_title ?? ""} />
              </Campo>
              <Campo etiqueta="En qué entra" ayuda="Separadas por comas">
                <Texto
                  name="expertise"
                  defaultValue={(persona.expertise ?? []).join(", ")}
                />
              </Campo>
            </div>

            <Campo etiqueta="Nota">
              <AreaTexto name="bio" rows={2} defaultValue={persona.bio ?? ""} />
            </Campo>

            <div className="flex gap-2">
              <Boton>Guardar</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/** Archivar o reactivar. Una persona archivada no entra, pero su trabajo sigue */
export function ArchivarPersona({
  id,
  activa,
}: {
  id: string;
  activa: boolean;
}) {
  return (
    <Formulario accion={archivarPersona} className="gap-0">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="activa" value={activa ? "no" : "si"} />
          <button
            type="submit"
            className="accion text-xs text-secundario"
          >
            {activa ? "Archivar" : "Reactivar"}
          </button>
        </>
      )}
    </Formulario>
  );
}

/**
 * Borrado real de una persona.
 *
 * Solo si no ha dejado rastro. Cuando lo tiene se explica por qué no se
 * puede: un botón deshabilitado sin motivo se lee como un fallo.
 */
export function BorrarPersona({
  persona,
}: {
  persona: { id: string; email: string; tiene_actividad: boolean };
}) {
  const [abierto, setAbierto] = useState(false);

  if (persona.tiene_actividad) {
    return (
      <span className="text-xs text-metadato">
        No se puede borrar: tiene trabajo a su nombre
      </span>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion accion-riesgo text-xs text-metadato"
      >
        Borrar
      </button>
    );
  }

  return (
    <div className="mt-2 w-full border-t border-mal/40 pt-3">
      <Formulario accion={borrarPersona} onOk={() => setAbierto(false)}>
        {(resultado) => (
          <>
            <input type="hidden" name="id" value={persona.id} />
            <input type="hidden" name="email" value={persona.email} />

            <p className="text-xs text-mal">
              Borra su cuenta y no tiene vuelta atrás. Solo se ofrece porque no
              ha dejado nada registrado.
            </p>

            <Campo
              etiqueta={`Escribe «${persona.email}» para confirmar`}
              error={!resultado.ok ? resultado.campos?.confirmacion : undefined}
            >
              <Texto name="confirmacion" autoComplete="off" required />
            </Campo>

            <div className="flex gap-2">
              <Boton>Borrar definitivamente</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/**
 * Corregir el correo de alguien que no ha entrado nunca.
 *
 * Solo aparece hasta el primer acceso. Después el correo es su identidad y
 * cambiarlo la dejaría fuera, así que en su lugar se explica qué hacer: dar
 * de alta el nuevo y archivar este.
 */
export function CorregirCorreo({
  id,
  email,
  editable,
}: {
  id: string;
  email: string;
  editable: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!editable) {
    return (
      <span className="text-xs text-metadato">
        El correo ya no se cambia: ha entrado con él
      </span>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs text-secundario"
      >
        Corregir el correo
      </button>
    );
  }

  return (
    <div className="mt-2 w-full border-t border-filete pt-3">
      <Formulario accion={corregirCorreo} onOk={() => setAbierto(false)}>
        {(resultado) => (
          <>
            <input type="hidden" name="id" value={id} />

            <Campo
              etiqueta="Correo"
              ayuda="Se puede cambiar porque esta persona todavía no ha entrado"
              error={!resultado.ok ? resultado.campos?.email : undefined}
            >
              <Texto name="email" type="email" defaultValue={email} required />
            </Campo>

            <div className="flex gap-2">
              <Boton>Corregir</Boton>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-filete bg-elevado px-3 py-2 text-sm text-secundario"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/**
 * Poner o cambiar la contraseña de alguien.
 *
 * Se enseña mientras se escribe, porque hay que copiarla para pasarla: una
 * contraseña que la dirección acaba de poner y no puede leer no sirve de
 * nada. Y hay un generador, porque quien da de alta a siete personas
 * seguidas se inventa siete variantes de la misma.
 */
export function Contrasena({
  id,
  email,
}: {
  id: string;
  email: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState("");

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="accion text-xs text-secundario"
      >
        Poner contraseña
      </button>
    );
  }

  return (
    <div className="mt-2 w-full border-t border-filete pt-3">
      <Formulario
        accion={fijarContrasena}
        onOk={() => {
          setAbierto(false);
          setClave("");
        }}
      >
        {(resultado) => (
          <>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="email" value={email} />

            <Campo
              etiqueta="Contraseña"
              ayuda="Al menos 12 caracteres. Cópiala antes de guardar: no se vuelve a enseñar"
              error={!resultado.ok ? resultado.campos?.password : undefined}
            >
              <div className="flex gap-2">
                <Texto
                  name="password"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  minLength={12}
                  required
                  value={clave}
                  onChange={(e) => setClave(e.currentTarget.value)}
                  className="flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setClave(claveSugerida())}
                  className="rounded-full border border-filete bg-elevado px-3 py-2 text-xs text-secundario transition-colors hover:border-filete-fuerte hover:text-titular"
                >
                  Generar
                </button>
              </div>
            </Campo>

            <div className="flex gap-2">
              <Boton>Guardar contraseña</Boton>
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  setClave("");
                }}
                className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm text-secundario"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/** Tres palabras y un número: se dicta por teléfono sin deletrear */
function claveSugerida(): string {
  const palabras = [
    "faro", "duna", "brisa", "roble", "cauce", "sierra", "ambar", "junco",
    "vela", "musgo", "risco", "trigo", "nieve", "cala", "olmo", "surco",
    "greda", "helio", "lirio", "marea", "nardo", "prisma", "sauce", "vega",
  ];
  const azar = (n: number) => {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    return b[0] % n;
  };
  const tres = Array.from({ length: 3 }, () => palabras[azar(palabras.length)]);
  return `${tres.join("-")}-${10 + azar(90)}`;
}
