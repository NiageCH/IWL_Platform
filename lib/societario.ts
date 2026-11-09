import { z } from "zod";
import { fecha } from "@/lib/utils";

/**
 * La situación societaria de un proyecto: desde dónde parte.
 *
 * Siren no tiene SL, y la plataforma daba por hecho una sociedad. Esto
 * reúne los nombres, la descripción que se enseña y la validación del
 * formulario, que comparten la candidatura y la compañía. Sin base de
 * datos ni React: se usa a los dos lados y se prueba solo.
 */

export const SITUACIONES = {
  sin_constituir: "Sin sociedad constituida",
  en_constitucion: "Sociedad en constitución",
  constituida: "Sociedad constituida",
} as const;

export type Situacion = keyof typeof SITUACIONES;

export const FORMAS = {
  sl: "SL",
  sa: "SA",
  otra: "Otra forma jurídica",
  extranjera: "Sociedad extranjera",
} as const;

export type Forma = keyof typeof FORMAS;

export interface DatosSocietarios {
  situacion_societaria: Situacion | null;
  constitucion_prevista: string | null;
  forma_juridica: Forma | null;
  denominacion_social: string | null;
  cif: string | null;
}

/**
 * Cómo se enseña, como dato y no como alerta: «Sin sociedad constituida»,
 * «Sociedad en constitución · prevista el 15 ene 2027», «SL · Siren Tech».
 */
export function describirSituacion(d: Partial<DatosSocietarios>): string | null {
  switch (d.situacion_societaria) {
    case "sin_constituir":
      return SITUACIONES.sin_constituir;
    case "en_constitucion":
      return d.constitucion_prevista
        ? `${SITUACIONES.en_constitucion} · prevista el ${fecha(d.constitucion_prevista)}`
        : SITUACIONES.en_constitucion;
    case "constituida": {
      const partes = [
        d.forma_juridica ? FORMAS[d.forma_juridica] : null,
        d.denominacion_social || null,
      ].filter(Boolean);
      return partes.length ? partes.join(" · ") : `${SITUACIONES.constituida} · faltan sus datos`;
    }
    default:
      return null;
  }
}

/** Sin sociedad todavía: el equity del Acuerdo queda pendiente de constituirla */
export function equityPendiente(situacion: Situacion | null | undefined): boolean {
  return situacion === "sin_constituir" || situacion === "en_constitucion";
}

// `type` y no `interface`: se guarda como JSON, y una interfaz no encaja en ese tipo
export type Firmante = {
  nombre: string;
  calidad: "personal" | "representante";
};

/**
 * Quién firma el Acuerdo.
 *
 * Sin sociedad, las fundadoras a título personal, cada una con su nombre.
 * Con sociedad, quien la representa, y además las fundadoras a título
 * personal si el Acuerdo lo pide. Las personales llegan una por línea.
 */
export function leerFirmantes(
  situacion: Situacion,
  personales: string | null | undefined,
  representante: string | null | undefined,
): Firmante[] {
  const nombres = (personales ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const salida: Firmante[] = [];
  if (situacion === "constituida" && representante?.trim()) {
    salida.push({ nombre: representante.trim(), calidad: "representante" });
  }
  for (const nombre of nombres) salida.push({ nombre, calidad: "personal" });
  return salida;
}

const texto = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ?? "").trim() || null);

/**
 * Los campos del formulario, y lo que exige cada situación. Va con el
 * resto del esquema de cada acción: `.merge()` y `.superRefine(exigir)`.
 */
export const camposSocietarios = z.object({
  situacion_societaria: z.enum(["sin_constituir", "en_constitucion", "constituida"], {
    message: "Di desde dónde parte: sin sociedad, en constitución o constituida.",
  }),
  constitucion_prevista: texto,
  forma_juridica: z
    .union([z.enum(["sl", "sa", "otra", "extranjera"]), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  denominacion_social: texto,
  cif: texto,
});

export function exigir(
  d: z.infer<typeof camposSocietarios>,
  ctx: z.RefinementCtx,
) {
  if (d.situacion_societaria === "en_constitucion" && !d.constitucion_prevista) {
    ctx.addIssue({
      code: "custom",
      path: ["constitucion_prevista"],
      message: "¿Para cuándo está prevista? Es la fecha del hito de constituirla.",
    });
  }
  if (d.situacion_societaria === "constituida") {
    if (!d.forma_juridica) {
      ctx.addIssue({ code: "custom", path: ["forma_juridica"], message: "Elige la forma jurídica." });
    }
    if (!d.denominacion_social) {
      ctx.addIssue({ code: "custom", path: ["denominacion_social"], message: "Falta la denominación social." });
    }
    if (!d.cif) {
      ctx.addIssue({ code: "custom", path: ["cif"], message: "Falta el CIF o NIF." });
    }
  }
}

/**
 * Lo que se guarda: lo que no corresponde a la situación, en blanco. Una
 * fecha prevista de constitución en una sociedad ya constituida confunde.
 */
export function paraGuardar(d: z.infer<typeof camposSocietarios>): DatosSocietarios {
  return {
    situacion_societaria: d.situacion_societaria,
    constitucion_prevista: d.situacion_societaria === "en_constitucion" ? d.constitucion_prevista : null,
    forma_juridica: d.situacion_societaria === "constituida" ? d.forma_juridica : null,
    denominacion_social: d.situacion_societaria === "constituida" ? d.denominacion_social : null,
    cif: d.situacion_societaria === "constituida" ? (d.cif?.toUpperCase() ?? null) : null,
  };
}
