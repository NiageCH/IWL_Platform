import Link from "next/link";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import {
  ArchivarPersona,
  Asignar,
  BorrarPersona,
  CambiarRol,
  Contrasena,
  CorregirCorreo,
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
import { nombrePersona, papel } from "@/lib/etiquetas";


export const metadata = { title: "Personas · Administración" };

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
  const yo = await personaActual();

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
        {/*
          Nombre, posición y correo. Nada más.
          
          Aquí llevaba también las áreas, la biografía y el detalle de cada
          asignación, y con diecinueve personas era un muro de texto por el
          que no se podía buscar a nadie. En una lista se busca; lo que esa
          persona es se lee en su ficha.
        */}
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            href={`/admin/personas/${p.id}`}
            className="enlace enlace-destacado text-sm font-medium text-titular"
          >
            {nombrePersona(p)}
          </Link>
          {p.job_title ? (
            <span className="text-xs text-secundario">{p.job_title}</span>
          ) : null}
          <Metadato>{p.email}</Metadato>
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
              : "Sin asignaciones, así que no ve ninguna compañía."}
          </p>
        ) : (
          /*
            Dónde está y con qué papel, en una línea. Las horas, las tareas
            y las fechas se leen en su ficha: aquí solo estorban para lo que
            se viene a hacer, que es encontrar a alguien y darle o quitarle
            acceso.
          */
          <ul className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5">
            {asignaciones.map((a) => (
              <li
                key={`${a.company_id}-${a.member_role}`}
                className="flex items-baseline gap-2"
              >
                <Link
                  href={`/cartera/${a.company_slug}`}
                  className="enlace text-sm text-cuerpo"
                >
                  {a.company_name}
                </Link>
                <Etiqueta>{papel(a.member_role)}</Etiqueta>
                <QuitarAsignacion
                  profileId={p.id!}
                  companyId={a.company_id}
                  memberRole={a.member_role}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="flex w-full flex-wrap items-center gap-4">
          <EditarPersona
            persona={{
              id: p.id!,
              full_name: p.full_name,
              role: p.role!,
              job_title: p.job_title,
              expertise: p.expertise,
              bio: p.bio,
            }}
          />
          <CorregirCorreo
            id={p.id!}
            email={p.email!}
            editable={p.correo_editable ?? false}
          />
          <Contrasena
            id={p.id!}
            email={p.email!}
            haEntrado={!(p.correo_editable ?? false)}
            esMia={p.id === yo?.id}
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
