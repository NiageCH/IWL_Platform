"use client";

import { useState, type ReactNode } from "react";
import {
  comentarHito,
  configurarRevisionHito,
  entregarHito,
  marcarHitoEconomico,
  pedirCambiosHito,
  validarHito,
} from "@/lib/acciones/hitos";
import { AreaTexto, Boton, Campo, Formulario, Seleccion, Texto } from "@/components/ui/formulario";
import { euros } from "@/lib/utils";

/**
 * Los formularios del circuito de un hito.
 *
 * Quién ve cada uno lo decide la pantalla con los permisos; quién puede
 * de verdad, la base. Ninguno guarda nada por su cuenta: todos llaman a las
 * funciones del circuito en `lib/acciones/hitos.ts`.
 */

/**
 * Entregar: la evidencia y una nota, y el botón.
 *
 * La evidencia va dentro del panel —es `<Evidencia>`, la misma pieza de
 * todas partes— porque entregar sin ella no se puede, y tener que buscarla
 * en otro sitio de la pantalla es la forma de que no se encuentre.
 */
export function EntregarHito({
  slug,
  id,
  titulo,
  requiereValidacion,
  hayEvidencia,
  evidencia,
}: {
  slug: string;
  id: string;
  titulo: string;
  requiereValidacion: boolean;
  hayEvidencia: boolean;
  /** `<Evidencia>` de este hito, ya montada */
  evidencia: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="boton-marca self-start px-4 py-1.5 text-xs"
        aria-label={`Entregar «${titulo}»`}
      >
        Entregar
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-filete bg-hundido p-3">
      <p className="text-xs text-secundario">
        {requiereValidacion
          ? "Adjunta lo que demuestra que está hecho. Al entregarlo avisamos a tu mentor, que lo valida o te pide cambios."
          : "Adjunta lo que demuestra que está hecho. Este hito no pide validación: al entregarlo queda cumplido."}
      </p>
      <div className="flex flex-col gap-1.5">
        <span className="cifra text-xs uppercase tracking-wide text-metadato">
          Evidencia <span className="text-acento-texto">*</span>
        </span>
        {evidencia}
      </div>
      <Formulario accion={entregarHito} onOk={() => setAbierto(false)}>
        {(resultado) => (
          <>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={id} />
            <Campo etiqueta="Nota para quien revisa" ayuda="Opcional. Lo que convenga saber al mirarlo." error={!resultado.ok ? resultado.campos?.nota : undefined}>
              <AreaTexto name="nota" rows={2} maxLength={1000} />
            </Campo>
            <div className="flex flex-wrap items-center gap-3">
              <Boton type="submit" disabled={!hayEvidencia}>
                Entregar el hito
              </Boton>
              <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
                Cancelar
              </button>
              {!hayEvidencia ? (
                <span className="text-xs text-metadato">Adjunta al menos una evidencia para poder entregarlo.</span>
              ) : null}
            </div>
          </>
        )}
      </Formulario>
    </div>
  );
}

/**
 * Revisar: validar o pedir cambios, con la evidencia delante (la pinta la
 * pantalla justo encima). Pedir cambios lleva comentario obligatorio:
 * es lo que ella lee en el hito.
 */
export function RevisarHito({
  slug,
  id,
  titulo,
  efecto,
}: {
  slug: string;
  id: string;
  titulo: string;
  /** «Libera 20.000 €», para que quien valida sepa lo que firma */
  efecto: string | null;
}) {
  const [modo, setModo] = useState<"nada" | "validar" | "cambios">("nada");

  if (modo === "nada") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setModo("validar")}
          className="boton-marca px-4 py-1.5 text-xs"
          aria-label={`Validar «${titulo}»`}
        >
          Validar
        </button>
        <button type="button" onClick={() => setModo("cambios")} className="accion text-xs">
          Pedir cambios
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-filete bg-hundido p-3">
      {modo === "validar" ? (
        <Formulario accion={validarHito} onOk={() => setModo("nada")}>
          {(resultado) => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              {efecto ? (
                <p className="text-xs text-secundario">
                  Al validarlo queda cumplido y {efecto.toLowerCase()}. Queda en el registro con tu nombre y la fecha.
                </p>
              ) : (
                <p className="text-xs text-secundario">Al validarlo queda cumplido, con tu nombre y la fecha.</p>
              )}
              <Campo etiqueta="Nota" ayuda="Opcional." error={!resultado.ok ? resultado.campos?.nota : undefined}>
                <AreaTexto name="nota" rows={2} maxLength={1000} />
              </Campo>
              <div className="flex flex-wrap items-center gap-3">
                <Boton type="submit">Validar el hito</Boton>
                <button type="button" onClick={() => setModo("nada")} className="accion text-xs">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </Formulario>
      ) : (
        <Formulario accion={pedirCambiosHito} onOk={() => setModo("nada")}>
          {(resultado) => (
            <>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              <Campo
                etiqueta="Qué hay que cambiar"
                obligatorio
                ayuda="Ella lo lee en el hito. Vuelve a «En curso» hasta que lo entregue otra vez."
                error={!resultado.ok ? resultado.campos?.comentario : undefined}
              >
                <AreaTexto name="comentario" rows={3} maxLength={2000} required />
              </Campo>
              <div className="flex flex-wrap items-center gap-3">
                <Boton type="submit">Pedir cambios</Boton>
                <button type="button" onClick={() => setModo("nada")} className="accion text-xs">
                  Cancelar
                </button>
              </div>
            </>
          )}
        </Formulario>
      )}
    </div>
  );
}

/** Una nota de quien acompaña sin validar: el mentor secundario, el técnico */
export function NotaHito({ slug, id }: { slug: string; id: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="accion self-start text-xs">
        Dejar una nota
      </button>
    );
  }
  return (
    <Formulario accion={comentarHito} className="gap-2">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <Campo etiqueta="Nota sobre el hito" error={!resultado.ok ? resultado.campos?.nota : undefined}>
            <AreaTexto name="nota" rows={2} maxLength={1000} required />
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <Boton type="submit" variante="secundario">
              Guardar la nota
            </Boton>
            <button type="button" onClick={() => setAbierto(false)} className="accion text-xs">
              Cerrar
            </button>
          </div>
        </>
      )}
    </Formulario>
  );
}

/**
 * Cómo se revisa este hito: si pide validación y a quién se le encarga.
 * Para quien coordina.
 */
export function RevisionDeHito({
  slug,
  id,
  requiere,
  obligatoria,
  revisorId,
  acompanantes,
}: {
  slug: string;
  id: string;
  requiere: boolean;
  /** Con efecto económico o condicionando invertible no se puede quitar */
  obligatoria: boolean;
  revisorId: string | null;
  acompanantes: Array<{ id: string; nombre: string }>;
}) {
  return (
    <Formulario accion={configurarRevisionHito} className="gap-3">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <label className="flex items-start gap-2 text-sm text-cuerpo">
            <input
              type="checkbox"
              name="requiere"
              defaultChecked={requiere || obligatoria}
              disabled={obligatoria}
              className="mt-0.5"
            />
            <span>
              Requiere validación del mentor
              <span className="block text-xs text-metadato">
                {obligatoria
                  ? "Obligatoria: el hito tiene efecto económico o condiciona invertible."
                  : "Sin validación, al entregarlo queda cumplido directamente."}
              </span>
            </span>
          </label>
          {/* Deshabilitada no se envía: se manda igual para no quitarla sin querer */}
          {obligatoria ? <input type="hidden" name="requiere" value="on" /> : null}
          {acompanantes.length > 0 ? (
            <Campo
              etiqueta="Lo valida también"
              ayuda="Un mentor secundario o técnico, si el hito es de su materia."
              error={!resultado.ok ? resultado.campos?.revisor : undefined}
            >
              <Seleccion name="revisor" defaultValue={revisorId ?? ""}>
                <option value="">Solo quien coordina</option>
                {acompanantes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
          ) : null}
          <Boton type="submit" variante="secundario" className="self-start">
            Guardar
          </Boton>
        </>
      )}
    </Formulario>
  );
}

/**
 * La financiación que libera un hito. Solo dirección, y solo con el Anexo en
 * borrador. Enseña cuánto queda por repartir. El equity de IWL ya no va por
 * hitos: existe desde la firma del Acuerdo (REVISION, 22 nov).
 */
export function EfectoEconomicoHito({
  slug,
  id,
  financiacion,
  financiacionPactada,
  financiacionLibre,
}: {
  slug: string;
  id: string;
  financiacion: number | null;
  financiacionPactada: number | null;
  /** Lo que queda por repartir sin contar este hito */
  financiacionLibre: number;
}) {
  return (
    <Formulario accion={marcarHitoEconomico} className="gap-3">
      {(resultado) => (
        <>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              etiqueta="Libera financiación (€)"
              ayuda={
                financiacionPactada === null
                  ? "El Anexo no compromete financiación directa."
                  : `El Anexo compromete ${euros(financiacionPactada)}; quedan ${euros(financiacionLibre)} por repartir.`
              }
              error={!resultado.ok ? resultado.campos?.financiacion : undefined}
            >
              <Texto
                name="financiacion"
                inputMode="decimal"
                defaultValue={financiacion === null ? "" : String(financiacion).replace(".", ",")}
                placeholder="Sin financiación"
              />
            </Campo>
          </div>
          <p className="text-xs text-metadato">
            Con financiación, la validación del mentor es obligatoria. Al proponer el Anexo, queda fija.
          </p>
          <Boton type="submit" variante="secundario" className="self-start">
            Guardar
          </Boton>
        </>
      )}
    </Formulario>
  );
}
