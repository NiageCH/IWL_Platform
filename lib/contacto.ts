/**
 * A dónde escribe quien no tiene cuenta.
 *
 * Había dos sitios que decían «escríbenos» sin decir dónde: el formulario
 * público cuando la convocatoria está cerrada, y el enlace privado de una
 * candidata. Un «escríbenos» sin dirección no es una invitación, es un
 * callejón.
 *
 * Sale de una variable de entorno para poder cambiarla sin tocar código.
 * El valor por defecto es el que hay que confirmar antes de repartir la
 * dirección: si ese buzón no existe, los correos se pierden.
 */
export const CORREO_CONTACTO =
  process.env.NEXT_PUBLIC_CORREO_CONTACTO ?? "hola@inceptionwomanlab.es";
