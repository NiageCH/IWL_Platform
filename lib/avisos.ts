/**
 * Lo que dice cada aviso, en una frase. Lo usan la lista de avisos de la
 * cartera y el resumen diario por correo: los dos dicen lo mismo.
 */
export function textoAviso(tipo: string, persona: string, donde?: string | null): string {
  switch (tipo) {
    case "primer_acceso":
      return `${persona} ha entrado por primera vez`;
    case "nda_comentario":
      return `${persona} ha comentado el NDA`;
    case "situacion_dicha":
      return `${persona} ha dicho la situación societaria. Falta confirmarla`;
    case "anexo_comentario":
      return `${persona} ha comentado la propuesta de Acuerdo`;
    case "nda_firmado":
      return `${persona} ha firmado el NDA. Falta la firma de IWL`;
    case "reunion_elegida":
      return `${persona} ha elegido fecha para la reunión`;
    case "reunion_contrapropuesta":
      return `${persona} propone otras fechas para la reunión`;
    case "reunion_caducada":
      return `Han pasado todas las fechas de la reunión con ${persona} sin elegir ninguna. Propón otras`;
    case "cambio_via":
      return `${donde ?? "Una compañía"} pasa de Construcción a Aceleración. Lo que estaba por construir pasa a por entregar`;
    default:
      return `Aviso sobre ${donde ?? "una compañía"}`;
  }
}
