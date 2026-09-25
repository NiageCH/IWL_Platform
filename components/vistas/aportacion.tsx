import { clienteServidor } from "@/lib/supabase/servidor";
import { leerExtracto } from "@/lib/datos/aportacion";
import { leerAportacionExtra, nombreTipo } from "@/lib/datos/aportacion-extra";
import { leerHojaDeRuta } from "@/lib/datos/ruta";
import { NuevaAportacion } from "@/components/formularios/ruta";
import { EnlacesInforme } from "@/components/informe/enlace";
import { RegistroRapidoHoras } from "@/components/formularios/programa";
import type { ResumenCompania } from "@/lib/datos/compania";
import {
  Bloque,
  Cifra,
  Etiqueta,
  Metadato,
  SinDatos,
  TituloBloque,
} from "@/components/ui/primitivas";
import { euros, fecha, numero, porcentaje } from "@/lib/utils";

/**
 * Extracto de aportación (documento de aportación §3).
 *
 * Es el apartado E del Anexo I, vivo. La compañía lo ve entero, con las horas
 * y su valor en euros: es el argumento del equity y esconderlo lo debilita.
 */

const TIPOS_CONTACTO: Record<string, string> = {
  inversor: "Inversor",
  cliente: "Cliente",
  partner: "Partner",
  proveedor: "Proveedor",
  organismo_publico: "Organismo público",
};

const ESTADOS_INTRODUCCION: Record<string, string> = {
  presentada: "Presentada",
  reunion_celebrada: "Reunión celebrada",
  en_negociacion: "En negociación",
  cerrada: "Cerrada",
  descartada: "Descartada",
};

export async function VistaAportacion({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const [extracto, extra, ruta] = await Promise.all([
    leerExtracto(resumen.compania.id),
    leerAportacionExtra(resumen.compania.id),
    leerHojaDeRuta(resumen.compania.id, resumen.compania.entry_state),
  ]);
  const { compromiso } = extracto;
  const { permisos, compania } = resumen;

  // El catálogo para el registro rápido. Solo lo necesita quien imputa horas
  const supabase = await clienteServidor();
  const [materias, perfiles] = permisos.esIwl
    ? await Promise.all([
        supabase
          .from("contribution_subjects")
          .select("id, name")
          .eq("is_active", true)
          .order("order_index"),
        supabase
          .from("rate_cards")
          .select("profile_code, profile_name")
          .is("valid_to", null)
          .order("applied_rate", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  // La última línea imputada, para no reescribir persona y perfil cada vez
  const ultima = extracto.horas[0];

  /*
   * Sin Anexo firmado hay aportación, lo que no hay es compromiso.
   *
   * Antes esta pantalla se cortaba entera cuando faltaba el Anexo, y escondía
   * las horas y el dinero ya puestos. El Anexo fija contra qué se mide; lo
   * entregado existe desde el primer día y es lo que la fundadora quiere ver.
   */
  const conAnexo = Boolean(compromiso?.annexId);

  return (
    <div className="flex flex-col gap-6">
      {!conAnexo || !compromiso ? (
        <Bloque>
          <TituloBloque>Compromiso del Anexo</TituloBloque>
          <SinDatos>
            Todavía no hay Anexo de Programa firmado, así que no hay compromiso
            de horas, caja ni introducciones contra el que medir. Lo que IWL ya
            ha puesto sí está registrado y se ve aquí abajo.
          </SinDatos>
          <EnlacesInforme slug={compania.slug} tipos={["aportacion"]} />
        </Bloque>
      ) : (
      <Bloque elevacion={2}>
        <TituloBloque
          accion={
            compromiso.equityPct !== null ? (
              <Metadato>Equity acordado {numero(compromiso.equityPct, 0)} %</Metadato>
            ) : undefined
          }
        >
          Compromiso del Anexo
        </TituloBloque>

        <div className="grid gap-6 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra
            destacada
            etiqueta="Horas entregadas"
            valor={`${numero(compromiso.horasEntregadas, 0)} de ${numero(compromiso.horasComprometidas, 0)}`}
            nota={
              compromiso.horasPct === null
                ? "Sin horas comprometidas"
                : `${porcentaje(compromiso.horasPct, 1)} del compromiso`
            }
          />
          <Cifra
            etiqueta="Caja desembolsada"
            valor={euros(compromiso.cajaDesembolsada)}
            nota={`de ${euros(compromiso.cajaComprometida)} comprometidos`}
          />
          <Cifra
            etiqueta="Valor de las horas"
            valor={euros(compromiso.valorAplicado)}
            nota={`${euros(compromiso.descuento)} por debajo de mercado`}
          />
          <Cifra
            etiqueta="Introducciones"
            valor={numero(compromiso.introducciones, 0)}
            nota={`${compromiso.entregables} ${compromiso.entregables === 1 ? "entregable" : "entregables"}`}
          />
        </div>

        <div className="border-t border-filete px-4 py-3">
          <Barra
            etiqueta="Horas"
            entregado={compromiso.horasEntregadas}
            comprometido={compromiso.horasComprometidas}
            formato={(v) => `${numero(v, 0)} h`}
          />
          <Barra
            etiqueta="Caja"
            entregado={compromiso.cajaDesembolsada}
            comprometido={compromiso.cajaComprometida}
            formato={euros}
          />
        </div>

        <p className="border-t border-filete px-4 py-2.5 text-xs text-metadato">
          El contador funciona en los dos sentidos. Si IWL va por detrás de lo
          comprometido, se ve aquí igual que si va por delante.
        </p>
        <EnlacesInforme slug={compania.slug} tipos={["aportacion"]} />
      </Bloque>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque>
          <TituloBloque accion={<Metadato>Horas y valor</Metadato>}>
            Por materia
          </TituloBloque>
          {extracto.porMateria.length === 0 ? (
            <SinDatos>Todavía no hay horas imputadas.</SinDatos>
          ) : (
            <ul className="divide-y divide-filete">
              {extracto.porMateria.map((m) => (
                <li key={m.materia} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span className="flex-1 text-sm text-titular">{m.materia}</span>
                  <span className="cifra text-sm text-secundario">
                    {numero(m.horas, 1)} h
                  </span>
                  <span className="cifra w-24 text-right text-sm text-titular">
                    {euros(m.valorAplicado)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        <Bloque>
          <TituloBloque accion={<Metadato>Quién ha aportado</Metadato>}>
            Por persona
          </TituloBloque>
          {extracto.porPersona.length === 0 ? (
            <SinDatos>Todavía no hay horas imputadas.</SinDatos>
          ) : (
            <ul className="divide-y divide-filete">
              {extracto.porPersona.map((p) => (
                <li
                  key={`${p.persona}-${p.perfil}`}
                  className="flex items-baseline gap-3 px-4 py-2.5"
                >
                  <span className="flex-1 text-sm text-titular">
                    {p.persona}
                    <span className="block text-xs text-metadato">{p.perfil}</span>
                  </span>
                  <span className="cifra text-sm text-secundario">
                    {numero(p.horas, 1)} h
                  </span>
                  <span className="cifra w-24 text-right text-sm text-titular">
                    {euros(p.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>
      </div>

      <Bloque>
        <TituloBloque accion={<Metadato>Partidas del Anexo</Metadato>}>
          Financiación directa
        </TituloBloque>
        {extracto.partidas.length === 0 ? (
          <SinDatos>El Anexo no incluye financiación directa.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {extracto.partidas.map((p) => {
              const pendienteJustificar = p.desembolsado - p.justificado;
              return (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-sm font-medium text-titular">{p.partida}</span>
                    {p.tramo ? <Metadato>Tramo {p.tramo}</Metadato> : null}
                    <span className="flex-1" />
                    <span className="cifra text-sm text-titular">
                      {euros(p.desembolsado)}{" "}
                      <span className="text-metadato">de {euros(p.comprometido)}</span>
                    </span>
                  </div>
                  {p.descripcion ? (
                    <p className="mt-0.5 text-xs text-secundario">{p.descripcion}</p>
                  ) : null}
                  {p.condicion ? (
                    <p className="mt-0.5 text-xs text-metadato">
                      Se desembolsa cuando: {p.condicion}
                    </p>
                  ) : null}
                  {pendienteJustificar > 0 ? (
                    <p className="mt-1.5 text-xs text-aviso">
                      {euros(pendienteJustificar)} sin justificante subido
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {extracto.introducciones.filter((i) => i.generaComision).length} con
              comisión
            </Metadato>
          }
        >
          Introducciones
        </TituloBloque>
        {extracto.introducciones.length === 0 ? (
          <SinDatos>Todavía no se ha hecho ninguna introducción.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {extracto.introducciones.map((i) => (
              <li key={i.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-sm font-medium text-titular">
                    {i.organizacion ?? i.contacto}
                  </span>
                  <Metadato>{TIPOS_CONTACTO[i.tipo] ?? i.tipo}</Metadato>
                  <Etiqueta>{ESTADOS_INTRODUCCION[i.estado] ?? i.estado}</Etiqueta>
                  <span className="flex-1" />
                  <Metadato>
                    {i.quien} · {fecha(i.fecha)}
                  </Metadato>
                </div>
                {i.resultado ? (
                  <p className="mt-1 text-sm text-secundario">{i.resultado}</p>
                ) : null}
                {i.importe !== null ? (
                  <p className="cifra mt-1 text-sm text-titular">
                    {euros(i.importe)}
                    {i.generaComision ? (
                      <span className="ml-2 text-xs text-acento-texto">
                        Genera comisión
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-filete px-4 py-2.5 text-xs text-metadato">
          Una introducción genera comisión si IWL la marcó como tal al hacerla y
          la operación se cierra dentro de los dieciocho meses siguientes a la
          presentación.
        </p>
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {extra.items.length}{" "}
              {extra.items.length === 1 ? "registro" : "registros"}
            </Metadato>
          }
        >
          Compras, eventos y reuniones
        </TituloBloque>

        {extra.porTipo.length > 0 ? (
          <div className="grid gap-6 border-b border-filete px-4 py-4 sm:grid-cols-3">
            <Cifra
              valor={euros(extra.coste)}
              etiqueta="Le cuesta a IWL"
              nota="Desembolso real"
            />
            <Cifra
              valor={euros(extra.valorMercado)}
              etiqueta="Valor de mercado"
              nota="Lo que costaría por su cuenta"
            />
            <Cifra
              destacada
              valor={euros(extra.descuento)}
              etiqueta="Aportación"
              nota="La diferencia, que es lo que se ahorra la compañía"
            />
          </div>
        ) : null}

        {extra.items.length === 0 ? (
          <SinDatos>
            Todavía no hay compras, eventos ni reuniones registradas. Es la
            parte de la aportación que no son horas ni transferencias, y sin
            ella el extracto cuenta el trabajo pero no el acceso.
          </SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {extra.items.map((i) => (
              <li key={i.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Etiqueta>{nombreTipo(i.tipo)}</Etiqueta>
                  <span className="text-sm font-medium text-titular">
                    {i.titulo}
                  </span>
                  <span className="flex-1" />
                  <Metadato>{fecha(i.fecha)}</Metadato>
                </div>

                {i.descripcion ? (
                  <p className="mt-1 text-sm text-secundario">{i.descripcion}</p>
                ) : null}

                {i.resultado ? (
                  <p className="mt-1 border-l-2 border-filete pl-3 text-sm text-secundario">
                    Resultado: {i.resultado}
                  </p>
                ) : null}

                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  {i.contraparte ? <Metadato>{i.contraparte}</Metadato> : null}
                  {i.etapa ? <Metadato>{i.etapa}</Metadato> : null}
                  {i.coste ? (
                    <Metadato>Coste {euros(i.coste)}</Metadato>
                  ) : null}
                  {i.descuento > 0 ? (
                    <span className="cifra text-xs text-acento-texto">
                      Aportación {euros(i.descuento)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {permisos.esIwl ? (
          <NuevaAportacion
            slug={compania.slug}
            companyId={compania.id}
            etapas={ruta.etapas.map((e) => ({ id: e.id, nombre: e.nombre }))}
          />
        ) : null}
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Producidos por IWL</Metadato>}>
          Entregables
        </TituloBloque>
        {extracto.entregables.length === 0 ? (
          <SinDatos>Todavía no hay entregables registrados.</SinDatos>
        ) : (
          <ul className="divide-y divide-filete">
            {extracto.entregables.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-sm font-medium text-titular">{e.titulo}</span>
                  {e.materia ? <Metadato>{e.materia}</Metadato> : null}
                  <span className="flex-1" />
                  <Metadato>{fecha(e.fecha)}</Metadato>
                </div>
                {e.descripcion ? (
                  <p className="mt-0.5 text-sm text-secundario">{e.descripcion}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>{extracto.horas.length} líneas</Metadato>}>
          Detalle de horas
        </TituloBloque>
        {permisos.esIwl ? (
          <RegistroRapidoHoras
            slug={compania.slug}
            companyId={compania.id}
            annexId={compromiso?.annexId ?? null}
            materias={(materias.data ?? []).map((m) => ({ id: m.id, nombre: m.name }))}
            perfiles={[
              ...new Map(
                (perfiles.data ?? []).map((p) => [
                  p.profile_code,
                  { codigo: p.profile_code, nombre: p.profile_name },
                ]),
              ).values(),
            ]}
            ultimaPersona={ultima?.persona ?? ""}
            ultimoPerfil={ultima?.perfil ?? "senior"}
          />
        ) : null}

        {extracto.horas.length === 0 ? (
          <SinDatos>Todavía no hay horas imputadas.</SinDatos>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-filete text-left">
                  <th className="px-4 py-2 font-medium text-metadato">Fecha</th>
                  <th className="px-4 py-2 font-medium text-metadato">Persona</th>
                  <th className="px-4 py-2 font-medium text-metadato">Materia</th>
                  <th className="px-4 py-2 font-medium text-metadato">Trabajo</th>
                  <th className="px-4 py-2 text-right font-medium text-metadato">Horas</th>
                  <th className="px-4 py-2 text-right font-medium text-metadato">Valor</th>
                  <th className="px-4 py-2 text-right font-medium text-metadato">
                    A mercado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-filete">
                {extracto.horas.map((h) => (
                  <tr key={h.id}>
                    <td className="cifra px-4 py-2.5 text-secundario">{fecha(h.fecha)}</td>
                    <td className="px-4 py-2.5 text-titular">
                      {h.persona}
                      {h.objetada ? (
                        <span className="ml-2 text-xs text-aviso">Objetada</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-secundario">{h.materia}</td>
                    <td className="px-4 py-2.5 text-secundario">{h.descripcion}</td>
                    <td className="cifra px-4 py-2.5 text-right text-titular">
                      {numero(h.horas, 1)}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-titular">
                      {euros(h.valorAplicado)}
                    </td>
                    <td className="cifra px-4 py-2.5 text-right text-metadato">
                      {euros(h.valorMercado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloque>
    </div>
  );
}

function Barra({
  etiqueta,
  entregado,
  comprometido,
  formato,
}: {
  etiqueta: string;
  entregado: number;
  comprometido: number | null;
  formato: (valor: number) => string;
}) {
  if (comprometido === null || comprometido === 0) return null;

  const pct = Math.min(100, (entregado / comprometido) * 100);

  return (
    <div className="flex items-center gap-4 py-1.5">
      <span className="w-16 shrink-0 text-sm text-titular">{etiqueta}</span>
      <span className="h-2 flex-1 rounded-sm bg-hundido" aria-hidden="true">
        <span
          className="barra-acento block h-full rounded-sm"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="cifra w-40 shrink-0 text-right text-sm text-secundario">
        {formato(entregado)} de {formato(comprometido)}
      </span>
    </div>
  );
}
