import { Mail } from "lucide-react";
import { clienteServidor } from "@/lib/supabase/servidor";
import { firmarFotos } from "@/lib/datos/logos";
import { nombreCompleto } from "@/lib/etiquetas";
import { Avatar, EnlaceLinkedin } from "@/components/ui/persona";
import { Bloque, TituloBloque } from "@/components/ui/primitivas";

/**
 * «Tu equipo IWL», en el Resumen de la fundadora (REVISION, 13 nov).
 *
 * Hasta ahora no tenía dónde ver quién la lleva: sabía de su mentora por
 * un correo, o por quién le comentaba el plan. Aquí está cada persona de
 * IWL asignada a su compañía, con su papel dicho para ella, su foto, su
 * LinkedIn y su correo para escribirle.
 *
 * Lo que ve lo decide RLS: lee las asignaciones de su compañía y los
 * perfiles de quienes comparten compañía con ella. Nada más.
 */

/** El papel, dicho para la compañía y no para IWL. En este orden */
const PAPELES_PARA_ELLA: Array<[string, string]> = [
  ["mentor_principal", "Mentoría principal"],
  ["revisor_niage", "Mentoría técnica · Niage"],
  ["responsable_iwl", "Tu contacto en IWL"],
  ["mentor_secundario", "Mentoría de apoyo"],
];

interface Miembro {
  member_role: string;
  title: string | null;
  profiles: {
    full_name: string | null;
    last_name: string | null;
    email: string | null;
    job_title: string | null;
    photo_path: string | null;
    linkedin_url: string | null;
    is_active: boolean | null;
  } | null;
}

export async function EquipoIwl({ companyId }: { companyId: string }) {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("company_members")
    .select("member_role, title, profiles ( full_name, last_name, email, job_title, photo_path, linkedin_url, is_active )")
    .eq("company_id", companyId)
    .neq("member_role", "fundadora");

  const orden = new Map(PAPELES_PARA_ELLA.map(([p], i) => [p, i]));
  const equipo = ((data ?? []) as unknown as Miembro[])
    .filter((m) => m.profiles && m.profiles.is_active !== false && orden.has(m.member_role))
    .sort((a, b) => orden.get(a.member_role)! - orden.get(b.member_role)!);
  const fotos = await firmarFotos(equipo.map((m) => m.profiles?.photo_path));
  const papeles = new Map(PAPELES_PARA_ELLA);
  const conMentora = equipo.some((m) => m.member_role === "mentor_principal");

  return (
    <Bloque className="mt-6">
      <TituloBloque>Tu equipo IWL</TituloBloque>
      {conMentora ? null : (
        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          Te asignaremos mentor en cuanto firmemos el Acuerdo.
        </p>
      )}
      {equipo.length > 0 ? (
        <ul className="divide-y divide-filete">
          {equipo.map((m, i) => {
            const p = m.profiles!;
            const nombre = nombreCompleto(p.full_name, p.last_name) || p.email || "";
            return (
              <li key={`${m.member_role}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <Avatar nombre={nombre} foto={fotos.get(p.photo_path ?? "")} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1 text-sm font-medium text-titular">
                    {nombre}
                    <EnlaceLinkedin url={p.linkedin_url} nombre={nombre} />
                  </p>
                  <p className="text-xs text-secundario">
                    {papeles.get(m.member_role)}
                    {m.title || p.job_title ? ` · ${m.title || p.job_title}` : ""}
                  </p>
                </div>
                {p.email ? (
                  <a
                    href={`mailto:${p.email}`}
                    className="accion shrink-0 text-xs"
                    aria-label={`Escribir a ${nombre}`}
                  >
                    <Mail aria-hidden="true" className="size-3.5 text-acento-texto" />
                    <span className="hidden sm:inline">{p.email}</span>
                    <span className="sm:hidden">Escribir</span>
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Bloque>
  );
}
