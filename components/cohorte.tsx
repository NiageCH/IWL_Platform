import Link from "next/link";
import type { DemandaDimension, TramoEmbudo } from "@/lib/datos/cohorte";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { numero } from "@/lib/utils";

/**
 * Lectura de la cohorte (§4.7).
 *
 * Embudo y mapa de intervención. Los dos son barras en el acento de IWL con su
 * cifra al lado: una sola serie, sin paleta que inventar, y la cifra exacta
 * siempre escrita para que la barra no sea la única fuente de información.
 */

export function Embudo({
  tramos,
  objetivo,
}: {
  tramos: TramoEmbudo[];
  objetivo: number | null;
}) {
  const total = tramos.reduce((acc, t) => acc + t.companias.length, 0);
  const maximo = Math.max(1, ...tramos.map((t) => t.companias.length));

  return (
    <Bloque>
      <TituloBloque
        accion={
          <Metadato>
            {objetivo
              ? `Objetivo de cohorte: ${objetivo} invertibles`
              : "Sin objetivo fijado"}
          </Metadato>
        }
      >
        Camino a invertible
      </TituloBloque>

      {total === 0 ? (
        <SinDatos>No hay compañías en seguimiento todavía.</SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {tramos.map((tramo) => (
            <li key={tramo.banda.codigo} className="px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="w-32 shrink-0 text-sm text-titular">
                  {tramo.banda.nombre}
                </span>

                <span className="flex h-4 flex-1 items-center" aria-hidden="true">
                  <span
                    className="block h-full bg-acento"
                    style={{
                      width: `${(tramo.companias.length / maximo) * 100}%`,
                      minWidth: tramo.companias.length > 0 ? "2px" : "0",
                    }}
                  />
                </span>

                <span className="cifra w-24 shrink-0 text-right text-sm text-titular">
                  {tramo.companias.length}{" "}
                  <span className="text-metadato">
                    {tramo.companias.length === 1 ? "compañía" : "compañías"}
                  </span>
                </span>
              </div>

              {tramo.companias.length > 0 ? (
                <p className="mt-1 pl-36 text-xs text-secundario">
                  {tramo.companias.map((c, i) => (
                    <span key={c.slug}>
                      {i > 0 ? " · " : ""}
                      <Link
                        href={`/cartera/${c.slug}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {c.nombre}
                      </Link>{" "}
                      <span className="cifra text-metadato">{numero(c.valor, 0)}</span>
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-filete px-4 py-2.5 text-xs text-metadato">
        Las bandas leen el score de preparación. Estar en la banda alta no es lo
        mismo que ser invertible: eso además exige cero hallazgos críticos
        abiertos y los hitos del Anexo.
      </p>
    </Bloque>
  );
}

export function MapaIntervencion({ mapa }: { mapa: DemandaDimension[] }) {
  const maximo = Math.max(1, ...mapa.map((d) => d.demanda));

  return (
    <Bloque>
      <TituloBloque accion={<Metadato>Dónde rinde más intervenir</Metadato>}>
        Mapa de intervención
      </TituloBloque>

      {mapa.length === 0 ? (
        <SinDatos>
          Todas las compañías alcanzan el objetivo de su etapa en todas las
          dimensiones. No hay brecha que cerrar.
        </SinDatos>
      ) : (
        <ul className="divide-y divide-filete">
          {mapa.map((d) => (
            <li key={d.codigo} className="px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="w-44 shrink-0 text-sm text-titular">{d.nombre}</span>

                <span className="flex h-4 flex-1 items-center" aria-hidden="true">
                  <span
                    className="block h-full bg-acento"
                    style={{ width: `${(d.demanda / maximo) * 100}%`, minWidth: "2px" }}
                  />
                </span>

                <span className="cifra w-28 shrink-0 text-right text-sm text-titular">
                  {numero(d.demanda, 1)}{" "}
                  <span className="text-metadato">demanda</span>
                </span>
              </div>

              <p className="mt-1 text-xs text-secundario sm:pl-48">
                {d.companias.map((c, i) => (
                  <span key={c.slug}>
                    {i > 0 ? " · " : ""}
                    <Link
                      href={`/cartera/${c.slug}/tecnico`}
                      className="underline-offset-4 hover:underline"
                    >
                      {c.nombre}
                    </Link>{" "}
                    <span className="cifra text-metadato">
                      {c.nivel} → {c.objetivo}
                    </span>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-filete px-4 py-2.5 text-xs text-metadato">
        La demanda suma, por dimensión, el peso multiplicado por los niveles que
        faltan en cada compañía. Una brecha grande donde el peso es alto rinde
        más que varias pequeñas donde pesa poco.
      </p>
    </Bloque>
  );
}
