import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  FileSignature,
  Inbox,
  XCircle,
} from "lucide-react";
import { personaActual, esIwl } from "@/lib/supabase/servidor";
import { leerEmbudo, leerCohortes } from "@/lib/datos/candidaturas";
import { ChipCompania } from "@/components/chip-compania";
import {
  Bloque,
  Cifra,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { NuevaCandidatura } from "@/components/formularios/candidatura";
import { Convocatoria } from "@/components/formularios/convocatoria";
import { EnlacePublico } from "@/components/formularios/enlace-publico";
import { direccionBase } from "@/lib/direccion";
import { PASOS_ABIERTOS, nombrePaso, paso, tonoPaso } from "@/lib/embudo";
import { cn, numero, porcentaje } from "@/lib/utils";

export const metadata = { title: "Embudo · Plataforma IWL" };

/**
 * El embudo de selección (§ proceso de convocatoria).
 *
 * Lo que pasa antes de que una startup sea compañía: quién se ha presentado,
 * por dónde va cada una, cuáles se descartaron y por qué.
 *
 * Arriba el recorrido con su cuenta por paso, que es la foto que se mira
 * todos los días. Debajo las candidaturas abiertas, y al final lo cerrado.
 */
export default async function Embudo() {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (!esIwl(persona.role)) redirect("/proyecto");

  const {
    abiertas,
    firmadas,
    descartadas,
    porPaso,
    descartesPorPaso,
    conversion,
  } = await leerEmbudo();

  const cohortes = await leerCohortes();
  const abierta = cohortes.find((c) => c.convocatoria_abierta);
  const base = direccionBase();

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titular-marca text-3xl text-titular sm:text-4xl">
            Embudo
          </h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-secundario">
            Desde que una startup se presenta hasta que firma o se descarta.
            {abierta ? (
              <>
                {" "}
                La convocatoria de <strong>{abierta.name}</strong> está abierta
                {abierta.convocatoria_cierra
                  ? ` hasta el ${abierta.convocatoria_cierra}`
                  : ""}
                .
              </>
            ) : (
              " Ahora mismo no hay ninguna convocatoria abierta."
            )}
          </p>
        </div>
      </header>

      {/*
        La dirección donde se presenta la gente, a la vista.
        
        Estaba solo en el código: para repartirla había que acordarse de la
        ruta y escribirla a mano. Es el enlace que va a un correo o a
        LinkedIn, así que vive aquí, al lado de dónde se abre y se cierra.
      */}
      {abierta ? (
        <div className="tarjeta mb-8 p-5">
          <p className="mb-1 text-sm font-medium text-titular">
            Reparte esta dirección
          </p>
          <p className="mb-3 text-xs text-metadato">
            Ahí se presentan las startups. Mientras la convocatoria esté
            abierta, admite candidaturas; al cerrarla, dice que no hay
            ninguna en curso.
          </p>
          <EnlacePublico base={base} />
        </div>
      ) : null}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Bloque elevacion={2} className="p-6">
          <Cifra
            destacada
            icono={Inbox}
            tono="acento"
            etiqueta="En proceso"
            valor={numero(abiertas.length)}
            nota="Candidaturas vivas ahora mismo"
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            icono={CheckCircle2}
            tono="menta"
            etiqueta="Firmadas"
            valor={numero(firmadas.length)}
            nota="Ya están en la cartera"
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            icono={XCircle}
            tono="mal"
            etiqueta="Descartadas"
            valor={numero(descartadas.length)}
            nota="Con su motivo apuntado"
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            icono={FileSignature}
            tono="cielo"
            etiqueta="De cada 100 cerradas, firman"
            valor={conversion === null ? "—" : porcentaje(conversion, 0)}
            nota={
              conversion === null
                ? "Hacen falta cinco cerradas para que signifique algo"
                : "Sobre firmadas más descartadas"
            }
          />
        </Bloque>
      </div>

      {/* El recorrido, paso a paso */}
      <Bloque className="mb-8">
        <TituloBloque accion={<Metadato>Dónde está cada una</Metadato>}>
          El recorrido
        </TituloBloque>
        <ol className="grid gap-px bg-filete sm:grid-cols-2 lg:grid-cols-4">
          {PASOS_ABIERTOS.map((p) => {
            const cuenta = porPaso.get(p.codigo) ?? 0;

            return (
              <li key={p.codigo} className="bg-papel px-4 py-4">
                <span
                  className={cn("pastilla mb-2", tonoPaso(p.codigo))}
                >
                  {p.nombre}
                </span>
                <p className="cifra text-2xl leading-none text-titular">
                  {cuenta}
                </p>
                <p className="mt-1 text-xs leading-snug text-metadato">
                  {p.descripcion}
                </p>
              </li>
            );
          })}
        </ol>
      </Bloque>

      <Bloque className="mb-8">
        <TituloBloque
          accion={<Metadato>{abiertas.length} en proceso</Metadato>}
        >
          Candidaturas abiertas
        </TituloBloque>

        {abiertas.length === 0 ? (
          <SinDatos>
            No hay ninguna candidatura en proceso. Cuando alguien se presente
            por el formulario aparecerá aquí.
          </SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {abiertas.map((c) => (
              <li key={c.id} className="fila-enlace px-5 py-4">
                <div className="flex items-center gap-3">
                  <ChipCompania nombre={c.nombre ?? ""} />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/embudo/${c.id}`}
                      className="estirado enlace enlace-destacado block truncate font-medium text-titular"
                    >
                      {c.nombre}
                    </Link>
                    <span className="block truncate text-xs text-metadato">
                      {c.sector ?? "Sin sector"}
                      {c.contacto_nombre ? ` · ${c.contacto_nombre}` : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "pastilla shrink-0",
                      tonoPaso(c.estado ?? "presentada"),
                    )}
                  >
                    {nombrePaso(c.estado ?? "presentada")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flecha cifra shrink-0 text-acento-texto"
                  >
                    →
                  </span>
                </div>
                <p className="mt-2 pl-11 text-sm text-secundario">
                  {c.one_liner ?? paso(c.estado ?? "presentada").siguiente}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque>
          <TituloBloque accion={<Metadato>Ya en la cartera</Metadato>}>
            Firmadas
          </TituloBloque>
          {firmadas.length === 0 ? (
            <SinDatos>Todavía no ha firmado ninguna.</SinDatos>
          ) : (
            <ul className="divide-y divide-filete">
              {firmadas.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <ChipCompania nombre={c.nombre ?? ""} />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/embudo/${c.id}`}
                      className="enlace block truncate text-sm text-titular"
                    >
                      {c.nombre}
                    </Link>
                    <span className="block text-xs text-metadato">
                      Firmó el {c.acuerdo_firmado_on ?? "—"}
                      {c.equity_pct !== null
                        ? ` · ${numero(c.equity_pct, 1)} % de equity`
                        : ""}
                    </span>
                  </span>
                  {c.company_slug ? (
                    <Link
                      href={`/cartera/${c.company_slug}`}
                      className="enlace shrink-0 text-xs text-acento-texto"
                    >
                      Ver su ficha
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque>
          <TituloBloque accion={<Metadato>Con su motivo</Metadato>}>
            Descartadas
          </TituloBloque>

          {descartesPorPaso.length > 0 ? (
            <div className="border-b border-filete px-5 py-3">
              <p className="mb-2 text-xs text-metadato">
                Dónde se caen. Es la pregunta por la que se cambia un proceso.
              </p>
              <ul className="flex flex-wrap gap-2">
                {descartesPorPaso.map((d) => (
                  <li key={d.paso} className="pastilla">
                    {d.nombre} · {d.cuenta}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {descartadas.length === 0 ? (
            <SinDatos>No se ha descartado ninguna todavía.</SinDatos>
          ) : (
            <ul className="divide-y divide-filete">
              {descartadas.slice(0, 8).map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <Link
                    href={`/embudo/${c.id}`}
                    className="enlace text-sm text-titular"
                  >
                    {c.nombre}
                  </Link>
                  <p className="text-xs text-metadato">
                    {c.descartada_desde
                      ? `En ${nombrePaso(c.descartada_desde).toLowerCase()} · `
                      : ""}
                    {c.descartada_motivo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <Bloque>
          <NuevaCandidatura
            cohortes={cohortes.map((c) => ({ id: c.id, name: c.name }))}
          />
        </Bloque>

        {persona.role === "admin_iwl" ? (
          <Bloque>
            <Convocatoria
              cohortes={cohortes.map((c) => ({
                id: c.id,
                name: c.name,
                abierta: c.convocatoria_abierta ?? false,
                cierra: c.convocatoria_cierra,
              }))}
            />
          </Bloque>
        ) : null}
      </div>
    </main>
  );
}
