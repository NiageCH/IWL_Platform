/**
 * Una contraseña que no haya que inventarse.
 *
 * Tres palabras y un número: se dicta por teléfono sin deletrear y aguanta
 * mucho mejor que la que escribiría a mano quien está dando de alta a siete
 * personas seguidas. El alfabeto evita las parejas que se confunden al
 * leerlas.
 *
 * Vive fuera de las acciones porque un fichero `"use server"` solo puede
 * exportar funciones asíncronas: todo lo que exporta queda expuesto como
 * punto de entrada desde el navegador, y una función corriente ahí dentro
 * es un error de compilación.
 */
export function generarClave(): string {
  const palabras = [
    "faro", "duna", "brisa", "roble", "cauce", "sierra", "ambar", "junco",
    "vela", "musgo", "risco", "trigo", "nieve", "cala", "olmo", "surco",
    "greda", "helio", "lirio", "marea", "nardo", "prisma", "sauce", "vega",
  ];
  const azar = (n: number) => {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0] % n;
  };

  const tres = Array.from({ length: 3 }, () => palabras[azar(palabras.length)]);
  return `${tres.join("-")}-${10 + azar(90)}`;
}
