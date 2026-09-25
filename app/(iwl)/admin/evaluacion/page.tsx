import { clienteServidor } from "@/lib/supabase/servidor";
import {
  CeldaNumero,
  guardarObjetivoAccion,
  guardarPesoDimensionAccion,
} from "@/components/formularios/admin";
import { Bloque, Etiqueta, Metadato, TituloBloque } from "@/components/ui/primitivas";

export const metadata = { title: "Evaluación técnica · Administración" };

const ETAPAS = [
  { codigo: "pre_semilla", nombre: "Pre-semilla" },
  { codigo: "semilla", nombre: "Semilla" },
  { codigo: "serie_a", nombre: "Serie A" },
] as const;

const PERFILES = [
  { codigo: "software", nombre: "Software" },
  { codigo: "software_ia", nombre: "Con IA" },
  { codigo: "hardware", nombre: "Hardware" },
] as const;

const APLICABILIDAD: Record<string, string> = {
  siempre: "Siempre",
  ia: "Solo con IA",
  hardware: "Solo hardware",
};

/**
 * Niveles objetivo y pesos.
 *
 * Es la tabla que decide qué significa un score. Mover un objetivo cambia el
 * score de todas las compañías de esa etapa al instante, porque el cálculo lee
 * la configuración de hoy; lo que no cambia son las instantáneas ya tomadas.
 */
export default async function AdminEvaluacion() {
  const supabase = await clienteServidor();

  const [dimensiones, objetivos, pesos] = await Promise.all([
    supabase
      .from("tech_dimensions")
      .select("id, code, name, applicability, order_index")
      .eq("is_active", true)
      .order("order_index"),
    supabase.from("tech_stage_targets").select("id, dimension_id, stage, target_level"),
    supabase
      .from("tech_dimension_weights")
      .select("id, dimension_id, tech_profile, weight"),
  ]);

  const objetivoDe = (dimensionId: string, etapa: string) =>
    (objetivos.data ?? []).find(
      (o) => o.dimension_id === dimensionId && o.stage === etapa,
    );

  const pesoDe = (dimensionId: string, perfil: string) =>
    (pesos.data ?? []).find(
      (p) => p.dimension_id === dimensionId && p.tech_profile === perfil,
    );

  return (
    <div className="flex flex-col gap-6">
      <Bloque>
        <TituloBloque accion={<Metadato>De 0 a 4 por etapa</Metadato>}>
          Niveles objetivo
        </TituloBloque>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-filete text-left">
                <th className="px-4 py-2 font-medium text-metadato">Dimensión</th>
                {ETAPAS.map((e) => (
                  <th key={e.codigo} className="px-4 py-2 font-medium text-metadato">
                    {e.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-filete">
              {(dimensiones.data ?? []).map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5 text-titular">
                    {d.name}
                    {d.applicability !== "siempre" ? (
                      <span className="ml-2">
                        <Etiqueta>{APLICABILIDAD[d.applicability]}</Etiqueta>
                      </span>
                    ) : null}
                  </td>
                  {ETAPAS.map((e) => {
                    const objetivo = objetivoDe(d.id, e.codigo);
                    return (
                      <td key={e.codigo} className="px-4 py-2.5">
                        {objetivo ? (
                          <CeldaNumero
                            accion={guardarObjetivoAccion}
                            id={objetivo.id}
                            campo="target_level"
                            valor={objetivo.target_level}
                            max="4"
                          />
                        ) : (
                          <span className="text-xs text-metadato">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="border-t border-filete px-4 py-3 text-xs text-metadato">
          El score mide la distancia a estos números, no a 4. Un objetivo de 0
          significa que la etapa no exige nada todavía en esa dimensión, y esa
          dimensión cuenta como cubierta. Merece revisarse: unos objetivos bajos
          en pre-semilla dan scores altos a compañías que apenas han empezado.
        </p>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Peso 0 desactiva la dimensión</Metadato>}>
          Pesos por perfil tecnológico
        </TituloBloque>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-filete text-left">
                <th className="px-4 py-2 font-medium text-metadato">Dimensión</th>
                {PERFILES.map((p) => (
                  <th key={p.codigo} className="px-4 py-2 font-medium text-metadato">
                    {p.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-filete">
              {(dimensiones.data ?? []).map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5 text-titular">{d.name}</td>
                  {PERFILES.map((perfil) => {
                    const peso = pesoDe(d.id, perfil.codigo);
                    return (
                      <td key={perfil.codigo} className="px-4 py-2.5">
                        {peso ? (
                          <CeldaNumero
                            accion={guardarPesoDimensionAccion}
                            id={peso.id}
                            campo="weight"
                            valor={Number(peso.weight)}
                            paso="0.5"
                            max="10"
                            ancho="w-20"
                          />
                        ) : (
                          <span className="text-xs text-metadato">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="border-t border-filete px-4 py-3 text-xs text-metadato">
          Así se apagan las dimensiones que no aplican a una compañía, sin
          penalizarla: hardware pesa 0 para software, e IA pesa 0 para quien no
          tiene modelos.
        </p>
      </Bloque>
    </div>
  );
}
