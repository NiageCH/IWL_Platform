import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { personaActual, esIwl, clienteServidor } from "@/lib/supabase/servidor";
import { leerCandidatura } from "@/lib/datos/candidaturas";
import { ChipCompania } from "@/components/chip-compania";
import { ExpedienteCandidata } from "@/components/vistas/expediente-candidata";
import {
  Bloque,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import {
  AccesoCandidata,
  AcuerdoCandidatura,
  AnotarEvento,
  DescartarCandidatura,
  EnlacesCandidatura,
  FirmarAcuerdo,
  MoverCandidatura,
  ReabrirCandidatura,
} from "@/components/formularios/candidatura";
import { PASOS_ABIERTOS, nombrePaso, paso, tonoPaso } from "@/lib/embudo";
import { cn, numero } from "@/lib/utils";

const ESTADOS_ENTRADA: Record<string, string> = {
  idea: "Idea",
  prototipo: "Prototipo",
  mvp: "MVP",
  primeros_clientes: "Primeros clientes",
  facturacion: "Facturación",
};

const TIPOS_EVENTO: Record<string, string> = {
  cambio_estado: "Cambio de paso",
  reunion: "Reunión",
  comite: "Comité",
  nota: "Nota",
};

export default async function FichaCandidatura({
  params,
}: PageProps<"/embudo/[id]">) {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (!esIwl(persona.role)) redirect("/proyecto");

  const { id } = await params;
  const datos = await leerCandidatura(id);
  if (!datos) notFound();

  const { candidatura: c, enlaces, eventos, peticiones, documentos, avance } =
    datos;
  const estado = c.estado ?? "presentada";

  const supabase = await clienteServidor();
  const [plantillas, fases] = await Promise.all([
    supabase.from("roadmap_templates").select("id, name").order("name"),
    supabase.from("phases").select("code, name").order("order_index"),
  ]);

  const indice = PASOS_ABIERTOS.findIndex((p) => p.codigo === estado);

  /*
   * La dirección de la plataforma, para poder enseñar el enlace entero y
   * que se pueda copiar. En Vercel llega por `VERCEL_PROJECT_PRODUCTION_URL`;
   * en local, por lo que haya configurado o localhost.
   */
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <Link href="/embudo" className="enlace text-sm text-metadato">
        ← Embudo
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-start gap-4">
        <ChipCompania nombre={c.nombre ?? ""} tamano="md" />
        <div className="min-w-0 flex-1">
          <h1 className="titular-marca text-3xl text-titular">{c.nombre}</h1>
          <p className="mt-1 text-sm text-secundario">
            {c.one_liner ?? "Sin descripción todavía."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn("pastilla", tonoPaso(estado))}>
              {nombrePaso(estado)}
            </span>
            {c.sector ? <span className="pastilla">{c.sector}</span> : null}
            {c.cohorte ? <span className="pastilla">{c.cohorte}</span> : null}
            {c.website ? (
              <a
                href={c.website}
                target="_blank"
                rel="noreferrer noopener"
                className="enlace text-xs text-acento-texto"
              >
                {c.website}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* Dónde está, en el recorrido entero */}
      {estado !== "descartada" && estado !== "firmada" ? (
        <Bloque className="mb-6">
          <TituloBloque
            accion={<Metadato>{paso(estado).siguiente}</Metadato>}
          >
            Por dónde va
          </TituloBloque>
          <ol className="flex flex-wrap gap-1 px-5 py-4">
            {PASOS_ABIERTOS.map((p, i) => (
              <li
                key={p.codigo}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs",
                  i < indice && "text-metadato line-through",
                  i === indice &&
                    "bg-acento-solido font-semibold text-white",
                  i > indice && "text-secundario",
                )}
              >
                {p.nombre}
              </li>
            ))}
          </ol>
          <div className="border-t border-filete px-5 py-4">
            <MoverCandidatura id={c.id!} estado={estado} />
          </div>
        </Bloque>
      ) : null}

      {estado === "descartada" ? (
        <Bloque className="mb-6">
          <TituloBloque
            accion={
              <Metadato>
                {c.descartada_desde
                  ? `Se cayó en ${nombrePaso(c.descartada_desde).toLowerCase()}`
                  : ""}
              </Metadato>
            }
          >
            Descartada
          </TituloBloque>
          <div className="px-5 py-4">
            <p className="text-sm text-cuerpo">{c.descartada_motivo}</p>
            <div className="mt-4">
              <ReabrirCandidatura id={c.id!} />
            </div>
          </div>
        </Bloque>
      ) : null}

      {estado === "firmada" && c.company_slug ? (
        <Bloque className="mb-6">
          <TituloBloque accion={<Metadato>Ya es compañía</Metadato>}>
            Firmada
          </TituloBloque>
          <div className="px-5 py-4 text-sm text-cuerpo">
            Firmó el {c.acuerdo_firmado_on}
            {c.equity_pct !== null
              ? `, con un ${numero(c.equity_pct, 1)} % de equity`
              : ""}
            .{" "}
            <Link
              href={`/cartera/${c.company_slug}`}
              className="enlace text-acento-texto"
            >
              Ver su ficha en la cartera
            </Link>
          </div>
        </Bloque>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-6">
          <Bloque>
            <TituloBloque accion={<Metadato>{enlaces.length}</Metadato>}>
              Lo que ha mandado
            </TituloBloque>
            <div className="px-5 py-4">
              <EnlacesCandidatura
                candidaturaId={c.id!}
                enlaces={enlaces.map((e) => ({
                  id: e.id,
                  titulo: e.titulo,
                  url: e.url,
                  tipo: e.tipo,
                }))}
              />
            </div>
          </Bloque>

          {/*
            El expediente del due diligence.
            
            Va antes del histórico porque mientras dura un due diligence, lo
            que se mira al abrir una ficha es qué falta por entregar.
          */}
          <Bloque>
            <TituloBloque
              accion={
                <Metadato>
                  {avance
                    ? `${avance.cumplidas} de ${avance.total} obligatorios`
                    : "Se pide al firmar el NDA"}
                </Metadato>
              }
            >
              Documentación del due diligence
            </TituloBloque>
            <ExpedienteCandidata
              candidaturaId={c.id!}
              peticiones={peticiones}
              documentos={documentos}
              avance={avance}
            />
          </Bloque>

          <Bloque>
            <TituloBloque accion={<Metadato>Lo más reciente arriba</Metadato>}>
              Qué ha pasado
            </TituloBloque>

            {eventos.length === 0 ? (
              <SinDatos>
                Nada anotado todavía. Las reuniones y el informe de comité van
                aquí.
              </SinDatos>
            ) : (
              <ul className="divide-y divide-filete">
                {eventos.map((e) => (
                  <li key={e.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="pastilla">
                        {TIPOS_EVENTO[e.tipo] ?? e.tipo}
                      </span>
                      <span className="cifra text-xs text-metadato">
                        {e.ocurrido_on}
                      </span>
                      {e.titulo ? (
                        <span className="text-sm font-medium text-titular">
                          {e.titulo}
                        </span>
                      ) : null}
                    </div>
                    {e.tipo === "cambio_estado" ? (
                      <p className="mt-1 text-xs text-metadato">
                        {e.desde ? nombrePaso(e.desde) : "—"} →{" "}
                        {e.hasta ? nombrePaso(e.hasta) : "—"}
                      </p>
                    ) : null}
                    {e.detalle ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-secundario">
                        {e.detalle}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-filete">
              <AnotarEvento candidaturaId={c.id!} />
            </div>
          </Bloque>
        </div>

        <div className="flex flex-col gap-6">
          <Bloque>
            <TituloBloque>Con quién se habla</TituloBloque>
            <dl className="flex flex-col gap-2 px-5 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-metadato">Nombre</dt>
                <dd className="text-right text-cuerpo">
                  {c.contacto_nombre}
                  {c.contacto_cargo ? ` · ${c.contacto_cargo}` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-metadato">Correo</dt>
                <dd className="text-right">
                  <a
                    href={`mailto:${c.contacto_email}`}
                    className="enlace text-cuerpo"
                  >
                    {c.contacto_email}
                  </a>
                </dd>
              </div>
              {c.contacto_telefono ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-metadato">Teléfono</dt>
                  <dd className="text-right text-cuerpo">
                    {c.contacto_telefono}
                  </dd>
                </div>
              ) : null}
              {c.pais ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-metadato">País</dt>
                  <dd className="text-right text-cuerpo">{c.pais}</dd>
                </div>
              ) : null}
              {c.origen ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-metadato">Cómo llegó</dt>
                  <dd className="text-right text-cuerpo">{c.origen}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-metadato">Dice estar en</dt>
                <dd className="text-right text-cuerpo">
                  {c.estado_declarado
                    ? ESTADOS_ENTRADA[c.estado_declarado]
                    : "Sin decir"}
                </dd>
              </div>
              {c.equipo_personas !== null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-metadato">Equipo</dt>
                  <dd className="text-right text-cuerpo">
                    {c.equipo_personas} personas
                  </dd>
                </div>
              ) : null}
            </dl>
          </Bloque>

          <Bloque>
            <TituloBloque
              accion={
                <Metadato>
                  {c.profile_id ? "Con cuenta" : "Con enlace privado"}
                </Metadato>
              }
            >
              Qué ve ella
            </TituloBloque>
            <AccesoCandidata
              id={c.id!}
              token={c.token}
              tieneCuenta={Boolean(c.profile_id)}
              correo={c.contacto_email ?? ""}
              base={base}
            />
          </Bloque>

          <Bloque>
            <TituloBloque accion={<Metadato>NDA, estado y equity</Metadato>}>
              El acuerdo
            </TituloBloque>
            <div className="px-5 py-4">
              <AcuerdoCandidatura
                id={c.id!}
                nda={c.nda_firmado_on}
                propuesto={c.acuerdo_propuesto_on}
                verificado={c.estado_verificado}
                equity={c.equity_pct}
                aportacion={c.aportacion_propuesta}
              />
            </div>
          </Bloque>

          {estado !== "firmada" && estado !== "descartada" ? (
            <Bloque>
              <FirmarAcuerdo
                id={c.id!}
                nombre={c.nombre ?? ""}
                plantillas={plantillas.data ?? []}
                fases={fases.data ?? []}
              />
              <DescartarCandidatura id={c.id!} />
            </Bloque>
          ) : null}
        </div>
      </div>
    </main>
  );
}
