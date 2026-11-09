import type { EstadoVisual } from "@/lib/estados";

/**
 * El alta de una persona, paso a paso.
 *
 * Rodrigo dio de alta a Agustina y no tenía forma de saber si había
 * entrado, si había cambiado la contraseña o dónde se había quedado. Esto
 * convierte las fechas que guarda la base en una línea de pasos con su
 * estado, y dice cuántos días lleva la persona en el paso en que está.
 *
 * Cálculo puro: sin base de datos ni React, para poder probarlo solo y
 * usarlo igual en la ficha, en el inicio y en el contador de la barra.
 */

export interface Umbrales {
  /** Días en un paso a partir de los cuales pide atención */
  atencion_dias: number;
  /** Días a partir de los cuales está vencido */
  vencido_dias: number;
}

export const UMBRALES_POR_DEFECTO: Umbrales = { atencion_dias: 5, vencido_dias: 10 };

/** Las fechas que hacen falta. Todas en ISO; `null` es que no ha pasado */
export interface DatosOnboarding {
  cuentaCreada: string | null;
  primerAcceso: string | null;
  contrasenaCambiada: string | null;
  /** Sin candidatura —alta directa— el alta acaba en la contraseña */
  candidatura: null | {
    descartada: boolean;
    ndaElla: string | null;
    ndaIwl: string | null;
    /** Peticiones obligatorias del due diligence y cuántas tienen algo entregado */
    entregas: { cumplidas: number; total: number; ultima: string | null } | null;
    comite: string | null;
    acuerdo: string | null;
  };
}

export type ClavePaso =
  | "cuenta"
  | "primer_acceso"
  | "contrasena"
  | "nda_ella"
  | "nda_iwl"
  | "due_diligence"
  | "comite"
  | "acuerdo";

export interface Paso {
  clave: ClavePaso;
  nombre: string;
  estado: EstadoVisual;
  /** Cuándo se completó */
  fecha: string | null;
  /** Solo en el paso en curso: cuántos días lleva en él */
  dias: number | null;
  /** «3 de 5», para el due diligence */
  detalle?: string;
}

const NOMBRES: Record<ClavePaso, string> = {
  cuenta: "Cuenta creada",
  primer_acceso: "Primer acceso",
  contrasena: "Contraseña cambiada",
  nda_ella: "NDA firmado por ella",
  nda_iwl: "NDA firmado por IWL",
  due_diligence: "Due diligence entregado",
  comite: "Comité",
  acuerdo: "Acuerdo firmado",
};

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Días enteros entre dos fechas, contando por día natural y no por horas */
export function diasEntre(desde: string, hasta: string): number {
  const a = Date.UTC(+desde.slice(0, 4), +desde.slice(5, 7) - 1, +desde.slice(8, 10));
  const b = Date.UTC(+hasta.slice(0, 4), +hasta.slice(5, 7) - 1, +hasta.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function estadoPorDias(dias: number, u: Umbrales): EstadoVisual {
  if (dias >= u.vencido_dias) return "vencido";
  if (dias >= u.atencion_dias) return "atencion";
  return "curso";
}

export function pasosDeOnboarding(
  d: DatosOnboarding,
  umbrales: Umbrales = UMBRALES_POR_DEFECTO,
  hoy: string = hoyISO(),
): Paso[] {
  const c = d.candidatura;
  const entregas = c?.entregas ?? null;
  const ddHecho = Boolean(entregas && entregas.total > 0 && entregas.cumplidas >= entregas.total);

  const crudos: { clave: ClavePaso; fecha: string | null; detalle?: string }[] = [
    { clave: "cuenta", fecha: d.cuentaCreada },
    { clave: "primer_acceso", fecha: d.primerAcceso },
    { clave: "contrasena", fecha: d.contrasenaCambiada },
  ];

  if (c) {
    crudos.push(
      { clave: "nda_ella", fecha: c.ndaElla },
      { clave: "nda_iwl", fecha: c.ndaIwl },
      {
        clave: "due_diligence",
        // Hecho sin fecha de entrega conocida: cuenta como hecho el día del NDA
        fecha: ddHecho ? (entregas?.ultima ?? c.ndaIwl ?? c.ndaElla) : null,
        detalle: entregas && entregas.total > 0
          ? `${entregas.cumplidas} de ${entregas.total}`
          : undefined,
      },
      { clave: "comite", fecha: c.comite },
      { clave: "acuerdo", fecha: c.acuerdo },
    );
  }

  /*
   * Lo que está hecho después de algo que no lo está se hizo fuera de la
   * plataforma —un NDA en papel, una compañía que ya estaba dentro—: el
   * paso de antes no aplica, no está pendiente.
   */
  const ultimoHecho = crudos.map((p) => Boolean(p.fecha)).lastIndexOf(true);

  let enCurso = false;
  let anterior: string | null = null;

  return crudos.map((p, i) => {
    const base = { clave: p.clave, nombre: NOMBRES[p.clave], fecha: p.fecha, dias: null, detalle: p.detalle };

    if (p.fecha) {
      anterior = p.fecha;
      return { ...base, estado: "hecho" as EstadoVisual };
    }
    if (i < ultimoHecho || c?.descartada) {
      return { ...base, estado: "no_aplica" as EstadoVisual };
    }
    if (enCurso) {
      return { ...base, estado: "pendiente" as EstadoVisual };
    }

    enCurso = true;

    /*
     * Sin cuenta no hay nadie parado: crearla es cosa de IWL, y la línea
     * mide dónde se ha quedado la persona.
     */
    if (p.clave === "cuenta" || !anterior) {
      return { ...base, estado: "pendiente" as EstadoVisual };
    }

    const dias = diasEntre(String(anterior).slice(0, 10), hoy);
    return { ...base, estado: estadoPorDias(dias, umbrales), dias };
  });
}

/** El paso en que está, si hay alguno abierto con días contando */
export function pasoEnCurso(pasos: Paso[]): Paso | null {
  return pasos.find((p) => p.dias !== null) ?? null;
}

/** Si pide que alguien haga algo: el paso en curso está en atención o vencido */
export function estaDetenido(pasos: Paso[]): boolean {
  const p = pasoEnCurso(pasos);
  return p !== null && (p.estado === "atencion" || p.estado === "vencido");
}

/**
 * El texto del recordatorio, para correo y para WhatsApp.
 *
 * Sin proveedor de correo, «Recordar» abre un correo ya redactado y deja
 * este texto para copiarlo. Lo escribe una persona a otra: sin jerga de
 * dentro, diciendo qué falta y dónde se hace.
 */
export function textoRecordatorio(
  paso: ClavePaso,
  nombre: string,
  direccion: string,
): { asunto: string; cuerpo: string } {
  const pila = nombre.split(" ")[0] || nombre;
  const qué: Partial<Record<ClavePaso, string>> = {
    primer_acceso: `todavía no has entrado en la plataforma. Entra en ${direccion}/entrar con tu correo y la contraseña que te pasamos.`,
    contrasena: `al entrar, la plataforma te pide elegir tu propia contraseña. Hasta que lo hagas no puedes ver nada más.`,
    nda_ella: `tienes el NDA esperando tu firma. Entra en ${direccion} y lo verás nada más entrar.`,
    due_diligence: `falta documentación del due diligence. Entra en ${direccion} y verás qué queda por subir.`,
  };
  const cuerpo = `Hola, ${pila}: ${qué[paso] ?? `seguimos con tu alta en la plataforma de Inception Woman Lab. Entra en ${direccion} para ver qué falta.`}\n\nCualquier duda, responde a este mensaje.\n\nEquipo de Inception Woman Lab`;
  return { asunto: "Tu alta en la plataforma de Inception Woman Lab", cuerpo };
}
