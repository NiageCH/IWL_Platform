"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { MenuAcciones, type AccionMenu } from "@/components/menu-acciones";
import { PanelLateral } from "@/components/ui/panel-lateral";
import { FechaHito, QuitarHito } from "@/components/formularios/lista-entrada";
import { reabrirHito } from "@/lib/acciones/hitos";
import { AreaTexto, Boton, Campo, Formulario } from "@/components/ui/formulario";
import {
  FormularioBorrarEtapa,
  FormularioEtapa,
  FormularioNuevoHito,
  MoverHito,
} from "@/components/formularios/ruta";

/**
 * La hoja de ruta de una compañía con el patrón de Administración → Hoja de
 * ruta (REVISION, 23 nov): por tramo, una acción principal, «Añadir hito»,
 * y lo demás en el menú ⋯; por hito, su menú ⋯. Todo lo que se edita se
 * abre en el panel lateral; nada de formularios en línea en la fila.
 */

/** El botón principal de un tramo: relleno, con el color de la marca */
function BotonAnadir({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="boton-marca inline-flex items-center gap-1 px-4 py-1.5 text-xs"
      onClick={onClick}
    >
      <Plus aria-hidden="true" className="size-3.5" />
      Añadir hito
    </button>
  );
}

export interface EtapaEditable {
  id: string;
  tramo: number | null;
  nombre: string;
  objetivo: string;
  orden: number;
  inicio: string | null;
  fin: string | null;
  estado: string;
  horasPrevistas: number | null;
  cajaPrevista: number | null;
  notas: string | null;
  hitos: number;
}

/** «Añadir hito» y el menú del tramo (editarlo y borrarlo), con su panel */
export function AccionesTramo({
  slug,
  companyId,
  etapa,
  esDireccion,
  borrable,
}: {
  slug: string;
  companyId: string;
  etapa: EtapaEditable;
  esDireccion: boolean;
  /** Los cuatro tramos de la hoja IWL son fijos: no se borran */
  borrable: boolean;
}) {
  const [panel, setPanel] = useState<"anadir" | "editar" | "borrar" | null>(null);
  const cerrar = useCallback(() => setPanel(null), []);
  const destino = etapa.tramo ? `al tramo ${etapa.tramo}` : `a «${etapa.nombre}»`;
  const titulo =
    panel === "anadir" ? `Añadir un hito ${destino}` : panel === "editar" ? "Editar el tramo" : "Borrar el tramo";

  return (
    <span className="flex items-center gap-2">
      <BotonAnadir onClick={() => setPanel("anadir")} />
      <MenuAcciones
        rotulo={`Acciones del tramo «${etapa.nombre}»`}
        acciones={[
          { texto: "Editar el tramo", alPulsar: () => setPanel("editar") },
          ...(borrable ? [{ texto: "Borrar el tramo", riesgo: true, alPulsar: () => setPanel("borrar") }] : []),
        ]}
      />
      <PanelLateral abierto={panel !== null} titulo={titulo} onCerrar={cerrar}>
        {panel === "anadir" ? (
          <FormularioNuevoHito
            slug={slug}
            companyId={companyId}
            stageId={etapa.id}
            esDireccion={esDireccion}
            onCerrar={cerrar}
          />
        ) : panel === "editar" ? (
          <FormularioEtapa slug={slug} etapa={etapa} onCerrar={cerrar} />
        ) : panel === "borrar" ? (
          <FormularioBorrarEtapa slug={slug} id={etapa.id} nombre={etapa.nombre} hitos={etapa.hitos} onCerrar={cerrar} />
        ) : null}
      </PanelLateral>
    </span>
  );
}

/** Solo «Añadir hito», para el asistente: allí el tramo no se edita */
export function AnadirHito({
  slug,
  companyId,
  stageId,
  tramo,
  esDireccion,
}: {
  slug: string;
  companyId: string;
  stageId: string;
  tramo: number;
  esDireccion: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  return (
    <>
      <BotonAnadir onClick={() => setAbierto(true)} />
      <PanelLateral abierto={abierto} titulo={`Añadir un hito al tramo ${tramo}`} onCerrar={cerrar}>
        {abierto ? (
          <FormularioNuevoHito
            slug={slug}
            companyId={companyId}
            stageId={stageId}
            esDireccion={esDireccion}
            onCerrar={cerrar}
          />
        ) : null}
      </PanelLateral>
    </>
  );
}

/**
 * El menú ⋯ de un hito: cambiar la fecha, moverlo de tramo y quitarlo, lo
 * que toque a quien mira. Quien llama decide qué se ofrece; la base lo
 * vuelve a decidir al guardar.
 */
export function MenuHito({
  slug,
  hito,
  fecha,
  mover,
  quitar,
  reabrir,
  ajustes,
}: {
  slug: string;
  hito: { id: string; titulo: string; fecha: string | null; fundamental: boolean };
  fecha?: { finPlazo: string | null; esDireccion: boolean; pideMotivo: boolean };
  mover?: { stageId: string | null; etapas: Array<{ id: string; nombre: string }> };
  quitar?: boolean;
  /** Solo en un hito cumplido, para el mentor principal o dirección */
  reabrir?: boolean;
  /**
   * El historial y los ajustes del hito (nota, quién lo revisa, efecto
   * económico): iban plegados debajo de cada fila y ahora se abren en el
   * panel. Los pinta el servidor; aquí solo se enseñan.
   */
  ajustes?: { texto: string; contenido: ReactNode };
}) {
  const [panel, setPanel] = useState<"fecha" | "mover" | "quitar" | "ajustes" | "reabrir" | null>(null);
  const cerrar = useCallback(() => setPanel(null), []);

  const acciones: AccionMenu[] = [];
  if (ajustes) acciones.push({ texto: ajustes.texto, alPulsar: () => setPanel("ajustes") });
  if (fecha) acciones.push({ texto: "Cambiar la fecha", alPulsar: () => setPanel("fecha") });
  if (mover && mover.etapas.length > 1) acciones.push({ texto: "Mover a otro tramo", alPulsar: () => setPanel("mover") });
  if (reabrir) acciones.push({ texto: "Reabrir el hito", alPulsar: () => setPanel("reabrir") });
  if (quitar) acciones.push({ texto: "Quitar", riesgo: true, alPulsar: () => setPanel("quitar") });
  if (!acciones.length) return null;

  const titulo =
    panel === "reabrir"
      ? "Reabrir el hito"
      : panel === "ajustes"
      ? (ajustes?.texto ?? "")
      : panel === "fecha"
        ? "Cambiar la fecha"
        : panel === "mover"
          ? "Mover a otro tramo"
          : "Quitar el hito";

  return (
    <>
      <MenuAcciones rotulo={`Acciones de «${hito.titulo}»`} acciones={acciones} />
      <PanelLateral abierto={panel !== null} titulo={titulo} onCerrar={cerrar}>
        <p className="mb-4 text-sm font-medium text-titular">{hito.titulo}</p>
        {panel === "reabrir" ? (
          <Formulario accion={reabrirHito} onOk={cerrar} className="gap-4">
            {(r) => (
              <>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="id" value={hito.id} />
                <p className="text-sm text-cuerpo">
                  Vuelve a «Pendiente» y conserva su evidencia. Para darlo otra vez por cumplido, ella lo entrega y
                  se valida.
                </p>
                <Campo
                  etiqueta="Por qué se reabre"
                  obligatorio
                  ayuda="Queda en su historial y en el registro"
                  error={r.ok ? undefined : r.campos?.motivo}
                >
                  <AreaTexto name="motivo" rows={3} required minLength={10} />
                </Campo>
                <div className="flex flex-wrap gap-2">
                  <Boton>Reabrir el hito</Boton>
                  <button
                    type="button"
                    className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm font-medium text-titular hover:border-filete-fuerte"
                    onClick={cerrar}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </Formulario>
        ) : panel === "ajustes" && ajustes ? (
          <div className="flex flex-col gap-4 text-sm">{ajustes.contenido}</div>
        ) : panel === "fecha" && fecha ? (
          <FechaHito
            id={hito.id}
            slug={slug}
            actual={hito.fecha}
            finPlazo={fecha.finPlazo}
            esDireccion={fecha.esDireccion}
            pideMotivo={fecha.pideMotivo}
            onOk={cerrar}
          />
        ) : panel === "mover" && mover ? (
          <MoverHito slug={slug} id={hito.id} stageId={mover.stageId} etapas={mover.etapas} />
        ) : panel === "quitar" ? (
          <QuitarHito id={hito.id} slug={slug} titulo={hito.titulo} fundamental={hito.fundamental} onCerrar={cerrar} />
        ) : null}
      </PanelLateral>
    </>
  );
}
