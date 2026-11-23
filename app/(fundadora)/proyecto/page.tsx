import { ListaDeEntrada } from "@/components/vistas/hoja";
import { leerListaEntrada } from "@/lib/datos/hoja";
import { companiaDeLaPersona } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaResumen } from "@/components/vistas/resumen";
import { EntradaFundadora } from "@/components/vistas/entrada";
import { EquipoIwl } from "@/components/vistas/equipo-iwl";
import { clienteServidor, personaActual } from "@/lib/supabase/servidor";
import { leerAvisosParaMi } from "@/lib/datos/onboarding";
import { AvisosParaMi } from "@/components/vistas/alta";
import { leerLoQueLeToca } from "@/lib/datos/le-toca";

export default async function ResumenProyecto() {
  const resumen = await companiaDeLaPersona();
  const movimiento = await leerMovimiento(resumen.compania.id);
  // Lo que le toca: confirmar horas (13 nov), el avance del mes y los hitos que vencen (20 nov)
  const persona = await personaActual();
  const [avisos, calculados] = await Promise.all([
    persona ? leerAvisosParaMi(persona.id) : Promise.resolve([]),
    resumen.compania.tramo === "entrada" ? Promise.resolve([]) : leerLoQueLeToca(resumen.compania.id),
  ]);

  const lista = resumen.compania.tramo === "entrada" ? await leerListaEntrada(resumen.compania.id) : null;

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
        <AvisosParaMi avisos={avisos} calculados={calculados} titulo="Te toca" />
        {resumen.compania.tramo === "entrada" ? <EntradaFundadora compania={resumen.compania} propuesta={propuesta} /> : null}
        {/* Su lista de entrada: «Diagnóstico» o «Lo que ya tenéis» (REVISION, 22 nov) */}
        {lista && resumen.compania.situacion_societaria ? (
          <ListaDeEntrada lista={lista} companyId={resumen.compania.id} slug={resumen.compania.slug} contesta verifica={false} />
        ) : null}
        <VistaResumen resumen={resumen} />
        <EquipoIwl companyId={resumen.compania.id} />
      </main>
    </>
  );
}
