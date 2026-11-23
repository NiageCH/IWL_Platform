"use client";

import { useCallback, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  anadirHitoFundamental,
  editarHitoPlantilla,
  moverHitoFundamental,
  retirarHitoFundamental,
} from "@/lib/acciones/ruta";
import type { Resultado } from "@/lib/acciones/resultado";
import type { HitoPlantillaIwl, TramoPlantilla } from "@/lib/datos/hoja";
import { MenuAcciones } from "@/components/menu-acciones";
import { PanelLateral } from "@/components/ui/panel-lateral";
import { AreaTexto, Boton, Campo, Formulario, Texto } from "@/components/ui/formulario";
import { Bloque } from "@/components/ui/primitivas";

/**
 * Administración → Hoja de ruta del programa (REVISION, 23 nov: «que no
 * parezca un Word»). Con las piezas de Compañías: los tramos en tarjetas,
 * cada hito en una fila con su menú de acciones, y editar y añadir en el
 * panel lateral. Una sola acción principal por tramo, «Añadir hito»; lo
 * demás va en el menú, y retirar pide confirmación en la propia fila.
 */

type Panel = { modo: "editar"; hito: HitoPlantillaIwl } | { modo: "anadir"; tramo: TramoPlantilla } | null;

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="pastilla">{children}</span>;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function HojaProgramaAdmin({ tramos }: { tramos: TramoPlantilla[] }) {
  const [panel, setPanel] = useState<Panel>(null);
  const cerrar = useCallback(() => setPanel(null), []);

  return (
    <>
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Los cuatro tramos">
        {tramos.map((t) => (
          <li key={t.id}>
            <a
              href={`#tramo-${t.tramo}`}
              className="tarjeta fila-enlace flex h-full flex-col gap-1 px-4 py-3"
              data-resumen-tramo={t.tramo}
            >
              <span className="cifra text-3xl font-semibold leading-none text-titular">{t.tramo}</span>
              <span className="text-sm font-medium text-titular">{t.nombre}</span>
              <span className="text-xs text-secundario">
                {t.meses ? plural(t.meses, "mes", "meses") : "Sin duración"} · {plural(t.hitos.length, "hito", "hitos")}
              </span>
            </a>
          </li>
        ))}
      </ol>

      {tramos.map((t) => (
        <Bloque key={t.id} id={`tramo-${t.tramo}`} className="scroll-mt-6">
          {/* La cabecera de bloque, en dos líneas si no cabe: en el móvil el
              título se quedaba en una columna estrecha junto a los chips */}
          <header className="titulo-bloque flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight text-titular">{`Tramo ${t.tramo} · ${t.nombre}`}</h2>
            <span className="flex flex-wrap items-center gap-2">
              <Chip>{t.meses ? plural(t.meses, "mes", "meses") : "Sin duración"}</Chip>
              <Chip>{plural(t.hitos.length, "hito", "hitos")}</Chip>
              <button
                type="button"
                className="boton-marca inline-flex items-center gap-1 px-4 py-1.5 text-xs"
                onClick={() => setPanel({ modo: "anadir", tramo: t })}
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Añadir hito
              </button>
            </span>
          </header>
          {t.objetivo ? <p className="border-b border-filete px-4 py-2 text-xs text-secundario">{t.objetivo}</p> : null}

          {t.hitos.length === 0 ? (
            <p className="px-4 py-6 text-sm text-secundario">
              Este tramo no tiene hitos fundamentales. Pulsa «Añadir hito» para poner el primero.
            </p>
          ) : (
            <ol className="divide-y divide-filete">
              {t.hitos.map((h, i) => (
                <FilaHito
                  key={h.id}
                  hito={h}
                  orden={i + 1}
                  primero={i === 0}
                  ultimo={i === t.hitos.length - 1}
                  onEditar={() => setPanel({ modo: "editar", hito: h })}
                />
              ))}
            </ol>
          )}

          {t.retirados.length ? (
            <details className="border-t border-filete">
              <summary className="desplegable-titulo cursor-pointer px-4 py-2.5 text-sm text-secundario">
                <span className="accion">{plural(t.retirados.length, "hito retirado", "hitos retirados")}</span>
              </summary>
              <ul className="divide-y divide-filete">
                {t.retirados.map((h) => (
                  <FilaRetirado key={h.id} hito={h} />
                ))}
              </ul>
            </details>
          ) : null}
        </Bloque>
      ))}

      <PanelLateral
        abierto={panel !== null}
        titulo={panel?.modo === "editar" ? "Editar el hito" : `Añadir un hito al tramo ${panel?.tramo.tramo ?? ""}`}
        onCerrar={cerrar}
      >
        {panel ? (
          <FormularioHito
            key={panel.modo === "editar" ? panel.hito.id : panel.tramo.id}
            panel={panel}
            onCerrar={cerrar}
          />
        ) : null}
      </PanelLateral>
    </>
  );
}

function FilaHito({
  hito,
  orden,
  primero,
  ultimo,
  onEditar,
}: {
  hito: HitoPlantillaIwl;
  orden: number;
  primero: boolean;
  ultimo: boolean;
  onEditar: () => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [ocupado, empezar] = useTransition();

  function hacer(accion: (fd: FormData) => Promise<Resultado>, campos: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(campos)) fd.set(k, v);
    empezar(async () => {
      const r = await accion(fd);
      setFallo(r.ok ? null : r.error);
    });
  }

  return (
    <li className="px-4 py-3" data-hito={hito.titulo} aria-busy={ocupado || undefined}>
      <div className="flex items-start gap-3">
        <span className="cifra w-6 shrink-0 pt-0.5 text-right text-sm text-metadato">{orden}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-titular">{hito.titulo}</p>
          {/* Si el criterio solo repite el título no se repite aquí; entero, en el panel */}
          {hito.criterio.trim() !== hito.titulo.trim() ? (
            <p className="truncate text-xs text-secundario" title={hito.criterio}>
              {hito.criterio}
            </p>
          ) : null}
          {hito.evidencia || hito.condicionaInvertible ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {hito.evidencia ? <span className="pastilla">Evidencia</span> : null}
              {hito.condicionaInvertible ? <span className="pastilla">Condiciona invertible</span> : null}
            </div>
          ) : null}
        </div>
        <MenuAcciones
          rotulo={`Acciones de «${hito.titulo}»`}
          acciones={[
            { texto: "Editar", alPulsar: onEditar },
            ...(primero ? [] : [{ texto: "Subir", alPulsar: () => hacer(moverHitoFundamental, { id: hito.id, sentido: "arriba" }) }]),
            ...(ultimo ? [] : [{ texto: "Bajar", alPulsar: () => hacer(moverHitoFundamental, { id: hito.id, sentido: "abajo" }) }]),
            { texto: "Retirar", riesgo: true, alPulsar: () => setConfirmar(true) },
          ]}
        />
      </div>

      {confirmar ? (
        <div className="mt-3 ml-9 flex flex-wrap items-center gap-3 rounded-md border border-mal/40 bg-mal/5 px-3 py-2" role="alertdialog" aria-label="Retirar el hito">
          <p className="min-w-0 flex-1 text-sm text-titular">
            ¿Retirar este hito? Deja de salir en las hojas de ruta nuevas; las que están en marcha y las firmadas no cambian.
          </p>
          <button
            type="button"
            className="rounded-full bg-mal px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            disabled={ocupado}
            onClick={() => hacer(retirarHitoFundamental, { id: hito.id, volver: "no" })}
          >
            Retirar
          </button>
          <button type="button" className="accion text-xs" onClick={() => setConfirmar(false)}>
            Cancelar
          </button>
        </div>
      ) : null}
      {fallo ? (
        <p className="mt-2 ml-9 text-xs text-mal" role="alert">
          {fallo}
        </p>
      ) : null}
    </li>
  );
}

function FilaRetirado({ hito }: { hito: HitoPlantillaIwl }) {
  const [ocupado, empezar] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-2.5" data-retirado={hito.titulo}>
      <span className="pastilla">Retirado</span>
      <span className="min-w-0 flex-1 text-sm text-secundario">{hito.titulo}</span>
      <button
        type="button"
        className="rounded-full border border-filete bg-elevado px-4 py-1.5 text-xs font-medium text-titular hover:border-filete-fuerte disabled:opacity-50"
        disabled={ocupado}
        onClick={() => {
          const fd = new FormData();
          fd.set("id", hito.id);
          fd.set("volver", "si");
          empezar(async () => {
            await retirarHitoFundamental(fd);
          });
        }}
      >
        Recuperar
      </button>
    </li>
  );
}

function FormularioHito({ panel, onCerrar }: { panel: NonNullable<Panel>; onCerrar: () => void }) {
  const editar = panel.modo === "editar" ? panel.hito : null;
  return (
    <Formulario accion={editar ? editarHitoPlantilla : anadirHitoFundamental} onOk={onCerrar} className="gap-4">
      {(r) => {
        const e = (n: string) => (r.ok ? undefined : r.campos?.[n]);
        return (
          <>
            {editar ? (
              <input type="hidden" name="id" value={editar.id} />
            ) : (
              <input type="hidden" name="template_stage_id" value={panel.modo === "anadir" ? panel.tramo.id : ""} />
            )}
            <Campo etiqueta="Título" obligatorio error={e("title")}>
              <Texto name="title" defaultValue={editar?.titulo ?? ""} required />
            </Campo>
            <Campo
              etiqueta="Criterio de cumplimiento"
              obligatorio
              error={e("success_criteria")}
              ayuda="Qué tiene que pasar para darlo por cumplido, de forma que se pueda comprobar"
            >
              <AreaTexto name="success_criteria" rows={4} defaultValue={editar?.criterio ?? ""} required />
            </Campo>
            <Campo etiqueta="Evidencia esperada" error={e("expected_evidence")} ayuda="Lo que se pide como prueba">
              <AreaTexto name="expected_evidence" rows={3} defaultValue={editar?.evidencia ?? ""} />
            </Campo>
            <label className="flex items-start gap-2 text-sm text-cuerpo">
              <input
                type="checkbox"
                name="gates_investable"
                defaultChecked={editar?.condicionaInvertible ?? false}
                className="mt-0.5 accent-[var(--color-acento)]"
              />
              <span>
                <span className="text-titular">Condiciona invertible</span>
                <span className="block text-xs text-secundario">
                  Una compañía solo se puede graduar con todos los hitos así validados.
                </span>
              </span>
            </label>
            <p className="text-xs text-secundario">
              Vale para las hojas de ruta nuevas. Las que están en marcha y las firmadas llevan su copia.
            </p>
            <div className="flex flex-wrap gap-2">
              <Boton>Guardar</Boton>
              <button
                type="button"
                className="rounded-full border border-filete bg-elevado px-4 py-2 text-sm font-medium text-titular hover:border-filete-fuerte"
                onClick={onCerrar}
              >
                Cancelar
              </button>
            </div>
          </>
        );
      }}
    </Formulario>
  );
}
