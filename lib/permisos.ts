/**
 * Qué puede hacer cada rol, en un solo sitio.
 *
 * Antes esto estaba repartido: `esIwl()` en `lib/supabase/servidor.ts`, una
 * excepción escrita a mano para el revisor de Niage en `/cartera` y en
 * `/comparativa`, y comprobaciones sueltas de `role === "admin_iwl"` en cada
 * pantalla. Añadir un rol obligaba a buscarlas todas, y dejarse una no
 * fallaba: solo dejaba a alguien fuera, o dentro, sin que nadie lo notara.
 *
 * Se razona por **capacidad**, no por rol: la pantalla pregunta «¿puede ver
 * la cartera?», no «¿es IWL?». Así, cuando cambia quién puede hacer qué, se
 * cambia aquí y punto.
 *
 * Esto decide **qué se enseña**. Quien autoriza sigue siendo la base: si las
 * dos discrepan, manda la base y aquí solo se vería un botón que da error.
 * Las capacidades por compañía —escribir, validar— viven en
 * `lib/datos/permisos.ts`, porque dependen de la asignación y no del rol.
 */

export type Rol =
  | "admin_iwl"
  | "equipo_iwl"
  | "revisor_niage"
  | "fundadora"
  | "mentor"
  | "lector_externo"
  | "candidata";

export interface Capacidades {
  /** Entra por la cartera y ve el esqueleto de IWL, con barra lateral */
  verCartera: boolean;
  /**
   * Ve la cartera entera.
   *
   * Quien no la tiene sigue viendo `/cartera`, pero solo con sus compañías
   * asignadas: el filtro no lo hace la pantalla, lo hace RLS.
   */
  verTodaLaCartera: boolean;
  verEmbudo: boolean;
  configurarPrograma: boolean;
  /** Trabaja sobre una sola compañía y entra por `/proyecto` */
  tieneProyectoPropio: boolean;
  /** Es una candidata con cuenta: su sitio es `/candidatura` */
  esCandidata: boolean;
}

const CAPACIDADES: Record<Rol, Capacidades> = {
  admin_iwl: {
    verCartera: true,
    verTodaLaCartera: true,
    verEmbudo: true,
    configurarPrograma: true,
    tieneProyectoPropio: false,
    esCandidata: false,
  },
  equipo_iwl: {
    verCartera: true,
    verTodaLaCartera: true,
    verEmbudo: true,
    configurarPrograma: false,
    tieneProyectoPropio: false,
    esCandidata: false,
  },
  /*
   * Revisor y mentor pasan al esqueleto de IWL con la cartera filtrada.
   *
   * Antes caían en `/proyecto` —la vista de una sola compañía— porque la
   * ruta deduce la compañía de la primera fila de `company_members`. Un
   * mentor que lleva tres proyectos veía uno, al azar, y no tenía forma de
   * llegar a los otros dos.
   */
  revisor_niage: {
    verCartera: true,
    verTodaLaCartera: false,
    verEmbudo: false,
    configurarPrograma: false,
    tieneProyectoPropio: false,
    esCandidata: false,
  },
  mentor: {
    verCartera: true,
    verTodaLaCartera: false,
    verEmbudo: false,
    configurarPrograma: false,
    tieneProyectoPropio: false,
    esCandidata: false,
  },
  fundadora: {
    verCartera: false,
    verTodaLaCartera: false,
    verEmbudo: false,
    configurarPrograma: false,
    tieneProyectoPropio: true,
    esCandidata: false,
  },
  lector_externo: {
    verCartera: false,
    verTodaLaCartera: false,
    verEmbudo: false,
    configurarPrograma: false,
    tieneProyectoPropio: true,
    esCandidata: false,
  },
  candidata: {
    verCartera: false,
    verTodaLaCartera: false,
    verEmbudo: false,
    configurarPrograma: false,
    tieneProyectoPropio: false,
    esCandidata: true,
  },
};

/** Sin rol conocido no se puede nada: es lo seguro cuando algo falla */
const NADA: Capacidades = {
  verCartera: false,
  verTodaLaCartera: false,
  verEmbudo: false,
  configurarPrograma: false,
  tieneProyectoPropio: false,
  esCandidata: false,
};

export function capacidades(rol: string | undefined | null): Capacidades {
  if (!rol) return NADA;
  return CAPACIDADES[rol as Rol] ?? NADA;
}

/** Dónde aterriza cada quien al entrar por la raíz */
export function inicioDe(rol: string | undefined | null): string {
  const c = capacidades(rol);
  if (c.esCandidata) return "/candidatura";
  if (c.verCartera) return "/cartera";
  if (c.tieneProyectoPropio) return "/proyecto";
  return "/sin-compania";
}
