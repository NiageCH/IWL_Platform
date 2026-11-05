/**
 * Las candidaturas de muestra: una por desenlace del embudo.
 *
 * Están para enseñar cómo se ve cada una —en curso, firmada, descartada—,
 * así que van marcadas `is_demo` y no cuentan en ningún número. Se buscan
 * por nombre, que es lo que las hace reconocibles a quien mira el embudo.
 *
 * La abierta es la de la cuenta de revisión `candidata`: en NDA firmado,
 * que es el punto en que una candidata tiene cuenta y un due diligence por
 * entregar. La firmada cuelga de la compañía de demostración, porque una
 * firmada sin compañía la base no la admite y una real no puede ser.
 *
 * Los correos de contacto son alias de Rodrigo, como los de las cuentas de
 * revisión: si algo llegara a escribirles, llega a un buzón que controla.
 */
import { PREFIJO_REVISION } from "./cuentas-lista.mjs";

export const NOMBRE_REVISION = "Revisión · Candidatura";

const comunes = {
  sector: "Demostración",
  is_demo: true,
};

/** `compania` y `hoy` se ponen al crear: dependen de la instalación y del día */
export function muestras({ compania, hoy }) {
  return [
    {
      clave: "abierta",
      fila: {
        ...comunes,
        nombre: NOMBRE_REVISION,
        one_liner: "Candidatura de demostración, para recorrer la vista de candidata.",
        contacto_nombre: "Revisión · Candidata",
        contacto_email: `${PREFIJO_REVISION}candidata@niage.es`,
        estado: "nda",
        nda_firmado_on: hoy,
        origen: "Cuentas de revisión",
      },
    },
    {
      clave: "firmada",
      fila: {
        ...comunes,
        nombre: "Muestra · Firmada",
        one_liner: "Así se ve una candidatura que firmó y pasó a la cartera.",
        contacto_nombre: "Muestra · Firmada",
        contacto_email: `${PREFIJO_REVISION}muestra-firmada@niage.es`,
        estado: "firmada",
        nda_firmado_on: hoy,
        acuerdo_firmado_on: hoy,
        company_id: compania,
        origen: "Muestra de demostración",
      },
    },
    {
      clave: "descartada",
      fila: {
        ...comunes,
        nombre: "Muestra · Descartada",
        one_liner: "Así se ve una candidatura descartada, con su motivo.",
        contacto_nombre: "Muestra · Descartada",
        contacto_email: `${PREFIJO_REVISION}muestra-descartada@niage.es`,
        estado: "descartada",
        descartada_at: `${hoy}T12:00:00Z`,
        descartada_desde: "comite",
        descartada_motivo: "Muestra de demostración: así se ve el motivo de un descarte.",
        origen: "Muestra de demostración",
      },
    },
  ];
}
