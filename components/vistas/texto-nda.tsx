import { interpretarNda, type Tramo } from "@/lib/nda-formato";

/**
 * El texto del NDA con su formato, en pantalla. Lo pinta el mismo
 * intérprete que el PDF, para que lo que ella lee antes de firmar y lo que
 * firma coincidan: título, rótulos, cláusulas con su número colgado,
 * expositivos, listas, negrita y las firmas en dos columnas.
 *
 * Todo va sobre una calle de 2 rem a la izquierda, donde cuelga el número
 * de cada cláusula, como en el margen del PDF.
 *
 * Sin estado ni efectos: lo usa el formulario de firma, que es de cliente,
 * y se puede usar desde el servidor igual.
 */

function Tramos({ tramos }: { tramos: Tramo[] }) {
  return (
    <>
      {tramos.map((t, i) =>
        t.negrita ? (
          <strong key={i} className="font-semibold text-titular">
            {t.texto}
          </strong>
        ) : (
          <span key={i}>{t.texto}</span>
        ),
      )}
    </>
  );
}

export function TextoNda({ texto }: { texto: string }) {
  const piezas = interpretarNda(texto);
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-cuerpo [overflow-wrap:anywhere]">
      {piezas.map((p, i) => {
        switch (p.tipo) {
          case "titulo":
            return (
              <div key={i} className="mb-2 pl-8">
                <h3 className="text-xl font-semibold leading-tight text-titular">{p.texto}</h3>
                <div className="mt-2 h-1 w-12 bg-acento" aria-hidden />
              </div>
            );
          case "seccion":
            return (
              <h4 key={i} className="mt-3 pl-8 text-sm font-semibold uppercase tracking-[0.05em] text-titular">
                {p.texto}
              </h4>
            );
          case "clausula":
            return (
              <h4
                key={i}
                className="mt-3 grid grid-cols-[2rem_1fr] items-baseline border-t border-acento pt-3 text-sm font-semibold uppercase text-titular"
              >
                <span className="font-mono text-[0.7rem] font-normal text-metadato">{p.numero}</span>
                <span>{p.titulo}</span>
              </h4>
            );
          case "parrafo":
            return (
              <p key={i} className="pl-8">
                <Tramos tramos={p.tramos} />
              </p>
            );
          case "expositivo":
            return (
              <p key={i} className="grid grid-cols-[2rem_2.5rem_1fr]">
                <span />
                <span>{p.numero}</span>
                <span>
                  <Tramos tramos={p.tramos} />
                </span>
              </p>
            );
          case "lista":
            return (
              <p key={i} className="grid grid-cols-[3.25rem_1.75rem_1fr]">
                <span />
                <span>{p.letra}</span>
                <span>
                  <Tramos tramos={p.tramos} />
                </span>
              </p>
            );
          case "firmas":
            return (
              <div key={i} className="mt-2 grid gap-6 pl-8 sm:grid-cols-2">
                {p.bloques.map((b, j) => (
                  <div key={j} className="border-t border-filete-fuerte pt-3">
                    {b.map((linea, k) => (
                      <p key={k}>
                        <Tramos tramos={linea} />
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}
