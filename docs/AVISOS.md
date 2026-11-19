# Inventario de avisos

REVISION, 18 nov: «cada aviso lleva al botón exacto, caduca cuando ya no toca
y enlaza con el paso siguiente». **Pendiente de que Rodrigo lo revise.**

## Las reglas

1. **Un aviso es una acción pendiente de quien lo ve.** Si no le pide nada a
   esa persona, va al historial y no es un aviso.
2. **Cada aviso tiene tres partes:**
   - qué pasó, con el dato y la fecha;
   - qué te toca;
   - un botón con ese verbo.
3. **El botón lleva al sitio exacto**, con ancla. Arriba de la página aparece
   la franja «Has venido a: …», con el dato y la acción ahí mismo, y el
   bloque de destino queda resaltado.
4. **Al hacer la acción, la franja dice qué viene después** y quién lo hace.
5. **Un aviso se cierra solo** cuando alguien hace la acción, sea quien sea,
   o cuando la acción ya no tiene sentido:
   - la fecha ha pasado;
   - la candidatura está descartada;
   - la compañía está archivada.
6. **Lo que viene después de una fecha se avisa al llegar la fecha.**
7. **El aviso dice de dónde viene y qué va después.** Lo saca del recorrido,
   no de un texto escrito a mano en cada aviso.

## Los que quedan

En la tabla, **«Se cierra cuando»** dice qué cierra el aviso además de la
acción. Si pone «— », solo lo cierra la acción.

| Aviso | Lo recibe | Qué pasó | Qué te toca · botón | Lleva a | Se cierra cuando | Después |
|---|---|---|---|---|---|---|
| **NDA firmado** (`nda_firmado`) | Dirección | «Ana firmó el NDA el 10 nov» | Contrafirmarlo · **Contrafirmar** | `/embudo/<id>#nda` | Dirección contrafirma; la candidatura se descarta | Ella dice su situación societaria (lo hace ella) |
| **Comentario al NDA** (`nda_comentario`) | Dirección | «Ana comentó el NDA el 10 nov» | Responderle · **Responder** | `/embudo/<id>#nda` | Alguien de IWL responde; la candidatura se descarta | Ella firma el NDA |
| **Situación dicha** (`situacion_dicha`) | Dirección | «Alba dijo su situación: sin constituir, el 10 nov» | Confirmarla · **Confirmar** / **Cambiarla** | `/cartera/<slug>#situacion` | Alguien la confirma; la compañía se archiva | Según el recorrido de entrada: due diligence o decidir la incorporación |
| **Comentario al Acuerdo** (`anexo_comentario`) | Dirección | «Alba comentó la propuesta de Acuerdo el 12 nov» | Responderle · **Responder** | `/cartera/<slug>/programa#anexo` | Alguien de IWL responde; la compañía se archiva | Ella acepta la propuesta |
| **Otras fechas** (`reunion_contrapropuesta`) | Dirección | «Marta propone otras fechas: 3 franjas, el 12 nov» | Aceptar una o proponer otras · **Elegir fecha** | `/embudo/<id>#reunion` | IWL acepta o propone; pasan todas sus fechas (sale «sin fecha»); la candidatura se descarta | Se celebra la reunión y se anota |
| **Reunión sin fecha** (`reunion_caducada`) | Dirección | «Pasaron todas las fechas con Marta sin elegir ninguna» | Proponer otras · **Proponer fechas** | `/embudo/<id>#reunion` | IWL propone otras o cancela; la candidatura se descarta | Ella elige fecha |
| **Anota la reunión** (`reunion_anotar`), **nuevo** | Quien la propuso y quien fue de IWL | «La reunión del 13 nov con Tarulo ya pasó» | Anotarla · **Anotar** | `/embudo/<id>#reunion` | Alguien la anota; la candidatura se descarta | Moverla a comité, si toca |
| **Hito entregado** (`hito_entregado`) | Mentor principal y revisor encargado; sin ninguno, dirección | «Alba entregó el hito "20 entrevistas" el 18 nov» | Revisarlo · **Validar** / **Pedir cambios** | `/cartera/<slug>/ruta#hito-<id>` | Alguien lo valida o pide cambios; la compañía se archiva | Siguiente hito de la etapa |
| **Cambio de vía** (`cambio_via`) | Mentor principal | «Siren pasó de Construcción a Aceleración el 12 nov» | Revisar lo que pasa a por entregar · **Revisar** y, en la franja, **Revisado** | `/cartera/<slug>/diligencia#puntos` | Lo marca «Revisado» quien lo revisa (no hay otro hecho que lo cierre); la compañía se archiva | Ella entrega lo que falta |
| **Hito sin revisar** (`hito_sin_revisar`) | Dirección | «"20 entrevistas" lleva 8 días entregado sin revisar» | Revisarlo · **Validar** / **Pedir cambios** | `/cartera/<slug>/ruta#hito-<id>` | Igual que el anterior | Igual que el anterior |

## Los calculados

No se guardan: salen cada vez del estado, así que desaparecen solos cuando la
acción se hace.

| Aviso | Lo recibe | Qué te toca · botón | Lleva a | Desaparece cuando |
|---|---|---|---|---|
| **Revisión en comité** | Dirección | Volver a mirarla · **Redactar el acta** | `/embudo/<id>#comite` | Hay acta nueva o se descarta |
| **Tope de entrada en Construcción** | Dirección | Decidir · **Decidir la incorporación** | `/cartera/<slug>#incorporacion` | Hay decisión o se archiva |
| **Alta detenida** | Dirección | Recordárselo · **Recordar** (ahí mismo) | — | Ella da el paso |

## Los que salen de avisos

| Aviso | Por qué | Dónde queda |
|---|---|---|
| **Primer acceso** (`primer_acceso`) | No pide nada: es un hecho. | En «Altas en curso» y en el recorrido de la candidata |
| **Ha elegido fecha** (`reunion_elegida`) | La reunión quedó confirmada al elegir, y el correo con la invitación ya llega a IWL. Lo que toca después es anotarla, y eso es «Anota la reunión». | En «Qué ha pasado» de la candidatura |

Los avisos de estos dos tipos que estaban abiertos se cierran con la
migración `20261118120000_avisos_con_accion`. También se cierran los que ya
no tocan:
- los de reuniones pasadas;
- los de candidaturas descartadas;
- los de compañías archivadas.

Cada cierre queda en el registro como `avisos_cerrados_por_revision`, con
cuántos de cada tipo.

## Pendientes de decidir

- **Correos sin enviar.** Hoy es un contador en el bloque «Correos». Podría
  ser un aviso a dirección («3 correos sin enviar desde el 12 nov ·
  **Reintentar**»), pero no lo he convertido sin preguntar.
- **Cambio de vía.** Lo dejo como aviso porque el 10 nov se pidió que le
  llegara al mentor principal. Como no hay ningún hecho que lo cierre solo,
  lo cierra «Revisado». Si prefieres que vaya al historial, se quita.
- **Revisión en comité.** El botón lleva al bloque del comité. Redactar el
  acta nueva la saca de la lista.
