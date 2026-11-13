/**
 * La dirección de un perfil de LinkedIn, en su forma canónica.
 *
 * Lo que la gente pega viene de mil maneras: sin `https://`, desde
 * `es.linkedin.com`, con la barra del final o con `?utm_source=…` del
 * botón de compartir. Todo eso es el mismo perfil, y se guarda como
 * `https://www.linkedin.com/in/<identificador>`, que es lo que comprueba la
 * base (`profiles_linkedin_url_valida`).
 *
 * Solo perfiles personales (`/in/`): una página de empresa o una
 * publicación no dicen quién es la persona.
 *
 * Devuelve `null` si lo pegado no es un perfil; `""` si está vacío.
 */
export function normalizarLinkedin(texto: string | null | undefined): string | null {
  const limpio = (texto ?? "").trim();
  if (!limpio) return "";

  const conEsquema = /^[a-z]+:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!/^([a-z]{2,3}\.)?linkedin\.com$/i.test(url.hostname)) return null;

  const partes = url.pathname.split("/").filter(Boolean);
  if (partes.length !== 2 || partes[0].toLowerCase() !== "in") return null;
  const identificador = partes[1];
  if (!/^[A-Za-z0-9%_-]+$/.test(identificador)) return null;

  return `https://www.linkedin.com/in/${identificador}`;
}
