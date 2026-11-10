import Link from "next/link";
import { Estado, NodoEstado } from "@/components/ui/estado";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { Recordar } from "@/components/formularios/recordar";
import { CerrarAviso } from "@/components/formularios/cerrar-aviso";
import { ContrafirmarNda } from "@/components/formularios/nda-iwl";
import type { AltaDe, AltaEnCurso, Aviso } from "@/lib/datos/onboarding";
import type { ClavePaso, Paso } from "@/lib/onboarding";
import { fecha } from "@/lib/utils";

/**
 * Los pasos que dependen de la persona. Los de IWL —contrafirmar, el
 * comité, el acuerdo— no se le recuerdan a ella: se hacen.
 */
const SUYOS: ClavePaso[] = ["primer_acceso", "contrasena", "nda_ella", "due_diligence"];

function cuando(p: Paso): string {
  if (p.fecha) return fecha(p.fecha);
  if (p.dias !== null) return p.dias === 1 ? "lleva 1 día" : `lleva ${p.dias} días`;
  return "";
}

/**
 * La línea de pasos del alta de una persona.
 *
 * Un paso por fila, con su estado en palabra e icono, cuándo se hizo o
 * cuánto lleva esperando. «Recordar» sale solo en el paso detenido, y solo
 * si es suyo.
 */
export function LineaAlta({
  alta,
  candidaturaId,
  direccion,
}: {
  alta: AltaDe;
  candidaturaId?: string;
  direccion: string;
}) {
  return (
    <ol className="divide-y divide-filete">
      {alta.pasos.map((p) => {
        const detenido = p.estado === "atencion" || p.estado === "vencido";
        return (
          <li key={p.clave} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <NodoEstado valor={p.estado} titulo={p.nombre} />
            <span className="min-w-0 flex-1 text-sm text-titular">
              {p.nombre}
              {p.detalle ? <span className="cifra text-metadato"> · {p.detalle}</span> : null}
            </span>
            <span className="cifra text-xs text-metadato">{cuando(p)}</span>
            <Estado valor={p.estado} />
            {detenido && SUYOS.includes(p.clave) && alta.persona?.id ? (
              <div className="basis-full">
                <Recordar
                  personaId={alta.persona.id}
                  candidaturaId={candidaturaId}
                  paso={p.clave}
                  nombre={alta.persona.nombre}
                  correo={alta.persona.correo}
                  direccion={direccion}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** El bloque de la ficha: una línea por persona */
export function BloqueAlta({
  altas,
  candidaturaId,
  direccion,
}: {
  altas: AltaDe[];
  candidaturaId?: string;
  direccion: string;
}) {
  return (
    <Bloque>
      <TituloBloque accion={<Metadato>Paso a paso</Metadato>}>Alta</TituloBloque>
      {altas.length === 0 ? (
        <SinDatos>
          Nadie del equipo fundador tiene cuenta todavía. Dale de alta desde
          Administración → Personas y aquí verás si entra.
        </SinDatos>
      ) : (
        altas.map((a) => (
          <div key={a.persona?.id ?? "sin-cuenta"}>
            {altas.length > 1 || !candidaturaId ? (
              <p className="border-b border-filete px-4 pt-3 pb-2 text-xs text-metadato">
                {a.persona?.nombre}
                {a.persona?.correo ? ` · ${a.persona.correo}` : ""}
              </p>
            ) : null}
            <LineaAlta alta={a} candidaturaId={candidaturaId} direccion={direccion} />
          </div>
        ))
      )}
    </Bloque>
  );
}

/**
 * Lo que espera a dirección, en su inicio.
 *
 * Arriba los avisos —alguien entró, alguien firmó— que se dan por vistos.
 * Debajo las altas a medias, las detenidas primero: esas no se cierran,
 * desaparecen cuando el paso se mueve.
 */
export function AvisosDireccion({
  avisos,
  altas,
  revisiones = [],
  paradas = [],
}: {
  avisos: Aviso[];
  altas: AltaEnCurso[];
  /** Candidaturas aplazadas en comité cuya fecha de revisión ha llegado */
  revisiones?: { candidaturaId: string; nombre: string; revisionOn: string }[];
  /** Compañías de Construcción que han pasado el tope del tramo de entrada sin Acuerdo */
  paradas?: { slug: string; nombre: string; dias: number; tope: "atencion" | "vencido" }[];
}) {
  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-2">
      <Bloque>
        <TituloBloque accion={<Metadato>{avisos.length + revisiones.length + paradas.length} sin ver</Metadato>}>
          Avisos
        </TituloBloque>
        {revisiones.length ? (
          <ul className="divide-y divide-filete border-b border-filete">
            {revisiones.map((r) => (
              <li key={r.candidaturaId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="min-w-0 flex-1 text-sm text-titular">
                  {r.nombre}: toca volver a mirarla en comité
                </span>
                <span className="cifra text-xs text-metadato">{fecha(r.revisionOn)}</span>
                <Link href={`/embudo/${r.candidaturaId}`} className="enlace text-xs">
                  Redactar el acta
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {paradas.length ? (
          <ul className="divide-y divide-filete border-b border-filete">
            {paradas.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="min-w-0 flex-1 text-sm text-titular">
                  {p.nombre} lleva {p.dias} días en entrada sin Acuerdo
                </span>
                <Estado valor={p.tope} rotulo={p.tope === "vencido" ? "Vencido" : "Atención"} />
                <Link href={`/cartera/${p.slug}`} className="enlace text-xs">
                  Decidir
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {avisos.length === 0 && revisiones.length === 0 && paradas.length === 0 ? (
          <SinDatos>
            Nada nuevo. Cuando alguien entre por primera vez, comente o firme
            el NDA, te lo dirá aquí.
          </SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {avisos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="min-w-0 flex-1 text-sm text-titular">
                  {a.tipo === "primer_acceso"
                    ? `${a.persona} ha entrado por primera vez`
                    : a.tipo === "nda_comentario"
                      ? `${a.persona} ha comentado el NDA`
                      : a.tipo === "situacion_dicha"
                        ? `${a.persona} ha dicho la situación societaria. Falta confirmarla`
                        : a.tipo === "anexo_comentario"
                          ? `${a.persona} ha comentado la propuesta de Acuerdo`
                          : `${a.persona} ha firmado el NDA. Falta la firma de IWL`}
                  {a.donde ? <span className="text-metadato"> · {a.donde}</span> : null}
                </span>
                <span className="cifra text-xs text-metadato">{fecha(a.created_at)}</span>
                {a.candidaturaId ? (
                  <Link href={`/embudo/${a.candidaturaId}`} className="enlace text-xs">
                    {a.tipo === "nda_firmado"
                      ? "Leer el NDA"
                      : a.tipo === "nda_comentario"
                        ? "Responder"
                        : "Ver su alta"}
                  </Link>
                ) : null}
                {a.companiaSlug && !a.candidaturaId ? (
                  <Link
                    href={
                      a.tipo === "anexo_comentario"
                        ? `/cartera/${a.companiaSlug}/programa`
                        : `/cartera/${a.companiaSlug}`
                    }
                    className="enlace text-xs"
                  >
                    {a.tipo === "anexo_comentario" ? "Responder" : "Confirmarla"}
                  </Link>
                ) : null}
                {/* Firmar ahí mismo, sin ir a la ficha */}
                {a.tipo === "nda_firmado" && a.candidaturaId ? (
                  <ContrafirmarNda candidaturaId={a.candidaturaId} />
                ) : null}
                {a.tipo === "primer_acceso" ? <CerrarAviso id={a.id} /> : null}
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={<Metadato>{altas.filter((a) => a.detenido).length} detenidas</Metadato>}
        >
          Altas en curso
        </TituloBloque>
        {altas.length === 0 ? (
          <SinDatos>
            Nadie está a medio dar de alta. Cuando des cuenta a alguien, su
            avance sale aquí.
          </SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {altas.map((a) => (
              <li key={`${a.href}-${a.persona}`} className="fila-enlace relative flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <Link href={a.href} className="estirado enlace min-w-0 flex-1 text-sm text-titular">
                  {a.persona}
                  <span className="text-metadato"> · {a.donde}</span>
                </Link>
                <span className="text-xs text-secundario">{a.paso.nombre}</span>
                <span className="cifra text-xs text-metadato">{cuando(a.paso)}</span>
                <Estado valor={a.paso.estado} />
              </li>
            ))}
          </ul>
        )}
      </Bloque>
    </div>
  );
}

/**
 * Los avisos que van a una persona concreta, no a dirección. Hoy, uno: al
 * mentor principal, cuando su compañía pasa de Construcción a Aceleración.
 * Se dan por vistos a mano.
 */
export function AvisosParaMi({ avisos }: { avisos: Aviso[] }) {
  if (!avisos.length) return null;
  return (
    <Bloque className="mb-8">
      <TituloBloque accion={<Metadato>{avisos.length} sin ver</Metadato>}>Avisos para ti</TituloBloque>
      <ul className="divide-y divide-filete">
        {avisos.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <span className="min-w-0 flex-1 text-sm text-titular">
              {a.tipo === "cambio_via"
                ? `${a.donde ?? "Una compañía"} pasa de Construcción a Aceleración. Lo que estaba por construir pasa a por entregar`
                : `Aviso sobre ${a.donde ?? "una compañía"}`}
            </span>
            <span className="cifra text-xs text-metadato">{fecha(a.created_at)}</span>
            {a.companiaSlug ? (
              <Link href={`/cartera/${a.companiaSlug}/programa`} className="enlace text-xs">
                Ver el motivo
              </Link>
            ) : null}
            <CerrarAviso id={a.id} />
          </li>
        ))}
      </ul>
    </Bloque>
  );
}
