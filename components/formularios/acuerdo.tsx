"use client";

import {
  aceptarAnexo,
  comentarAnexo,
  firmarAcuerdo,
  pasarAAceleracion,
  proponerAnexo,
  responderComentarioAnexo,
  volverABorrador,
} from "@/lib/acciones/acuerdo";
import { CamposFirmantes } from "@/components/formularios/situacion";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Seleccion, Texto } from "@/components/ui/formulario";
import type { Situacion } from "@/lib/societario";

/** Proponerle el Acuerdo: el Anexo en borrador, más quién firma */
export function ProponerAnexo({
  id,
  slug,
  situacion,
  fundadoras,
}: {
  id: string;
  slug: string;
  situacion: Situacion | null;
  fundadoras: string;
}) {
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
