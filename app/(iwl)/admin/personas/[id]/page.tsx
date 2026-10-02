import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { clienteServidor, esIwl, personaActual } from "@/lib/supabase/servidor";
import {
  Bloque,
  Cifra,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { CvDePersona } from "@/components/formularios/admin";
import { nombrePersona, papel } from "@/lib/etiquetas";
import { fecha, numero } from "@/lib/utils";

export const metadata = { title: "Persona · Administración" };

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

/**
 * La ficha de una persona.
 *
 * La lista de personas llevaba dentro todo lo que se sabe de cada una —el
 * cargo, las áreas, la biografía, cada asignación con sus horas— y con
 * diecinueve personas era un muro. En una lista se busca a alguien; lo que
 * esa persona es se lee cuando ya la has encontrado.
 *
 * Así que la lista se quedó con el nombre, la posición y dónde trabaja, y
 * todo lo demás vive aquí.
 */
export default async function FichaPersona({
  params,
}: PageProps<"/admin/personas/[id]">) {
  const persona = await personaActual();
  if (!persona) redirect("/entrar");
  if (!esIwl(persona.role)) redirect("/proyecto");

  const { id } = await params;
  const supabase = await clienteServidor();

  const { data: ficha } = await supabase
    .from("admin_personas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!ficha) notFound();

  const asignaciones = (ficha.asignaciones ?? []) as unknown as Asignacion[];
  const horas = asignaciones.reduce((a, x) => a + x.imputadas, 0);
  const comprometidas = asignaciones.reduce(
    (a, x) => a + (x.assigned_hours ?? 0),
    0,
  );
  const tareas = asignaciones.reduce((a, x) => a + x.tareas_abiertas, 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <Link
        href="/admin/personas"
        className="enlace mb-6 inline-flex items-center gap-1.5 text-sm text-secundario"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Personas
      </Link>

      <header className="relative mb-8 pl-4">
        <span className="filete-acento absolute inset-y-0 left-0 w-0.5 rounded-full" />
        <h1 className="titular-marca text-3xl text-titular sm:text-4xl">
          {nombrePersona(ficha)}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secundario">
          {ficha.job_title ? <span>{ficha.job_title}</span> : null}
          {ficha.organization_name ? (
            <Metadato>{ficha.organization_name}</Metadato>
          ) : null}
          <Metadato>{ficha.email}</Metadato>
          {ficha.is_active ? null : <Etiqueta>Sin acceso</Etiqueta>}
        </p>
      </header>

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <Bloque className="p-6">
          <Cifra
            etiqueta="Proyectos"
            valor={numero(asignaciones.length)}
            nota={
              asignaciones.length === 0
                ? "Sin asignaciones todavía"
                : "Donde tiene asignación"
            }
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            etiqueta="Horas imputadas"
            valor={comprometidas > 0
              ? `${numero(horas, 1)} de ${numero(comprometidas, 0)}`
              : numero(horas, 1)}
            nota={comprometidas > 0 ? "Sobre lo comprometido" : "Sin compromiso fijado"}
          />
        </Bloque>
        <Bloque className="p-6">
          <Cifra
            etiqueta="Tareas abiertas"
            valor={numero(tareas)}
            nota="Sumando todos sus proyectos"
          />
        </Bloque>
      </div>

      {/*
        Lo que sabe hacer y quién es.
        
        Hoy se escribe a mano desde «Editar». La idea es que esto salga de
        un CV o de LinkedIn sin teclearlo; mientras tanto, al menos tiene
        un sitio donde vivir que no es una lista de diecinueve filas.
      */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Bloque>
          <TituloBloque accion={<Metadato>{papel(ficha.role ?? "")}</Metadato>}>
            Áreas
          </TituloBloque>
          {(ficha.expertise ?? []).length === 0 ? (
            <SinDatos>
              Sin áreas apuntadas. Se añaden desde Editar, en la lista de
              personas.
            </SinDatos>
          ) : (
            <ul className="flex flex-wrap gap-1.5 px-4 py-4">
              {(ficha.expertise ?? []).map((area) => (
                <li key={area}>
                  <Etiqueta>{area}</Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque>
          <TituloBloque>Quién es</TituloBloque>
          {ficha.bio ? (
            <p className="border-b border-filete px-4 py-4 text-sm leading-relaxed text-cuerpo">
              {ficha.bio}
            </p>
          ) : (
            <SinDatos>
              Sin descripción. Se escribe desde Editar, en la lista de personas.
            </SinDatos>
          )}
          {/*
            Y el CV, tal cual lo mandó.
            
            Se guarda sin extraer nada: lo de que una IA lo leyera y
            rellenara el cargo y las áreas se dejó para más adelante. Esto
            resuelve lo inmediato, que es no ir a buscarlo a un correo de
            hace meses.
          */}
          <CvDePersona
            profileId={ficha.id!}
            tieneCv={Boolean(ficha.cv_path)}
          />
        </Bloque>
      </div>

      <Bloque>
        <TituloBloque
          accion={<Metadato>{asignaciones.length} asignaciones</Metadato>}
        >
          En qué proyectos está
        </TituloBloque>

        {asignaciones.length === 0 ? (
          <SinDatos>
            {ficha.role === "admin_iwl" || ficha.role === "equipo_iwl"
              ? "Sin asignaciones. No le hacen falta: IWL ve toda la cartera."
              : "Sin asignaciones, así que no ve ninguna compañía. El rol dice qué puede hacer; la asignación, dónde."}
          </SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {asignaciones.map((a) => {
              const pct =
                a.assigned_hours && a.assigned_hours > 0
                  ? Math.round((a.imputadas / a.assigned_hours) * 100)
                  : null;

              return (
                <li
                  key={`${a.company_id}-${a.member_role}`}
                  className="fila-enlace flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3"
                >
                  <Link
                    href={`/cartera/${a.company_slug}`}
                    className="estirado enlace text-sm font-medium text-titular"
                  >
                    {a.company_name}
                  </Link>
                  <Etiqueta>{papel(a.member_role)}</Etiqueta>
                  {a.title ? <Metadato>{a.title}</Metadato> : null}
                  {a.archivada ? <Metadato>compañía archivada</Metadato> : null}

                  <span className="flex-1" />

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
                  {a.starts_on ? (
                    <Metadato>desde {fecha(a.starts_on)}</Metadato>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Bloque>
    </main>
  );
}
