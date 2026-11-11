"use client";

import { useState } from "react";
import { firmarAnexo } from "@/lib/acciones/programa";
import {
  aceptarAnexo,
  comentarAnexo,
  darAccesoFundadora,
  firmarAcuerdo,
  pasarAAceleracion,
  proponerAnexo,
  responderComentarioAnexo,
  volverABorrador,
} from "@/lib/acciones/acuerdo";
import { CamposFirmantes } from "@/components/formularios/situacion";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Seleccion, Texto } from "@/components/ui/formulario";
import type { Situacion } from "@/lib/societario";
import { fueraDeHorquilla, textoHorquilla, type Horquilla } from "@/lib/entrada";

/**
 * Proponerle el Acuerdo: el Anexo en borrador, más quién firma.
 *
 * Con la horquilla de su vía fijada, se enseña como referencia y, si el
 * equity se sale, pide el motivo. Sin sociedad, pide la fecha prevista de
 * «Constituir la sociedad»: el equity queda comprometido hasta entonces.
 */
export function ProponerAnexo({
  id,
  slug,
  situacion,
  fundadoras,
  horquilla,
  via,
  equity,
  fechaHito,
}: {
  id: string;
  slug: string;
  situacion: Situacion | null;
  fundadoras: string;
  horquilla: Horquilla | null;
  via: string | null;
  equity: number | null;
  fechaHito: string | null;
}) {
  const sinSociedad = situacion === "sin_constituir" || situacion === "en_constitucion";
  const fuera = fueraDeHorquilla(equity, horquilla);
  return (
    <Desplegable titulo="Proponerle el Acuerdo">
      <Formulario accion={proponerAnexo} className="gap-4">
        {(r) => (
          <>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="slug" value={slug} />
            <p className="text-xs text-secundario">
              Lo verá en Mi compañía, con estas cifras, para comentarlo y aceptarlo. Mientras
              esté propuesto no se edita: para cambiarlo, se devuelve a borrador.
            </p>
            {horquilla ? (
              <p className="text-sm text-cuerpo">
                La horquilla de equity de {via === "aceleracion" ? "Aceleración" : "Construcción"} es{" "}
                {textoHorquilla(horquilla)}.{" "}
                {equity === null
                  ? "Este Anexo no tiene equity todavía."
                  : fuera
                    ? `Este propone el ${equity} %: se sale, y hay que decir por qué.`
                    : `Este propone el ${equity} %.`}
              </p>
            ) : null}
            {fuera ? (
              <Campo
                etiqueta="Por qué se sale de la horquilla"
                ayuda="Queda en el registro con la propuesta"
                obligatorio
                error={r.ok ? undefined : r.campos?.equity_fuera_motivo}
              >
                <AreaTexto name="equity_fuera_motivo" rows={2} required />
              </Campo>
            ) : null}
            {sinSociedad ? (
              <Campo
                etiqueta="Constituir la sociedad, prevista para"
                ayuda="Sin sociedad, el equity queda comprometido y se materializa al constituirla. Es el primer hito del Anexo"
                obligatorio
                error={r.ok ? undefined : r.campos?.constitucion_prevista}
              >
                <Texto type="date" name="constitucion_prevista" defaultValue={fechaHito ?? ""} required className="w-48" />
              </Campo>
            ) : null}
            {situacion ? (
              <CamposFirmantes situacion={situacion} fundadoras={fundadoras} errores={r.ok ? undefined : r.campos} />
            ) : (
              <p className="text-sm text-cuerpo">
                Falta la situación societaria: de ella depende quién firma.
              </p>
            )}
            <div>
              <Boton disabled={!situacion}>Proponerle el Acuerdo</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

export function VolverABorrador({ id, slug, aceptado }: { id: string; slug: string; aceptado: boolean }) {
  return (
    <Formulario accion={volverABorrador} className="gap-2">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="slug" value={slug} />
          <p className="text-xs text-metadato">
            {aceptado
              ? "Para cambiar algo, vuelve a borrador: su aceptación se pierde y tendrá que aceptar la propuesta nueva."
              : "Para cambiar algo, vuelve a borrador y propónselo otra vez."}
          </p>
          <div>
            <Boton variante="secundario">Volver a borrador para cambiarlo</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

export function ComentarAnexo({ annexId, companyId, slug }: { annexId: string; companyId: string; slug: string }) {
  return (
    <Formulario accion={comentarAnexo} className="gap-3">
      {(r) => (
        <>
          <input type="hidden" name="annex_id" value={annexId} />
          <input type="hidden" name="company_id" value={companyId} />
          <input type="hidden" name="slug" value={slug} />
          <Campo
            etiqueta="Comentar la propuesta"
            ayuda="Si algo no te encaja o no lo entiendes, dínoslo antes de aceptarla"
            error={r.ok ? undefined : r.campos?.texto}
          >
            <AreaTexto name="texto" rows={3} />
          </Campo>
          <div>
            <Boton variante="secundario">Enviar el comentario</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

export function ResponderComentarioAnexo({ id, slug }: { id: string; slug: string }) {
  return (
    <Formulario accion={responderComentarioAnexo} className="gap-2">
      {(r) => (
        <>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="slug" value={slug} />
          <Campo etiqueta="Respuesta" error={r.ok ? undefined : r.campos?.respuesta}>
            <AreaTexto name="respuesta" rows={2} />
          </Campo>
          <div>
            <Boton variante="secundario">Responder</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

export function AceptarAnexo({ id, slug }: { id: string; slug: string }) {
  return (
    <Formulario accion={aceptarAnexo} className="gap-2">
      {() => (
        <>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="slug" value={slug} />
          <div>
            <Boton>Aceptar la propuesta</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/**
 * Firmar el Acuerdo y su Anexo aceptado. Pasa la compañía a incubación:
 * fija etapa, perfil, fase y recorrido, y crea sus KPI y su hoja de ruta.
 */
export function FirmarAcuerdoCompania({
  companyId,
  slug,
  plantillas,
  fases,
}: {
  companyId: string;
  slug: string;
  plantillas: { id: string; name: string }[];
  fases: { code: string; name: string }[];
}) {
  return (
    <Desplegable titulo="Firmar el Acuerdo y el Anexo">
      <Formulario accion={firmarAcuerdo} className="gap-4">
        {(r) => (
          <>
            <input type="hidden" name="company_id" value={companyId} />
            <input type="hidden" name="slug" value={slug} />
            <p className="text-xs text-secundario">
              La compañía pasa a incubación y entra en la cartera, con sus KPI y su hoja de ruta.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Etapa de inversión" obligatorio error={r.ok ? undefined : r.campos?.stage}>
                <Seleccion name="stage" defaultValue="pre_semilla">
                  <option value="pre_semilla">Pre-semilla</option>
                  <option value="semilla">Semilla</option>
                  <option value="serie_a">Serie A</option>
                </Seleccion>
              </Campo>
              <Campo etiqueta="Perfil técnico" obligatorio error={r.ok ? undefined : r.campos?.tech_profile}>
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
              <Campo etiqueta="Empieza el" error={r.ok ? undefined : r.campos?.roadmap_start}>
                <Texto type="date" name="roadmap_start" />
              </Campo>
              <Campo etiqueta="Firmado el" obligatorio error={r.ok ? undefined : r.campos?.firmado_on}>
                <Texto type="date" name="firmado_on" required />
              </Campo>
            </div>
            <div>
              <Boton>Firmar el Acuerdo</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

export function PasarAAceleracion({ companyId, slug }: { companyId: string; slug: string }) {
  return (
    <Desplegable titulo="Pasar a Aceleración">
      <Formulario accion={pasarAAceleracion} className="gap-3">
        {(r) => (
          <>
            <input type="hidden" name="company_id" value={companyId} />
            <input type="hidden" name="slug" value={slug} />
            <p className="text-xs text-secundario">
              Cuando empieza a facturar. No tiene vuelta atrás: lo que estaba por construir pasa
              a por entregar, queda en el registro y se avisa a su mentor principal.
            </p>
            <Campo etiqueta="Motivo" obligatorio error={r.ok ? undefined : r.campos?.motivo}>
              <AreaTexto name="motivo" rows={3} required />
            </Campo>
            <div>
              <Boton>Pasar a Aceleración</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * Proponer está bloqueado mientras ella no tenga cuenta: es donde lee y
 * acepta. Al lado, el botón para dársela.
 *
 * El formulario se monta siempre y lo que cambia es su contenido: el
 * mensaje lleva la contraseña, que se enseña una sola vez, y darle la
 * cuenta hace falsa la condición «sin cuenta». Se cierra con «Hecho».
 */
export function DarAccesoFundadora({
  companyId,
  slug,
  tieneCuenta,
}: {
  companyId: string;
  slug: string;
  /** Con cuenta no enseña nada, pero sigue montado: es donde vive la contraseña recién dada */
  tieneCuenta: boolean;
}) {
  const [hecho, setHecho] = useState(false);
  return (
    <Formulario accion={darAccesoFundadora} className="gap-3">
      {(r) => {
        if (r.ok && r.datos?.clave) {
          return hecho ? null : (
            <div className="flex flex-col gap-3 rounded-lg border border-filete px-4 py-3">
              <p className="text-sm text-titular" role="status">
                Cuenta creada para {r.datos.correo}. Su contraseña es{" "}
                <strong className="cifra">{r.datos.clave}</strong> — cópiala ahora por si hay que
                dársela por otro canal: no se vuelve a enseñar. Al entrar la cambiará y verá su
                compañía.
              </p>
              <div>
                <button type="button" className="accion text-xs" onClick={() => setHecho(true)}>
                  Hecho
                </button>
              </div>
            </div>
          );
        }
        if (tieneCuenta) return null;
        return (
          <>
            <input type="hidden" name="company_id" value={companyId} />
            <input type="hidden" name="slug" value={slug} />
            <p className="text-sm text-cuerpo">
              Para proponerle el Acuerdo, ella tiene que tener cuenta: es donde lo lee, lo
              comenta y lo acepta. Ahora no la tiene, porque el NDA se firmó fuera de la
              plataforma.
            </p>
            <div>
              <Boton variante="secundario">Dar acceso</Boton>
            </div>
          </>
        );
      }}
    </Formulario>
  );
}

/** Firmar un Anexo que ella ya aceptó, en una compañía que está en incubación */
export function FirmarAnexoAceptado({ id, slug }: { id: string; slug: string }) {
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <Formulario accion={firmarAnexo} className="gap-3">
      {(r) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Campo
            etiqueta="Fecha de la firma"
            ayuda="Al firmar, las horas, el dinero y el equity quedan congelados"
            error={r.ok ? undefined : r.campos?.signed_on}
          >
            <Texto name="signed_on" type="date" required defaultValue={hoy} className="w-48" />
          </Campo>
          <div>
            <Boton>Firmar el Anexo</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}
