import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  FormularioCohorte,
  FormularioCompania,
} from "@/components/formularios/admin";
import {
  AnadirAlEquipo,
  ArchivarCompania,
  BorrarCompania,
  EditarCompania,
  type Asignable,
  type FichaCompania,
} from "@/components/formularios/companias";
import { QuitarAsignacion } from "@/components/formularios/admin";
import { EstadoEntrada } from "@/components/formularios/plantillas";
import { leerPlantillas } from "@/lib/datos/ruta";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import {
  etapa as nombreEtapa,
  nombrePersona,
  papel,
  perfil as nombrePerfil,
} from "@/lib/etiquetas";
import { fecha, numero } from "@/lib/utils";

export const metadata = { title: "Compañías · Administración" };

interface Miembro {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  member_role: string;
  assigned_hours: number | null;
  imputadas: number | null;
}

export default async function AdminCompanias() {
  const supabase = await clienteServidor();

  const [companias, fases, cohortes, plantillas, asignables] = await Promise.all([
    supabase.from("admin_companias").select("*").order("name"),
    supabase.from("phases").select("id, code, name, order_index").order("order_index"),
    supabase
      .from("cohorts")
      .select("id, name, start_date, end_date, investable_target")
      .order("name"),
    leerPlantillas(),
    supabase
      .from("personas_asignables")
      .select(
        "id, full_name, email, job_title, expertise, proyectos, horas_comprometidas",
      )
      .order("full_name"),
  ]);

  const equipoDisponible: Asignable[] = (asignables.data ?? []).map((p) => ({
    id: p.id!,
    full_name: p.full_name,
    job_title: p.job_title,
    email: p.email,
    expertise: p.expertise ?? [],
    proyectos: Number(p.proyectos ?? 0),
    horas_comprometidas: Number(p.horas_comprometidas ?? 0),
  }));

  const todas = companias.data ?? [];
  const activas = todas.filter((c) => c.archived_at === null);
  const archivadas = todas.filter((c) => c.archived_at !== null);

  const listaFases = (fases.data ?? []).map((f) => ({ id: f.id, name: f.name }));
  const listaCohortes = (cohortes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const ficha = (c: (typeof todas)[number]): FichaCompania => ({
    id: c.id!,
    name: c.name!,
    slug: c.slug!,
    sector: c.sector,
    one_liner: c.one_liner,
    stage: c.stage!,
    tech_profile: c.tech_profile!,
    phase_id: c.phase_id,
    cohort_id: c.cohort_id,
    archivada: c.archived_at !== null,
    tiene_actividad: c.tiene_actividad ?? true,
  });

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque accion={<Metadato>{activas.length} en la cartera</Metadato>}>
          Compañías
        </TituloBloque>

        {activas.length === 0 ? (
          <SinDatos>Todavía no hay ninguna compañía dada de alta.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {activas.map((c) => {
              const equipo = (c.equipo ?? []) as unknown as Miembro[];

              return (
                <li key={c.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link
                      href={`/cartera/${c.slug}`}
                      className="enlace enlace-destacado text-sm font-medium text-titular"
                    >
                      {c.name}
                    </Link>
                    <Metadato>{c.sector ?? "Sin sector"}</Metadato>
                    <span className="flex-1" />
                    <Etiqueta>{nombreEtapa(c.stage!)}</Etiqueta>
                    <Etiqueta>{nombrePerfil(c.tech_profile!)}</Etiqueta>
                  </div>

                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    <div className="flex gap-2">
                      <dt className="text-metadato">Entró en</dt>
                      <dd>
                        <EstadoEntrada id={c.id!} valor={c.entry_state} />
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-metadato">Fase</dt>
                      <dd className="text-cuerpo">{c.phase_name ?? "—"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-metadato">Cohorte</dt>
                      <dd className="text-cuerpo">{c.cohort_name ?? "Sin cohorte"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-metadato">Hoja de ruta</dt>
                      <dd>
                        <Link
                          href={`/cartera/${c.slug}/ruta`}
                          className={
                            (c.etapas ?? 0) > 0
                              ? "enlace text-cuerpo"
                              : "enlace text-acento-texto"
                          }
                        >
                          {(c.etapas ?? 0) > 0
                            ? `${numero(c.etapas ?? 0, 0)} etapas`
                            : "Diseñarla"}
                        </Link>
                      </dd>
                    </div>
                  </dl>

                  {equipo.length > 0 ? (
                    <ul className="mt-2 divide-y divide-filete border-l-2 border-filete pl-3">
                      {equipo.map((m) => (
                        <li
                          key={`${m.profile_id}-${m.member_role}`}
                          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1.5"
                        >
                          <span className="text-sm text-cuerpo">
                            {nombrePersona(m)}
                          </span>
                          <Etiqueta>
                            {papel(m.member_role)}
                          </Etiqueta>
                          {m.job_title ? <Metadato>{m.job_title}</Metadato> : null}
                          {m.assigned_hours !== null ? (
                            <span className="cifra text-xs text-metadato">
                              {numero(m.imputadas ?? 0, 1)} de{" "}
                              {numero(m.assigned_hours, 0)} h
                            </span>
                          ) : null}
                          <span className="flex-1" />
                          <QuitarAsignacion
                            profileId={m.profile_id}
                            companyId={c.id!}
                            memberRole={m.member_role}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-metadato">
                      Sin nadie asignado. Nadie de IWL la lleva y su equipo
                      fundador no puede entrar.
                    </p>
                  )}

                  <div className="-mx-4 mt-2">
                    <AnadirAlEquipo companyId={c.id!} personas={equipoDisponible} />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <EditarCompania
                      compania={ficha(c)}
                      fases={listaFases}
                      cohortes={listaCohortes}
                    />
                    <ArchivarCompania compania={ficha(c)} />
                    <BorrarCompania compania={ficha(c)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <FormularioCompania
          fases={(fases.data ?? []).map((f) => ({ code: f.code, name: f.name }))}
          cohortes={listaCohortes}
          plantillas={plantillas.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            estadoEntrada: p.estadoEntrada,
            etapas: p.etapas.length,
            hitos: p.etapas.reduce((t, e) => t + e.hitos.length, 0),
          }))}
        />
      </Bloque>

      {archivadas.length > 0 ? (
        <Bloque>
          <TituloBloque accion={<Metadato>{archivadas.length} fuera del programa</Metadato>}>
            Archivadas
          </TituloBloque>
          <p className="border-b border-filete px-4 py-3 text-xs text-secundario">
            Su equipo fundador ya no las ve. IWL sí, porque el histórico de una
            compañía que pasó por el programa es lo que justifica la
            participación acordada.
          </p>
          <ul className="divide-y divide-filete">
            {archivadas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-3 px-4 py-3">
                <Link
                  href={`/cartera/${c.slug}`}
                  className="enlace text-sm text-titular"
                >
                  {c.name}
                </Link>
                <Metadato>
                  Archivada el {fecha(c.archived_at)}
                  {c.archive_reason ? ` · ${c.archive_reason}` : ""}
                </Metadato>
                <span className="flex-1" />
                <ArchivarCompania compania={ficha(c)} />
                <BorrarCompania compania={ficha(c)} />
              </li>
            ))}
          </ul>
        </Bloque>
      ) : null}

      <Bloque>
        <TituloBloque accion={<Metadato>Objetivo interno de cada una</Metadato>}>
          Cohortes
        </TituloBloque>

        {(cohortes.data ?? []).length === 0 ? (
          <SinDatos>No hay cohortes creadas.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {(cohortes.data ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-3 px-4 py-3">
                <span className="text-sm font-medium text-titular">{c.name}</span>
                <Metadato>
                  {fecha(c.start_date)} — {fecha(c.end_date)}
                </Metadato>
                <span className="flex-1" />
                {c.investable_target ? (
                  <Etiqueta>
                    Objetivo: {numero(c.investable_target, 0)} invertibles
                  </Etiqueta>
                ) : (
                  <Metadato>Sin objetivo fijado</Metadato>
                )}
              </li>
            ))}
          </ul>
        )}

        <FormularioCohorte />
      </Bloque>
    </div>
  );
}
