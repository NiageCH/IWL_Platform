import type { ResumenCompania } from "@/lib/datos/compania";
import { leerExtracto } from "@/lib/datos/aportacion";
import { leerAportacionExtra, nombreTipo } from "@/lib/datos/aportacion-extra";
import { quienGenera } from "@/lib/datos/informes";
import {
  Celda,
  Cifras,
  NoHay,
  Pie,
  Portada,
  Seccion,
  Tabla,
} from "./piezas";
import { etapa } from "@/lib/etiquetas";
import { euros, fecha, numero, porcentaje } from "@/lib/utils";

/**
 * Extracto de aportación · §9 del documento de aportación.
 *
 * Es el apartado E del Anexo I, congelado en un documento. Sirve para tres
 * cosas: que la fundadora vea lo que recibe, que IWL justifique su equity, y
 * que la aportación se pueda demostrar en una ronda futura, cuando nadie se
 * acuerde de qué pasó el segundo trimestre.
 *
 * Lleva las cinco fuentes: horas, caja, introducciones, entregables y las
 * compras, eventos y reuniones. Y lleva los dos importes de cada una, porque
 * lo que sostiene el equity no es lo que IWL gasta sino la diferencia entre
 * eso y lo que la compañía habría pagado por su cuenta.
 */

const TIPOS_CONTACTO: Record<string, string> = {
  inversor: "Inversor",
  cliente: "Cliente",
  partner: "Partner",
  proveedor: "Proveedor",
  talento: "Talento",
  institucion: "Institución",
  medio: "Medio",
};

const ESTADOS_INTRO: Record<string, string> = {
  presentado: "Presentado",
  en_conversacion: "En conversación",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

export async function InformeAportacion({
  resumen,
}: {
  resumen: NonNullable<ResumenCompania>;
}) {
  const { compania } = resumen;

  const [extracto, extra, generadoPor] = await Promise.all([
    leerExtracto(compania.id),
    leerAportacionExtra(compania.id),
    quienGenera(),
  ]);

  const { compromiso } = extracto;
  const horasTotales = extracto.horas.reduce((t, h) => t + h.horas, 0);
  const valorHoras = extracto.horas.reduce((t, h) => t + h.valorAplicado, 0);
  const mercadoHoras = extracto.horas.reduce((t, h) => t + h.valorMercado, 0);
  const desembolsado = extracto.desembolsos.reduce((t, d) => t + d.importe, 0);

  /*
   * Lo que recibe la compañía, valorado a lo que costaría fuera: las horas a
   * precio de mercado, el dinero transferido y el valor de mercado de
   * compras, eventos y gestiones.
   */
  const valorMercadoTotal = mercadoHoras + desembolsado + extra.valorMercado;

  /*
   * Y la parte que no le cuesta nada.
   *
   * Se suma descuento a descuento en vez de restar totales, porque el dinero
   * transferido no tiene «descuento»: mil euros valen mil euros los ponga
   * quien los ponga. Lo que tiene descuento es el trabajo, que se imputa a
   * tarifa de programa, y el acceso, que una compañía sola no compra al
   * mismo precio. Esa diferencia es lo que sostiene la participación.
   */
  const descuentoHoras = mercadoHoras - valorHoras;
  const descuento = descuentoHoras + extra.descuento;

  const cerradas = extracto.introducciones.filter((i) => i.estado === "cerrado");

  return (
    <article>
      <Portada
        titulo="Extracto de aportación"
        compania={compania.name}
        subtitulo="Lo que IWL ha puesto en este proyecto dentro del programa de incubación: horas de trabajo con su valor, dinero desembolsado, presentaciones, entregables, compras y eventos. Es el apartado E del Anexo de Programa, al día."
        confidencialidad="Documento compartido entre IWL y el equipo fundador. Sirve para justificar la participación acordada y puede aportarse en un proceso de inversión."
        datos={[
          { etiqueta: "Etapa", valor: etapa(compania.stage) },
          {
            etiqueta: "Participación acordada",
            valor:
              compromiso?.equityPct != null
                ? `${numero(compromiso.equityPct, 2)} %`
                : "Sin Anexo firmado",
          },
          {
            etiqueta: "Periodo",
            valor:
              extracto.horas.length > 0
                ? `${fecha(extracto.horas[extracto.horas.length - 1].fecha)} — ${fecha(extracto.horas[0].fecha)}`
                : "Sin actividad registrada",
          },
        ]}
      />

      <Seccion
        titulo="Resumen"
        descripcion="La aportación se valora a precio de mercado y se cobra a tarifa de programa. La diferencia entre las dos es lo que la compañía se ahorra por estar dentro, y es el argumento de la participación acordada."
      >
        <Cifras
          items={[
            {
              etiqueta: "Horas de IWL",
              valor: numero(horasTotales, 1),
              nota: `${extracto.horas.length} ${extracto.horas.length === 1 ? "línea" : "líneas"} imputadas`,
            },
            {
              etiqueta: "Valor a mercado",
              valor: euros(valorMercadoTotal),
              nota: "Lo que costaría fuera del programa",
            },
            {
              etiqueta: "Caja desembolsada",
              valor: euros(desembolsado),
              nota: "Dinero transferido a la compañía",
            },
            {
              etiqueta: "Aportación no monetaria",
              valor: euros(descuento),
              nota: "La diferencia con el precio de mercado",
            },
          ]}
        />

        {compromiso?.annexId ? (
          <Tabla
            cabeceras={["Compromiso del Anexo", "Acordado", "Entregado", "Cumplimiento"]}
            alineadas={[1, 2, 3]}
          >
            <tr>
              <Celda>Horas de acompañamiento</Celda>
              <Celda cifra>
                {compromiso.horasComprometidas === null
                  ? "—"
                  : `${numero(compromiso.horasComprometidas, 0)} h`}
              </Celda>
              <Celda cifra>{numero(compromiso.horasEntregadas, 1)} h</Celda>
              <Celda cifra>
                {compromiso.horasPct === null
                  ? "—"
                  : porcentaje(compromiso.horasPct, 1)}
              </Celda>
            </tr>
            <tr>
              <Celda>Financiación directa</Celda>
              <Celda cifra>{euros(compromiso.cajaComprometida)}</Celda>
              <Celda cifra>{euros(compromiso.cajaDesembolsada)}</Celda>
              <Celda cifra>
                {compromiso.cajaPct === null ? "—" : porcentaje(compromiso.cajaPct, 1)}
              </Celda>
            </tr>
          </Tabla>
        ) : (
          <NoHay>
            No hay Anexo de Programa firmado, así que no hay compromiso contra
            el que medir. Lo que IWL ya ha puesto sí está registrado y es lo que
            recoge este extracto.
          </NoHay>
        )}
      </Seccion>

      <Seccion
        titulo="Horas por materia"
        descripcion="La materia es el área de conocimiento en la que se imputan las horas, no el pilar del programa: una sesión de mentoría puede ser de estrategia comercial o de producto."
      >
        {extracto.porMateria.length === 0 ? (
          <NoHay>Todavía no hay horas imputadas.</NoHay>
        ) : (
          <Tabla
            cabeceras={["Materia", "Horas", "A tarifa de programa", "A precio de mercado"]}
            alineadas={[1, 2, 3]}
          >
            {extracto.porMateria.map((m) => (
              <tr key={m.materia}>
                <Celda>{m.materia}</Celda>
                <Celda cifra>{numero(m.horas, 1)}</Celda>
                <Celda cifra>{euros(m.valorAplicado)}</Celda>
                <Celda cifra>{euros(m.valorMercado)}</Celda>
              </tr>
            ))}
            <tr className="border-t border-filete-fuerte font-medium">
              <Celda>Total</Celda>
              <Celda cifra>{numero(horasTotales, 1)}</Celda>
              <Celda cifra>{euros(valorHoras)}</Celda>
              <Celda cifra>{euros(mercadoHoras)}</Celda>
            </tr>
          </Tabla>
        )}
      </Seccion>

      <Seccion
        titulo="Horas por persona"
        descripcion="Quién ha puesto las horas y con qué perfil. La tarifa que se aplica a cada línea es la que estaba vigente el día que se imputó, copiada en ese momento: un cambio de tarifa no reescribe el histórico."
      >
        {extracto.porPersona.length === 0 ? (
          <NoHay>Todavía no hay horas imputadas.</NoHay>
        ) : (
          <Tabla cabeceras={["Persona", "Perfil", "Horas", "Valor"]} alineadas={[2, 3]}>
            {extracto.porPersona.map((p) => (
              <tr key={`${p.persona}-${p.perfil}`}>
                <Celda>{p.persona}</Celda>
                <Celda>{p.perfil}</Celda>
                <Celda cifra>{numero(p.horas, 1)}</Celda>
                <Celda cifra>{euros(p.valor)}</Celda>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Seccion
        titulo="Financiación directa"
        hojaNueva
        descripcion="Dinero comprometido en el Anexo y lo que se ha desembolsado de cada partida. Una partida justificada es la que tiene su factura o su comprobante en la sala de datos."
      >
        {extracto.partidas.length === 0 ? (
          <NoHay>No hay partidas de financiación directa comprometidas.</NoHay>
        ) : (
          <Tabla
            cabeceras={["Partida", "Comprometido", "Desembolsado", "Justificado", "Condición"]}
            alineadas={[1, 2, 3]}
          >
            {extracto.partidas.map((p) => (
              <tr key={p.id}>
                <Celda>
                  {p.partida}
                  {p.descripcion ? (
                    <span className="block text-xs text-secundario">
                      {p.descripcion}
                    </span>
                  ) : null}
                </Celda>
                <Celda cifra>{euros(p.comprometido)}</Celda>
                <Celda cifra>{euros(p.desembolsado)}</Celda>
                <Celda cifra>{euros(p.justificado)}</Celda>
                <Celda>{p.condicion ?? "Sin condición"}</Celda>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Seccion
        titulo="Presentaciones"
        descripcion="Contactos a los que IWL ha presentado la compañía, con en qué acabó cada uno. Una presentación que no llevó a nada sigue siendo aportación: el acceso se pone, el resultado no se controla."
        accion={
          cerradas.length > 0 ? (
            <span className="cifra text-xs text-metadato">
              {cerradas.length} cerradas
            </span>
          ) : undefined
        }
      >
        {extracto.introducciones.length === 0 ? (
          <NoHay>Todavía no hay presentaciones registradas.</NoHay>
        ) : (
          <Tabla
            cabeceras={["Contacto", "Tipo", "Presentó", "Fecha", "Estado", "Importe"]}
            alineadas={[5]}
          >
            {extracto.introducciones.map((i) => (
              <tr key={i.id}>
                <Celda>
                  {i.contacto}
                  {i.organizacion ? (
                    <span className="block text-xs text-secundario">
                      {i.organizacion}
                    </span>
                  ) : null}
                </Celda>
                <Celda>{TIPOS_CONTACTO[i.tipo] ?? i.tipo}</Celda>
                <Celda>{i.quien}</Celda>
                <Celda>{fecha(i.fecha)}</Celda>
                <Celda>
                  {ESTADOS_INTRO[i.estado] ?? i.estado}
                  {i.resultado ? (
                    <span className="block text-xs text-secundario">
                      {i.resultado}
                    </span>
                  ) : null}
                </Celda>
                <Celda cifra>{i.importe === null ? "—" : euros(i.importe)}</Celda>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Seccion
        titulo="Compras, eventos y gestiones"
        descripcion="Lo que IWL pone y no son horas ni transferencias: una licencia que asume, un escenario al que lleva al proyecto, una reunión que organiza, un trámite que hace por la compañía."
      >
        {extra.items.length === 0 ? (
          <NoHay>
            Todavía no hay compras, eventos ni reuniones registradas. Es la
            parte de la aportación que no son horas ni dinero, y sin ella el
            extracto cuenta el trabajo pero no el acceso.
          </NoHay>
        ) : (
          <>
            <Tabla
              cabeceras={["Aportación", "Tipo", "Fecha", "Coste IWL", "Valor a mercado"]}
              alineadas={[3, 4]}
            >
              {extra.items.map((i) => (
                <tr key={i.id}>
                  <Celda>
                    {i.titulo}
                    {i.resultado ? (
                      <span className="block text-xs text-secundario">
                        Resultado: {i.resultado}
                      </span>
                    ) : null}
                  </Celda>
                  <Celda>{nombreTipo(i.tipo)}</Celda>
                  <Celda>{fecha(i.fecha)}</Celda>
                  <Celda cifra>{i.coste === null ? "—" : euros(i.coste)}</Celda>
                  <Celda cifra>
                    {i.valorMercado === null ? "—" : euros(i.valorMercado)}
                  </Celda>
                </tr>
              ))}
              <tr className="border-t border-filete-fuerte font-medium">
                <Celda>Total</Celda>
                <Celda />
                <Celda />
                <Celda cifra>{euros(extra.coste)}</Celda>
                <Celda cifra>{euros(extra.valorMercado)}</Celda>
              </tr>
            </Tabla>
          </>
        )}
      </Seccion>

      {extracto.entregables.length > 0 ? (
        <Seccion
          titulo="Entregables"
          descripcion="Documentos y materiales producidos por IWL que quedan en manos de la compañía."
        >
          <Tabla cabeceras={["Entregable", "Materia", "Entregado"]}>
            {extracto.entregables.map((e) => (
              <tr key={e.id}>
                <Celda>
                  {e.titulo}
                  {e.descripcion ? (
                    <span className="block text-xs text-secundario">
                      {e.descripcion}
                    </span>
                  ) : null}
                </Celda>
                <Celda>{e.materia ?? "—"}</Celda>
                <Celda>{fecha(e.fecha)}</Celda>
              </tr>
            ))}
          </Tabla>
        </Seccion>
      ) : null}

      <Pie
        generadoPor={generadoPor}
        nota="Las horas se valoran a la tarifa vigente el día en que se imputaron. La compañía puede objetar cualquier línea por escrito dentro de los quince días siguientes a su registro."
      />
    </article>
  );
}
