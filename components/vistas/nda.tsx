import { Estado } from "@/components/ui/estado";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";
import { AbrirNda } from "@/components/formularios/abrir-nda";
import {
  ContrafirmarNda,
  RegenerarPdfNda,
  RegistrarNdaExterno,
} from "@/components/formularios/nda-iwl";
import type { EstadoNda } from "@/lib/datos/nda";
import type { EstadoVisual } from "@/lib/estados";
import { fecha } from "@/lib/utils";

const ESTADO: Record<EstadoNda, { visual: EstadoVisual; rotulo: string }> = {
  no_aplica: { visual: "no_aplica", rotulo: "No aplica" },
  sin_plantilla: { visual: "pendiente", rotulo: "Falta la plantilla" },
  por_firmar: { visual: "pendiente", rotulo: "Por firmar" },
  esperando_iwl: { visual: "curso", rotulo: "Falta IWL" },
  firmado: { visual: "hecho", rotulo: "Firmado" },
};

/**
 * El NDA en la ficha de la candidatura: en qué punto está, y lo que
 * dirección puede hacer en cada uno. Contrafirmar y registrar uno de fuera
 * son de dirección; la base lo vuelve a comprobar.
 */
export function BloqueNda({
  candidaturaId,
  nda,
  esDireccion,
}: {
  candidaturaId: string;
  nda: {
    estado: EstadoNda;
    plantilla: { version: number } | null;
    firma: {
      firmante_nombre: string | null;
      firmado_at: string | null;
      contrafirmante_nombre: string | null;
      contrafirmado_at: string | null;
      texto_version: string | null;
      externo: boolean;
      documento_id: string | null;
      evidencia_url: string | null;
    } | null;
  };
  esDireccion: boolean;
}) {
  const { estado, firma, plantilla } = nda;
  const e = ESTADO[estado];

  return (
    <Bloque>
      <TituloBloque accion={<Estado valor={e.visual} rotulo={e.rotulo} />}>NDA</TituloBloque>
      <div className="flex flex-col gap-3 px-5 py-4 text-sm text-secundario">
        {estado === "sin_plantilla" ? (
          <p>
            Todavía no hay texto del NDA. Cárgalo en Administración → Programa
            → «Plantilla del NDA»; mientras tanto, ella ve que está en
            preparación y no puede firmar nada.
          </p>
        ) : null}
        {estado === "por_firmar" ? (
          <p>
            Lo verá nada más entrar, en la versión {plantilla?.version}. Hasta
            que lo firme no ve nada más.
          </p>
        ) : null}
        {firma?.firmado_at ? (
          <p>
            {firma.externo ? "Firmado fuera de la plataforma" : `Firmado por ${firma.firmante_nombre}`} el{" "}
            {fecha(firma.firmado_at)}
            {firma.texto_version ? <Metadato> · versión {firma.texto_version}</Metadato> : null}
          </p>
        ) : null}
        {firma?.contrafirmado_at ? (
          <p>
            Por IWL, {firma.contrafirmante_nombre}, el {fecha(firma.contrafirmado_at)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {estado === "esperando_iwl" && esDireccion ? <ContrafirmarNda candidaturaId={candidaturaId} /> : null}
          {estado === "firmado" && (firma?.documento_id || firma?.evidencia_url) ? (
            <AbrirNda candidaturaId={candidaturaId} />
          ) : null}
          {estado === "firmado" && !firma?.documento_id && !firma?.evidencia_url && esDireccion ? (
            <RegenerarPdfNda candidaturaId={candidaturaId} />
          ) : null}
        </div>
      </div>
      {esDireccion && estado !== "firmado" && estado !== "no_aplica" ? (
        <RegistrarNdaExterno candidaturaId={candidaturaId} />
      ) : null}
    </Bloque>
  );
}
