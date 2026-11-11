import "server-only";
import { clienteServicio } from "@/lib/supabase/servicio";
import { direccionBase } from "@/lib/direccion";
import { escribirCorreo, type DatosCorreo, type Evento } from "@/lib/correo/plantillas";
import { proveedor } from "@/lib/correo/proveedores";

export { NOMBRE_EVENTO, type Evento } from "@/lib/correo/plantillas";

/**
 * El correo de la plataforma: una sola entrada, `notificar`.
 *
 * Escribe el correo del evento, lo apunta en `correos`, lo entrega el
 * proveedor que haya y apunta en qué quedó. Nunca lanza: si el proveedor
 * falla, o no hay ninguno, la acción que lo provocó sigue adelante y el
 * correo queda «sin enviar», con «Reintentar» en la ficha.
 *
 * Usa la clave de servicio para escribir el registro. Quién puede provocar
 * cada envío lo comprueba la acción que llama, antes.
 */

export interface Destinatario {
  correo: string;
  nombre?: string | null;
  profileId?: string | null;
}

export interface Contexto {
  candidaturaId?: string | null;
  companyId?: string | null;
  autor?: string | null;
}

export interface ResultadoCorreo {
  id: string | null;
  estado: "enviado" | "sin_enviar";
  error?: string;
}

/**
 * Lo que solo se puede preparar al enviar y no se guarda: el enlace para
 * fijar la contraseña. Se genera en cada intento, nuevo.
 */
async function preparar(evento: Evento, datos: DatosCorreo, para: Destinatario): Promise<DatosCorreo> {
  if (evento !== "nda_enviado" && evento !== "acceso_dado") return datos;
  const { data, error } = await clienteServicio().auth.admin.generateLink({
    type: "recovery",
    email: para.correo,
    options: { redirectTo: `${direccionBase()}/auth/confirmar?siguiente=/cambiar-contrasena` },
  });
  if (error || !data.properties?.action_link) {
    throw new Error(`no se ha podido preparar su enlace de acceso: ${error?.message ?? "sin enlace"}`);
  }
  return { ...datos, enlace: data.properties.action_link, correo: para.correo };
}

async function entregar(
  filaId: string,
  evento: Evento,
  datos: DatosCorreo,
  para: Destinatario,
  intentos: number,
): Promise<ResultadoCorreo> {
  const servicio = clienteServicio();
  const quien = proveedor();
  if (!quien) {
    const error = "No hay proveedor de correo configurado.";
    await servicio.from("correos").update({ estado: "sin_enviar", error, intentos }).eq("id", filaId);
    return { id: filaId, estado: "sin_enviar", error };
  }
  try {
    const listos = await preparar(evento, datos, para);
    const c = escribirCorreo(evento, listos);
    const { id } = await quien.enviar({ para: { correo: para.correo, nombre: para.nombre }, ...c });
    await servicio
      .from("correos")
      .update({
        estado: "enviado",
        proveedor: quien.nombre,
        proveedor_id: id,
        error: null,
        intentos,
        enviado_at: new Date().toISOString(),
      })
      .eq("id", filaId);
    return { id: filaId, estado: "enviado" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await servicio.from("correos").update({ estado: "sin_enviar", proveedor: quien.nombre, error, intentos }).eq("id", filaId);
    return { id: filaId, estado: "sin_enviar", error };
  }
}

export async function notificar(
  destinatario: Destinatario,
  evento: Evento,
  datos: DatosCorreo,
  contexto: Contexto = {},
): Promise<ResultadoCorreo> {
  try {
    const { asunto } = escribirCorreo(evento, { ...datos, enlace: datos.enlace ?? "" });
    const { data: fila, error } = await clienteServicio()
      .from("correos")
      .insert({
        evento,
        destinatario: destinatario.correo,
        destinatario_nombre: destinatario.nombre ?? null,
        profile_id: destinatario.profileId ?? null,
        candidatura_id: contexto.candidaturaId ?? null,
        company_id: contexto.companyId ?? null,
        asunto,
        datos,
        created_by: contexto.autor ?? null,
      })
      .select("id")
      .single();
    if (error || !fila) return { id: null, estado: "sin_enviar", error: error?.message ?? "no se pudo apuntar" };
    return await entregar(fila.id, evento, datos, destinatario, 1);
  } catch (e) {
    return { id: null, estado: "sin_enviar", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Volver a intentar uno que quedó sin enviar. Quién puede, lo mira la acción */
export async function reintentar(id: string): Promise<ResultadoCorreo> {
  const { data: fila } = await clienteServicio().from("correos").select("*").eq("id", id).maybeSingle();
  if (!fila) return { id, estado: "sin_enviar", error: "Ese correo ya no está." };
  if (fila.estado === "enviado") return { id, estado: "enviado" };
  return entregar(
    id,
    fila.evento as Evento,
    fila.datos as DatosCorreo,
    { correo: fila.destinatario, nombre: fila.destinatario_nombre, profileId: fila.profile_id },
    fila.intentos + 1,
  );
}

/** Si hay proveedor: Administración lo dice cuando no */
export function hayProveedor(): boolean {
  return proveedor() !== null;
}
