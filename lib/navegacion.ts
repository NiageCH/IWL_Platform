import { capacidades } from "@/lib/permisos";
import type { NombreIcono } from "@/lib/secciones";

/**
 * Las entradas del menú, en un solo sitio.
 *
 * Estaban escritas a mano dos veces —`barra-lateral.tsx` para IWL y
 * `barra-superior.tsx` para la fundadora— y había que acordarse de tocar
 * las dos. Añadir «Tareas» en una y olvidarla en la otra no rompe nada:
 * simplemente la mitad de la gente no la encuentra.
 *
 * Se decide por capacidad, no por rol, para que añadir un rol sea una fila
 * en `lib/permisos.ts` y no una condición más aquí.
 */

export interface EntradaMenu {
  href: string;
  nombre: string;
  icono: NombreIcono;
  /** Para marcar la entrada abierta también en sus subrutas */
  prefijo?: string;
}

export function menuDe(rol: string | undefined | null): EntradaMenu[] {
  const c = capacidades(rol);
  const entradas: EntradaMenu[] = [];

  if (c.verCartera) {
    entradas.push({ href: "/cartera", nombre: "Cartera", icono: "cartera" });
  }

  if (c.tieneProyectoPropio) {
    entradas.push({
      href: "/proyecto",
      nombre: "Mi compañía",
      icono: "resumen",
    });
  }

  if (c.verEmbudo) {
    entradas.push({ href: "/embudo", nombre: "Embudo", icono: "embudo" });
  }

  /*
   * Comparativa deja de ser entrada propia.
   *
   * Es una forma de mirar la cartera, no otro sitio: tenerla fuera
   * obligaba a elegir entre dos entradas que contestan a la misma
   * pregunta. Pasa a `/cartera?vista=comparativa` en el paso 4; hasta
   * entonces, la ruta vieja sigue existiendo y solo se cae del menú.
   */

  if (c.configurarPrograma) {
    entradas.push({
      href: "/admin",
      nombre: "Administración",
      icono: "administracion",
      prefijo: "/admin",
    });
  }

  return entradas;
}
