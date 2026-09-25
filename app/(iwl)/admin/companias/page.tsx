import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  FormularioCohorte,
  FormularioCompania,
} from "@/components/formularios/admin";
import {
  Bloque,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { fecha, numero } from "@/lib/utils";

export const metadata = { title: "Compañías · Administración" };

const ETAPAS: Record<string, string> = {
  pre_semilla: "Pre-semilla",
  semilla: "Semilla",
  serie_a: "Serie A",
};

const PERFILES: Record<string, string> = {
  software: "Software",
  software_ia: "Software con IA",
  hardware: "Hardware",
};

export default async function AdminCompanias() {
  const supabase = await clienteServidor();

  const [companias, fases, cohortes] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "id, name, slug, sector, stage, tech_profile, created_at, phases ( name ), cohorts ( name )",
      )
      .order("name"),
    supabase.from("phases").select("code, name, order_index").order("order_index"),
    supabase.from("cohorts").select("id, name, start_date, end_date, investable_target").order("name"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque
          accion={<Metadato>{(companias.data ?? []).length} en la cartera</Metadato>}
        >
          Compañías
        </TituloBloque>

        {(companias.data ?? []).length === 0 ? (
          <SinDatos>Todavía no hay ninguna compañía dada de alta.</SinDatos>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-filete text-left">
                  <th className="px-4 py-2 font-medium text-metadato">Compañía</th>
                  <th className="px-4 py-2 font-medium text-metadato">Etapa</th>
                  <th className="px-4 py-2 font-medium text-metadato">Perfil</th>
                  <th className="px-4 py-2 font-medium text-metadato">Fase</th>
                  <th className="px-4 py-2 font-medium text-metadato">Cohorte</th>
                  <th className="px-4 py-2 font-medium text-metadato">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-filete">
                {(companias.data ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cartera/${c.slug}`}
                        className="font-medium text-titular underline-offset-4 hover:underline"
                      >
                        {c.name}
                      </Link>
                      <span className="block text-xs text-metadato">
                        {c.sector ?? "Sin sector"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secundario">
                      {ETAPAS[c.stage] ?? c.stage}
                    </td>
                    <td className="px-4 py-3 text-secundario">
                      {PERFILES[c.tech_profile] ?? c.tech_profile}
                    </td>
                    <td className="px-4 py-3 text-secundario">
                      {c.phases?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-secundario">
                      {c.cohorts?.name ?? "Sin cohorte"}
                    </td>
                    <td className="cifra px-4 py-3 text-metadato">
                      {fecha(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <FormularioCompania
          fases={(fases.data ?? []).map((f) => ({ code: f.code, name: f.name }))}
          cohortes={(cohortes.data ?? []).map((c) => ({ id: c.id, name: c.name }))}
        />
      </Bloque>

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
