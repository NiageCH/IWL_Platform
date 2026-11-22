import Link from "next/link";
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
  plantilla_con_huecos: { visual: "atencion", rotulo: "Plantilla con huecos" },
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
  sinApellidos = false,
}: {
  candidaturaId: string;
  nda: {
    estado: EstadoNda;
    /** Por qué no se puede enviar, con el mismo texto que Programa */
    problema: string | null;
    plantilla: { version: number; texto: string; candidatura_id: string | null } | null;
    firma: {
      /** Firma: el de antes del 22 nov. Casilla: aceptado al presentarse */
      modo?: string | null;
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
  /** Quien mira no tiene apellidos en su perfil: no puede firmar por IWL */
  sinApellidos?: boolean;
}) {
  const { estado, firma, plantilla, problema } = nda;
  const casilla = firma?.modo === "casilla";
  const e = casilla ? { visual: "hecho" as const, rotulo: "Aceptado" } : ESTADO[estado];

  return (
    <Bloque id="nda" className="scroll-mt-48">
      <TituloBloque accion={<Estado valor={e.visual} rotulo={e.rotulo} />}>NDA</TituloBloque>
      <div className="flex flex-col gap-3 px-5 py-4 text-sm text-secundario">
        {estado === "sin_plantilla" ? (
          <p>
            Todavía no hay texto del NDA. Cárgalo en Administración → Programa
            → «Plantilla del NDA»; mientras tanto, ella ve que está en
            preparación y no puede firmar nada.
          </p>
        ) : null}
        {estado === "plantilla_con_huecos" ? (
          <p>
            {problema} Mientras tanto, ella ve que está en preparación y no
            puede firmar nada.{" "}
            <Link href="/admin/programa" className="enlace text-acento-texto">
              Ir a la plantilla, en Administración → Programa
            </Link>
          </p>
        ) : null}
        {estado === "por_firmar" ? (
          <p>
            Lo verá nada más entrar, en la versión {plantilla?.version}
            {plantilla?.candidatura_id ? ", que es solo suya" : ""}, encima de
            su candidatura.
          </p>
        ) : null}
        {firma?.firmado_at ? (
          <p>
            {firma.externo
              ? "Firmado fuera de la plataforma"
              : casilla
                ? `Aceptado con la casilla por ${firma.firmante_nombre}, al presentarse,`
                : `Firmado por ${firma.firmante_nombre}`}{" "}
            el{" "}
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
          {estado === "esperando_iwl" && esDireccion ? <ContrafirmarNda candidaturaId={candidaturaId} sinApellidos={sinApellidos} /> : null}
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
