import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  ArchivarPersona,
  Asignar,
  BorrarPersona,
  CambiarRol,
  EditarPersona,
  FormularioPersona,
  QuitarAsignacion,
} from "@/components/formularios/admin";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { numero } from "@/lib/utils";

export const metadata = { title: "Personas · Administración" };

const PAPELES: Record<string, string> = {
  fundadora: "Equipo fundador",
  responsable_iwl: "Responsable IWL",
  revisor_niage: "Revisora Niage",
  mentor_principal: "Coordina",
  mentor_secundario: "Apoyo",
  mentor: "Mentoría (obsoleto)",
};

interface Asignacion {
  company_id: string;
  company_name: string;
  company_slug: string;
  archivada: boolean;
  member_role: string;
  title: string | null;
  assigned_hours: number | null;
  rate_profile: string | null;
  starts_on: string | null;
  ends_on: string | null;
  imputadas: number;
  tareas_abiertas: number;
}

export default async function AdminPersonas() {
  const supabase = await clienteServidor();

  const [personas, companias] = await Promise.all([
    supabase.from("admin_personas").select("*").order("role").order("email"),
    supabase
      .from("companies")
      .select("id, name, archived_at")
      .is("archived_at", null)
      .order("name"),
  ]);

  const todas = personas.data ?? [];
  const activas = todas.filter((p) => p.is_active);
  const archivadas = todas.filter((p) => !p.is_active);
  const lista = (companias.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  function Persona({ p }: { p: (typeof todas)[number] }) {
    const asignaciones = (p.asignaciones ?? []) as unknown as Asignacion[];

    return (
      <li className="flex flex-wrap items-baseline gap-x-3 gap-y-2 px-4 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-medium text-titular">
            {p.full_name ?? "Sin nombre"}
          </span>
          <Metadato>{p.email}</Metadato>
          {p.organization_name ? (
            <Metadato>{p.organization_name}</Metadato>
          ) : null}
        </div>

        <CambiarRol
          profileId={p.id!}
          rol={p.role!}
          activa={p.is_active ?? false}
        />

        {asignaciones.length === 0 ? (
          <p className="w-full text-xs text-metadato">
            {p.role === "admin_iwl" || p.role === "equipo_iwl"
              ? "Sin asignaciones. No le hacen falta: IWL ve toda la cartera."
              : "Sin asignaciones, así que no ve ninguna compañía. El rol dice qué puede hacer; la asignación, dónde."}
          </p>
        ) : (
          <ul className="w-full divide-y divide-filete border-l-2 border-filete pl-3">
            {asignaciones.map((a) => {
              const pct =
                a.assigned_hours && a.assigned_hours > 0
                  ? Math.round((a.imputadas / a.assigned_hours) * 100)
                  : null;

              return (
                <li
                  key={`${a.company_id}-${a.member_role}`}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1.5"
                >
                  <Link
                    href={`/cartera/${a.company_slug}`}
                    className="text-sm text-cuerpo underline-offset-4 hover:underline"
                  >
                    {a.company_name}
                  </Link>
                  <Etiqueta>{PAPELES[a.member_role] ?? a.member_role}</Etiqueta>
                  {a.title ? <Metadato>{a.title}</Metadato> : null}
                  {a.archivada ? <Metadato>compañía archivada</Metadato> : null}

                  {a.assigned_hours !== null ? (
                    <span
                      className={`cifra text-xs ${
                        pct !== null && pct > 100 ? "text-aviso" : "text-metadato"
                      }`}
                    >
                      {numero(a.imputadas, 1)} de {numero(a.assigned_hours, 0)} h
                      {pct === null ? "" : ` · ${pct} %`}
                    </span>
                  ) : null}

                  {a.tareas_abiertas > 0 ? (
                    <Metadato>
                      {a.tareas_abiertas}{" "}
                      {a.tareas_abiertas === 1 ? "tarea" : "tareas"}
                    </Metadato>
                  ) : null}

                  <span className="flex-1" />
                  <QuitarAsignacion
                    profileId={p.id!}
                    companyId={a.company_id}
                    memberRole={a.member_role}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex w-full flex-wrap items-center gap-4">
          <EditarPersona
            persona={{ id: p.id!, full_name: p.full_name, role: p.role! }}
          />
          <ArchivarPersona id={p.id!} activa={p.is_active ?? false} />
          <BorrarPersona
            persona={{
              id: p.id!,
              email: p.email!,
              tiene_actividad: p.tiene_actividad ?? true,
            }}
          />
        </div>

        {p.is_active ? (
          <div className="w-full">
            <Asignar profileId={p.id!} companias={lista} />
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque accion={<Metadato>{activas.length} con acceso</Metadato>}>
          Personas
        </TituloBloque>

        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          El <strong className="font-medium text-titular">rol</strong> dice qué
          puede hacer una persona; la{" "}
          <strong className="font-medium text-titular">asignación</strong>, en
          qué proyectos. Son cosas distintas: una revisora de Niage sin
          asignación no ve nada, y la misma mentora coordina un proyecto y
          entra de apoyo en otro.
        </p>

        {activas.length === 0 ? (
          <SinDatos>Nadie tiene acceso todavía.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {activas.map((p) => (
              <Persona key={p.id} p={p} />
            ))}
          </ul>
        )}

        <FormularioPersona companias={lista} />
      </Bloque>

      {archivadas.length > 0 ? (
        <Bloque>
          <TituloBloque accion={<Metadato>{archivadas.length} sin acceso</Metadato>}>
            Archivadas
          </TituloBloque>
          <p className="border-b border-filete px-4 py-3 text-xs text-secundario">
            No entran, pero sus horas, sus validaciones y sus tareas siguen
            llevando su nombre. Un extracto de aportación donde las horas las
            puso «alguien que ya no está» no justifica nada.
          </p>
          <ul className="divide-y divide-filete">
            {archivadas.map((p) => (
              <Persona key={p.id} p={p} />
            ))}
          </ul>
        </Bloque>
      ) : null}
    </div>
  );
}
