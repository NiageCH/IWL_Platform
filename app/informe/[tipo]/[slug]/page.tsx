import { notFound } from "next/navigation";
import { companiaPorSlug } from "@/lib/datos/sesion";
import { Imprimir } from "@/components/informe/imprimir";
import { InformeAportacion } from "@/components/informe/aportacion";
import { InformeMensual } from "@/components/informe/mensual";
import { InformeTecnico } from "@/components/informe/tecnico";

/**
 * Informes.
 *
 * Son lo único de la plataforma que sale de ella, así que se imprimen sobre
 * papel blanco aunque quien los genere esté en la consola oscura. Quién puede
 * verlos lo decide Row Level Security a través de `companiaPorSlug`: si la
 * compañía no es visible, no hay informe.
 *
 * Lo que sí se decide aquí es el contenido. La versión de inversor del
 * informe técnico existe porque un documento que circula por correo no puede
 * llevar el detalle de las debilidades que siguen abiertas.
 */

export const INFORMES = {
  tecnico: {
    titulo: "Informe técnico interno",
    resumen: "La evaluación completa, con la evidencia de cada hallazgo.",
  },
  "tecnico-inversor": {
    titulo: "Informe de due diligence técnico",
    resumen: "Para compartir fuera: sin detalle de lo que sigue abierto.",
  },
  aportacion: {
    titulo: "Extracto de aportación",
    resumen: "Lo que IWL ha puesto, con su valor a precio de mercado.",
  },
  mensual: {
    titulo: "Informe mensual",
    resumen: "El mes: indicadores, avances de las dos partes e hitos.",
  },
} as const;

export type TipoInforme = keyof typeof INFORMES;

function esTipo(valor: string): valor is TipoInforme {
  return valor in INFORMES;
}

export async function generateMetadata({
  params,
}: PageProps<"/informe/[tipo]/[slug]">) {
  const { tipo } = await params;
  return {
    title: esTipo(tipo) ? `${INFORMES[tipo].titulo} · IWL` : "Informe · IWL",
  };
}

export default async function Pagina({
  params,
  searchParams,
}: PageProps<"/informe/[tipo]/[slug]">) {
  const { tipo, slug } = await params;
  if (!esTipo(tipo)) notFound();

  const resumen = await companiaPorSlug(slug);

  // El informe mensual admite pedir un mes concreto: ?periodo=2026-08-01
  const { periodo } = await searchParams;
  const mes = typeof periodo === "string" ? periodo : undefined;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
      <Imprimir />

      {tipo === "aportacion" ? (
        <InformeAportacion resumen={resumen} />
      ) : tipo === "mensual" ? (
        <InformeMensual resumen={resumen} periodo={mes} />
      ) : (
        <InformeTecnico
          resumen={resumen}
          paraInversor={tipo === "tecnico-inversor"}
        />
      )}
    </main>
  );
}
