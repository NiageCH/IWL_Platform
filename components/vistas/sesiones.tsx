import { leerSesiones, leerOpcionesSesion, type Sesion } from "@/lib/datos/sesiones";
import { leerDocumentosElegibles } from "@/lib/datos/evidencia";
import type { ResumenCompania } from "@/lib/datos/compania";
import { APARTADOS_ACTA, MODALIDADES, NOMBRE_ESTADO_SESION, confirmaSolaEl, textoEvento } from "@/lib/sesiones";
import { estadoVisual } from "@/lib/estados";
import { euros, fecha, numero } from "@/lib/utils";
import { Bloque, Cifra, Etiqueta, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { Estado } from "@/components/ui/estado";
import { Evidencia } from "@/components/formularios/evidencia";
import { AccionesAcuerdo, AccionesSesion, RegistrarSesion } from "@/components/formularios/sesiones";

/**
 * Sesiones: el acta, las horas y su confirmación (REVISION, 13 nov).
 *
 * La ven IWL y la fundadora, con lo mismo delante. El acta de una sesión
 * la levanta siempre el mentor de la compañía (REVISION, 22 nov); quien
 * acompaña sin ser mentor apunta su trabajo fuera de sesión; ella confirma las horas o dice qué no cuadra, y
 * lo que se hable queda en la historia de la sesión, con cada cambio de
 * horas y su motivo. Nada se borra: se anula con motivo.
 */
export async function VistaSesiones({ resumen }: { resumen: NonNullable<ResumenCompania> }) {
  const { compania, permisos } = resumen;
  const acompana = permisos.coordina || permisos.acompana;
  // Quién apunta algo aquí: el mentor, el acta; quien acompaña sin serlo, su trabajo
  const apunta = permisos.levantaActas || permisos.acompana;
  const [{ sesiones, recuento }, opciones, elegibles] = await Promise.all([
    leerSesiones(compania.id),
    acompana ? leerOpcionesSesion(compania.id) : Promise.resolve(null),
    leerDocumentosElegibles(compania.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Bloque elevacion={2}>
        <TituloBloque accion={<Metadato>Lo que cuenta para el Anexo son las confirmadas</Metadato>}>
          Horas de IWL
        </TituloBloque>
        <div className="grid gap-6 px-4 py-4 sm:grid-cols-3">
          <Cifra destacada etiqueta="Confirmadas" valor={numero(recuento.confirmadas, 1)} unidad="h" nota="Por ella, por plazo o por dirección" />
          <Cifra etiqueta="Por confirmar" valor={numero(recuento.porConfirmar, 1)} unidad="h" nota="Esperan su respuesta" />
          <Cifra etiqueta="En discusión" valor={numero(recuento.enDiscusion, 1)} unidad="h" nota="No cuadran, o están en dirección" />
        </div>
        {acompana && opciones && compania.tramo === "entrada" ? (
          <p className="border-t border-filete px-4 py-3 text-sm text-secundario">
            Todavía no hay Acuerdo firmado: las horas de acompañamiento cuentan desde la firma.
          </p>
        ) : apunta && opciones && permisos.personaId ? (
          <RegistrarSesion
            slug={compania.slug}
            companyId={compania.id}
            materias={opciones.materias}
            pilares={opciones.pilares}
            perfiles={opciones.perfiles}
            personas={opciones.personas}
            yo={permisos.personaId}
            soloYo={!permisos.coordina}
            soloTrabajo={!permisos.levantaActas}
          />
        ) : null}
      </Bloque>

      {sesiones.length === 0 ? (
        <Bloque>
          <SinDatos>
            {apunta
              ? "Todavía no hay sesiones. Registra la primera con «Registrar una sesión o un trabajo»: le llegará a ella para que confirme las horas."
              : acompana
                ? "Todavía no hay sesiones. El acta de cada sesión la levanta el mentor de la compañía."
              : "Todavía no hay sesiones. Cuando tu mentor registre una, te llegará un aviso para que confirmes las horas."}
          </SinDatos>
        </Bloque>
      ) : (
        sesiones.map((s) => (
          <TarjetaSesion
            key={s.id}
            s={s}
            slug={compania.slug}
            companyId={compania.id}
            hitos={opciones?.hitos ?? []}
            materias={opciones?.materias ?? []}
            pilares={opciones?.pilares ?? []}
            elegibles={elegibles}
            papel={{
              ella: permisos.esFundadora,
              // El acta la lleva el mentor; un trabajo, quien lo apuntó. Espejo de `app.lleva_el_acta`
              registra: s.tipo === "sesion" ? permisos.levantaActas : s.registradaPor.id === permisos.personaId && apunta,
              esAdmin: permisos.esAdmin,
              habla: permisos.esFundadora || acompana,
            }}
            acompana={acompana}
          />
        ))
      )}
    </div>
  );
}

function TarjetaSesion({
  s,
  slug,
  companyId,
  hitos,
  materias,
  pilares,
  elegibles,
  papel,
  acompana,
}: {
  s: Sesion;
  slug: string;
  companyId: string;
  hitos: Array<{ id: string; titulo: string }>;
  materias: Array<{ id: string; nombre: string }>;
  pilares: Array<{ id: string; nombre: string }>;
  elegibles: Awaited<ReturnType<typeof leerDocumentosElegibles>>;
  papel: { ella: boolean; registra: boolean; esAdmin: boolean; habla: boolean };
  acompana: boolean;
}) {
  const visual = estadoVisual("sesion", { estado: s.estado });
  const valor = s.lineas.reduce((t, l) => t + l.valor, 0);
  const abierta = ["por_confirmar", "en_discusion"].includes(s.estado);
  return (
    <div id={`sesion-${s.id}`} className="scroll-mt-48">
      <Bloque>
        <TituloBloque
          accion={<Estado valor={visual} rotulo={NOMBRE_ESTADO_SESION[s.estado]} />}
        >
          {s.titulo}
        </TituloBloque>
        <div className="flex flex-col gap-3 px-4 py-3 text-sm">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secundario">
            <Etiqueta>{s.tipo === "sesion" ? "Sesión" : "Trabajo fuera de sesión"}</Etiqueta>
            <span className="cifra">{fecha(s.fecha)}</span>
            {s.duracionMin ? <span>{s.duracionMin} min</span> : null}
            {s.modalidad ? <span>{MODALIDADES[s.modalidad] ?? s.modalidad}</span> : null}
            {s.materia ? <span>{s.materia}</span> : null}
            {s.pilar ? <span>Pilar: {s.pilar}</span> : null}
            <span>Registrada por {s.registradaPor.nombre}</span>
          </p>

          {s.estado === "por_confirmar" ? (
            <p className="text-xs text-metadato">
              Si nadie responde, se confirma sola el {fecha(confirmaSolaEl(s.pendienteDesde).toISOString())}.
            </p>
          ) : null}

          {s.asistentesCompania ? <p className="text-xs text-secundario">De su lado: {s.asistentesCompania}</p> : null}

          {s.trabajado ? (
            <div>
              <p className="text-xs text-metadato">{s.tipo === "sesion" ? "Qué se trabajó" : "Qué se hizo"}</p>
              <p className="whitespace-pre-line text-cuerpo">{s.trabajado}</p>
            </div>
          ) : s.migrada ? (
            <p className="text-xs text-metadato">Sin acta: se imputó antes del 13 nov, cuando las horas no se confirmaban.</p>
          ) : null}

          {s.entregable ? (
            <p className="text-xs">
              Entregable:{" "}
              <a href={s.entregable} target="_blank" rel="noreferrer noopener" className="enlace text-acento-texto [overflow-wrap:anywhere]">
                {s.entregable}
              </a>
            </p>
          ) : null}

          {s.acuerdos.length ? (
            <div>
              <p className="text-xs text-metadato">Acuerdos</p>
              <ul className="flex flex-col gap-2">
                {s.acuerdos.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1 border-l-2 border-filete pl-3">
                    <span className="text-cuerpo">{a.texto}</span>
                    <span className="text-xs text-metadato">
                      {[a.responsable, a.fecha ? `para el ${fecha(a.fecha)}` : null, a.tareaId ? "Pasado a tarea" : null, a.hito ? `Hito: ${a.hito.titulo}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {acompana && s.estado !== "anulada" ? (
                      <AccionesAcuerdo slug={slug} id={a.id} tieneTarea={Boolean(a.tareaId)} tieneHito={Boolean(a.hito)} hitos={hitos} />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <table className="w-full text-sm" aria-label="Horas">
            <tbody className="divide-y divide-filete">
              {s.lineas.map((l) => (
                <tr key={l.id}>
                  <td className="py-1.5 text-titular">
                    {l.persona} <span className="text-xs text-metadato">{l.perfil}</span>
                  </td>
                  <td className="cifra py-1.5 text-right text-titular">{numero(l.horas, 1)} h</td>
                  <td className="cifra w-24 py-1.5 text-right text-metadato">{euros(l.valor)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 text-xs text-metadato">Total</td>
                <td className="cifra py-1.5 text-right font-medium text-titular">{numero(s.horas, 1)} h</td>
                <td className="cifra w-24 py-1.5 text-right text-metadato">{euros(valor)}</td>
              </tr>
            </tbody>
          </table>

          <Evidencia
            slug={slug}
            companyId={companyId}
            entidad="session"
            entidadId={s.id}
            adjuntas={s.evidencias}
            elegibles={elegibles}
            puedeEscribir={acompana && abierta}
          />

          <AccionesSesion
            slug={slug}
            id={s.id}
            estado={s.estado}
            lineas={s.lineas.map((l) => ({ id: l.id, persona: l.persona, horas: l.horas }))}
            papel={papel}
            materias={materias}
            pilares={pilares}
            acta={{
              tipo: s.tipo,
              fecha: s.fecha,
              duracionMin: s.duracionMin,
              modalidad: s.modalidad,
              asistentes: s.asistentesCompania,
              titulo: s.titulo,
              materiaId: s.materiaId,
              pilarId: s.pilarId,
              trabajado: s.trabajado,
              entregable: s.entregable,
            }}
          />

          <details className="border-t border-filete pt-2" open={["en_discusion", "en_direccion"].includes(s.estado)}>
            <summary className="cursor-pointer text-xs text-secundario">Historia ({s.historia.length})</summary>
            <ol className="mt-2 flex flex-col gap-2">
              {s.historia.map((e) => (
                <li key={e.id} className="text-xs">
                  <span className="text-titular">{e.autor ?? "IWL"}</span>{" "}
                  <span className="text-secundario">{textoEvento(e.tipo, e.detalle).toLowerCase()}</span>{" "}
                  <span className="cifra text-metadato">· {fecha(e.fecha)}</span>
                  {e.texto ? <p className="mt-0.5 whitespace-pre-line border-l-2 border-filete pl-2 text-cuerpo">{e.texto}</p> : null}
                  {e.tipo === "version_acta" ? <VersionActa detalle={e.detalle} /> : null}
                </li>
              ))}
            </ol>
          </details>
        </div>
      </Bloque>
    </div>
  );
}

/** Una versión del acta, plegada: cada apartado con lo de antes y lo de después */
function VersionActa({ detalle }: { detalle: Record<string, unknown> }) {
  const antes = (detalle.antes ?? {}) as Record<string, unknown>;
  const despues = (detalle.despues ?? {}) as Record<string, unknown>;
  const horas = (Array.isArray(detalle.horas) ? detalle.horas : []) as Array<{ persona?: string; antes: number; despues: number }>;
  const campos = Object.keys(despues);
  if (!campos.length && !horas.length) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-metadato">Ver qué cambió</summary>
      <dl className="mt-1 flex flex-col gap-1.5 border-l-2 border-filete pl-2">
        {campos.map((c) => (
          <div key={c}>
            <dt className="text-metadato">{APARTADOS_ACTA[c] ?? c}</dt>
            <dd className="whitespace-pre-line text-cuerpo">
              {valorApartado(c, antes[c])} <span className="text-metadato">→</span> {valorApartado(c, despues[c])}
            </dd>
          </div>
        ))}
        {horas.map((h, i) => (
          <div key={i}>
            <dt className="text-metadato">horas de {h.persona ?? "una persona"}</dt>
            <dd className="cifra text-cuerpo">
              {numero(Number(h.antes), 1)} h <span className="text-metadato">→</span> {numero(Number(h.despues), 1)} h
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function valorApartado(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (campo === "held_on") return fecha(String(v));
  if (campo === "duration_minutes") return `${v} min`;
  if (campo === "modality") return MODALIDADES[String(v)] ?? String(v);
  return String(v);
}
