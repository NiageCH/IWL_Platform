import Link from "next/link";
import { ChipCompania } from "@/components/chip-compania";
import { Estado } from "@/components/ui/estado";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";
import { Recordar } from "@/components/formularios/recordar";
import { VIAS } from "@/lib/comite";
import type { FilaEntrada } from "@/lib/datos/entrada";

const QUIEN: Record<FilaEntrada["paso"]["quien"], string> = {
  ella: "le toca a ella",
  iwl: "le toca a IWL",
  direccion: "le toca a dirección",
};

/** Una pieza del diagnóstico de Construcción, con su estado en palabra */
function Pieza({ hecho, texto }: { hecho: boolean; texto: string }) {
  return <Estado valor={hecho ? "hecho" : "pendiente"} rotulo={texto} />;
}

/**
 * «En entrada», al lado de la cartera: las compañías que ya existen —NDA
 * firmado por las dos partes— y todavía no tienen Acuerdo. No cuentan en
 * la cartera ni en ninguna media, así que aquí es donde se ven.
 *
 * Cada fila dice su vía y su paso, y a quién le toca. En Aceleración, el
 * avance del due diligence, «Recordar» y «Validar»; en Construcción, el
 * diagnóstico: reunión, ficha y situación.
 */
export function EnEntrada({ filas, direccion }: { filas: FilaEntrada[]; direccion: string }) {
  if (!filas.length) return null;

  return (
    <Bloque className="mb-8">
      <TituloBloque accion={<Metadato>{filas.length} sin Acuerdo todavía</Metadato>}>En entrada</TituloBloque>
      <ul className="divide-y divide-filete">
        {filas.map((f) => (
          <li key={f.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ChipCompania nombre={f.nombre} logo={f.logo} tamano="sm" />
              <Link href={`/cartera/${f.slug}`} className="enlace min-w-0 text-sm font-medium text-titular">
                {f.nombre}
              </Link>
              {f.via ? <span className="pastilla">{VIAS[f.via]}</span> : <span className="pastilla">Sin vía</span>}
              {f.tope ? (
                <Estado valor={f.tope} rotulo={`${f.dias} días sin Acuerdo`} />
              ) : (
                <span className="cifra text-xs text-metadato">
                  {f.dias === 1 ? "1 día" : `${f.dias} días`} en entrada
                </span>
              )}
            </div>

            <p className="text-sm text-cuerpo">
              {f.paso.texto}
              <span className="text-metadato"> · {QUIEN[f.paso.quien]}</span>
            </p>

            {f.via === "aceleracion" ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="cifra text-xs text-secundario">
                  Due diligence: {f.obligatoriosHechos} de {f.obligatorios} obligatorios validados
                </span>
                <Link href={`/cartera/${f.slug}/diligencia`} className="accion text-xs">
                  Validar
                </Link>
                {f.fundadora && f.obligatoriosHechos < f.obligatorios ? (
                  <Recordar
                    personaId={f.fundadora.id}
                    paso="due_diligence"
                    nombre={f.fundadora.nombre}
                    correo={f.fundadora.correo}
                    direccion={direccion}
                  />
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-secundario">Diagnóstico:</span>
                <Pieza hecho={f.diagnostico.reunion} texto="Reunión" />
                <Pieza hecho={f.diagnostico.ficha} texto="Ficha" />
                <Pieza hecho={f.diagnostico.situacion} texto="Situación" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Bloque>
  );
}
