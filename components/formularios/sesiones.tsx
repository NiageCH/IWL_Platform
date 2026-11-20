"use client";

import { useState } from "react";
import {
  acuerdoAHito,
  acuerdoATarea,
  anularSesion,
  comentarSesion,
  confirmarSesion,
  corregirHorasSesion,
  decidirSesion,
  editarActaSesion,
  llevarSesionADireccion,
  mantenerHorasSesion,
  noCuadraSesion,
  registrarSesion,
} from "@/lib/acciones/sesiones";
import type { Resultado } from "@/lib/acciones/resultado";
import { AreaTexto, Boton, Campo, Formulario, Seleccion, Texto } from "@/components/ui/formulario";

/**
 * Los formularios de una sesión (REVISION, 13 nov).
 *
 * Quién ve cada uno lo decide la pantalla con los permisos; quién puede de
 * verdad, la base. Ninguno guarda nada por su cuenta: todos llaman a las
 * funciones del circuito en `lib/acciones/sesiones.ts`. Al acabar, el acuse
 * es la sesión cambiada —su estado y su historia—, así que se cierran solos.
 */

type Accion = (formData: FormData) => Promise<Resultado>;

interface Persona {
  id: string;
  nombre: string;
  perfil: string | null;
}

export function RegistrarSesion({
  slug,
  companyId,
  materias,
  pilares,
  perfiles,
  personas,
  yo,
  soloYo,
}: {
  slug: string;
  companyId: string;
  materias: Array<{ id: string; nombre: string }>;
  pilares: Array<{ id: string; nombre: string }>;
  perfiles: Array<{ codigo: string; nombre: string }>;
  personas: Persona[];
  yo: string;
  /** Quien no coordina solo imputa sus propias horas: la base no le deja otras */
  soloYo: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"sesion" | "trabajo">("sesion");
  const [filas, setFilas] = useState(1);
  const [acuerdos, setAcuerdos] = useState(1);
  const hoy = new Date().toISOString().slice(0, 10);
  const elegibles = soloYo ? personas.filter((p) => p.id === yo) : personas;
  const mio = personas.find((p) => p.id === yo);

  if (!abierto) {
    return (
      <div className="border-t border-filete px-4 py-3">
        <button type="button" onClick={() => setAbierto(true)} className="boton-marca px-4 py-1.5 text-xs">
          Registrar una sesión o un trabajo
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-filete px-4 py-4">
      <Formulario accion={registrarSesion} onOk={() => setAbierto(false)} className="gap-4">
        {(r) => {
          const e = (c: string) => (r.ok ? undefined : r.campos?.[c]);
          return (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="company_id" value={companyId} />
              <input type="hidden" name="kind" value={tipo} />

              <fieldset className="flex flex-wrap gap-4 text-sm">
                <legend className="mb-1 text-xs text-metadato">Qué registras</legend>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={tipo === "sesion"} onChange={() => setTipo("sesion")} />
                  Una sesión con ella
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={tipo === "trabajo"} onChange={() => setTipo("trabajo")} />
                  Trabajo fuera de sesión
                </label>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-3">
                <Campo etiqueta="Fecha" error={e("held_on")}>
                  <Texto type="date" name="held_on" defaultValue={hoy} max={hoy} required />
                </Campo>
                {tipo === "sesion" ? (
                  <>
                    <Campo etiqueta="Duración, en minutos" error={e("duration_minutes")}>
                      <Texto name="duration_minutes" inputMode="numeric" placeholder="60" />
                    </Campo>
                    <Campo etiqueta="Modalidad" error={e("modality")}>
                      <Seleccion name="modality" defaultValue="">
                        <option value="" disabled>
                          Elige una
                        </option>
                        <option value="videollamada">Videollamada</option>
                        <option value="presencial">Presencial</option>
                        <option value="telefono">Teléfono</option>
                      </Seleccion>
                    </Campo>
                  </>
                ) : null}
              </div>

              <Campo etiqueta="De qué fue, en una línea" error={e("title")}>
                <Texto name="title" required placeholder="Revisión del modelo de precios" />
              </Campo>

              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Materia" error={e("subject_id")}>
                  <Seleccion name="subject_id" required defaultValue="">
                    <option value="" disabled>
                      Elige una
                    </option>
                    {materias.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
                <Campo etiqueta="Pilar" ayuda="Opcional.">
                  <Seleccion name="pillar_id" defaultValue="">
                    <option value="">Ninguno</option>
                    {pilares.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </Seleccion>
                </Campo>
              </div>

              {tipo === "sesion" ? (
                <Campo etiqueta="Quién estuvo de su lado" ayuda="Opcional. De IWL, las personas con horas.">
                  <Texto name="attendees_company" placeholder="Alba y su CTO" />
                </Campo>
              ) : (
                <Campo etiqueta="Enlace al entregable" error={e("deliverable_url")} ayuda="Sin entregable no se imputa. Los ficheros se adjuntan después, en la sesión.">
                  <Texto name="deliverable_url" type="url" placeholder="https://…" />
                </Campo>
              )}

              <Campo etiqueta={tipo === "sesion" ? "Acta: qué se trabajó" : "Qué se hizo"} error={e("worked")}>
                <AreaTexto name="worked" rows={4} required minLength={10} />
              </Campo>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs text-metadato">Horas de cada persona de IWL</legend>
                {Array.from({ length: filas }, (_, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_6rem]">
                    <Seleccion name="hora_persona" aria-label={`Persona ${i + 1}`} defaultValue={i === 0 && mio ? mio.id : ""}>
                      <option value="">Elige a quién</option>
                      {elegibles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </Seleccion>
                    <Seleccion name="hora_perfil" aria-label={`Perfil ${i + 1}`} defaultValue={(i === 0 ? mio?.perfil : null) ?? "senior"}>
                      {perfiles.map((p) => (
                        <option key={p.codigo} value={p.codigo}>
                          {p.nombre}
                        </option>
                      ))}
                    </Seleccion>
                    <Texto name="hora_cantidad" aria-label={`Horas ${i + 1}`} inputMode="decimal" placeholder="1,5" />
                  </div>
                ))}
                {e("horas") ? <p className="text-xs text-mal">{e("horas")}</p> : null}
                {!soloYo ? (
                  <button type="button" onClick={() => setFilas(filas + 1)} className="accion self-start text-xs">
                    Añadir otra persona
                  </button>
                ) : null}
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs text-metadato">Acuerdos (opcional): qué, quién y para cuándo</legend>
                {Array.from({ length: acuerdos }, (_, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[3fr_1.5fr_10rem]">
                    <Texto name="acuerdo_texto" aria-label={`Acuerdo ${i + 1}`} placeholder="Preparar tres escenarios de precio" />
                    <Texto name="acuerdo_responsable" aria-label={`Responsable ${i + 1}`} placeholder="Responsable" />
                    <Texto name="acuerdo_fecha" type="date" aria-label={`Fecha ${i + 1}`} />
                  </div>
                ))}
                <button type="button" onClick={() => setAcuerdos(acuerdos + 1)} className="accion self-start text-xs">
                  Añadir otro acuerdo
                </button>
              </fieldset>

              <p className="text-xs text-secundario">
                Al registrarla le llega a ella un aviso para que confirme las horas. Si en 7 días no responde, se
                confirman solas.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Boton>Registrar</Boton>
                <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
                  Cancelar
                </button>
              </div>
            </>
          );
        }}
      </Formulario>
    </div>
  );
}

/** Un paso con texto: un botón que abre el campo, y el envío */
function ConTexto({
  slug,
  id,
  accion,
  boton,
  etiqueta,
  enviar,
  obligatorio = true,
  principal = false,
}: {
  slug: string;
  id: string;
  accion: Accion;
  boton: string;
  etiqueta: string;
  enviar: string;
  obligatorio?: boolean;
  principal?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={principal ? "boton-marca px-4 py-1.5 text-xs" : "accion text-xs"}
      >
        {boton}
      </button>
    );
  }
  return (
    <Formulario accion={accion} onOk={() => setAbierto(false)} className="w-full rounded-md border border-filete bg-hundido p-3">
      {(r) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Campo etiqueta={etiqueta} error={r.ok ? undefined : r.campos?.texto}>
            <AreaTexto name="texto" rows={2} required={obligatorio} />
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <Boton>{enviar}</Boton>
            <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
              Cancelar
            </button>
          </div>
        </>
      )}
    </Formulario>
  );
}

export interface PapelEnSesion {
  /** Fundadora de esta compañía */
  ella: boolean;
  /** Quien la registró, o quien coordina */
  registra: boolean;
  esAdmin: boolean;
  /** Puede escribir en el hilo: ella o quien acompaña */
  habla: boolean;
}

/** Lo que se puede cambiar del acta, tal como está */
export interface ActaEditable {
  tipo: "sesion" | "trabajo";
  fecha: string;
  duracionMin: number | null;
  modalidad: string | null;
  asistentes: string | null;
  titulo: string;
  materiaId: string | null;
  pilarId: string | null;
  trabajado: string | null;
  entregable: string | null;
}

export function AccionesSesion({
  slug,
  id,
  estado,
  lineas,
  papel,
  acta,
  materias = [],
  pilares = [],
}: {
  slug: string;
  id: string;
  estado: string;
  lineas: Array<{ id: string; persona: string; horas: number }>;
  papel: PapelEnSesion;
  acta?: ActaEditable;
  materias?: Array<{ id: string; nombre: string }>;
  pilares?: Array<{ id: string; nombre: string }>;
}) {
  const abierta = ["por_confirmar", "en_discusion", "en_direccion"].includes(estado);
  const puedeAnular =
    estado !== "anulada" &&
    (["por_confirmar", "en_discusion"].includes(estado) ? papel.registra : papel.esAdmin);
  return (
    <div className="flex flex-wrap items-start gap-3">
      {papel.ella && estado === "por_confirmar" ? (
        <>
          <ConTexto
            slug={slug}
            id={id}
            accion={confirmarSesion}
            boton="Confirmar"
            etiqueta="Comentario (opcional)"
            enviar="Confirmar las horas"
            obligatorio={false}
            principal
          />
          <ConTexto
            slug={slug}
            id={id}
            accion={noCuadraSesion}
            boton="No cuadra"
            etiqueta="Qué no cuadra"
            enviar="Enviar"
          />
        </>
      ) : null}

      {papel.registra && ["por_confirmar", "en_discusion"].includes(estado) ? <CorregirHoras slug={slug} id={id} lineas={lineas} /> : null}
      {papel.registra && acta && materias.length && !["en_direccion", "anulada"].includes(estado) ? (
        <EditarActa
          slug={slug}
          id={id}
          acta={acta}
          confirmada={!["por_confirmar", "en_discusion"].includes(estado)}
          lineas={lineas}
          materias={materias}
          pilares={pilares}
        />
      ) : null}
      {papel.registra && estado === "en_discusion" ? (
        <ConTexto
          slug={slug}
          id={id}
          accion={mantenerHorasSesion}
          boton="Mantener las horas"
          etiqueta="Por qué se mantienen"
          enviar="Mantener y pedirle que confirme"
        />
      ) : null}
      {(papel.ella || papel.registra) && estado === "en_discusion" ? (
        <ConTexto
          slug={slug}
          id={id}
          accion={llevarSesionADireccion}
          boton="Llevar a dirección"
          etiqueta="Por qué no os ponéis de acuerdo"
          enviar="Llevar a dirección"
        />
      ) : null}
      {papel.esAdmin && estado === "en_direccion" ? <DecidirSesion slug={slug} id={id} lineas={lineas} /> : null}
      {papel.habla && abierta ? (
        <ConTexto slug={slug} id={id} accion={comentarSesion} boton="Responder" etiqueta="Tu mensaje" enviar="Enviar" />
      ) : null}
      {puedeAnular ? (
        <ConTexto slug={slug} id={id} accion={anularSesion} boton="Anular" etiqueta="Por qué se anula" enviar="Anular la sesión" />
      ) : null}
    </div>
  );
}

function CorregirHoras({ slug, id, lineas }: { slug: string; id: string; lineas: Array<{ id: string; persona: string; horas: number }> }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="accion text-xs">
        Corregir las horas
      </button>
    );
  }
  return (
    <Formulario accion={corregirHorasSesion} onOk={() => setAbierto(false)} className="w-full rounded-md border border-filete bg-hundido p-3">
      {(r) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Campo etiqueta="De quién">
              <Seleccion name="linea" defaultValue={lineas[0]?.id}>
                {lineas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.persona} · {String(l.horas).replace(".", ",")} h
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Horas, corregidas" error={r.ok ? undefined : r.campos?.horas}>
              <Texto name="horas" inputMode="decimal" required />
            </Campo>
          </div>
          <Campo etiqueta="Por qué cambian" error={r.ok ? undefined : r.campos?.texto}>
            <AreaTexto name="texto" rows={2} required />
          </Campo>
          <p className="text-xs text-secundario">Queda la cifra de antes y el motivo, y le pedimos que vuelva a confirmar.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Boton>Corregir</Boton>
            <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
              Cancelar
            </button>
          </div>
        </>
      )}
    </Formulario>
  );
}

/**
 * Editar el acta (REVISION, 20 nov). Abierta, cada guardado deja versión.
 * Confirmada, queda fija: corregirla pide motivo y, si cambian las horas,
 * vuelve a ella para que confirme.
 */
function EditarActa({
  slug,
  id,
  acta,
  confirmada,
  lineas,
  materias,
  pilares,
}: {
  slug: string;
  id: string;
  acta: ActaEditable;
  confirmada: boolean;
  lineas: Array<{ id: string; persona: string; horas: number }>;
  materias: Array<{ id: string; nombre: string }>;
  pilares: Array<{ id: string; nombre: string }>;
}) {
  const [abierto, setAbierto] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="accion text-xs">
        {confirmada ? "Corregir el acta" : "Editar el acta"}
      </button>
    );
  }
  return (
    <Formulario accion={editarActaSesion} onOk={() => setAbierto(false)} className="w-full gap-3 rounded-md border border-filete bg-hundido p-3">
      {(r) => {
        const e = (c: string) => (r.ok ? undefined : r.campos?.[c]);
        return (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="kind" value={acta.tipo} />
            <input type="hidden" name="confirmada" value={confirmada ? "si" : "no"} />
            <p className="text-xs text-secundario">
              {confirmada
                ? "Está confirmada: el cambio queda como versión nueva, con su motivo. Si cambias las horas, vuelve a ella para que confirme."
                : "Cada guardado queda como versión en la historia: quién, cuándo y qué cambió."}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Fecha" error={e("held_on")}>
                <Texto type="date" name="held_on" defaultValue={acta.fecha} max={hoy} required />
              </Campo>
              {acta.tipo === "sesion" ? (
                <>
                  <Campo etiqueta="Duración, en minutos" error={e("duration_minutes")}>
                    <Texto name="duration_minutes" inputMode="numeric" defaultValue={acta.duracionMin ? String(acta.duracionMin) : ""} />
                  </Campo>
                  <Campo etiqueta="Modalidad" error={e("modality")}>
                    <Seleccion name="modality" defaultValue={acta.modalidad ?? ""}>
                      <option value="">Sin decir</option>
                      <option value="videollamada">Videollamada</option>
                      <option value="presencial">Presencial</option>
                      <option value="telefono">Teléfono</option>
                    </Seleccion>
                  </Campo>
                </>
              ) : null}
            </div>
            <Campo etiqueta="De qué fue, en una línea" error={e("title")}>
              <Texto name="title" defaultValue={acta.titulo} required />
            </Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Materia" error={e("subject_id")}>
                <Seleccion name="subject_id" defaultValue={acta.materiaId ?? ""} required>
                  <option value="" disabled>
                    Elige una
                  </option>
                  {materias.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
              <Campo etiqueta="Pilar" ayuda="Opcional.">
                <Seleccion name="pillar_id" defaultValue={acta.pilarId ?? ""}>
                  <option value="">Ninguno</option>
                  {pilares.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>
            {acta.tipo === "sesion" ? (
              <Campo etiqueta="Quién estuvo de su lado" ayuda="Opcional.">
                <Texto name="attendees_company" defaultValue={acta.asistentes ?? ""} />
              </Campo>
            ) : null}
            <Campo etiqueta={acta.tipo === "sesion" ? "Acta: qué se trabajó" : "Qué se hizo"} error={e("worked")}>
              <AreaTexto name="worked" rows={4} defaultValue={acta.trabajado ?? ""} required />
            </Campo>
            <Campo etiqueta="Entregable, enlace" ayuda={acta.tipo === "trabajo" ? undefined : "Opcional."} error={e("deliverable_url")}>
              <Texto name="deliverable_url" type="url" defaultValue={acta.entregable ?? ""} />
            </Campo>
            {confirmada
              ? lineas.map((l) => (
                  <div key={l.id}>
                    <input type="hidden" name="linea" value={l.id} />
                    <Campo etiqueta={`Horas de ${l.persona}`}>
                      <Texto name="linea_horas" inputMode="decimal" defaultValue={String(l.horas).replace(".", ",")} required />
                    </Campo>
                  </div>
                ))
              : null}
            {confirmada ? (
              <Campo etiqueta="Por qué cambia el acta" error={e("texto")}>
                <AreaTexto name="texto" rows={2} required />
              </Campo>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Boton>{confirmada ? "Guardar la corrección" : "Guardar el acta"}</Boton>
              <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
                Cancelar
              </button>
            </div>
          </>
        );
      }}
    </Formulario>
  );
}

function DecidirSesion({ slug, id, lineas }: { slug: string; id: string; lineas: Array<{ id: string; persona: string; horas: number }> }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="boton-marca px-4 py-1.5 text-xs">
        Decidir y cerrar
      </button>
    );
  }
  return (
    <Formulario accion={decidirSesion} onOk={() => setAbierto(false)} className="w-full rounded-md border border-filete bg-hundido p-3">
      {(r) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          {lineas.map((l) => (
            <div key={l.id}>
              <input type="hidden" name="linea" value={l.id} />
              <Campo etiqueta={`Horas de ${l.persona}`}>
                <Texto name="linea_horas" inputMode="decimal" defaultValue={String(l.horas).replace(".", ",")} required />
              </Campo>
            </div>
          ))}
          <Campo etiqueta="Qué se decide y por qué" error={r.ok ? undefined : r.campos?.texto}>
            <AreaTexto name="texto" rows={2} required />
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <Boton>Decidir y cerrar</Boton>
            <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
              Cancelar
            </button>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** Un acuerdo del acta: a tarea, o enlazado a un hito, con un clic */
export function AccionesAcuerdo({
  slug,
  id,
  tieneTarea,
  tieneHito,
  hitos,
}: {
  slug: string;
  id: string;
  tieneTarea: boolean;
  tieneHito: boolean;
  hitos: Array<{ id: string; titulo: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!tieneTarea ? (
        <Formulario accion={acuerdoATarea}>
          {() => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="accion text-xs">
                Pasar a tarea
              </button>
            </>
          )}
        </Formulario>
      ) : null}
      {!tieneHito && hitos.length ? (
        <Formulario accion={acuerdoAHito} className="flex-row items-center gap-2">
          {() => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              <Seleccion name="hito" defaultValue="" aria-label="Hito" className="py-1 text-xs">
                <option value="" disabled>
                  Enlazar a un hito
                </option>
                {hitos.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.titulo}
                  </option>
                ))}
              </Seleccion>
              <button type="submit" className="accion text-xs">
                Enlazar
              </button>
            </>
          )}
        </Formulario>
      ) : null}
    </div>
  );
}
