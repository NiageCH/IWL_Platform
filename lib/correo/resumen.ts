import "server-only";
import { clienteServicio } from "@/lib/supabase/servicio";
import { direccionBase } from "@/lib/direccion";
import { lineaAviso } from "@/lib/avisos";
import { CAMPOS_AVISO, comoAviso, conCuantosCorreos, type FilaAviso } from "@/lib/datos/onboarding";
import { leerModoPruebas, notificar } from "@/lib/correo";
import { leerEnEntradaCon, porDecidir, porProponer } from "@/lib/datos/entrada";
import { leerHitosVencidosDeMisCompanias, leerLoQueLeToca } from "@/lib/datos/le-toca";
import { nuevosParaResumen } from "@/lib/le-toca";

/** Una línea calculada para el resumen, con su clave para no repetirla */
interface Calculado {
  clave: string;
  estado: "atencion" | "vencido";
  linea: string;
}

/**
 * El resumen diario de avisos: un correo a cada persona que tenga
 * alguno abierto, no uno por aviso. Quien no quiere recibirlo lo dice en
 * Mi cuenta.
 *
 * Dirección ve los avisos de todos (los que no van a nadie en concreto) y
 * los suyos; el resto de IWL y los mentores, solo los suyos —los de un
 * cambio de vía y los hitos entregados, al mentor principal—. Es lo mismo
 * que ve cada cual en la cartera.
 *
 * Lo calculado —el avance del mes, los hitos que vencen, decidir la
 * incorporación, proponer el Acuerdo— va también, pero solo el día que
 * aparece y el día que pasa a vencido (REVISION, 21 nov). Lo guardado se
 * repite mientras siga abierto, como hasta ahora. Por lo calculado, el
 * resumen llega también a las fundadoras.
 */
export async function enviarResumenes(): Promise<{ enviados: number; sinEnviar: number }> {
  const servicio = clienteServicio();
  /*
   * En modo pruebas, el resumen solo a quien lo eligió a mano en Mi cuenta
   * (REVISION, 21 nov). El «diario» por defecto no cuenta: así no le llega
   * al equipo real un resumen de compañías de prueba.
   */
  const modo = await leerModoPruebas();
  const [{ data: todas }, { data: avisos }, { data: fundadoras }, { data: contadas }, enEntrada] = await Promise.all([
    servicio
      .from("profiles")
      .select("id, email, full_name, role, resumen_elegido_at")
      .in("role", ["admin_iwl", "equipo_iwl", "mentor", "fundadora"])
      .eq("is_active", true)
      .eq("resumen_avisos", "diario"),
    servicio
      .from("avisos")
      .select(`${CAMPOS_AVISO}, para, para_iwl`)
      .is("cerrado_at", null)
      .order("created_at"),
    servicio.from("company_members").select("profile_id, company_id").eq("member_role", "fundadora"),
    servicio.from("digest_computed_notices").select("profile_id, notice_key, state"),
    leerEnEntradaCon(servicio, { logos: false }),
  ]);

  const personas = (todas ?? []).filter((p) => !modo.activo || p.resumen_elegido_at);
  const enlaceDe = (ruta: string) => `${direccionBase()}${ruta}`;
  const deDireccion: Calculado[] = [
    ...porDecidir(enEntrada).map((d) => ({
      clave: `decidir-${d.slug}`,
      estado: d.tope === "vencido" ? ("vencido" as const) : ("atencion" as const),
      linea: `${d.paso}. Te toca: decidir la incorporación.`,
    })),
    ...porProponer(enEntrada).map((d) => ({
      clave: `proponer-${d.slug}`,
      estado: "atencion" as const,
      linea: `${d.paso}. Te toca: proponerle el Acuerdo.`,
    })),
  ];

  let enviados = 0;
  let sinEnviar = 0;
  for (const p of personas) {
    if (!p.email) continue;
    const filas = (avisos ?? []) as unknown as Array<FilaAviso & { para: string | null; para_iwl: boolean }>;
    // Los de todo IWL, a dirección y al equipo; no a los mentores
    const suyos = filas.filter(
      (a) =>
        a.para === p.id ||
        (a.para === null && p.role === "admin_iwl") ||
        (a.para_iwl && p.role === "equipo_iwl"),
    );

    const calculados = await calculadosDe(p, servicio, deDireccion, fundadoras ?? []);
    const contados = new Set(
      (contadas ?? []).filter((c) => c.profile_id === p.id).map((c) => `${c.notice_key}|${c.state}`),
    );
    const nuevos = nuevosParaResumen(calculados, contados);
    if (!suyos.length && !nuevos.length) continue;

    // Lo mismo que la cartera: qué pasó y qué le toca
    const dichos = await conCuantosCorreos(suyos.map(comoAviso), servicio);
    const lista = dichos.map((a) => `· ${lineaAviso(a)}`).join("\n");
    const r = await notificar(
      { correo: p.email, nombre: p.full_name, profileId: p.id },
      "resumen_avisos",
      {
        nombre: p.full_name,
        cuantos: suyos.length,
        lista,
        nuevos: nuevos.length,
        lista_nuevos: nuevos.map((c) => `· ${c.linea}`).join("\n"),
        enlace: enlaceDe(p.role === "fundadora" ? "/proyecto" : "/cartera"),
      },
    );
    if (r.estado === "enviado") {
      enviados++;
      // Contado solo si salió: si el correo falla, mañana se vuelve a intentar
      if (nuevos.length) {
        await servicio
          .from("digest_computed_notices")
          .upsert(
            nuevos.map((c) => ({ profile_id: p.id, notice_key: c.clave, state: c.estado })),
            { onConflict: "profile_id,notice_key,state", ignoreDuplicates: true },
          );
      }
    } else sinEnviar++;
  }
  return { enviados, sinEnviar };
}

/** Lo calculado de cada cual: lo mismo que ve en su inicio */
async function calculadosDe(
  p: { id: string; role: string },
  servicio: ReturnType<typeof clienteServicio>,
  deDireccion: Calculado[],
  fundadoras: Array<{ profile_id: string; company_id: string }>,
): Promise<Calculado[]> {
  if (p.role === "fundadora") {
    const companias = fundadoras.filter((f) => f.profile_id === p.id).map((f) => f.company_id);
    const listas = await Promise.all(companias.map((id) => leerLoQueLeToca(id, servicio)));
    return listas.flat().map((c) => ({ clave: c.clave, estado: c.estado, linea: `${c.texto}. ${c.teToca}.` }));
  }
  // Los hitos vencidos de las compañías que coordina, sea del rol de IWL que sea
  const hitos = (await leerHitosVencidosDeMisCompanias(p.id, servicio)).map((c) => ({
    clave: c.clave,
    estado: c.estado,
    linea: `${c.texto}. ${c.teToca}.`,
  }));
  return p.role === "admin_iwl" ? [...deDireccion, ...hitos] : hitos;
}
