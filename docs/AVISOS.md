# Inventario de avisos

REVISION, 18 nov: «cada aviso lleva al botón exacto, caduca cuando ya no toca
y enlaza con el paso siguiente». **Revisado y aprobado por Rodrigo el 19 nov**,
con seis avisos que faltaban, ya añadidos, y la sección «Lo que le toca a
ella».

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
| **Hito sin revisar** (`hito_sin_revisar`) | Dirección, a los 7 días de entregado | «"20 entrevistas" lleva más de 7 días entregado sin revisar» | Revisarlo · **Validar** / **Pedir cambios** | `/cartera/<slug>/ruta#hito-<id>` | Igual que el anterior | Igual que el anterior |
| **Candidatura nueva** (`candidatura_nueva`), **19 nov** | Dirección y equipo | «Marta presentó Tarulo el 14 nov» | Revisarla · **Abrir**; en la franja, **Pasar a en revisión** | `/embudo/<id>#pasos` | Pasa a «En revisión» o a cualquier otro paso; la candidatura se descarta | Tener la reunión |
| **Acta pendiente de tu firma** (`acta_por_firmar`), **19 nov** | Cada miembro del comité que falta, uno por persona | «El acta de comité de Tarulo espera tu firma desde el 14 nov» | Firmarla · **Firmar el acta**; en la franja, la firma en un clic | `/embudo/<id>#comite` | Firma (se cierra el suyo, no el de los demás); sale del comité; el borrador se borra; la candidatura se descarta | Lo que decida el acta |
| **Propuesta de Acuerdo aceptada** (`anexo_aceptado`), **19 nov** | Dirección | «Alba aceptó la propuesta de Acuerdo el 15 nov» | Firmar el Acuerdo · **Firmar** | `/cartera/<slug>/programa#anexo` | Se firma; vuelve a borrador; la compañía se archiva | Se firma y entra en incubación |
| **Documento entregado** (`documento_entregado`), **19 nov** | Quien lo pidió (un punto que alguien de IWL añadió a mano); si nadie, dirección y equipo | «Alba entregó "Escritura de constitución" el 16 nov» | Revisarlo · **Revisar**; en la franja, **Validar** / **Pedir cambios** | `/cartera/<slug>/diligencia#punto-<id>` | Se valida, se piden cambios, se marca bloqueante o no aplica; la compañía se archiva | Ella entrega el siguiente punto |
| **Correos sin enviar** (`correos_sin_enviar`), **19 nov** | Dirección; uno solo aunque sean varios | «3 correos sin enviar desde el 12 nov» | Reintentarlos · **Reintentar** | `/admin/correos#correos` | No queda ninguno sin enviar | — |
| **Horas por confirmar** (`sesion_por_confirmar`), **20 nov** | Cada fundadora con cuenta, y por correo al registrarla | «Marta Mentora ha registrado 2 h de sesión del 12 nov» | Confirmarlas o decir qué no cuadra · **Revisar** | `/proyecto/sesiones#sesion-<id>` | Confirma, dice que no cuadra, se anula, o pasan 7 días (se confirma sola); la compañía se archiva | Cuentan para el Anexo |
| **No cuadra** (`sesion_no_cuadra`), **20 nov** | Quien registró la sesión | «Alba dice que no cuadran las horas de "Precios", del 12 nov» | Responder: corregirlas o mantenerlas · **Responder** | `/cartera/<slug>/sesiones#sesion-<id>` | Las corrige o las mantiene (vuelve a ella), se lleva a dirección o se anula | Ella vuelve a confirmar |
| **Horas en dirección** (`sesion_en_direccion`), **20 nov** | Dirección | «Las horas de "Precios" con Marea no cuadran y han llegado a dirección» | Decidir y cerrar · **Decidir** | `/cartera/<slug>/sesiones#sesion-<id>` | Dirección decide, o se anula | Cuentan para el Anexo |

## Los calculados

No se guardan: salen cada vez del estado, así que desaparecen solos cuando la
acción se hace.

| Aviso | Lo recibe | Qué te toca · botón | Lleva a | Desaparece cuando |
|---|---|---|---|---|
| **Revisión en comité** | Dirección | Volver a mirarla · **Redactar el acta** | `/embudo/<id>#comite` | Hay acta nueva o se descarta |
| **Decidir la incorporación**, **19 nov**: en Aceleración con lo obligatorio validado; en Construcción con la situación confirmada, sin esperar al tope. Si ha pasado el tope, lo dice («lleva 15 días en entrada sin Acuerdo») y no sale un segundo aviso | Dirección | Decidir · **Decidir la incorporación** | `/cartera/<slug>#incorporacion` | Hay decisión o se archiva |
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

## Lo que quedó decidido el 19 nov

- **Cambio de vía**: se queda como aviso con acción, y lo cierra «Revisado».
- **Correos sin enviar**: aviso a dirección, uno solo, que se cierra cuando no
  queda ninguno. Lleva a **Administración → Correos**, que no existía: hasta
  ahora los correos solo se veían en la ficha de cada candidatura o compañía,
  y los que no son de ninguna —el resumen diario, los de acceso— no se veían
  en ningún sitio.
- **Validar hitos**: dirección y el mentor principal; el técnico o el revisor,
  solo si está encargado de ese hito.
- **Hito sin revisar**: a los 7 días.

## Pendientes de decidir

- **Proponerle el Acuerdo.** Decidida la incorporación, lo siguiente es que
  IWL le proponga el Acuerdo. No tiene aviso: se ve en «En entrada», con
  quién lo mueve. Si quieres que lo sea, sería calculado, como «Decidir la
  incorporación».
- **La firma del Acuerdo** está en Programa (`#anexo`), que es donde está el
  botón, y no en la ficha (`#acuerdo`), que no lo tiene.

## Lo que le toca a ella

La candidata y la fundadora tienen las mismas necesidades que IWL. Esta tabla
es la base de «Tu siguiente paso», que se hará cuando se retome lo visual:
con las mismas reglas, la franja «Has venido a…» al llegar y el «Después» al
terminar.

**Hoy** cada una de estas acciones está en su pantalla, pero no llega como
aviso con su franja. Las anclas que no existen todavía en su lado van en
cursiva.

| Aviso | Lo recibe | Qué pasó | Qué te toca · botón | Lleva a | Se cierra cuando | Después |
|---|---|---|---|---|---|---|
| **Firmar el NDA** | La candidata | «IWL te ha enviado el NDA el 12 nov» | Leerlo y firmarlo · **Firmar el NDA** | `/candidatura` (con cuenta) o su enlace privado, *`#nda`* | Lo firma; la candidatura se descarta | IWL lo contrafirma (lo hace dirección) |
| **Elegir fecha** | La candidata | «IWL te propone 3 fechas para la reunión, el 10 nov» | Elegir una o proponer otras · **Elegir fecha** | `/candidatura` o su enlace, *`#reunion`* | Elige o propone otras; pasan todas las fechas; IWL cancela; la candidatura se descarta | Se celebra la reunión |
| **Decir tu situación societaria** | La fundadora | «Firmasteis el NDA el 12 nov» | Decirla · **Decir mi situación** | `/proyecto`, *`#situacion`* | La dice; la compañía se archiva | IWL la confirma |
| **Aceptar la propuesta de Acuerdo** | La fundadora | «IWL te propuso el Acuerdo el 13 nov» | Leerla y aceptarla, o comentarla · **Leer la propuesta** | `/proyecto/programa#anexo` | La acepta; IWL la devuelve a borrador; la compañía se archiva | IWL firma el Acuerdo |
| **Rehacer un hito** | La fundadora | «Tu mentor pidió cambios en "20 entrevistas" el 18 nov: …» | Rehacerlo y volver a entregarlo · **Rehacer** | `/proyecto/ruta#hito-<id>` | Lo entrega de nuevo; la compañía se archiva | Su mentor lo revisa |
| **Subir un documento pedido** | La fundadora | «IWL te pide "Escritura de constitución"» o «IWL pidió cambios en …: falta la página de firmas» | Subirlo · **Subir** | `/proyecto/diligencia#punto-<id>` | Lo sube (pasa a revisión); IWL lo marca «no aplica»; la compañía se archiva | IWL lo revisa |
| **Confirmar horas**, **hecho el 20 nov** (`sesion_por_confirmar`, arriba) | La fundadora, en su inicio («Te toca») y por correo | «Marta Mentora ha registrado 2 h de sesión del 12 nov» | Confirmarlas o decir qué no cuadra · **Revisar** | `/proyecto/sesiones#sesion-<id>` | Las confirma o dice que no cuadran; pasan 7 días; la compañía se archiva | Cuentan para el Anexo |
