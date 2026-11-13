"use client";

import Link from "next/link";
import { useState } from "react";
import { BLOQUES, MARCADORES, completarNda, erroresPlantilla } from "@/lib/nda-texto";
import { MARCAS, faltanMarcas } from "@/lib/nda-formato";
import { TextoNda } from "@/components/vistas/texto-nda";
import {
  contrafirmarNda,
  guardarLugarNda,
  guardarPlantillaNda,
  regenerarPdfNda,
  registrarNdaExterno,
} from "@/lib/acciones/nda";
import { AreaTexto, Boton, Campo, Desplegable, Formulario, Texto } from "@/components/ui/formulario";
import { BarraSubida, useSubidas, type CampoSubida } from "@/components/ui/subida";
import { textoLimite } from "@/lib/subidas";

/** El NDA firmado fuera va al expediente de la candidatura */
const NDA_EXTERNO: CampoSubida[] = [
  {
    campo: "documento",
    clase: "nda",
    destino: (fd) => ({ clase: "nda", candidaturaId: String(fd.get("candidatura_id")) }),
  },
];

/**
 * La firma de IWL, con su nombre. Sin mensaje de vuelta: el acuse es la
 * pantalla cambiada —el aviso desaparece y el NDA pasa a firmado—. Si el
 * PDF no se genera, sí devuelve mensaje y el formulario se queda.
 */
export function ContrafirmarNda({
  candidaturaId,
  sinApellidos = false,
}: {
  candidaturaId: string;
  /** Se firma con nombre y apellidos: sin ellos, la base no deja, y se dice antes */
  sinApellidos?: boolean;
}) {
  if (sinApellidos) {
    return (
      <span className="text-xs text-cuerpo">
        Para firmar por IWL faltan tus apellidos.{" "}
        <Link href="/perfil" className="enlace text-acento-texto">
          Añádelos en Mi cuenta
        </Link>
      </span>
    );
  }
  return (
    <Formulario accion={contrafirmarNda}>
      {() => (
        <>
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <button type="submit" className="accion text-xs font-medium text-titular">
            Firmar por IWL
          </button>
        </>
      )}
    </Formulario>
  );
}

export function RegenerarPdfNda({ candidaturaId }: { candidaturaId: string }) {
  return (
    <Formulario accion={regenerarPdfNda}>
      {() => (
        <>
          <input type="hidden" name="candidatura_id" value={candidaturaId} />
          <button type="submit" className="accion text-xs">
            Generar el PDF otra vez
          </button>
        </>
      )}
    </Formulario>
  );
}

/**
 * Un NDA firmado fuera: en papel o por otro sistema. Como `<Evidencia>`,
 * con el documento o con un enlace; aquí va al data room de la candidatura
 * porque todavía no hay compañía, y al firmar el Acuerdo le llega con el
 * resto de su expediente.
 */
export function RegistrarNdaExterno({ candidaturaId }: { candidaturaId: string }) {
  const [modo, setModo] = useState<"archivo" | "enlace">("archivo");
  const { progreso, conSubidas } = useSubidas();

  return (
    <Desplegable titulo="Se firmó fuera de la plataforma">
      <Formulario accion={conSubidas(registrarNdaExterno, NDA_EXTERNO)} className="gap-4">
        {(r) => (
          <>
            <input type="hidden" name="candidatura_id" value={candidaturaId} />
            <p className="text-sm text-secundario">
              En papel o por otro sistema. Cuenta igual: la candidatura pasa a
              «NDA firmado» y ella deja de ver la firma pendiente.
            </p>
            <div className="flex gap-2">
              {(["archivo", "enlace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={modo === m ? "pestana pestana-activa" : "pestana"}
                >
                  {m === "archivo" ? "Subir el PDF" : "Pegar un enlace"}
                </button>
              ))}
            </div>
            {modo === "archivo" ? (
              <Campo etiqueta="El NDA firmado" ayuda={textoLimite("nda")} error={r.ok ? undefined : r.campos?.documento}>
                <Texto type="file" name="documento" accept="application/pdf,image/*" />
              </Campo>
            ) : (
              <Campo etiqueta="Dónde está" error={r.ok ? undefined : r.campos?.url}>
                <Texto type="url" name="url" placeholder="https://" />
              </Campo>
            )}
            <Campo etiqueta="Se firmó el" error={r.ok ? undefined : r.campos?.firmado_on} obligatorio>
              <Texto type="date" name="firmado_on" required />
            </Campo>
            <BarraSubida progreso={progreso} />
            <div>
              <Boton variante="secundario">Darlo por firmado</Boton>
            </div>
          </>
        )}
      </Formulario>
    </Desplegable>
  );
}

/**
 * La plantilla del NDA. Guardar crea una versión nueva; la anterior queda
 * como estaba, y las firmas hechas siguen apuntando a la suya.
 */
/**
 * Cómo saldrá lo que se está pegando, antes de guardarlo: con su formato y
 * con lo que impediría guardarlo. Los marcadores se quedan a la vista, sin
 * rellenar; los bloques condicionales, según se mire como persona física o
 * como sociedad.
 */
export function VistaPreviaPlantilla({ texto }: { texto: string }) {
  const [sociedad, setSociedad] = useState(false);
  if (!texto.trim()) return null;
  const problemas = [faltanMarcas(texto), ...erroresPlantilla(texto)].filter((p): p is string => !!p);
  const completado = completarNda(texto, { startup: "", contraparte_nombre: "", lugar: "", es_sociedad: sociedad });
  return (
    <section aria-label="Vista previa de la plantilla" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-titular">Vista previa, antes de guardar</h3>
        <div className="flex gap-2 text-xs" role="group" aria-label="Ver como">
          {(
            [
              [false, "Persona física"],
              [true, "Sociedad"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={rotulo}
              type="button"
              aria-pressed={sociedad === valor}
              onClick={() => setSociedad(valor)}
              className={`pestana ${sociedad === valor ? "pestana-activa" : ""}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      {problemas.length ? (
        <ul className="flex flex-col gap-1 text-sm text-mal" role="status">
          {problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-filete bg-hundido py-5 pr-5 pl-2">
        <TextoNda texto={completado} />
      </div>
    </section>
  );
}

export function PlantillaNda({ vigente }: { vigente: string }) {
  const [texto, setTexto] = useState(vigente);
  return (
    <Formulario accion={guardarPlantillaNda} className="px-4 py-4">
      {(r) => (
        <>
          <Campo
            etiqueta="Texto del NDA"
            ayuda="Pega el .md abierto como texto, con sus marcas. Guardarlo crea una versión nueva: las firmas hechas no cambian."
            error={r.ok ? undefined : r.campos?.texto}
          >
            <AreaTexto name="texto" rows={14} defaultValue={vigente} onChange={(e) => setTexto(e.currentTarget.value)} />
          </Campo>
          <VistaPreviaPlantilla texto={texto} />
          <div>
            <Boton>Guardar como versión nueva</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** El lugar de firma del NDA: lo que pone `{{lugar}}` */
export function LugarNda({ lugar }: { lugar: string }) {
  return (
    <Formulario accion={guardarLugarNda} className="gap-3 px-4 py-4">
      {(r) => (
        <>
          <Campo etiqueta="Lugar de firma" ayuda="Lo que pone el marcador {{lugar}}" error={r.ok ? undefined : r.campos?.lugar}>
            <Texto name="lugar" defaultValue={lugar} className="max-w-xs" />
          </Campo>
          <div>
            <Boton variante="secundario">Guardar el lugar</Boton>
          </div>
        </>
      )}
    </Formulario>
  );
}

/** Los marcadores que valen, con qué pone cada uno: lista cerrada */
export function MarcadoresNda() {
  return (
    <details className="text-sm">
      <summary className="accion cursor-pointer text-xs text-secundario">Marcadores y marcas de formato</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-xs text-metadato">
          Se escriben entre llaves dobles. Uno que no esté en esta lista no deja guardar la plantilla, y un
          hueco entre corchetes no deja enviarla.
        </p>
        <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
          {Object.entries(MARCADORES).map(([m, que]) => (
            <div key={m} className="contents">
              <dt className="cifra text-titular">{`{{${m}}}`}</dt>
              <dd className="text-secundario">{que}</dd>
            </div>
          ))}
          {Object.entries(BLOQUES).map(([b, que]) => (
            <div key={b} className="contents">
              <dt className="cifra text-titular">{`{{#${b}}}…{{/${b}}}`}</dt>
              <dd className="text-secundario">{que}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-metadato">
          Y el formato, con estas marcas. Una mal puesta —un «:::» sin cerrar, dos títulos— no deja guardar
          la plantilla, y se dice cuál. Ninguna usa corchetes: un corchete sigue siendo un hueco.
        </p>
        <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
          {MARCAS.map(({ marca, que }) => (
            <div key={marca} className="contents">
              <dt className="cifra whitespace-nowrap text-titular">{marca}</dt>
              <dd className="text-secundario">{que}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
