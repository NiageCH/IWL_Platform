import { clienteServidor } from "@/lib/supabase/servidor";
import { FormularioUmbralesAlta } from "@/components/formularios/umbrales-alta";
import { LugarNda, MarcadoresNda, PlantillaNda } from "@/components/formularios/nda-iwl";
import { HorquillaEquity, TopeEntrada } from "@/components/formularios/entrada";
import { problemaParaEnviar } from "@/lib/nda-texto";
import { fecha } from "@/lib/utils";
import { leerPlantillaVigente } from "@/lib/datos/nda";
import { ComiteDefecto } from "@/components/formularios/comite";
import { leerComiteDefecto, leerPersonasIwl } from "@/lib/datos/comite";
import {
  CeldaNumero,
  FilaTarifa,
  FormularioBandas,
  FormularioObjetivosTraccion,
  FormularioPesosMadurez,
  FormularioUmbrales,
  guardarPesoAreaAccion,
} from "@/components/formularios/admin";
import { Bloque, Metadato, TituloBloque } from "@/components/ui/primitivas";
import { euros, numero } from "@/lib/utils";

export const metadata = { title: "Programa y umbrales · Administración" };

interface Banda {
  codigo: string;
  nombre: string;
  desde: number;
  hasta: number;
}

/**
 * Lo que decide cuándo una compañía está lista y cuánto vale una hora.
 *
 * Los umbrales del estado invertible vivían en una constante de TypeScript.
 * El documento define «invertible» en prosa y deja los números abiertos, así
 * que son de IWL y se tocan desde aquí.
 */
export default async function AdminPrograma() {
  const supabase = await clienteServidor();

  const [ajustes, areas, tarifas, materias] = await Promise.all([
    supabase.from("platform_settings").select("key, value, description"),
    supabase
      .from("dd_areas")
      .select("id, name, weight, order_index")
      .eq("is_active", true)
      .order("order_index"),
    supabase
      .from("rate_cards")
      .select("id, profile_code, profile_name, applied_rate, market_rate, source")
      .is("valid_to", null)
      .order("applied_rate", { ascending: false }),
    supabase
      .from("contribution_subjects")
      .select("id, name, description, order_index")
      .eq("is_active", true)
      .order("order_index"),
  ]);

  const ajuste = (clave: string) =>
    (ajustes.data ?? []).find((a) => a.key === clave)?.value;

  const umbrales = (ajuste("umbrales_invertible") ?? {}) as {
    score_tecnico_minimo?: number;
    score_preparacion_minimo?: number;
    runway_minimo_meses?: number;
  };

  const bandas = (ajuste("bandas_preparacion") ?? []) as unknown as Banda[];
  const corte = (codigo: string, porDefecto: number) =>
    bandas.find((b) => b.codigo === codigo)?.hasta ?? porDefecto;

  const pesoTecnico = (ajuste("score_preparacion_peso_tecnico") ?? {}) as {
    peso?: number;
  };

  const pesosMadurez = (ajuste("pesos_madurez") ?? {}) as Record<string, number>;
  const objetivos = (ajuste("objetivos_traccion") ?? {}) as Record<string, number>;
  const [plantillaNda, personasIwl, comiteDefecto] = await Promise.all([
    leerPlantillaVigente(),
    leerPersonasIwl(),
    leerComiteDefecto(),
  ]);
  const umbralesAlta = (ajuste("onboarding_umbrales") ?? {}) as {
    atencion_dias?: number;
    vencido_dias?: number;
  };

  return (
    <div className="flex flex-col gap-6">
      <Bloque elevacion={2}>
        <TituloBloque accion={<Metadato>Qué hace falta para estar listo</Metadato>}>
          Umbrales del estado invertible
        </TituloBloque>

        <FormularioUmbrales
          tecnico={umbrales.score_tecnico_minimo ?? 80}
          preparacion={umbrales.score_preparacion_minimo ?? 80}
          runway={umbrales.runway_minimo_meses ?? 6}
        />

        <p className="border-t border-filete px-4 py-3 text-xs text-metadato">
          Además de estos números, bloquean siempre: un hallazgo crítico abierto,
          un punto bloqueante en el due diligence y cualquier hito del Anexo que
          condicione el estado. Eso no se configura.
        </p>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Cuándo avisa un paso parado</Metadato>}>
          Alta de las personas
        </TituloBloque>
        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          Cada persona que se da de alta pasa por la cuenta, el primer acceso,
          la contraseña, el NDA y la documentación. Si lleva en el mismo paso
          más días de estos, su ficha y tu inicio lo marcan en atención o
          vencido, y el contador de la barra lo cuenta.
        </p>
        <FormularioUmbralesAlta
          atencion={umbralesAlta.atencion_dias ?? 5}
          vencido={umbralesAlta.vencido_dias ?? 10}
        />
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              {plantillaNda
                ? `Versión ${plantillaNda.version} · ${fecha(plantillaNda.created_at)}`
                : "Sin texto todavía"}
            </Metadato>
          }
        >
          Plantilla del NDA
        </TituloBloque>
        <div className="flex flex-col gap-2 border-b border-filete px-4 py-3 text-sm text-secundario">
          <p>
            Es lo que firma cada candidata al entrar, y después IWL. Mientras
            esté vacía, ella ve que su NDA está en preparación y no puede
            firmar nada.
          </p>
          <p>
            <strong className="text-titular">Firma electrónica simple.</strong>{" "}
            Luciana valida que sirve para el NDA antes de usarlo con fundadoras
            reales. La plataforma no redacta el texto: pega aquí el validado
            (en Drive, «IWL_NDA_PlantillaGenerica_ES_v2_20261110»).
          </p>
          <p>
            <strong className="text-titular">Cada candidata firma su texto completado.</strong>{" "}
            Los huecos que dependen de ella van con marcadores —su nombre, su
            documento, si firma como persona o como sociedad—, y antes de firmar
            rellena lo suyo y lo ve ya escrito. Lo firmado es ese texto.
          </p>
          {plantillaNda ? (
            problemaParaEnviar(plantillaNda.texto) ? (
              <p className="text-cuerpo" role="status">
                <strong className="text-titular">No se puede enviar todavía.</strong>{" "}
                {problemaParaEnviar(plantillaNda.texto)} Mientras tanto, «Enviar el NDA» está
                bloqueado y quien ya tenga cuenta ve que su NDA está en preparación.
              </p>
            ) : (
              <p className="text-cuerpo">Lista para enviar: no le queda ningún hueco sin marcador.</p>
            )
          ) : null}
          {plantillaNda ? (
            <p className="cifra text-xs text-metadato">
              Hash SHA-256 de la versión vigente: {plantillaNda.hash}
            </p>
          ) : null}
          <MarcadoresNda />
        </div>
        <PlantillaNda vigente={plantillaNda?.texto ?? ""} />
        <div className="border-t border-filete">
          <LugarNda lugar={typeof ajuste("nda_lugar") === "string" ? (ajuste("nda_lugar") as string) : "Málaga"} />
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>No se trabaja sin Acuerdo</Metadato>}>
          Entrada en Construcción
        </TituloBloque>
        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          En Construcción, el tramo de entrada es un diagnóstico corto para
          decidir, no para construir. Al llegar a estos días sin Acuerdo, la
          compañía sale en atención en «En entrada» y en tus avisos; a la
          semana, vencida. En Aceleración no hay tope: el due diligence ya
          tiene sus avisos.
        </p>
        <TopeEntrada dias={typeof ajuste("entrada_tope_construccion_dias") === "number" ? (ajuste("entrada_tope_construccion_dias") as number) : 14} />
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>La fija Luciana</Metadato>}>
          Horquilla de equity por vía
        </TituloBloque>
        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          Entrar antes cuesta más equity: la horquilla de Construcción es más
          alta que la de Aceleración. Al proponer un Anexo se enseña como
          referencia, y salirse de ella pide el motivo, que queda en el
          registro. Vacía, no se comprueba nada.
        </p>
        <HorquillaEquity
          horquillas={(ajuste("equity_horquilla") ?? {}) as Record<string, { min: number | null; max: number | null }>}
        />
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>{comiteDefecto.length} personas</Metadato>}>
          Comité por defecto
        </TituloBloque>
        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          Salen marcadas al redactar cada acta de comité, y se pueden cambiar
          en ella. El acta se cierra cuando firman todas las que estén
          marcadas.
        </p>
        <ComiteDefecto personas={personasIwl} marcados={comiteDefecto} />
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Cómo se mide el avance</Metadato>}>
          Ejes de madurez
        </TituloBloque>

        <p className="border-b border-filete px-4 py-3 text-sm text-secundario">
          El score técnico dice si la tecnología aguanta y el de preparación si
          el expediente está en orden. El índice de madurez contesta a otra
          pregunta: si el proyecto está más maduro que cuando entró. Se compara
          contra la línea base congelada, y la comparación usa siempre estos
          pesos en los dos extremos, así que cambiarlos mueve las dos figuras a
          la vez y el salto entre ellas sigue siendo comparable.
        </p>

        <FormularioPesosMadurez pesos={pesosMadurez} />

        <div className="border-t border-filete">
          <TituloBloque accion={<Metadato>Referencia del eje de tracción</Metadato>}>
            Ingreso recurrente esperado por etapa
          </TituloBloque>
          <FormularioObjetivosTraccion objetivos={objetivos} />
        </div>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Cómo se lee la cohorte</Metadato>}>
          Bandas de preparación
        </TituloBloque>

        <FormularioBandas
          cortes={{
            inicio: corte("inicio", 40),
            desarrollo: corte("en_desarrollo", 65),
            consolidada: corte("consolidada", 85),
          }}
        />
      </Bloque>

      <Bloque>
        <TituloBloque
          accion={
            <Metadato>
              La técnica pesa {numero(pesoTecnico.peso ?? 2, 1)}
            </Metadato>
          }
        >
          Pesos de las áreas de due diligence
        </TituloBloque>

        <ul className="divide-y divide-filete">
          {(areas.data ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-4 px-4 py-2.5">
              <span className="flex-1 text-sm text-titular">{a.name}</span>
              <CeldaNumero
                accion={guardarPesoAreaAccion}
                id={a.id}
                campo="weight"
                valor={Number(a.weight)}
                paso="0.5"
                max="10"
                ancho="w-20"
              />
            </li>
          ))}
        </ul>

        <p className="border-t border-filete px-4 py-3 text-xs text-metadato">
          El score de preparación es la media ponderada de estas áreas más el
          score técnico, que entra como una área más con su propio peso.
        </p>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Aplicada y de mercado, por hora</Metadato>}>
          Tarifas
        </TituloBloque>

        <ul className="divide-y divide-filete">
          {(tarifas.data ?? []).map((t) => (
            <li key={t.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-48 shrink-0 text-sm text-titular">
                  {t.profile_name}
                  <span className="cifra block text-xs text-metadato">
                    {t.profile_code}
                  </span>
                </span>
                <FilaTarifa
                  id={t.id}
                  aplicada={Number(t.applied_rate)}
                  mercado={Number(t.market_rate)}
                />
                <span className="flex-1" />
                <span className="cifra text-xs text-acento-texto">
                  {euros(Number(t.market_rate) - Number(t.applied_rate))} de
                  aportación por hora
                </span>
              </div>
              {t.source ? (
                <p className="mt-1 text-xs text-metadato">Fuente: {t.source}</p>
              ) : null}
            </li>
          ))}
        </ul>

        <p className="border-t border-filete px-4 py-3 text-xs text-metadato">
          Cambiar una tarifa no toca las horas ya imputadas: cada línea guardó la
          suya el día que se registró. Lo que cambia es lo que se aplicará de
          aquí en adelante.
        </p>
      </Bloque>

      <Bloque>
        <TituloBloque accion={<Metadato>Dónde se imputan las horas</Metadato>}>
          Materias de la aportación
        </TituloBloque>

        <ul className="divide-y divide-filete">
          {(materias.data ?? []).map((m) => (
            <li key={m.id} className="px-4 py-2.5">
              <span className="text-sm text-titular">{m.name}</span>
              {m.description ? (
                <span className="block text-xs text-secundario">{m.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Bloque>
    </div>
  );
}
