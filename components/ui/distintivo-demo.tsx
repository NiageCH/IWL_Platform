/**
 * Distintivo de compañía de demostración.
 *
 * Lleva la palabra dentro y no solo un color, como el resto de pastillas:
 * quien no distinga el tono lee exactamente lo mismo.
 *
 * Importa que se vea. Una demostración existe para enseñarse, así que
 * aparece en los mismos sitios que una compañía real y alguien puede
 * tomarla por una: sus cifras están construidas para recorrer todos los
 * estados, no para describir nada. Que no cuente en los agregados lo
 * arregla por dentro; esto lo arregla por fuera.
 */
export function DistintivoDemo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span
      className="pastilla [--tono:var(--color-durazno)]"
      title="Compañía de demostración: no entra en las medias de la cohorte"
    >
      {compacto ? "Demo" : "Demostración"}
    </span>
  );
}
