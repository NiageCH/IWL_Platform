import { ListaDeEntrada } from "@/components/vistas/hoja";
import { leerListaEntrada } from "@/lib/datos/hoja";
import { FranjaAviso } from "@/components/vistas/franja-aviso";
import { companiaPorSlug } from "@/lib/datos/sesion";
import { CabeceraProyecto } from "@/components/cabecera-proyecto";
import { leerMovimiento } from "@/lib/datos/movimiento";
import { VistaResumen } from "@/components/vistas/resumen";
import { esIwl, personaActual } from "@/lib/supabase/servidor";
import { leerAltaCompania } from "@/lib/datos/onboarding";
import { BloqueAlta } from "@/components/vistas/alta";
import { direccionBase } from "@/lib/direccion";
import { EntradaIwl, FichaEntradaMentor } from "@/components/vistas/entrada";
import { leerEntrada, leerFichaEntrada, leerMentorPrincipal } from "@/lib/datos/entrada";
import { leerMentores } from "@/lib/datos/comite";
import { leerCorreos } from "@/lib/datos/correos";
import { BloqueCorreos } from "@/components/vistas/correos";
import { CerrarCompania } from "@/components/formularios/cierre";
import { leerHitosParaGraduar } from "@/lib/datos/cierre";
import { leerSeguimiento } from "@/lib/datos/hoja";
import { Bloque, TituloBloque } from "@/components/ui/primitivas";

export default async function ResumenCompania({ params, searchParams }: PageProps<"/cartera/[slug]">) {
  const { slug } = await params;
  const { aviso } = await searchParams;
  const resumen = await companiaPorSlug(slug);
  const movimiento = await leerMovimiento(resumen.compania.id);

  // Quién del equipo fundador ha entrado y quién no: lo sigue IWL
  const persona = await personaActual();
  const altas = esIwl(persona?.role) ? await leerAltaCompania(resumen.compania.id) : null;
  const enEntrada = resumen.compania.tramo === "entrada" && esIwl(persona?.role);
  const entrada = enEntrada ? await leerEntrada(resumen.compania.id) : null;
  // La lista la ve también el mentor principal, que es quien la verifica
  // (REVISION, 23 nov). La ficha de entrada —candidatura y decisión— sigue
  // siendo de IWL: son datos del embudo que el mentor no lee.
  const listaVisible = resumen.compania.tramo === "entrada" && resumen.permisos.coordina;
  const lista = listaVisible ? await leerListaEntrada(resumen.compania.id) : null;
  // El mentor, sin ser de IWL, ve lo que presentó ella y el comité: no el embudo entero
  const ficha = listaVisible && !enEntrada ? await leerFichaEntrada(resumen.compania.id) : null;
  const [mentor, mentores] = enEntrada
    ? await Promise.all([leerMentorPrincipal(resumen.compania.id), leerMentores()])
    : [null, []];
  // Cerrarla es de dirección, y solo con la compañía ya en el programa (bloque 8)
  const cierraDireccion = persona?.role === "admin_iwl" && resumen.compania.tramo === "incubacion";
  const seguimiento = cierraDireccion ? await leerSeguimiento(resumen.compania.id) : null;
  const tramo4Cerrado = Boolean(seguimiento?.tramos.some((t) => t.tramo === 4 && t.cerrado));
  const paraGraduar = cierraDireccion ? await leerHitosParaGraduar(resumen.compania.id) : null;
  // Los correos de la compañía —el Acuerdo propuesto, las respuestas—, para IWL
  const correos = esIwl(persona?.role) ? await leerCorreos({ companyId: resumen.compania.id }) : null;

  return (
    <>
      <CabeceraProyecto
        resumen={resumen}
        movimiento={movimiento}
        base={`/cartera/${slug}`}
        seccionActiva="resumen"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <FranjaAviso aviso={aviso} contexto={{ companyId: resumen.compania.id, slug }} />
        {entrada ? (
          <EntradaIwl
            compania={resumen.compania}
            decision={entrada.decision}
            candidatura={entrada.candidatura}
            esDireccion={persona?.role === "admin_iwl"}
            archivada={Boolean(resumen.compania.archived_at)}
            mentor={mentor}
            mentores={mentores}
          />
        ) : null}
        {ficha ? <FichaEntradaMentor ficha={ficha} /> : null}
        {lista ? (
          <ListaDeEntrada
            lista={lista}
            companyId={resumen.compania.id}
            slug={slug}
            contesta={false}
            verifica={resumen.permisos.coordina}
          />
        ) : null}
        <VistaResumen resumen={resumen} />
        {altas ? (
          <div className="mt-8">
            <BloqueAlta altas={altas} direccion={direccionBase()} />
          </div>
        ) : null}
        {correos?.length ? (
          <div className="mt-8">
            <BloqueCorreos correos={correos} />
          </div>
        ) : null}
        {cierraDireccion ? (
          <Bloque id="cierre" className="mt-8 scroll-mt-48">
            <TituloBloque>Cierre</TituloBloque>
            <p className="px-4 py-3 text-sm text-secundario">
              {tramo4Cerrado
                ? "Ha cerrado el tramo 4: confirma si es invertible. Si lo es, se gradúa."
                : "Cuando termine en el programa: graduada si es invertible, salida si acaba el plazo sin serlo, baja si no sigue. Graduarla pide validados los hitos que condicionan invertible."}
            </p>
            <CerrarCompania
              companyId={resumen.compania.id}
              nombre={resumen.compania.name}
              sugerida={tramo4Cerrado && paraGraduar?.pendientes === 0 && paraGraduar.marcados > 0 ? "graduada" : null}
              paraGraduar={paraGraduar}
              hoy={new Date().toISOString().slice(0, 10)}
            />
          </Bloque>
        ) : null}
      </main>
    </>
  );
}
