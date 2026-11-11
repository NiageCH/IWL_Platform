/**
 * Quién entrega los correos. Cambiar de proveedor es escribir otro
 * adaptador aquí: el resto de la plataforma solo conoce `notificar`.
 *
 *   · brevo: el de producción, por su API HTTP. Con `BREVO_API_KEY`. IWL
 *     ya lo usaba y no quiere un proveedor por proyecto (REVISION, 11 nov).
 *   · mailpit: el buzón local que trae Supabase. No sale nada a internet;
 *     se lee en http://127.0.0.1:54324, y las pruebas lo consultan.
 *
 * Sin ninguno, no se envía: el correo queda «sin enviar» y Administración
 * lo dice.
 */

export interface Mensaje {
  para: { correo: string; nombre?: string | null };
  asunto: string;
  texto: string;
  html: string;
}

export interface Proveedor {
  nombre: "brevo" | "mailpit";
  enviar(m: Mensaje): Promise<{ id: string }>;
}

/** «Nombre <correo>» en sus dos partes */
export function partirRemitente(r: string): { nombre: string | null; correo: string } {
  const m = r.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { nombre: m[1] || null, correo: m[2].trim() } : { nombre: null, correo: r.trim() };
}

export function remitente() {
  return process.env.CORREO_REMITENTE || "Inception Woman Lab <plataforma@inceptionwlab.es>";
}

export function respuestaA() {
  return process.env.CORREO_RESPUESTA || "iwl@inceptionwlab.es";
}

/**
 * Brevo, por su API de correo transaccional. Devuelve el id del mensaje
 * («<…@smtp-relay.mailin.fr>»), que va al registro de envíos.
 */
export const brevo: Proveedor = {
  nombre: "brevo",
  async enviar(m) {
    const de = partirRemitente(remitente());
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY ?? "",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: de.correo, ...(de.nombre ? { name: de.nombre } : {}) },
        to: [{ email: m.para.correo, ...(m.para.nombre ? { name: m.para.nombre } : {}) }],
        replyTo: { email: respuestaA() },
        subject: m.asunto,
        textContent: m.texto,
        htmlContent: m.html,
      }),
    });
    const cuerpo = (await r.json().catch(() => ({}))) as { messageId?: string; message?: string };
    if (!r.ok || !cuerpo.messageId) throw new Error(cuerpo.message ?? `Brevo respondió ${r.status}`);
    return { id: cuerpo.messageId };
  },
};

const mailpit: Proveedor = {
  nombre: "mailpit",
  async enviar(m) {
    const de = partirRemitente(remitente());
    const r = await fetch(`${process.env.MAILPIT_URL || "http://127.0.0.1:54324"}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: de.correo, Name: de.nombre ?? "" },
        To: [{ Email: m.para.correo, Name: m.para.nombre ?? "" }],
        ReplyTo: [{ Email: respuestaA() }],
        Subject: m.asunto,
        Text: m.texto,
        HTML: m.html,
      }),
    });
    const cuerpo = (await r.json().catch(() => ({}))) as { ID?: string };
    if (!r.ok || !cuerpo.ID) throw new Error(`Mailpit respondió ${r.status}`);
    return { id: cuerpo.ID };
  },
};

/**
 * El proveedor que toca. `CORREO_PROVEEDOR` lo fuerza («brevo», «mailpit»
 * o «ninguno»). Si no, Brevo si hay clave; Mailpit si la base es la local;
 * y si no, ninguno.
 */
export function proveedor(): Proveedor | null {
  const forzado = process.env.CORREO_PROVEEDOR;
  if (forzado === "ninguno") return null;
  if (forzado === "brevo") return process.env.BREVO_API_KEY ? brevo : null;
  if (forzado === "mailpit") return mailpit;
  if (process.env.BREVO_API_KEY) return brevo;
  if (/127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) return mailpit;
  return null;
}
