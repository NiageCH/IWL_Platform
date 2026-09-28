import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  FormularioCohorte,
  FormularioCompania,
} from "@/components/formularios/admin";
import {
  ArchivarCompania,
  BorrarCompania,
  EditarCompania,
  type FichaCompania,
} from "@/components/formularios/companias";
import { EstadoEntrada } from "@/components/formularios/plantillas";
import { leerPlantillas } from "@/lib/datos/ruta";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { etapa as nombreEtapa, perfil as nombrePerfil } from "@/lib/etiquetas";
import { fecha, numero } from "@/lib/utils";

export const metadata = { title: "Compañías · Administración" };

const PAPELES: Record<string, string> = {
  fundadora: "fundadora",
  responsable_iwl: "responsable",
  revisor_niage: "revisora",
  mentor_principal: "coordina",
  mentor_secundario: "apoya",
  mentor: "mentoría",
};

interface Miembro {
  profile_id: string;
  full_name: string | null;
  member_role: string;
}

export default async function AdminCompanias() {
  const supabase = await clienteServidor();

  const [companias, fases, cohortes, plantillas] = await Promise.all([
    supabase.from("admin_companias").select("*").order("name"),
    supabase.from("phases").select("id, code, name, order_index").order("order_index"),
    supabase
      .from("cohorts")
      .select("id, name, start_date, end_date, investable_target")
      .order("name"),
    leerPlantillas(),
  ]);

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
                      className="text-sm font-medium text-titular underline-offset-4 hover:underline"
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
                              ? "text-cuerpo underline-offset-4 hover:underline"
                              : "text-acento-texto underline-offset-4 hover:underline"
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
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secundario">
                      {equipo.map((m) => (
                        <span key={`${m.profile_id}-${m.member_role}`}>
                          {m.full_name}
                          <span className="text-metadato">
                            {" "}
                            · {PAPELES[m.member_role] ?? m.member_role}
                          </span>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-metadato">
                      Sin nadie asignado. Nadie de IWL la lleva y su equipo
                      fundador no puede entrar.
                    </p>
                  )}

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
                  className="text-sm text-titular underline-offset-4 hover:underline"
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
