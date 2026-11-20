import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaResumen } from "@/components/vistas/resumen";
import { EntradaFundadora } from "@/components/vistas/entrada";
import { EquipoIwl } from "@/components/vistas/equipo-iwl";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { leerAvisosParaMi } from "@/lib/datos/onboarding";
import { AvisosParaMi } from "@/components/vistas/alta";

export default async function ResumenProyecto() {
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);
  // Lo que le toca: confirmar horas, por ahora (REVISION, 13 nov)
  const persona = await personaActual();
  const avisos = persona ? await leerAvisosParaMi(persona.id) : [];

  // El borrador no le llega (RLS): lo que vea aquí ya se le ha propuesto
  let propuesta: string | null = null;
  if (resumen.compania.tramo === "entrada") {
    const supabase = await clienteServidor();
    const { data } = await supabase
      .from("annexes")
      .select("status")
      .eq("company_id", resumen.compania.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    propuesta = data?.status ?? null;
  }

  return (
    <>
      <CabeceraProyecto resumen={resumen}
        movimiento={movimiento} base="/proyecto" seccionActiva="resumen" />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <AvisosParaMi avisos={avisos} titulo="Te toca" />
        {resumen.compania.tramo === "entrada" ? <EntradaFundadora compania={resumen.compania} propuesta={propuesta} /> : null}
        <VistaResumen resumen={resumen} />
        <EquipoIwl companyId={resumen.compania.id} />
      </main>
    </>
  );
}
