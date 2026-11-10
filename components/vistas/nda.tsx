import { Estado } from "@/components/ui/estado";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";
import { AbrirNda } from "@/components/formularios/abrir-nda";
import {
  ContrafirmarNda,
  RegenerarPdfNda,
  RegistrarNdaExterno,
} from "@/components/formularios/nda-iwl";
import { NdaPropio, ResponderComentarioNda } from "@/components/formularios/comentar-nda";
import type { ComentarioNda, EstadoNda } from "@/lib/datos/nda";
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
/**
 * Lo que ella ha comentado del NDA y lo que se le ha respondido. Lo ven
 * las dos partes; responder es de IWL, y solo se le pasa a esa pantalla.
 */
export function ComentariosNda({
  comentarios,
  candidaturaId,
  responder = false,
}: {
  comentarios: ComentarioNda[];
  candidaturaId: string;
  responder?: boolean;
}) {
  if (!comentarios.length) return null;
  return (
    <ul className="flex flex-col gap-3">
      {comentarios.map((c) => (
        <li key={c.id} className="flex flex-col gap-1.5 rounded-lg border border-filete px-4 py-3 text-sm">
          <p className="text-xs text-metadato">
            Comentario del {fecha(c.created_at)}
            {c.version ? ` · sobre la versión ${c.version}` : ""}
          </p>
          <p className="whitespace-pre-wrap text-titular [overflow-wrap:anywhere]">{c.texto}</p>
          {c.respuesta ? (
            <div className="border-l-2 border-filete pl-3">
              <p className="text-xs text-metadato">
                Respuesta de {c.respondidoPor ?? "Inception Woman Lab"}
                {c.respondido_at ? ` el ${fecha(c.respondido_at)}` : ""}
              </p>
              <p className="whitespace-pre-wrap text-secundario [overflow-wrap:anywhere]">{c.respuesta}</p>
            </div>
          ) : responder ? (
            <ResponderComentarioNda id={c.id} candidaturaId={candidaturaId} />
          ) : (
            <p className="text-xs text-metadato">Sin responder todavía</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BloqueNda({
  candidaturaId,
  nda,
  esDireccion,
}: {
  candidaturaId: string;
  nda: {
    estado: EstadoNda;
    plantilla: { version: number; texto: string; candidatura_id: string | null } | null;
    comentarios: ComentarioNda[];
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
  const { estado, firma, plantilla, comentarios } = nda;
  const abierto = estado === "por_firmar" || estado === "esperando_iwl";
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
            Lo verá nada más entrar, en la versión {plantilla?.version}
            {plantilla?.candidatura_id ? ", que es solo suya" : ""}. Hasta que
            lo firme no ve nada más; antes puede comentarlo.
          </p>
        ) : null}
        <ComentariosNda comentarios={comentarios} candidaturaId={candidaturaId} responder={abierto} />
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
      {esDireccion && abierto && plantilla ? (
        <NdaPropio
          candidaturaId={candidaturaId}
          texto={plantilla.texto}
          firmadoPorElla={estado === "esperando_iwl"}
        />
      ) : null}
      {esDireccion && estado !== "firmado" && estado !== "no_aplica" ? (
        <RegistrarNdaExterno candidaturaId={candidaturaId} />
      ) : null}
    </Bloque>
  );
}
