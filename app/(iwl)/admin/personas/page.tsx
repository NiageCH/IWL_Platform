import { clienteServidor } from "@/lib/supabase/servidor";
import {
  Asignar,
  CambiarRol,
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

export const metadata = { title: "Personas · Administración" };

const PAPELES: Record<string, string> = {
  fundadora: "Equipo fundador",
  responsable_iwl: "Responsable IWL",
  revisor_niage: "Revisora Niage",
  mentor: "Mentoría",
};

interface Asignacion {
  company_id: string;
  company_name: string;
  company_slug: string;
  member_role: string;
}

export default async function AdminPersonas() {
  const supabase = await clienteServidor();

  const [personas, companias] = await Promise.all([
    supabase.from("admin_personas").select("*").order("role").order("email"),
    supabase.from("companies").select("id, name").order("name"),
  ]);

  const lista = (companias.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque
          accion={<Metadato>{(personas.data ?? []).length} con acceso</Metadato>}
        >
          Personas
        </TituloBloque>

        {(personas.data ?? []).length === 0 ? (
          <SinDatos>Nadie tiene acceso todavía.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {(personas.data ?? []).map((p) => {
              const asignaciones = (p.asignaciones ?? []) as unknown as Asignacion[];

              return (
                <li key={p.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-titular">
                      {p.full_name ?? "Sin nombre"}
                      <span className="cifra ml-2 text-xs text-metadato">
                        {p.email}
                      </span>
                    </span>
                    {!p.is_active ? <Etiqueta>Desactivada</Etiqueta> : null}
                    <span className="flex-1" />
                    <CambiarRol
                      profileId={p.id!}
                      rol={p.role!}
                      activa={Boolean(p.is_active)}
                    />
                  </div>

                  {asignaciones.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {asignaciones.map((a) => (
                        <li
                          key={`${a.company_id}-${a.member_role}`}
                          className="flex items-baseline gap-2 text-sm text-secundario"
                        >
                          <span className="text-titular">{a.company_name}</span>
                          <span className="text-xs text-metadato">
                            {PAPELES[a.member_role] ?? a.member_role}
                          </span>
                          <QuitarAsignacion
                            profileId={p.id!}
                            companyId={a.company_id}
                            memberRole={a.member_role}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-metadato">
                      Sin compañías asignadas.
                      {p.role === "revisor_niage" || p.role === "mentor"
                        ? " Con este rol, sin asignación no ve nada."
                        : ""}
                    </p>
                  )}

                  <div className="mt-2">
                    <Asignar profileId={p.id!} companias={lista} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <FormularioPersona companias={lista} />
      </Bloque>

      <Bloque>
        <TituloBloque>Cómo funcionan rol y asignación</TituloBloque>
        <div className="flex flex-col gap-2 px-4 py-4 text-sm text-secundario">
          <p>
            El <span className="text-titular">rol</span> dice qué puede hacer una
            persona en la plataforma. La{" "}
            <span className="text-titular">asignación</span> dice en qué compañías.
            Son cosas distintas: un revisor de Niage sin asignación no ve nada, y
            eso es lo correcto.
          </p>
          <p>
            Los roles de IWL —dirección y equipo— ven toda la cartera sin necesidad
            de asignación. Fundadora, mentoría y revisión técnica solo ven donde
            están asignadas.
          </p>
          <p>
            Quien puntúa el due diligence técnico de una compañía es su revisora de
            Niage asignada, o el equipo de IWL. Nunca la propia compañía.
          </p>
        </div>
      </Bloque>
    </div>
  );
}
