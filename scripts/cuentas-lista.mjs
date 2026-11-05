/**
 * Quién tiene cuenta en la nube. Una sola lista, para los tres usos.
 *
 * `cuentas:nube` crea las del equipo, `cuentas:revision` las de revisión y
 * `cuentas:nube -- --limpiar` borra todo lo que no esté aquí. Si las listas
 * vivieran en cada script, añadir a alguien en uno y no en el otro sería
 * darle cuenta y borrársela en la siguiente limpieza.
 */

/** La cuenta principal: la única que la limpieza exige que funcione */
export const PRINCIPAL = "rodrigo@niage.es";

/**
 * El equipo, con su papel.
 *
 * Carlos Silvero y Cecilia Calónico no están: sus correos reales no están
 * confirmados, y una cuenta con un correo equivocado no es un dato
 * pendiente, es un enlace de acceso en el buzón de otra persona.
 */
export const EQUIPO = [
  { email: PRINCIPAL, nombre: "Rodrigo González", rol: "admin_iwl" },
  { email: "luciana@niage.es", nombre: "Luciana Patiño", rol: "admin_iwl" },
  { email: "laura@niage.es", nombre: "Laura Gleizer", rol: "equipo_iwl" },
  { email: "juan.mishima@niage.es", nombre: "Juan Mishima", rol: "revisor_niage" },
  { email: "ingenieria@inceptionwlab.es", nombre: "David Rodriguez", rol: "equipo_iwl" },
];

export const PREFIJO_REVISION = "rodrigo+rev-";

/**
 * Las de revisión: una por vista, colgando de la demostración.
 *
 * `vinculo` describe qué hay que montarle además de la cuenta:
 *   · null            — el rol basta, ve toda la cartera
 *   · {papel}         — miembro de la compañía de demostración con ese papel
 *   · {candidatura}   — se le da acceso a una candidatura en NDA firmado
 */
export const REVISION = [
  {
    alias: "admin", nombre: "Revisión · Dirección",
    rol: "admin_iwl", vinculo: null,
    ve: "Toda la plataforma, incluida la configuración del programa",
  },
  {
    alias: "equipo", nombre: "Revisión · Equipo IWL",
    rol: "equipo_iwl", vinculo: null,
    ve: "Toda la cartera y el embudo, sin configuración",
  },
  {
    alias: "niage", nombre: "Revisión · Ingeniería Niage",
    rol: "revisor_niage", vinculo: { papel: "revisor_niage" },
    ve: "Solo la demostración, con el due diligence técnico editable",
  },
  {
    alias: "mentor1", nombre: "Revisión · Mentor principal",
    rol: "mentor", vinculo: { papel: "mentor_principal" },
    ve: "Solo la demostración, como quien la coordina",
  },
  {
    alias: "mentor2", nombre: "Revisión · Mentor secundario",
    rol: "mentor", vinculo: { papel: "mentor_secundario" },
    ve: "Solo la demostración, sin aportación ni hallazgos técnicos",
  },
  {
    alias: "fundadora", nombre: "Revisión · Fundadora",
    rol: "fundadora", vinculo: { papel: "fundadora" },
    ve: "Su proyecto y nada más",
  },
  {
    alias: "lector", nombre: "Revisión · Lector externo",
    rol: "lector_externo", vinculo: { papel: "fundadora" },
    ve: "Su proyecto, en solo lectura",
  },
  {
    alias: "candidata", nombre: "Revisión · Candidata",
    rol: "candidata", vinculo: { candidatura: true },
    ve: "Su candidatura y el due diligence que tiene por entregar",
  },
];

export const correoRevision = (alias) => `${PREFIJO_REVISION}${alias}@niage.es`;

/**
 * Los correos que se quedan, exactos.
 *
 * Exactos y no por prefijo: un `rodrigo+rev-loquesea` que nadie sabe de
 * dónde salió es justo lo que una limpieza tiene que encontrar.
 */
export function correosQueSeQuedan() {
  return new Set([
    ...EQUIPO.map((p) => p.email.toLowerCase()),
    ...REVISION.map((c) => correoRevision(c.alias).toLowerCase()),
  ]);
}
