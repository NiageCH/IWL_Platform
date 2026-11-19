import Link from "next/link";
import { enlaceHito } from "@/lib/avisos";
import { FilaAviso, Traza } from "@/components/vistas/avisos";
import { PASO_EMBUDO, traza } from "@/lib/recorridos";
import type { PorDecidir } from "@/lib/datos/entrada";
import { Estado, NodoEstado } from "@/components/ui/estado";
import { Bloque, Metadato, SinDatos, TituloBloque } from "@/components/ui/primitivas";
import { Recordar } from "@/components/formularios/recordar";
import type { AltaDe, AltaEnCurso, Aviso } from "@/lib/datos/onboarding";
import type { HitoPorRevisar } from "@/lib/datos/ruta";
import { estadoVisual } from "@/lib/estados";
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
  incorporaciones = [],
}: {
  avisos: Aviso[];
  altas: AltaEnCurso[];
  /** Candidaturas aplazadas en comité cuya fecha de revisión ha llegado */
  revisiones?: { candidaturaId: string; nombre: string; revisionOn: string }[];
  /** Compañías en entrada que esperan la decisión de incorporación */
  incorporaciones?: PorDecidir[];
}) {
  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-2">
      <Bloque>
        <TituloBloque accion={<Metadato>{avisos.length + revisiones.length + incorporaciones.length} sin ver</Metadato>}>
          Avisos
        </TituloBloque>
        {revisiones.length ? (
          <ul className="divide-y divide-filete border-b border-filete">
            {revisiones.map((r) => (
              <li key={r.candidaturaId} className="flex flex-col gap-1 px-4 py-3" data-aviso="comite_revision">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1 text-sm text-titular">
                    {r.nombre} quedó aplazada en comité hasta el {fecha(r.revisionOn)}
                  </span>
                  <span className="text-xs text-secundario">Te toca: volver a mirarla</span>
                  <Link href={`/embudo/${r.candidaturaId}?aviso=comite#comite`} className="accion text-xs text-acento-texto">
                    Redactar el acta
                  </Link>
                </div>
                <Traza {...traza("embudo", PASO_EMBUDO.comite)} />
              </li>
            ))}
          </ul>
        ) : null}
        {incorporaciones.length ? (
          <ul className="divide-y divide-filete border-b border-filete">
            {incorporaciones.map((p) => (
              <li key={p.slug} className="flex flex-col gap-1 px-4 py-3" data-aviso="incorporacion">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1 text-sm text-titular">{p.paso}</span>
                  {p.tope ? <Estado valor={p.tope} rotulo={`${p.dias} días en entrada`} /> : null}
                  <span className="text-xs text-secundario">Te toca: decidir</span>
                  <Link href={`/cartera/${p.slug}?aviso=incorporacion#incorporacion`} className="accion text-xs text-acento-texto">
                    Decidir la incorporación
                  </Link>
                </div>
                <Traza {...traza("entrada", 2)} />
              </li>
            ))}
          </ul>
        ) : null}
        {avisos.length === 0 && revisiones.length === 0 && incorporaciones.length === 0 ? (
          <SinDatos>
            Nada pendiente. Cuando llegue una candidatura, alguien firme o
            comente el NDA, diga su situación, entregue un documento o acepte
            el Acuerdo, te lo dirá aquí con su botón.
          </SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {avisos.map((a) => (
              <FilaAviso key={a.id} aviso={a} />
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
 * Los avisos que van a una persona concreta, no a dirección: al mentor
 * principal, al cambiar la vía; a quien propuso una reunión, para anotarla.
 * Se cierran solos cuando se hace lo que piden.
 */
export function AvisosParaMi({ avisos }: { avisos: Aviso[] }) {
  if (!avisos.length) return null;
  return (
    <Bloque className="mb-8">
      <TituloBloque accion={<Metadato>{avisos.length} sin ver</Metadato>}>Avisos para ti</TituloBloque>
      <ul className="divide-y divide-filete">
        {avisos.map((a) => (
          <FilaAviso key={a.id} aviso={a} />
        ))}
      </ul>
    </Bloque>
  );
}

/**
 * Los hitos entregados que esperan a quien mira.
 *
 * Arriba de la cartera, para IWL y para el mentor que coordina: es lo que
 * tiene a una fundadora esperando. A los siete días sin revisar se pinta
 * vencido, y dirección recibe aviso.
 */
export function HitosPorRevisar({ hitos }: { hitos: HitoPorRevisar[] }) {
  if (!hitos.length) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <Bloque className="mb-8">
      <TituloBloque accion={<Metadato>{hitos.length} por revisar</Metadato>}>Hitos por revisar</TituloBloque>
      <ul className="divide-y divide-filete">
        {hitos.map((h) => {
          const visual = estadoVisual("hito", { estado: "entregado", entregadoEl: h.entregadoEl, revisa: true }, hoy);
          return (
            <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className="min-w-0 flex-1 text-sm text-titular">
                {h.titulo}
                <span className="text-metadato"> · {h.compania}</span>
              </span>
              <Estado
                valor={visual}
                rotulo={visual === "vencido" ? "Más de 7 días" : "Por revisar"}
                motivo={`Entregado el ${fecha(h.entregadoEl)}`}
              />
              <span className="cifra text-xs text-metadato">{fecha(h.entregadoEl)}</span>
              <Link href={enlaceHito(h.slug, h.id)} className="enlace text-xs">
                Revisar
              </Link>
            </li>
          );
        })}
      </ul>
    </Bloque>
  );
}
