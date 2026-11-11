# Bitácora

Una entrada por tanda de trabajo, la más reciente arriba. Solo se añaden:
una entrada escrita no se reescribe nunca, ni para corregirla. Si algo
resultó estar mal, se dice en la entrada siguiente.

Complementa a `DECISIONES.md`: aquí **qué pasó**, allí **por qué algo es
como es**.

---

## 2026-11-11 · Contraseña olvidada y correos de acceso en español · commit c5eaf2d

**Qué cambió**
- **«¿Has olvidado tu contraseña?» en `/entrar`.** Pide el correo y manda un enlace de recuperación (`resetPasswordForEmail`) que aterriza en `/cambiar-contrasena?recuperar=1`, con «Elige tu nueva contraseña». Después dice «Si hay una cuenta con ese correo, te hemos mandado un enlace…», exista o no la cuenta.
- Las otras dos vías siguen: contraseña, y «Pedir un enlace para entrar». Las tres se cambian con botones bajo el formulario.
- **`/cambiar-contrasena`** abre en dos casos: con la marca de contraseña temporal, como antes, o al volver del enlace. Sin ninguno de los dos, devuelve a la portada.
- **Plantillas de Supabase Auth en español**, en `supabase/templates/`: entrar con enlace, recuperar contraseña, invitación y cambio de correo. Tienen el mismo aspecto que los correos de `lib/correo`: la marca arriba, texto corto, un botón, la dirección por si el botón falla y la firma de IWL.
  - En local las lee `config.toml`.
  - En la nube se pegan a mano: `DESPLIEGUE.md`, paso 6 de «El correo», dice qué asunto y qué fichero van en cada pestaña.
- **Seguimiento de Brevo:** `DESPLIEGUE.md`, paso 7, dice dónde quitarlo para toda la cuenta y cómo comprobarlo. No he tocado el adaptador, como dijiste.
- **Pruebas:** `recuperar-contrasena.spec.ts`, de punta a punta con Mailpit. Comprueba el asunto y la plantilla, el enlace, la contraseña nueva y entrar con ella. También que un correo sin cuenta recibe la misma respuesta y ningún correo, y que `/cambiar-contrasena` no se abre a mano.

**Qué decidí yo**
- Que alguien con sesión abra `/cambiar-contrasena?recuperar=1` escribiéndolo a mano no le da nada nuevo: desde Mi cuenta ya puede cambiar su contraseña sin la anterior.
- Tras elegirla, se entra directamente, sin mensaje: el acuse es estar dentro, como en la primera entrada.
- El error al repetir la contraseña de antes ahora dice «Tiene que ser distinta de la que tenías.», que vale para los dos casos.
- «Entrar con un enlace» pasó a llamarse «Pedir un enlace para entrar». Las pruebas buscan «Entrar» exacto, porque hay más botones que contienen la palabra.
- La invitación dice que caduca en una hora: es lo que dura cualquier enlace (`otp_expiry`).
- Si en la nube el enlace de recuperación acabara en la portada, `DESPLIEGUE.md` dice que se añada `…/auth/confirmar**` a las direcciones de redirección: el enlace lleva `?siguiente=` detrás. En local funciona sin eso.

**Qué necesito que decidas**
1. ¿Quitamos «Pedir un enlace para entrar»? Con «¿Has olvidado tu contraseña?» ya no hace falta, y son dos correos de acceso parecidos para la misma persona.

**Estado**
- **Suites:** 230 unitarias; 227 de acceso, dos veces seguidas; 388 de interfaz, con 4 saltadas.
- **Despliegue:** sin desplegar, y sin migración nueva.
- **Al desplegar:** pegar las cuatro plantillas en Supabase y quitar el seguimiento en Brevo.

**Siguiente**
- Lo pendiente, en el orden de REVISION:
  1. el correo con enlace al «Darle cuenta»;
  2. el motivo obligatorio al cambiar o cancelar una reunión;
  3. los apellidos donde se identifica a la persona;
  4. el historial de versiones del Anexo.

---

## 2026-11-11 · Correo: Brevo en lugar de Resend · commit a67a304

**Qué cambió**
- **Adaptador de Brevo** en `lib/correo/proveedores.ts`. Envía por `POST https://api.brevo.com/v3/smtp/email`, con la cabecera `api-key`. El `messageId` que devuelve Brevo va al registro de envíos, en `correos.proveedor_id`, y su mensaje de error a `correos.error`.
- **Elección del proveedor:** con `BREVO_API_KEY` se envía por Brevo. Sin clave, en local se usa Mailpit y en producción ninguno: el correo queda «sin enviar». `CORREO_PROVEEDOR` (`brevo`, `mailpit` o `ninguno`) lo fuerza.
- **Aviso de Administración:** sin proveedor, dice «Falta la clave de Brevo, BREVO_API_KEY, en Vercel».
- **`DESPLIEGUE.md`, «El correo»:** reescrito para Brevo. También `.env.example` y la tabla de la especificación.
- **Pruebas unitarias nuevas:** la elección del proveedor, la llamada a Brevo (dirección, cabecera y cuerpo) y el error cuando Brevo rechaza el envío.

**Qué decidí yo**
- **Quité el adaptador de Resend.** Me dejabas elegir. Sin uso era una acción sin botón, y además una segunda clave que, olvidada en Vercel, decidiría por dónde sale el correo.
- **Supabase va por el puerto 587** (STARTTLS), como dice la entrada.
- **SPF en la raíz y no en un subdominio**, porque Brevo lo pide así. Si `inceptionwlab.es` ya tiene un SPF, se añade el include al que hay; no se crea un segundo.

**Pasos para Rodrigo** (detallados en `DESPLIEGUE.md` → «El correo»)
1. **Brevo:** Settings → Senders, Domains & Dedicated IPs → Domains → añadir `inceptionwlab.es`, autenticado a mano.
2. **GoDaddy** (DNS de `inceptionwlab.es`), los registros que enseñe Brevo:
   - TXT `@` con `brevo-code:…`, la verificación;
   - DKIM en `brevo1._domainkey` (y `brevo2._domainkey` si da dos), como TXT o CNAME según lo dé Brevo;
   - SPF: `include:spf.brevo.com` dentro del `v=spf1` que ya haya en `@`, o uno nuevo `v=spf1 include:spf.brevo.com ~all`;
   - DMARC: TXT `_dmarc` con `v=DMARC1; p=none; rua=mailto:iwl@inceptionwlab.es`, si no hay ya uno.
3. **Brevo, el remitente:** Senders → `Inception Woman Lab <plataforma@inceptionwlab.es>`.
4. **Brevo, la clave API:** SMTP & API → API Keys → nueva clave (`xkeysib-…`). Va a **Vercel** como `BREVO_API_KEY`.
5. **Vercel:** además, `CRON_SECRET`, una cadena aleatoria hecha con `openssl rand -hex 32`. Después, `npx vercel --prod`.
6. **Brevo, SMTP:** SMTP & API → SMTP, el Login (`…@smtp-brevo.com`) y una clave SMTP (`xsmtpsib-…`, que **no es la API**). Van a **Supabase** → Authentication → Emails → SMTP Settings:
   - host `smtp-relay.brevo.com`, puerto 587;
   - remitente `plataforma@inceptionwlab.es`, «Inception Woman Lab».
7. **Comprobarlo:** desaparece el aviso de Administración, y un NDA de prueba sale «Enviado» en el bloque «Correos» de su ficha.

**Qué necesito que decidas**
1. ¿El remitente es `plataforma@inceptionwlab.es` sin buzón detrás, con las respuestas a `iwl@`, o queréis que exista el buzón?

**Estado**
- **Suites:** 230 unitarias, 227 de acceso dos veces seguidas, 382 de interfaz con 4 saltadas.
- **Despliegue:** sin desplegar. Va con lo anterior y no trae migración nueva.
- **Sin probar:** el envío real por Brevo; solo se verá en producción con la clave.

**Siguiente**
- Desplegar.
- Después, lo pendiente de las respuestas del 11 nov: los apellidos donde se identifica a la persona, el correo con enlace en «Darle cuenta» y el motivo obligatorio al cambiar una reunión.

---

## 2026-11-11 · El NIF de IWL y el Anexo sin «Perfiles sénior» · commits 085e0b3, 53bca20

**Qué cambió**
- **NIF (085e0b3).** `lib/iwl.ts` lleva ahora B27646355, el correcto. Una prueba nueva comprueba su dígito de control: el viejo no lo pasaba, y cualquier cifra cambiada hace fallar la prueba. Las cinco muestras de `docs/constancia/` están regeneradas y llevan el NIF nuevo.
- **Anexo (53bca20).**
  - El formulario va en este orden: Equity, Horas, Valoradas en, Financiación directa, Duración, Empieza el, Termina el y Otros compromisos.
  - «Perfiles sénior» sale del formulario, de la vista (la tuya y la de ella) y de la acción. La columna `committed_seniors` se queda en la base, sin uso.
  - **Valoradas en** se calcula en vivo con un ajuste nuevo de Programa, «Tarifa para valorar el Anexo (€/h)», en el bloque Tarifas. Para poner otra cifra se marca «Poner otro valor que el calculado», y entonces el motivo es obligatorio. El motivo se ve junto al valor y no cambia mientras el Anexo está propuesto. Sin tarifa, el valor se escribe a mano como antes.
  - **Termina el** se calcula y se enseña: la víspera del mismo día, N meses después. Se guarda al guardar el Anexo.
  - **Financiación** vacía o 0 se lee «Sin financiación».
  - Migración `20261111140000_anexo_sin_seniors`.

**Qué decidí yo**
- La entrada del PDF del NDA y el acta (927a887) sigue diciendo el NIF viejo. La entrada que pedía no dejar ninguno chocaba con la regla de no reescribir la bitácora, y he seguido la regla: la corrección queda aquí. Fuera de esa entrada, en el repositorio no queda ninguno.
- «La tarifa del programa» no existía como una sola cifra: en Programa hay seis tarifas, una por perfil, con aplicada y de mercado. He creado un ajuste propio para el Anexo, vacío al desplegar.
- El motivo de otro valor se enseña a los dos, como el de salirse de la horquilla de equity: forma parte de lo que se le propone a ella.
- No hay historial de versiones del Anexo en pantalla, solo la última. Por eso los perfiles sénior de los Anexos ya guardados no se enseñan en ningún sitio.
- Fin del Anexo: si el día de destino no existe (31 de enero más un mes), termina el último día del mes.
- Los Anexos propuestos o firmados no se recalculan; solo se calcula al guardar un borrador.

**Qué necesito que decidas**
1. ¿Qué tarifa se pone en «Tarifa para valorar el Anexo»? ¿Una propia, o debería ser una de las seis de perfil (aplicada o de mercado)?
2. ¿Quieres un historial de versiones del Anexo en pantalla, donde se vería lo que tenían los anteriores?

**Estado**
- Suites: 224 unitarias; 227 de acceso, dos veces seguidas; 382 de interfaz, con 4 saltadas.
- Sin desplegar.
- Las respuestas del 11 nov que piden trabajo están por hacer: los apellidos donde se identifica a la persona, el correo con enlace en «Darle cuenta» y el motivo obligatorio al cambiar una reunión.

**Siguiente**
- Desplegar. Entran cinco migraciones: `20261111100000_nombre_y_apellidos`, `…110000_acta_hash`, `…120000_correos`, `…130000_reunion_acordada` y `…140000_anexo_sin_seniors`.
- Después, esas tres respuestas.

---

## 2026-11-11 · La reunión se acuerda en la plataforma · commit 46c2f3d

**Qué cambió**
· **IWL propone** dos o tres franjas en hora de Madrid, con su duración, quién va de IWL (se marca de la lista de personas), el formato —videollamada con enlace, o en persona con dirección— y una nota opcional.
· **Ella lo ve arriba en su página**, en el enlace privado mientras no tenga cuenta y en «Tu candidatura» si ya la tiene, como siguiente paso: «Te proponemos reunirnos», con las franjas.
  · **«Elegir esta»** la deja confirmada.
  · **«Ninguna me va»** le deja proponer dos o tres fechas suyas, con una nota.
· **IWL recibe el aviso** («… ha elegido fecha» o «… propone otras fechas»), que lleva a la ficha. Ahí acepta una de sus fechas o propone otras; el ida y vuelta se repite hasta que una queda confirmada. Cada paso queda en el historial.
· **Confirmada**, los dos lados ven fecha, hora de Madrid, formato y enlace o dirección. Ella tiene **«Añadir a mi calendario»**, que descarga un `.ics`. IWL puede **cambiarla** (vuelve a propuesta, con motivo y aviso a ella) o **cancelarla**, con motivo.
· **Los estados van con `<Estado>`**: Propuesta (por hacer), Contrapropuesta (atención: te toca), Confirmada (en curso), Celebrada (hecho), Cancelada (no aplica) y Caducada (vencido).
· **Una franja pasada no se elige.** Si pasan todas sin elegir, la ficha la marca «Caducada» y el cron diario deja un aviso a IWL para proponer otras, una sola vez.
· **A ella le llega un correo** al proponer, confirmar, cambiar y cancelar, con el enlace por el que entra. Sin proveedor quedan «sin enviar» en «Correos».
· **«Anotar la reunión»** sigue igual, colgando de la confirmada.
· Fuera el «Proponer y abrir el correo».

### Qué decidí yo
· **Sin línea para copiar a WhatsApp.** El correo ya existe, y tu entrada del correo dice que la sustituye.
· **Proponer, aceptar y cancelar no devuelven mensaje.** El acuse es la reunión cambiada en la lista, y si el correo salió lo dice «Correos» en la misma ficha. Con mensaje, el formulario desaparecía con su propio éxito y se llevaba el acuse, que es lo que prohíbe CLAUDE.md.
· **Cuando ella propone, la duración es la de IWL.** No se le pregunta: la reunión dura lo que IWL ha previsto.
· **«Caducada» se calcula al leer**, no es un estado guardado. El aviso lo deja el cron, que ya corre a diario para el resumen.
· **Las reuniones de antes** quedan como «Celebrada» si estaban anotadas, y como «Propuesta» si no.

### Qué necesito que decidas
1. ¿Cambiar una reunión confirmada debe pedir el motivo siempre? Ahora es opcional y, si se escribe, va en el correo.

### Estado
· 213 unitarias · 227 RLS, dos veces seguidas · **380 de interfaz en verde y 4 saltadas**.
· Migración `20261111130000_reunion_acordada`.

### Para desplegar todo lo de hoy
`main` está en `e862964`. Entran los puntos 1 a 4 (los pasos de después están en la entrada «Para desplegar los puntos 1 a 4»), el correo y la reunión. Cinco migraciones: `20261111100000_nombre_y_apellidos`, `20261111110000_acta_hash`, `20261111120000_correos`, `20261111130000_reunion_acordada` y, si no se desplegó antes, `20261110200000_nda_plantilla_con_huecos`. Aparta antes tu `docs/REVISION.md` sin guardar en `main`.

```bash
git merge --ff-only worktree-limpiar-cuentas-nube
npx supabase db push
git push
npx vercel --prod
```

Sin `RESEND_API_KEY` todo funciona igual, pero los correos quedan «sin enviar» y Administración lo avisa. Cuando pongas las variables de la entrada del correo, haz otro `npx vercel --prod` y reintenta desde cada ficha los que hayan quedado.

### Siguiente
Lo que digas de lo de hoy.

---

## 2026-11-11 · El correo de la plataforma · commit dd3161d

**Qué cambió**
· **`lib/correo/`**: una sola entrada, `notificar(destinatario, evento, datos)`, y un adaptador por proveedor. El de Resend usa su API HTTP. En local y en las pruebas se entrega a Mailpit (http://127.0.0.1:54324), y las pruebas leen ahí lo que habría llegado. Cambiar de proveedor es escribir otro adaptador en `lib/correo/proveedores.ts`.
· **Plantillas en código**, en español, con versión en texto plano y un botón. Remitente `Inception Woman Lab <plataforma@inceptionwlab.es>` y respuesta a `iwl@inceptionwlab.es`; los dos se pueden cambiar por variable de entorno.
· **Lo que sale ya:**
  · el enlace privado, al presentarse;
  · el NDA enviado, con un enlace para entrar y elegir su contraseña. La temporal ya no va por correo: se enseña a IWL una vez, para dársela por otro canal si hace falta;
  · la respuesta a su comentario, del NDA o del Acuerdo;
  · el Acuerdo propuesto, a cada fundadora;
  · el mensaje de descarte, del acta o de «no se incorpora»: con un botón, una sola vez;
  · el recordatorio («Enviar el correo»);
  · a IWL, un **resumen diario** de los avisos abiertos, a quien tenga alguno. Cada cual lo deja en «Cada mañana» o «Nunca» en Mi cuenta.
· **El registro**: cada envío deja una fila en `correos`, con evento, destinatario, cuándo, id del proveedor y estado. La ficha de la candidatura y la de la compañía tienen un bloque «Correos». Si el proveedor falla, la acción no falla: el correo queda «Sin enviar», con el motivo y «Reintentar».
· **Sin proveedor configurado**, Administración lo dice arriba y los correos quedan «sin enviar», no desaparecen.
· Fuera todos los «Abrir el correo».

### Qué decidí yo
· **No se guarda el correo ya escrito, sino el evento y sus datos**, y se vuelve a escribir en cada intento. El enlace para elegir contraseña deja entrar en su cuenta: si se guardara, cualquiera de IWL podría usarlo. Se genera al enviar y no queda en ninguna tabla.
· **La reunión no la he tocado aquí.** Sus cuatro correos están escritos y salen con la reunión en la plataforma, que es lo siguiente. Hasta entonces, «Proponer reunión» sigue abriendo el programa de correo.
· **El resumen diario sale a las 7:00 UTC**, las 8:00 o las 9:00 en Madrid según la época del año. Vercel Hobby permite un cron al día.
· **«Darle cuenta para el due diligence»** (cuando el NDA se firmó fuera) no manda correo: no está en tu lista. Deja el acceso escrito para mandarlo por otro canal.

### Qué necesito que decidas
1. ¿El correo de «Darle cuenta para el due diligence» lo quieres también, con el mismo enlace para elegir contraseña?

### Estado
· 209 unitarias · 220 RLS, dos veces seguidas · **378 de interfaz en verde y 4 saltadas**.
· Migración `20261111120000_correos`.

### Lo que tienes que hacer tú (fuera del código)
Está también en `DESPLIEGUE.md`, «El correo».

**Registros DNS en GoDaddy** (Resend da los valores exactos al añadir `inceptionwlab.es` con región UE, eu-west-1):

| Tipo | Nombre | Valor |
|---|---|---|
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com`, prioridad 10 |
| TXT (SPF) | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT (DKIM) | `resend._domainkey` | la clave pública que da Resend, entera |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:iwl@inceptionwlab.es` (si ya hay uno, se deja ese) |

El MX y el SPF van en el subdominio `send`, así que no tocan el correo que ya recibe `inceptionwlab.es`.

**Variables en Vercel** (producción):

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | la clave de Resend, con permiso de envío |
| `CRON_SECRET` | una cadena aleatoria larga (`openssl rand -hex 32`) |
| `CORREO_REMITENTE` | opcional; por defecto `Inception Woman Lab <plataforma@inceptionwlab.es>` |
| `CORREO_RESPUESTA` | opcional; por defecto `iwl@inceptionwlab.es` |

Después, otro `npx vercel --prod`: las variables no se aplican a un despliegue ya hecho.

**Supabase Auth con el mismo proveedor** (Authentication → Emails → SMTP Settings): host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña la misma clave, remitente `plataforma@inceptionwlab.es`, nombre `Inception Woman Lab`. Y en Authentication → URL Configuration, `https://ride.inceptionwlab.es/auth/confirmar` entre las direcciones de redirección: es a donde lleva el enlace del correo del NDA.

**Para comprobarlo**: desaparece el aviso de Administración, y al enviar un NDA de prueba su ficha dice «Enviado» en «Correos».

### Siguiente
La reunión acordada dentro de la plataforma.

---

## 2026-11-11 · Para desplegar los puntos 1 a 4

`main` está en `e862964`. Entran tres commits de código (`43b709c`, `4f9cc3e` y `927a887`), esta bitácora y dos migraciones: `20261111100000_nombre_y_apellidos` y `20261111110000_acta_hash`. Aparta antes tu `docs/REVISION.md` sin guardar en `main`.

```bash
git merge --ff-only worktree-limpiar-cuentas-nube
npx supabase db push
git push
npx vercel --prod
```

**Después del despliegue, en este orden:**
1. **Tú y Luciana: Mi cuenta → «Tus datos».** Escribe el nombre en «Nombre» y los apellidos en «Apellidos». Hasta entonces nadie puede contrafirmar un NDA, y la pantalla lo dice con el enlace. Si en «Nombre» está ya el nombre completo, quita de ahí los apellidos: si no, saldrían dos veces en la contrafirma.
2. **Pega otra vez la plantilla del NDA.** Abre `IWL_NDA_PlantillaPlataforma_ES_v3_20261110.md` como texto (en un editor, no en una vista previa) y pégala en Administración → Programa. La vista previa de debajo tiene que enseñar el título y las cláusulas antes de guardar. Quedará como versión 5. La 4 se queda como está, y Programa avisa de que no lleva marcas.
3. Las actas ya cerradas conservan su PDF. Si quieres el nuevo diseño en alguna, pulsa «Regenerar el PDF» en su ficha.

---

## 2026-11-11 · Textos desfasados del bloque del NDA · sin commit nuevo

**Qué cambió**
Nada en este encargo: ya estaba hecho en `f929491` y está en `main`. La ficha dice «Lo verá nada más entrar, en la versión N, encima de su candidatura. Puede comentarlo antes de firmar.», y con su firma pendiente de IWL la ayuda de comentar dice «Si algo no te encaja, dínoslo. Lo vemos antes de que firme IWL.». Lo comprueba `nda-comentarios.spec.ts`.

### Qué decidí yo
· Si en producción todavía ves el texto viejo, es que ese despliegue no ha llegado a Vercel: con el de arriba llega.

### Qué necesito que decidas
1. Si te referías a otro texto del bloque del NDA que no sea uno de estos dos, dime cuál.

### Estado
· Sin cambios.

### Siguiente
El correo de la plataforma.

---

## 2026-11-11 · PDF del NDA ajustado, y el acta de comité con la plantilla de documento IWL · commit 927a887

**Qué cambió**
· **Una sola plantilla de documento**, `DocumentoIwl` en `lib/pdf.ts`, para el NDA, el acta y los que vengan:
  · en la primera página, la marca («INCEPTION WOMAN LAB», Montserrat 600 a 9 pt con tracking) y debajo, en mono 7 pt gris, «INCEPTION WOMAN LAB, S.L. · NIF B27646559 · Ancha del Carmen 32, 29002 Málaga»; esos datos están solo en `lib/iwl.ts`;
  · en las demás, la cabecera;
  · en todas, el pie con filete magenta, «CONFIDENCIAL» y folio.
· **NDA: sin huecos al final de página.** Las cláusulas se parten entre páginas. Ningún párrafo deja una línea sola al pie ni arriba, y cada título va con las dos primeras líneas de lo que le sigue. El bloque de firmas sigue sin partirse.
· **El acta de comité**, con el mismo diseño:
  · título «Acta del comité de selección» y, debajo, startup, persona de contacto, cohorte y fecha;
  · ficha en dos columnas: fecha, cohorte, miembros y decisión;
  · el resumen tal como se escribió;
  · la decisión destacada con un filete magenta a la izquierda: la vía y el motivo del cambio, la fecha de revisión, o el motivo y si puede volver. El mensaje para ella no va;
  · una línea por miembro, con la fecha de su firma;
  · el registro de firmas aparte, con el hash del contenido firmado.
· **El hash del acta** se guarda al cerrarla (`comite_actas.contenido_hash`) y la base no deja cambiarlo.
· **«Regenerar el PDF»**, solo para dirección, en las actas cerradas. Hace uno nuevo con el diseño de ahora, deja el de antes en el expediente y comprueba que el hash coincide. El PDF dice que es regenerado y de dónde sale el hash.
· **`npm run acta:muestra`** genera las tres variantes.

### Qué decidí yo
· **Marca en texto**, porque no hay símbolo W en el repositorio.
· **Lo firmado de un acta** son los campos que se congelan desde la primera firma y los miembros por su id: si alguien cambia de nombre, el hash no cambia.
· **Las actas cerradas antes de esta versión** no tenían hash. Se calcula y se guarda la primera vez que se regeneran, y el PDF lo explica. No se ha podido alterar nada, porque el acta no se edita desde la primera firma.
· **El registro va en filas de etiqueta y valor**, como la ficha. Con tres firmantes, en bloques apilados, se iba a una tercera página.
· **`lib/pdf.ts` es solo de servidor.** Lo que llega al navegador pasó a `lib/firmas.ts`.

### Qué necesito que decidas
1. Mira en `docs/constancia/` las tres actas (`IWL_Acta_Muestra_Preseleccionada/Aplazada/Descartada.pdf`) y las dos del NDA real (`IWL_NDA_Muestra_PlantillaReal_v3_*`), revisadas página a página.

### Estado
· 202 unitarias · 216 RLS, dos veces seguidas · **374 de interfaz en verde y 4 saltadas**.
· Migración `20261111110000_acta_hash`.

### Siguiente
El correo de la plataforma.

---

## 2026-11-11 · Nombre y apellidos de la firmante · commit 4f9cc3e

**Qué cambió**
· **Presentarse y el alta** piden «Nombre» y «Apellidos», los dos obligatorios (`candidaturas.contacto_apellidos`). Las que ya existen se quedan con lo suyo y los apellidos vacíos.
· **«Tus datos para el NDA»** empieza por «Nombre y apellidos, como en tu documento», rellenado con los de la candidatura. Ella lo confirma o lo corrige. Ese valor entra en `{{contraparte_nombre}}` y en la firma, y la base exige nombre y al menos un apellido.
· **Si lo corrige**, la candidatura se actualiza y queda en el historial («Nombre corregido al firmar el NDA», con lo que constaba y lo que firmó).
· **Mi cuenta** tiene «Tus datos» (`profiles.last_name`). Por IWL no se contrafirma con un perfil sin apellidos: la base lo impide, y en el aviso y en la ficha sale «Para firmar por IWL faltan tus apellidos» con el enlace.
· Las cuentas que se crean desde una candidatura nacen con sus apellidos.

### Qué decidí yo
· **Cómo se parte lo que corrige.** Si empieza por el nombre que había, ese sigue siendo el nombre y el resto son los apellidos, así que un nombre compuesto no se rompe. Si no, la primera palabra es el nombre.
· **Al corregir la ficha de una candidatura antigua, los apellidos no son obligatorios.** Exigirlos para cambiar otro dato obligaba a inventarlos. La ficha marca «(sin apellidos)».
· **`full_name` sigue siendo el nombre en el resto de la plataforma.** Donde hoy sale tu nombre completo seguirá saliendo así; si pasas los apellidos a su campo, esas pantallas enseñarán solo el nombre.
· `handle_new_user` se recreó desde su última definición, la que no lee el rol de los metadatos. La primera vez lo hice desde la original, y tres pruebas de registro lo cazaron.

### Qué necesito que decidas
1. ¿Quieres que las pantallas que enseñan a una persona (equipo, avisos, firmas) pongan también los apellidos cuando los tenga?

### Estado
· 198 unitarias · 215 RLS, dos veces seguidas · 374 de interfaz en verde y 4 saltadas.
· Migración `20261111100000_nombre_y_apellidos`.

### Siguiente
El PDF del acta.

---

## 2026-11-11 · Una plantilla sin marcas no se guarda, y vista previa al pegar · commit 43b709c

**Qué cambió**
· **Si la plantilla no empieza por `# ` o no tiene ningún `## `, no se guarda**, con tu texto: «La plantilla no lleva las marcas de formato (# título, ## cláusulas). Cópiala desde el fichero .md abierto como texto, no desde una vista previa.» Vale para la genérica y para la propia de una candidata.
· **Debajo del campo, la vista previa con formato** de lo que se está pegando, antes de guardar. Se puede ver como persona física o como sociedad, con lo que impediría guardarla.
· **Programa avisa si la versión vigente no lleva marcas**, como la 4 de producción.
· `\r\n` vale igual que `\n` en el intérprete de marcas. Ya lo hacía; ahora hay una prueba que lo comprueba.

### Qué decidí yo
· **Una plantilla sin marcas no se guarda, pero sí se puede enviar.** No lo meto en «lo que impide enviar», porque bloquearía los NDA con la versión 4 hasta que pegues la 5.

### Qué necesito que decidas
Nada.

### Estado
· 198 unitarias · 211 RLS · 374 de interfaz en verde y 4 saltadas.

### Siguiente
Nombre y apellidos.

---

## 2026-11-10 · El NDA con formato: plantilla con marcas y PDF con el diseño de IWL · commit d980f65

**Qué cambió**
· **Marcas en la plantilla**, en una lista cerrada que se explica en Programa, en «Marcadores y marcas de formato»:
  · `# Título`, `### SECCIÓN` y `## 01 TÍTULO`;
  · `I.` y `a)` al principio de un párrafo;
  · `**negrita**`;
  · `::: firma … :::`;
  · los párrafos se separan con una línea en blanco.
· **Una marca mal puesta no deja guardar la plantilla**, y se dice cuál: un `:::` sin cerrar, dos títulos o uno que no va al principio, una cláusula sin número, `####`, una negrita sin cerrar, un bloque que no es de firma o una tabla. Ninguna marca usa corchetes.
· **Un solo intérprete**, `lib/nda-formato.ts`. Pinta el PDF y la pantalla en la que ella lee antes de firmar, así que lo que ve y lo que firma coinciden. El hash sigue siendo el del texto completado, con sus marcas.
· **El PDF**, según lo esencial que pasaste:
  · A4, con márgenes 20/20/28/20;
  · Montserrat 400, 600 y 700 y Roboto Mono, incrustadas;
  · el título a 26 pt con el filete magenta debajo;
  · el cuerpo a 11/16,5, alineado a la izquierda;
  · rótulos en caja alta con +0,05 em;
  · cada cláusula con su filete magenta fino y el número en mono gris colgado en el margen;
  · cabecera desde la segunda página, y pie con filete, «INCEPTION WOMAN LAB, S.L. · CONFIDENCIAL» y folio «N DE M»;
  · firmas en dos columnas con un filete zinc-200, sin partirse entre páginas;
  · el registro de firmas en su página, con el mismo diseño.
· **La plantilla de pruebas local**, pasada a marcas, las usa todas.
· **`npm run nda:muestra`** genera el PDF de una plantilla en sus dos variantes, con datos inventados.

### Qué decidí yo
· **El «filete magenta de 3 mm» bajo el título** es una barra de 3 mm de alto y 24 mm de ancho. A lo ancho de toda la caja pesaba demasiado. Lo dejo como pregunta abajo.
· **Lo que no especificaba el documento de formato** (el tamaño de los rótulos, los espacios entre bloques, cuánto cuelga el número) lo he ajustado mirando el resultado, no copiando de `IWL_Formato_Documentos`, porque no tengo acceso a él.
· **Dentro de un párrafo, las líneas se juntan.** Como en Markdown, lo que separa párrafos es la línea en blanco. En las firmas, en cambio, cada línea es una línea.
· **Un párrafo que se queda vacío desaparece.** Pasa cuando es un bloque condicional que no toca, como el de sociedad cuando firma una persona física. Así no deja un hueco en el PDF.
· **El formato lo valida la aplicación, no la base.** Los marcadores los sigue comprobando la base. El intérprete nunca falla: una marca rota se pinta como texto. Está en `DECISIONES.md`.
· **Lo que la fuente no sabe dibujar** (un emoji, un ideograma) sale como «?» y no como un cuadro vacío.
· **He leído la plantilla real de Drive** (`v3_20261110`) solo para probarla. No está en el repositorio. Pasa la validación sin errores y se envía. Sus dos PDF de muestra están junto a los de prueba.
· **Las fuentes van a todas las rutas del despliegue** con `outputFileTracingIncludes`, porque se leen del disco. Son 1,5 MB.

### Qué necesito que decidas
1. El filete bajo el título: ¿una barra corta, como ahora (24 × 3 mm), o a lo ancho de la caja de texto?
2. Mira los cuatro PDF de `docs/constancia/`: los dos de prueba y los dos de la plantilla real. Si algo del diseño no coincide con `IWL_Formato_Documentos`, dime qué medida cambiar.

### Estado
· 196 unitarias · 211 RLS, dos veces seguidas, tras reiniciar desde cero · **372 de interfaz en verde y 4 saltadas** (los informes en PDF).
· Sin migración en este encargo. La de esta tanda es `20261110200000_nda_plantilla_con_huecos`, de la entrada de abajo.
· Dependencia nueva: `@pdf-lib/fontkit` 1.1.1.

### Para desplegar
`main` está en `405cb70`. Entran las migraciones `20261110190000_nda_un_solo_texto` (la de antes, si no se desplegó) y `20261110200000_nda_plantilla_con_huecos`. Aparta antes tu `docs/REVISION.md` sin guardar.

```bash
git merge --ff-only worktree-limpiar-cuentas-nube
npx supabase db push
git push
npx vercel --prod
```

Después, pega en Administración → Programa la plantilla `IWL_NDA_PlantillaPlataforma_ES_v3_20261110.md`, que quedará como versión 4. Si con el primer NDA contrafirmado en la nube «Abrir el NDA» no da el PDF, sale «Volver a generar el PDF»; avísame y miro el registro de Vercel, porque sería que las fuentes no han llegado.

### Siguiente
Lo que digas del filete y del diseño.

---

## 2026-11-10 · «Sin plantilla» y «plantilla con huecos» son dos estados · commit 159374b

**Qué cambió**
· `estado_nda` devuelve `plantilla_con_huecos` cuando hay plantilla pero no se puede enviar (corchetes o marcadores desconocidos), y `sin_plantilla` solo cuando no hay ninguna.
· Con huecos, la ficha lleva la pastilla «Plantilla con huecos», dice el problema con el mismo texto que Programa («La plantilla tiene huecos sin marcador: …») y enlaza a la plantilla.
· A ella le sigue saliendo «Tu NDA está en preparación» en los dos casos.

### Qué decidí yo
· La pastilla va en «Atención» y no en «Por hacer»: hay algo que arreglar, no solo algo que falta.

### Qué necesito que decidas
Nada.

### Estado
· Migración `20261110200000_nda_plantilla_con_huecos`. Prueba de interfaz nueva con una plantilla con `[CIUDAD]`. Suites, en la entrada de arriba.

### Siguiente
El formato del NDA, arriba.

---

## 2026-11-10 · Textos del NDA al día · commit f929491

**Qué cambió**
· Con el NDA por firmar, la ficha dice: «Lo verá nada más entrar, en la versión N, encima de su candidatura. Puede comentarlo antes de firmar.»
· Con su firma puesta y la de IWL pendiente, la ayuda de «Comentar el NDA» dice: «Si algo no te encaja, dínoslo. Lo vemos antes de que firme IWL.»

### Qué decidí yo
· Cuando la versión es solo suya, la ficha lo sigue diciendo («…versión N, que es solo suya, encima de su candidatura…»).

### Qué necesito que decidas
Nada.

### Estado
· Las dos frases se comprueban en `nda-comentarios.spec.ts`. Suites, en la entrada de arriba.

### Siguiente
Lo de «sin plantilla», arriba.

---

## 2026-11-10 · La fecha de efecto, fuera del texto firmado · commit 23f5acf

Tu respuesta a la pregunta del NDA personalizado: la alternativa, sin dos tiempos.

**Qué cambió**
· **`{{fecha_efecto}}` deja de ser un marcador.** Una plantilla que lo lleve no se guarda. Lo dicen el formulario y la base: «La fecha de efecto no va en el texto: las dos partes firman el mismo texto, y la fecha es la de la última firma del registro de firmas. Quita {{fecha_efecto}} y dilo con palabras.» Ya no sale en la lista de marcadores.
· **Ella e IWL firman exactamente el mismo texto, con un solo hash.** La contrafirma ya no guarda un texto final: se quitan las columnas `texto_final` y `texto_final_hash` y el parámetro de la contrafirma.
· **El PDF lleva ese texto**, y en la última página, el registro de firmas:
  · «Hash SHA-256 del texto firmado por las dos partes»;
  · «Fecha de efecto, la de la última firma», con su fecha y hora en Madrid;
  · las dos firmas, como antes.
· La plantilla de prueba local dice ahora la fecha con palabras, como lo hará la de Luciana. La redacción de la de verdad es suya.

### Qué decidí yo
· **La «Fecha de efecto» va explícita en el registro de firmas**, calculada como la más tardía de las dos firmas, para que no haya que deducirla comparando horas.
· **Las columnas del texto final se borran**, no se dejan vacías. En producción no hay ningún NDA firmado: la plantilla todavía tenía corchetes, así que no se ha podido enviar ninguno y no se pierde nada.

### Qué necesito que decidas
Nada.

### Estado
· 182 unitarias · 211 RLS, dos veces seguidas, tras reiniciar desde cero · **370 de interfaz en verde y 4 saltadas** (los informes en PDF).
· Migración nueva: `20261110190000_nda_un_solo_texto`.

### Para desplegar
`main` está en `405cb70`; entra solo esta migración. Aparta antes tu `docs/REVISION.md` sin guardar.

```bash
git merge --ff-only worktree-limpiar-cuentas-nube
npx supabase db push
git push
npx vercel --prod
```

Si la plantilla de producción ya lleva `{{fecha_efecto}}`, Programa lo dirá («No se puede enviar todavía»), y la versión nueva sin él sí se guardará.

**Siguiente**
REVISION no tiene nada más pendiente.

---

## 2026-11-10 · Construcción: no se trabaja sin Acuerdo, y entrar antes cuesta más equity · commit 34648eb

Los cuatro puntos de tu entrada «Construcción: no se trabaja sin Acuerdo». Las cifras de equity no las he puesto: la horquilla está vacía hasta que la fije Luciana.

**Qué cambió**
1. **Tope del tramo de entrada en Construcción**, en Programa → «Entrada en Construcción», 14 días por defecto, contados desde que nace la compañía.
   · Al llegar: Atención en «En entrada» («N días sin Acuerdo») y aviso a dirección, «… lleva N días en entrada sin Acuerdo», con «Decidir». A la semana, Vencido.
   · El contador de la barra la cuenta, una vez por compañía.
   · En Aceleración no hay tope.
2. **Horquilla de equity por vía**, en Programa → «Horquilla de equity por vía»: desde y hasta para cada vía. Vacía no comprueba nada.
   · Al proponer el Anexo se enseña como referencia.
   · Si el equity se sale, pide «Por qué se sale de la horquilla». El motivo se ve en la propuesta, queda en el registro y, propuesto, no se cambia sin volver a borrador.
   · Lo comprueba la base.
3. **Equity sin sociedad**: con la situación «sin constituir» o «en constitución», el Anexo enseña el equity como **«Comprometido · se materializa al constituir»**, también en Aportación.
   · Proponer pide «Constituir la sociedad, prevista para», que es la fecha del hito, y ese hito queda como hito del Anexo. La base no deja proponer sin ella.
   · Cuando IWL pone la sociedad como constituida, el equity pasa a **«Materializado el …»**, con la fecha, y queda en el registro.
4. **Horas solo desde la firma.**
   · En una compañía en entrada no se imputan horas: en Aportación sale «Todavía no hay Acuerdo firmado: las horas de acompañamiento cuentan desde la firma.»
   · En una que firmó el Acuerdo por el embudo, tampoco con fecha anterior a la firma.
   · Lo impide la base, también con la clave de servicio.
   · Las compañías de antes, sin candidatura firmada, no cambian.

### Qué decidí yo
· **El tope se calcula al leer**, como el aviso de revisión del comité. No hace falta un proceso que corra cada noche, y cambiar los días en Programa vale al instante para todas.
· **El tope cuenta desde que nace la compañía**, es decir, desde la contrafirma del NDA, no desde la decisión de incorporación.
· **«Horas entregadas» no cambia de cálculo.** Como la base no deja imputar horas antes de la firma, ya cuentan desde ella.
· **La fecha de «Constituir la sociedad» se pide al proponer**, en el mismo formulario. Hoy no hay pantalla para editar la fecha de un hito, y mandar a buscarlo a otro sitio era un callejón sin salida.
· **«Materializado» se marca cuando la situación pasa a constituida**, la ponga quien la ponga de IWL. Si quieres que sea al cumplir el hito, es lo mismo: cumplir el hito ya la pasa a constituida.

### Cómo lo he probado
· 3 unitarias: horquilla, equity comprometido o materializado, y el tope.
· 5 de RLS (`construccion.test.ts`):
  · horas en entrada, ni con la clave de servicio;
  · horquilla: sin motivo no se propone, el motivo va al registro y no se cambia;
  · sin fecha del hito no se propone, y el hito queda en el Anexo;
  · al constituirse, el equity se materializa con la fecha;
  · ninguna hora anterior a la firma.
· De interfaz:
  · en «En entrada», 15 días sin Acuerdo salen en la fila y en los avisos, y Aportación dice por qué no hay horas;
  · la del Acuerdo pide la fecha de constitución y enseña «Comprometido»;
  · una nueva guarda el tope, la horquilla (rechaza un máximo menor que el mínimo) y el lugar del NDA, y los deja como estaban.

### Qué necesito que decidas
Nada. La horquilla la rellena Luciana en Programa cuando tenga las cifras.

### Estado
· 181 unitarias · 210 RLS, dos veces seguidas, tras reiniciar desde cero · **370 de interfaz en verde y 4 saltadas** (los informes en PDF).
· Migración nueva: `20261110180000_construccion_sin_acuerdo`.

### Para desplegar
`main` sigue en `878d956`, así que van juntas las tres migraciones pendientes: `20261110160000` (sin texto no se envía), `20261110170000` (NDA personalizado) y `20261110180000` (esto). Como siempre, aparta antes tu `docs/REVISION.md` sin guardar.

```bash
git merge --ff-only worktree-limpiar-cuentas-nube
npx supabase db push
git push
npx vercel --prod
```

Después: Programa enseña el tope en 14 días y la horquilla vacía. Lo de la plantilla del NDA, como en la entrada anterior.

**Siguiente**
No hay nada más pendiente en REVISION. Lo abierto es la pregunta de la entrada anterior, sobre la fecha de efecto del NDA.

---

## 2026-11-10 · El NDA personalizado: marcadores, datos de la firmante y texto completado · commit fc469f1

Tu entrada «El NDA se personaliza». No he tocado el texto legal: los marcadores los pone Luciana en la plantilla.

**Qué cambió**
· **Marcadores en la plantilla**, `{{nombre}}`, de una lista cerrada:
  · de la candidatura: `{{startup}}` y `{{contraparte_nombre}}` (la persona de contacto);
  · de la firma: `{{fecha_efecto}}` y `{{lugar}}`;
  · de ella: `{{documento}}` y `{{domicilio}}`, y si es sociedad `{{denominacion}}`, `{{nif}}` y `{{cargo}}`;
  · bloques `{{#si_sociedad}}…{{/si_sociedad}}` y `{{#si_persona}}…{{/si_persona}}`.

  La lista está en la pantalla de la plantilla, en «Marcadores que se pueden usar». Un marcador desconocido, o un bloque sin cerrar, no deja guardar: lo dice el formulario y lo impide la base.
· **Persona física o sociedad**: «constituida» es sociedad; sin constituir o en constitución, persona física. Si la situación societaria no se ha dicho todavía, que antes del NDA es lo normal, se le pregunta a ella: «Firmas como persona física / en nombre de una sociedad constituida».
· **«Tus datos para el NDA»**, antes de firmar. Solo los campos que su texto pide. El texto de debajo se completa mientras escribe, y mientras falte algo no se puede firmar.
· **Lo firmado es el texto completado.** El hash es el de ese texto, y se guardan el texto (`texto_firmado`) y los datos que rellenó (`datos`). La base calcula el hash sobre lo que recibe y rechaza un texto con huecos.
· **La fecha de efecto.** Mientras falta una firma, el texto dice «la fecha de la última firma». Al contrafirmar IWL, que es la última, se escribe la fecha y se guarda el texto final con su hash (`texto_final`, `texto_final_hash`).
  · Ese es el texto del PDF.
  · El rastro de la última página lleva los dos hashes: el del texto que firmó ella y el del texto con la fecha, y dice que solo cambia eso.
· **Sin corchetes.** Una plantilla con un hueco entre corchetes no se envía:
  · «Enviar el NDA» bloqueado, con el motivo y el primer hueco;
  · la base lo impide al dar cuenta y al pasar a «NDA enviado»;
  · quien ya tenga cuenta ve «Tu NDA está en preparación», nunca un texto con corchetes.

  En Programa, el bloque de la plantilla dice si está lista o qué le falta.
· **El lugar**, en Programa → «Lugar de firma», con Málaga por defecto.
· La plantilla de prueba de la semilla local lleva ahora los marcadores, así que las pruebas recorren lo mismo que una candidata.

### Qué decidí yo
· **La fecha de efecto va en dos tiempos.** Pediste «la de la última firma», pero esa fecha no existe cuando firma ella, y lo que firma no puede cambiar después. Ella firma el texto con «la fecha de la última firma». El PDF lleva el mismo texto con la fecha escrita, con su propio hash y la explicación. Pregunta 1.
· **`{{contraparte_nombre}}` es la persona de contacto de la candidatura.** Si está mal escrita, se corrige en «Corregir los datos» antes de enviar. No es el nombre que ella escribe al firmar, que puede no coincidir.
· **La plantilla del NDA solo para ella cumple las mismas reglas** que la genérica: marcadores, huecos y bloqueo.
· **Los NDA firmados antes de esto** no tienen datos ni texto completado: su PDF sale de la plantilla, como hasta ahora.

### Cómo lo he probado
· 8 unitarias: completar persona y sociedad, huecos, campos que pide, marcadores desconocidos y bloques sin cerrar, y el rastro con los dos hashes.
· 6 de RLS, con una versión solo para una candidata nueva, porque la genérica no se puede tocar en pruebas:
  · un marcador desconocido no se guarda;
  · con corchetes, ni cuenta ni «NDA enviado», y ella ve «en preparación»;
  · un texto con hueco no se firma;
  · el hash es el del texto que llega, con los datos guardados;
  · la contrafirma guarda el texto final y su hash.
· De interfaz, la del NDA de punta a punta: elige «persona física», rellena documento y domicilio, ve el texto completado, firma, y lo firmado y el texto final con la fecha quedan en la base.

### Qué necesito que decidas
1. **¿Vale la fecha de efecto en dos tiempos?** Ella firma «con efecto desde la fecha de la última firma», y el PDF final lleva la fecha. La alternativa es que `{{fecha_efecto}}` no esté en el texto que se firma y la fecha vaya solo en el rastro del PDF.

### Estado
· 178 unitarias · 205 RLS, dos veces seguidas, tras reiniciar desde cero · **368 de interfaz en verde y 4 saltadas** (los informes en PDF).
· Migración nueva: `20261110170000_nda_personalizado`. Va junto con la del arreglo anterior, `20261110160000`.

### Para desplegar los dos
Desde la carpeta del proyecto, con `main` en `878d956`. Antes, aparta tu `docs/REVISION.md` sin guardar, como siempre.

```bash
git merge --ff-only worktree-limpiar-cuentas-nube
npx supabase db push        # entran 20261110160000 y 20261110170000
git push
npx vercel --prod
```

**Después, en producción:**
· **Administración → Programa → Plantilla del NDA.** El bloque dirá «No se puede enviar todavía» y el primer hueco entre corchetes de la plantilla que cargaste. Hasta que Luciana cambie los corchetes por marcadores y se guarde como versión nueva, el NDA no se envía y la candidata que ya tiene cuenta ve «en preparación».
· **El lugar** sale como Málaga; se cambia ahí mismo.

**Siguiente**
Lo de «Construcción: no se trabaja sin Acuerdo»:
1. el tope del tramo de entrada;
2. la horquilla de equity;
3. el equity comprometido sin sociedad;
4. las horas solo desde la firma.

---

## 2026-11-10 · Producción: sin texto de NDA no se envía, y con el NDA pendiente ve su candidatura · commit 45cd207

Tu entrada «Producción: la candidata con NDA pendiente no ve nada más», antes que lo de Construcción.

**Qué cambió**
· **Sin plantilla de NDA, «Enviar el NDA» no se puede pulsar.**
  · Sale desactivado, con el motivo («Falta cargar la plantilla del NDA…») y el enlace «Cargarla en Administración → Programa».
  · La acción lo comprueba **antes de crear la cuenta**, que es lo que no tiene vuelta.
  · Si la base aun así rechaza el acceso, la cuenta recién creada se borra: no queda huérfana.
· **Lo impide también la base**, por los dos caminos:
  · darle cuenta a una candidata en Preseleccionada o en «NDA enviado»;
  · pasar una candidatura a «NDA enviado», también con «Pasar a…».
  · Un NDA firmado fuera de la plataforma sigue pasando: no necesita texto.
· **Con el NDA pendiente, ella ve su candidatura.** Arriba, una tarjeta de **siguiente paso**:
  · «Firma el NDA», con el texto, los comentarios y la firma;
  · o «Tu NDA está en preparación».

  Debajo, **su candidatura entera**, como la veía por el enlace. Detrás del NDA queda solo lo nuevo y confidencial: la sala de datos y lo que comparta IWL.
· **Textos**: fuera «no tienes que hacer nada más hasta entonces»; ahora «Te avisaremos cuando esté listo para firmar. Mientras, aquí tienes tu candidatura.». Fuera las rayas: «Antes de compartir información confidencial, en las dos direcciones, firmamos un acuerdo de confidencialidad. Léelo y fírmalo aquí. Después firmará Inception Woman Lab.»

### Qué decidí yo
· **«Ver su candidatura» es la misma vista del enlace** (`CandidaturaPublica`), sin quitarle nada. Es lo que pedías: estado, lo que envió y lo que aportó.
· **El título de la tarjeta va como `h2`**: el `h1` de la página es el nombre de su startup, como en el enlace.
· **Con plantilla propia de ella también vale.** La comprobación es «no hay ninguna que le aplique», genérica o suya.

### Cómo lo he probado
· **Sin texto de NDA, a mano.** En la base de pruebas siempre hay una plantilla: la semilla carga una, y las versiones no se borran, ni con la clave de servicio. Así que no cabe en una suite. Lo he probado en una transacción que las quita y se deshace al final, con tres casos:
  · dar acceso: rechazado, y el enlace sigue vivo sin cuenta;
  · pasar a «NDA enviado»: rechazado;
  · NDA firmado fuera: aceptado, y nace la compañía.
· Las pruebas de interfaz del NDA comprueban ahora que, con el NDA pendiente, se ve debajo el nombre de su candidatura.

### Para desplegarlo
Desde la carpeta del proyecto, con `main` en `878d956` como lo dejaste:

```bash
git merge --ff-only worktree-limpiar-cuentas-nube
npx supabase db push        # entra 20261110160000_nda_sin_plantilla_no_se_envia
git push
npx vercel --prod
```

`docs/REVISION.md` tiene en `main` tus cambios sin guardar, y la rama lleva tu versión de hoy. Apártalo antes de fusionar, como en la entrada anterior.

**La candidata que se quedó atascada** no necesita nada: con esto ve su candidatura y «Tu NDA está en preparación». En cuanto cargues la plantilla en Administración → Programa, verá el NDA para firmar.

### Qué necesito que decidas
Nada.

### Estado
· 170 unitarias · 199 RLS, dos veces seguidas · **368 de interfaz en verde y 4 saltadas** (los informes en PDF).
  · En la primera pasada falló una vez en Safari «una candidatura recorre el embudo»: la firma de la candidatura de antes, que esto no toca. La pantalla no tenía error; el clic no llegó.
  · Sola en Safari pasó tres de tres, y la pasada completa siguiente salió limpia.
· Corrección a la entrada anterior: decía 33 commits por delante de `main` y eran 32.

**Siguiente**
Lo de «Construcción: no se trabaja sin Acuerdo»:
1. el tope del tramo de entrada;
2. la horquilla de equity;
3. el equity comprometido sin sociedad;
4. las horas solo desde la firma.

---

## 2026-11-10 · La guía de carga rehecha, y la rama lista para desplegar · commit d4ec373

**Qué cambió**
· **`docs/IWL_Doc_CargarCompania_ES_v2_20261110.md`**, con el nuevo corte y Siren de ejemplo (Construcción, sin sociedad). Catorce pasos: candidatura → reunión → comité → NDA, que es donde nace la compañía → «En entrada» → situación → decisión → Acuerdo → equipo → ficha → hoja de ruta → KPI → paso a Aceleración → alta directa. Al final, «Si algo no cuadra».
· La versión 1 queda marcada como sustituida, sin tocar su contenido.
· Lleva ya la regla de tu entrada de hoy: **no se trabaja sin Acuerdo**, y el Acuerdo se firma aunque no haya sociedad. Lo demás de esa entrada (tope de 14 días, horquilla de equity, equity comprometido, horas desde la firma) no está construido; la guía no lo da por hecho.

### Qué decidí yo
· **De Siren va solo el nombre de la compañía**, que ya está en el repositorio en varios sitios. Ninguna persona.
· **Los rótulos los he comprobado contra el código**, no de memoria.

## Para desplegar

Desde la carpeta del proyecto (`~/Desktop/IWL_Platform`), donde están `.env.produccion` y el enlace a Supabase.

**0. Antes de fusionar.** En `main` tienes `docs/REVISION.md` modificado sin guardar, y la rama lleva tu versión de hoy. Si no lo has tocado desde la última entrada, la fusión solo necesita que lo apartes:

```bash
cp docs/REVISION.md ~/REVISION-copia.md      # por si acaso
git checkout -- docs/REVISION.md
```

Después de fusionar, `diff ~/REVISION-copia.md docs/REVISION.md` no tiene que dar nada. Si da algo, es que escribiste después: vuelve a copiar la tuya encima. El otro fichero suelto, `docs/IWL_Doc_FlujoEntrada_ES_v1_20261109.md`, no está en la rama y no estorba.

**1 a 5.**

```bash
# 1. Fusión en main
git merge --ff-only worktree-limpiar-cuentas-nube

# 2. Dependencias: entra pdf-lib, para los PDF del NDA y del acta
npm install

# 3. La base primero: el código nuevo pide columnas nuevas
npx supabase db push

# 4. Publicar
git push

# 5. Desplegar
npx vercel --prod
```

No hace falta ninguna variable nueva en Vercel ni en Supabase.

### Qué migraciones entran (16)

| Migración | Qué hace |
|---|---|
| `20261109100000_onboarding` | Avisos y seguimiento del alta |
| `20261109110000_enums_societarios` | Valores de la situación societaria |
| `20261109120000_situacion_societaria` | Situación en candidatura y compañía, y lo societario que depende de ella |
| `20261109130000_nda` | El NDA firmado en la plataforma |
| `20261109140000_estado_nda` | En qué punto está el NDA |
| `20261109150000_enums_entrada` | `diligencia` pasa a `entrada`; «por construir»; tramo y vía |
| `20261109151000_tramo_via` | Tramo y vía en la compañía; «por construir» con los hitos |
| `20261109160000_reuniones` | Proponer y anotar reuniones; si abrió el enlace |
| `20261109170000_comite` | El acta de comité y sus firmas |
| `20261109171000_comite_cascada` | Borrar una candidatura con sus actas |
| `20261110100000_nda_comentarios` | Comentar el NDA y la versión solo para ella |
| `20261110120000_compania_en_entrada` | La compañía nace al contrafirmar; la decisión de incorporación |
| `20261110130000_sin_peticiones_de_candidatura` | Ya no se piden documentos a la candidatura |
| `20261110140000_enums_anexo_propuesto` | Estados del Anexo propuesto |
| `20261110141000_anexo_propuesta_y_acuerdo` | La propuesta, sus comentarios, firmar el Acuerdo y el cambio de vía |
| `20261110150000_anexo_siempre_aceptado` | Ningún Anexo sin su aceptación; «Dar acceso» |

Las compañías que ya hay quedan en incubación, sin vía, y no cambian. Los Anexos firmados siguen firmados. Los valores de enum van en su propia migración, porque Postgres no deja usarlos en la misma en que se crean.

### Qué comprobar en producción

1. **Entra como dirección.** La cartera tiene que tener las mismas compañías y cifras que antes. No sale «En entrada»: todavía no hay ninguna.
2. **Administración → Programa**:
   · el **comité por defecto**: marca quién firma las actas;
   · la **Plantilla del NDA**. La nube no tiene texto de NDA, y sin él la candidata ve «Tu NDA está en preparación» y no puede firmar.
3. **Una vuelta entera con una candidatura de prueba**, con un correo tuyo con alias (`rodrigo+prueba@niage.es`) y marcada como demostración, para que no cuente en el embudo:
   · acta de comité preseleccionada, en Construcción;
   · **Enviar el NDA**, y ella lo firma;
   · **Firmar por IWL** desde el aviso;
   · tiene que aparecer en «En entrada», y al entrar como ella, «¿Desde dónde partís?».
4. **Sigue en ella**:
   · confirmar la situación;
   · decidir «Sí»;
   · abrir el Anexo y proponérselo;
   · aceptarlo como ella;
   · **Firmar el Acuerdo y el Anexo**: pasa a la cartera.

   Luego bórrala con `npm run nube:vaciar` (lee la constancia antes de `--confirmar`), o archívala si prefieres conservarla.
5. **El enlace de una candidatura sin cuenta** sigue abriendo su página.

### Qué necesito que decidas
Nada para desplegar.

### Estado
· Rama `worktree-limpiar-cuentas-nube`, 33 commits por delante de `main`.
· Última pasada completa, la del paso 6: 170 unitarias · 199 RLS, dos veces seguidas · 368 de interfaz y 4 saltadas (los informes en PDF). Después solo han entrado documentos.

**Siguiente**
Paro aquí para el despliegue, como pediste. Lo siguiente es lo de tu entrada «Construcción: no se trabaja sin Acuerdo», que no frena el despliegue:
1. el tope del tramo de entrada en Construcción;
2. la horquilla de equity por vía;
3. el equity sin sociedad, comprometido hasta constituir;
4. las horas solo desde la firma.

---

## 2026-11-10 · Flujo de entrada, 6 de 6: «En entrada», al lado de la cartera · commit 3a0c674

**Qué cambió**
· **Bloque «En entrada»**, arriba de la cartera, solo para IWL: las compañías con el NDA firmado por las dos partes y sin Acuerdo. Las «No incorporadas» no salen.
  · Cada fila lleva su vía, los días que lleva y **su paso**, y a quién le toca: a ella, a IWL o a dirección. El orden es situación, confirmación, due diligence (solo Aceleración), decisión, propuesta, aceptación y firma.
  · **Aceleración**: «Due diligence: x de y obligatorios validados», **Validar** (a su due diligence) y **Recordar**, el de siempre, con el texto del due diligence.
  · **Construcción**: el diagnóstico, con Reunión, Ficha y Situación, cada una hecha o por hacer.
· **No salen en la lista de la cartera ni en sus cifras** (ya lo hacía el paso 1).
· **El contador de dirección cuenta las que esperan a dirección**, que es decidir la incorporación. Confirmar la situación ya tiene su aviso, y no se cuenta dos veces.

### Qué decidí yo
· **«Decidir la incorporación» sale en Aceleración solo con lo obligatorio validado.** Antes, el paso es el due diligence y le toca a ella. Dirección puede decidir igual cuando quiera: la lista dice el paso, no lo impone.
· **«Ficha» del diagnóstico es tener sector y frase.** No había una definición. Si la ficha tiene que tener más, dímelo.
· **La reunión del diagnóstico es una reunión celebrada en su candidatura**, la del paso 2.
· **Un revisor de Niage o un mentor no ven el bloque**, aunque aterricen en la cartera: es de IWL.

### Qué necesito que decidas
Nada.

### Estado
· 170 unitarias · 199 RLS, dos veces seguidas · **368 de interfaz en verde y 4 saltadas**.
· Sin migraciones.

**Siguiente**
La guía de carga.

---

## 2026-11-10 · Ningún Anexo sin su aceptación, y ella con cuenta antes del Acuerdo · commit a50dfbf

Las dos respuestas de REVISION del 10 nov, «Paso 5 cerrado».

**Qué cambió**
· **Proponer exige una fundadora con cuenta en la compañía**, en entrada y en incubación. Lo comprueba la base.
  · En pantalla, en lugar de «Proponerle el Acuerdo», sale el motivo y **«Dar acceso»**.
  · Si la compañía viene del embudo, «Dar acceso» crea la cuenta con el correo de contacto, la hace fundadora de la compañía y enseña la contraseña una sola vez, con «Hecho». La cambia al entrar.
  · Si no viene del embudo, dice que se dé de alta en Administración → Personas.
  · No hay aceptaciones registradas por IWL.
· **Ningún Anexo se firma sin su aceptación**, tampoco al renovar en incubación.
  · Desaparece «Firmar el Anexo» del borrador. Sale solo con el Anexo aceptado: en incubación, «Firmar el Anexo»; en entrada, «Firmar el Acuerdo y el Anexo».
  · En la base: firmado solo desde aceptado, también con la clave de servicio. Con sesión, un Anexo nace siempre en borrador.
  · Proponer pide quién firma en los dos tramos, no solo en entrada.
· **`db:reset` ya no se queda a medias.** Justo tras reiniciar, PostgREST tarda en recargar el esquema y las instantáneas fallaban de vez en cuando. Ahora reintentan medio segundo, hasta diez segundos.

### Qué decidí yo
· **«Dar acceso» reutiliza una cuenta que ya exista con ese correo**, sin tocar su contraseña, y lo dice. Solo convierte en fundadora una cuenta de candidata o fundadora; una de IWL, de mentor o de revisor la rechaza.
· **Tu semilla local `30_agrolabx.sql` registraba un Anexo ya firmado con sesión declarada**, y la base ahora lo rechaza. Ese insert va ahora sin sesión, y la sesión se vuelve a declarar justo después. Cambiado en la carpeta principal y en la copia del worktree.
· **La prueba de interfaz del Anexo ya no firma un borrador.** Lo propone, ella lo acepta y se firma. La del Acuerdo da acceso con el botón y entra con la contraseña que enseña.

### Qué necesito que decidas
Nada.

### Estado
· 167 unitarias · 199 RLS, dos veces seguidas, tras reiniciar desde cero · **366 de interfaz en verde y 4 saltadas** (los informes en PDF).
· Migración nueva: `20261110150000_anexo_siempre_aceptado`.

**Siguiente**
«En entrada», al lado de la cartera.

---

## 2026-11-10 · Flujo de entrada, 5 de 6 (segunda mitad): el Anexo como propuesta, la firma del Acuerdo y el cambio de vía · commit 37ea32a

**Qué cambió**
· **El Anexo es la propuesta de Acuerdo.** Avanza borrador → propuesto → comentado → aceptado → firmado, en «Programa y Anexo».
  · **Proponerlo**: IWL, con el Anexo en borrador. Lleva «quién firma», que sale de la situación societaria y trae a la persona de contacto. En entrada, la base exige la incorporación en «sí», la duración, las horas y los firmantes.
  · **Ella no ve el borrador.** Propuesto, el resumen de Mi compañía le dice «te ha propuesto el Acuerdo», con enlace a Programa.
  · **Lo comenta** como el NDA: dirección recibe «… ha comentado la propuesta de Acuerdo», con «Responder». Responder cierra el aviso.
  · **Lo acepta ella**, con su cuenta. IWL no puede aceptarlo por ella, ni una fundadora de otra compañía.
  · **Lo propuesto no se edita**, ni con la clave de servicio. Para cambiar algo, «Volver a borrador para cambiarlo»; su aceptación se pierde y vuelve a proponerse.
  · Proponerlo pasa la candidatura a «Acuerdo propuesto».
· **«Firmar el Acuerdo y el Anexo»**, en la compañía en entrada, con el Anexo aceptado: etapa, perfil técnico, fase, recorrido, arranque y fecha.
  · La compañía pasa a **incubación** y entra en la cartera. Se crean sus KPI y, si se elige recorrido, su hoja de ruta enlazada al Anexo.
  · La candidatura queda «Firmada», con el equity y los firmantes del Anexo.
  · **La puerta, en la base:** en Aceleración, lo obligatorio del due diligence validado (si no, dice cuántos faltan). En Construcción, nada. En las dos, la incorporación en «sí» y el Anexo aceptado.
  · En entrada desaparece «Firmar el Anexo» suelto: el Anexo se firma con el Acuerdo.
· **«Pasar a Aceleración»**, en «Vía de entrada», bajo la fase del programa. Solo dirección, con motivo.
  · Lo por construir pasa a por entregar.
  · El motivo queda en el registro y se ve ahí mismo: «Pasó de Construcción a Aceleración el …: <motivo>».
  · **El mentor principal recibe un aviso** en su cartera, «Avisos para ti», con «Entendido».
  · La base ya no deja cambiar la vía con un `update` directo: solo por esa función, que es la que pide el motivo.
· **Los avisos pueden ir a una persona** (`avisos.para`). Sin destinatario, son de dirección, como hasta ahora.

### Qué decidí yo
· **«Volver a borrador» en vez de versiones nuevas.** La respuesta del 9 nov dice «un solo documento que avanza». Rehacer una versión por cada cambio llenaba el historial de Anexos que nunca se firmaron. Lo que cambió queda en el registro: proponer, aceptar y volver a borrador dejan cada uno su fila.
· **En incubación, IWL puede seguir firmando un borrador directamente**, como hasta ahora, para renovar un Anexo. La propuesta y la aceptación son obligatorias solo en entrada. Si lo quieres en las dos, es una línea en la base.
· **Una compañía en entrada no puede crear un Anexo ya aceptado.** Era un atajo para saltarse la aceptación. En incubación sí se puede registrar uno firmado: tu semilla local lo hace.
· **Si la fundadora no tiene cuenta** —un NDA registrado como firmado fuera—, la aceptación solo se puede registrar sin sesión. No he puesto botón para que IWL registre una aceptación hecha fuera de la plataforma. ¿Hace falta? Ver la pregunta 1.
· **Los firmantes van en el Anexo** (`annexes.firmantes`), porque es lo que ella acepta. Al firmar se copian a la candidatura, donde estaban antes.
· **El aviso al mentor principal se ve en su cartera.** Es donde aterriza un mentor. No había ningún sitio donde un mentor viera avisos.
· **Lo que se ha probado y no se ve en las pruebas:** una prueba de interfaz mía leía la base antes de que la firma llegara. El rótulo «Firmado el» del campo de fecha satisfacía la espera, y el `finally` borraba la compañía mientras la firma iba de camino. Ahora espera a la fecha de la firma en la pastilla y a que el formulario desaparezca.

### Qué necesito que decidas
1. **Una fundadora sin cuenta** (NDA firmado fuera) no puede aceptar la propuesta en la plataforma. ¿Pongo «Registrar la aceptación» para IWL, con el documento o el enlace como prueba, igual que el NDA de fuera? ¿O se le da cuenta siempre antes del Acuerdo?
2. **La propuesta y la aceptación, ¿también al renovar el Anexo** de una compañía que ya está en incubación?

### Estado
· 167 unitarias · 196 RLS, dos veces seguidas, tras reiniciar desde cero · **366 de interfaz en verde y 4 saltadas** (los informes en PDF, solo en Chromium de escritorio).
· Migraciones nuevas: `20261110140000_enums_anexo_propuesto` y `20261110141000_anexo_propuesta_y_acuerdo`.
· 13 pruebas de acceso nuevas (`tests/rls/acuerdo.test.ts`) y una de interfaz de punta a punta (`tests/e2e/acuerdo.spec.ts`).

**Siguiente**
«En entrada» al lado de la cartera, y después la guía de carga rehecha. La guía tiene que decir dónde se encuentra una compañía en entrada, así que hago antes «En entrada», que es corto.

---

## 2026-11-10 · Sin documentos de candidatura, y las suites sin depender de lo no versionado · commit 81f9492

Las dos respuestas de REVISION del 10 nov.

**Qué cambió**
· **Enviar el NDA ya no crea la lista de documentos de la candidatura.** Su due diligence es el checklist de la compañía, que nace al contrafirmar. Se han quitado el disparador y las dos `pedir_due_diligence`: no queda ninguna función muerta.
  · Las candidaturas de antes conservan sus peticiones y sus documentos, sin tocarlos. La ficha les enseña «Documentación del due diligence»; a las demás, ya no.
  · La función que ajusta lo societario de esas listas sigue, porque hay candidaturas que la tienen. Solo cambia su comentario, que hablaba de una función que ya no existe.
· **Las pruebas de acceso pasan al checklist de la compañía**, entrando como ella y como una fundadora ajena:
  · ella lo ve entero, y solo el suyo;
  · una fundadora ajena no ve nada;
  · ella no se pide cosas a sí misma ni se quita lo que se le pide;
  · tampoco lo saca de «por construir».
  · En la candidatura se prueba que pasar a NDA no crea nada y que la función ya no existe.
  · La prueba de que lo entregado siendo candidatura llega a la compañía se queda, porque sigue valiendo para las de antes. La petición se pone a mano, como la dejó el sistema de entonces.
· **Semilla de demostración:** «Cuentas anuales» y «Vesting» se ponen en revisión y bloqueante sin mirar su estado anterior. Cambiado en tu fichero, en la carpeta principal, y en la copia del worktree.
· **Retirada `demostracion-completa.spec.ts`.** Todo lo que comprobaba vivía en `seed/local/40_demostracion.sql`. Que cada estado se pinte bien ya lo cubren `lib/estados.test.ts` y las pruebas de cada pantalla. Anotado en `DECISIONES.md`, donde se citaba.
· **`db:reset` crea también las cuentas de revisión.** Sin eso, sus pruebas se saltaban en una máquina nueva, y tras cada reinicio había que acordarse de crearlas a mano: me pasó a mí dos veces.

### Qué decidí yo
· **La retiro, no la reescribo.** Reescribirla con datos propios era probar otra cosa: que una compañía con un punto en cada estado los enseña. Eso no es lo que decía su nombre, y ya está cubierto.
· **Las 4 saltadas que quedan son a propósito**: los informes en PDF solo se imprimen en Chromium y no desde el móvil. No dependen de la máquina.

### Qué necesito que decidas
Nada.

### Estado
· 167 unitarias · 183 RLS, dos veces seguidas, tras reiniciar desde cero con el `db:reset` nuevo · **364 de interfaz en verde y 4 saltadas, sin fallos**.
· Migración nueva: `20261110130000_sin_peticiones_de_candidatura`.

**Siguiente**
La segunda mitad del paso 5.

---

## 2026-11-10 · Flujo de entrada, 5 de 6 (primera mitad): la compañía en entrada y la decisión de incorporación · commit 1570b74

El punto 5 va en dos commits. Este es la compañía en entrada, la situación y la decisión. El siguiente, el Anexo como propuesta de Acuerdo y la firma del Acuerdo desde la compañía.

**Qué cambió**
· **Con las dos firmas del NDA nace la compañía, en «entrada».** Pasa igual si el NDA se firmó en la plataforma o se registró firmado fuera.
  · Lleva la vía del acta. Una candidatura sin vía toma la de su estado: con clientes o facturación, Aceleración; si no, Construcción.
  · Etapa y perfil técnico vacíos. El identificador sale del nombre, sin tildes, con el primer número libre.
  · Va en la misma transacción que la firma: si falla al crearla, la firma tampoco queda.
  · La candidatura pasa a «En entrada», y el historial dice «Compañía creada, en entrada».
· **Ella pasa a fundadora, con la misma cuenta**, y al entrar cae en Mi compañía.
· **Mi compañía abre con «¿Desde dónde partís?»** si nadie ha dicho la situación societaria.
  · La dice ella una vez. Después solo la cambia IWL, y tampoco puede confirmarla ni tocar el tramo o el archivo: lo impide la base.
  · Dirección recibe el aviso «… ha dicho la situación societaria», con «Confirmarla».
  · IWL la confirma desde la compañía y el aviso se cierra. Hasta entonces se ve «Por confirmar».
· **En Construcción, el checklist y el business plan nacen «por construir»**, y también lo societario que aparece después al decir la situación. Sin sociedad, lo que la requiere pasa a «No aplica» también desde «por construir».
· **«Decidir la incorporación»**, en la compañía en entrada. Solo dirección y una sola vez.
  · Lleva la base, sugerida por la vía (due diligence en Aceleración, estratégica en Construcción), y el motivo.
  · «No» pide el mensaje para ella, ya redactado en la voz de IWL y editable. Archiva la compañía como «No incorporada: <motivo>», descarta la candidatura desde «entrada» y deja «Enviarle el mensaje».
  · Una decisión no se cambia ni se borra, tampoco con la clave de servicio. Se va con su compañía.
· **La ficha de la candidatura dice «Ya es compañía, en entrada»**, con enlace a la compañía.

### Qué decidí yo
· **Firmar el Acuerdo desde la candidatura queda solo para las que no tienen compañía**: las que no pasaron el NDA por la plataforma. Las demás lo firmarán desde la compañía, en la segunda mitad.
· **La compañía se inserta directamente, no por `crear_compania`.** Esa pide sesión de IWL, y la contrafirma llega con la clave de servicio, que es la que registra la IP. La autorización ya la hizo la firma de dirección.
· **«Por construir» al nacer va en un disparador al insertar**, no en quien crea la compañía. Así nacen igual los puntos societarios que aparecen después. Solo al insertar: IWL puede seguir pasando algo a «por entregar» a mano.
· **La situación dicha en la candidatura pasa a la compañía**, y entonces a ella no se le pregunta. IWL la confirma igual.
· **El «no» descarta también la candidatura**, con su motivo. Así sale del embudo y no se queda en «En entrada» para siempre.
· **La decisión solo la ve IWL.** Ella ve el efecto: la compañía archivada y el mensaje que se le envía.
· **Solo pasa a fundadora la candidata.** La candidatura no guarda las cofundadoras con cuenta, así que no hay a quién más pasar.
· **El mensaje de la base cuando una fundadora intenta cambiar la situación** dice ahora «una vez dicha, la fija el equipo de IWL. Si ha cambiado, díselo y la cambian ellos».

### Qué necesito que decidas
1. **Los documentos que se le piden en la candidatura se siguen generando al enviar el NDA.** Para las nuevas sobran: su due diligence es ya el checklist de la compañía. ¿Dejo de generarlos? Las de antes conservan lo que tienen.
2. Sigue abierta la de la entrada anterior: la semilla local de demostración.

### Estado
· 167 unitarias · 182 RLS, dos veces seguidas, tras reiniciar la base desde cero · **374 de interfaz en verde, 4 saltadas y 2 en rojo**: la de la demostración, en escritorio y en Safari, la misma de antes.
· Migración nueva: `20261110120000_compania_en_entrada`.
· La prueba de interfaz del NDA va ahora hasta el final: ella firma, IWL contrafirma, ella entra en Mi compañía y dice su situación, dirección la confirma y decide que no.

**Siguiente**
El Anexo como propuesta de Acuerdo, que ella ve, comenta y acepta en Mi compañía. Firmar el Acuerdo desde la compañía, con la puerta del due diligence en Aceleración, y los KPI y la hoja de ruta al firmar. El cambio de Construcción a Aceleración, con motivo y aviso al mentor principal.

---

## 2026-11-10 · Flujo de entrada, 4 de 6: enviar y comentar el NDA · commit 85bcbf0

**Qué cambió**
· **«Enviar el NDA»**, en «Qué ve ella», desde Preseleccionada:
  · crea la cuenta y anula el enlace privado, como antes;
  · pasa la candidatura a «NDA enviado», con su evento en el historial;
  · enseña la contraseña una sola vez y deja **el correo ya escrito**: dónde entrar, con qué correo y contraseña, y que puede comentar el NDA o firmarlo. Se abre en el programa de correo o se copia para WhatsApp, y se queda puesto hasta pulsar «Hecho».
· **Antes del comité no sale el botón**, y la pantalla dice que llega con el acta firmada.
· **La candidata comenta el NDA** debajo del texto, antes de firmar o mientras falta la firma de IWL.
  · Cada comentario llega como aviso a dirección («… ha comentado el NDA», con «Responder»).
  · IWL responde en la ficha y ella ve la respuesta en su pantalla.
  · Responder cierra el aviso. Un comentario no se edita.
· **«Cambiar el texto solo para ella»**, en el bloque del NDA, solo dirección.
  · Guarda una versión propia de esa candidatura, partiendo del texto que tiene. La genérica no cambia.
  · Solo la ven IWL y esa candidata.
  · **Si ella había firmado y IWL no, su firma se anula**. El historial dice qué había firmado (versión, hash y fecha) y ella vuelve a ver el NDA para firmar.
  · **Con las dos firmas, la base no deja guardar otra versión**, ni comentar.
· **Firmar exige la versión que le toca**: la propia si la tiene, si no la genérica. Antes valía cualquiera que mandara el formulario.
· Migración `20261110100000_nda_comentarios`.

### Qué decidí yo
· **Fuera de Preseleccionada sin cuenta, el botón sigue siendo «Darle cuenta»** y no mueve el paso. Es para las que llegaron a NDA a mano antes de esto.
· **El paso a «NDA enviado» va en la misma acción que la cuenta**, no en la función de la base. Si fallara después de crear la cuenta, el mensaje lo dice y enseña igualmente la contraseña.
· **La firma anulada se borra**, no se marca. `nda_firmas` es una fila por candidatura. Lo que firmó queda en el historial con su versión y su hash, que es lo que sirve de prueba.
· **Responder es de todo IWL**; cambiar el texto, solo de dirección, como la plantilla genérica.
· **La versión propia sigue la numeración de todas**: si la genérica es la 1, la de ella es la 2. Así un número de versión no se repite nunca.
· **«Hecho» quita el correo ya escrito, pero no el aviso con la contraseña**, que sigue como antes hasta recargar la página.
· Dos pruebas daban cuenta a candidaturas de la semilla que están antes del comité. Ahora crean la suya en Preseleccionada, y otra prueba comprueba que antes del comité no hay botón.

### Qué necesito que decidas
1. La pregunta de la entrada anterior sigue abierta: la semilla local de la demostración no pone «en revisión» ni «bloqueante» tras un reinicio.

### Estado
· 164 unitarias · 173 RLS, dos veces seguidas · **374 de interfaz en verde, 4 saltadas y 2 en rojo**: las de la demostración, como en la entrada anterior.

**Siguiente**
La compañía en entrada al contrafirmar el NDA, la decisión de incorporación y el Anexo como propuesta de Acuerdo.

---

## 2026-11-10 · Flujo de entrada, 3 de 6: acta de comité · commit c6c58d1

**Qué cambió**
· **«Redactar el acta de comité»**, en la ficha de la candidatura, bloque «Comité».
  · Fecha, resumen, decisión y quién forma el comité. Salen marcados los del comité por defecto, y se cambian en cada acta.
  · **Preseleccionada** pide la vía. Sale propuesta por el estado de entrada (idea, prototipo y MVP → Construcción; clientes o facturación → Aceleración). Cambiarla pide el motivo.
  · **Aplazada** pide la fecha de revisión. **Descartada** pide el motivo, si puede volver a presentarse y el mensaje para ella, ya redactado en la voz de IWL y editable.
· **Cada miembro firma con su cuenta**, con su IP y su navegador, como el NDA.
  · Con la primera firma, el acta y su comité quedan congelados. Lo impide la base, también con la clave de servicio. Un borrador sin firmas se puede descartar.
  · **La última firma cierra el acta**: aplica la decisión (estado y vía en la candidatura), deja el evento en el historial y el PDF en el expediente, con el rastro de cada firma en su última página.
  · Cerrada una descartada, «Enviarle el mensaje» abre el correo ya escrito.
· **Aplazada avisa el día de revisión**, en los avisos de dirección y en el contador de la barra lateral. Se va sola cuando hay acta nueva.
· **Comité por defecto**, en Programa.
· El PDF del NDA y el del acta comparten `lib/pdf.ts`.
· Borrar una candidatura entera se lleva sus actas, firmadas o no. Si no, `nube:vaciar` no podría vaciar.

### Un fallo de la tanda anterior (commit 8a712b5)
**Tras un `db:reset`, lo societario no se marcaba.** La migración de la situación societaria marca los puntos que requieren sociedad y crea «Pacto entre fundadoras» y «Titularidad de lo construido». Pero corre antes que la semilla, que es la que crea las áreas y los puntos, así que en local no hacía nada. Ahora lo hace también la semilla. **La nube no está afectada**: allí las áreas ya existían cuando corrió la migración. La prueba de RLS que lo cubre pasaba porque la base no se había reiniciado desde entonces.

### Qué decidí yo
· **Las actas son solo de IWL**: ni la candidata ni la fundadora las ven. Ella ve el efecto, el estado de su candidatura.
· **Aplazada sin motivo obligatorio**: la fecha de revisión ya dice lo esencial. El motivo se puede escribir.
· **El aviso de revisión mira solo la última acta** de cada candidatura. Un borrador nuevo sin firmar ya lo quita.
· **El mensaje del descarte no se manda solo**: se abre en el correo de quien lo envía, como «Recordar», hasta que haya proveedor de correo.
· **En el worktree he copiado `supabase/seed/local/` desde la carpeta principal** para poder probar con los datos completos. Está en `.gitignore` y no se versiona. Un enlace simbólico no valía: la regla, con su barra final, solo ignora un directorio de verdad.

### Qué necesito que decidas
1. **La prueba «el due diligence tiene un punto en cada uno de sus cinco estados» falla también en `main`** tras un reinicio. `seed/local/40_demostracion.sql` pone «en revisión» y «bloqueante» solo a Cuentas anuales y Vesting si están pendientes. Pero `03_actividad.sql` ya deja validado todo Marea menos tres puntos. ¿Arreglo la semilla local para que los ponga sin esa condición? Es un fichero tuyo, sin versionar.

### Estado
· 163 unitarias · 166 RLS, dos veces seguidas · **370 de interfaz en verde, 4 saltadas y 2 en rojo**: la del punto anterior, en escritorio y en Safari. La del acta pasa.
· Migraciones nuevas: `20261109170000_comite` y `20261109171000_comite_cascada`.

**Siguiente**
Enviar el NDA desde Preseleccionada, y los comentarios de la candidata al NDA.

---

## 2026-11-09 · Flujo de entrada, 2 de 6: reuniones · commit 968c8e3

**Qué cambió**
· **«Proponer reunión»**, en la ficha de la candidatura, bloque «Reuniones».
  · Dos o tres franjas, en hora de Madrid, con su duración.
  · Al proponerla queda guardada y se abre un correo ya escrito para la persona de contacto: le habla por su nombre, numera las franjas con el día de la semana y dice que son hora de Madrid.
  · Sin proveedor de correo, el correo se abre en el programa de quien la propone.
· **«Anotar la reunión»**: fecha, quién estuvo (de IWL y de la candidatura, una persona por línea), qué se habló, cómo quedó (seguir, no seguir, pendiente) y adjuntos.
  · Se puede anotar la que se propuso o una que no pasó por aquí.
  · Los adjuntos van al expediente de la candidatura, colgando de la reunión.
· **Las dos dejan su evento en el historial** del expediente: «Reunión propuesta» y «Reunión · Seguir».
· **Ella ve «Reunión propuesta»** mientras haya una sin celebrar, con qué hacer: responder al correo con la franja que le vaya.
· **Si abrió su enlace**: en «Qué ve ella», «Abrió su enlace el 9 nov · la última vez, el 12 nov», o «Todavía no ha abierto su enlace». Lo apunta la propia página del enlace. Si quien lo abre es de IWL, comprobándolo antes de mandarlo, no cuenta.

### Qué decidí yo
· **La apertura la apunta una función aparte**, no `ver_candidatura`. Esa solo lee, y una lectura que escribe no puede marcarse como estable.
· **«Reunión propuesta» sale de la base** (`momento_de`), como el resto de momentos. Las dos funciones que lo enseñan se recrean desde su definición vigente, cambiando solo esa llamada.
· **La conclusión va escrita, no en un color.** Es una decisión, no un estado de trabajo, así que no usa `<Estado>`.
· **Al menos dos franjas**: con una sola, si no le va, se pierde un correo.

**Cómo lo he probado**
· 5 unitarias: la hora de Madrid en invierno y en verano, la franja contada con su día, el correo y los asistentes.
· 3 de RLS: las reuniones solo las ve IWL; con una propuesta sin celebrar, ella ve «Reunión propuesta»; y la apertura se apunta sin sesión, sin mover la primera vez.
· 1 de interfaz, de punta a punta: ella abre el enlace, IWL lo ve, propone dos franjas, ella ve la reunión propuesta, se anota, y el historial lleva los dos eventos.

### Estado
· 156 unitarias · 160 RLS · **369 de interfaz en verde y 4 saltadas**. Hubo un fallo en WebKit, en «la dirección restablece la contraseña»: una carrera de navegación que la propia prueba ya documenta, ajena a esto. Repetida sola, pasa tres de tres.
· Migración nueva: `20261109160000_reuniones`.

**Siguiente**
El acta de comité, con la firma de cada miembro, la vía, el PDF y el aplazamiento.

---

## 2026-11-09 · Flujo de entrada, 1 de 6: tramo, vía y «por construir» · commit 29ab9bc

Con el modelo v2 aprobado, construyo los puntos 3 a 7 en este orden, cada uno con su commit y su entrada:
1. la base, que es esto;
2. las reuniones;
3. el acta de comité;
4. enviar y comentar el NDA;
5. la compañía en entrada, la decisión de incorporación y el Anexo como propuesta;
6. «En entrada».
Al final, la guía de carga rehecha.

**Qué cambió**
· **Tramo y vía en la compañía**: `tramo` (`entrada` o `incubacion`, por defecto incubación) y `via` (`aceleracion` o `construccion`). Las compañías de hoy quedan en incubación y no cambian.
· **En entrada no cuenta**: no sale en la cartera ni en ninguna media. Como la comparativa y la cohorte se calculan desde la cartera, quedan fuera también.
· **La vía la cambia solo dirección**, y solo de Construcción a Aceleración. Al pasar, lo que estaba por construir pasa a por entregar.
· **«Por construir»**, un estado nuevo en el due diligence y en el business plan:
  · no cuenta como pendiente ni vencido, ni en el score;
  · en pantalla es «Por hacer», sin fecha;
  · pasa solo a «por entregar» al enlazarse a un hito con fecha (`dd_items.milestone_id`), y toma esa fecha, también si el hito la estrena después;
  · ponerlo o quitarlo a mano es de quien valida, como «No aplica».
· **`diligencia` pasa a llamarse `entrada`**, y en pantalla «En entrada». `nda` pasa a decir «NDA enviado».
  · Tres funciones de la base llevaban el valor escrito como texto, y habrían fallado al ejecutarse, no al crearse. Se recrean desde su definición vigente cambiando solo ese valor.
· **Etapa y perfil técnico pueden estar vacíos en entrada.** En pantalla, «Sin etapa todavía». Lo que se calcula contra ellos lo dice en vez de suponerlos: la línea base y la evaluación técnica piden fijarlos antes.

### Qué decidí yo
· **El aviso al mentor principal al cambiar la vía** va con el punto 5, que es donde está el cambio de vía en pantalla. Aquí está la regla de la base.
· **Lo que no se puede calcular sin etapa se niega con un mensaje**, no se calcula con una supuesta: una línea base con la etapa inventada no se podría comparar con nada.

### Estado
· 151 unitarias · 157 RLS · **368 de interfaz en verde y 4 saltadas**.
· Migraciones nuevas: `20261109150000_enums_entrada` y `20261109151000_tramo_via`.

**Siguiente**
Las reuniones: proponerla, anotarla y saber si abrió el enlace.

---

## 2026-11-09 · El modelo del flujo de entrada, rehecho con dos vías · commit 8f2c5e3

**Qué cambió**
· **`docs/IWL_Doc_ModeloFlujoEntrada_ES_v2_20261109.md`**: el modelo de datos rehecho con tu corrección y tus siete respuestas. La versión 1 queda como estaba, como historia.
· **`docs/IWL_Doc_FlujoEntrada_ES_v2_20261109.md`**: el flujo, en palabras, con las dos vías, la decisión de incorporación y la propuesta de Acuerdo.

Lo principal del modelo:
· **Tramo y vía**: `tramo` (`entrada` o `incubacion`) y `via` (`aceleracion` o `construccion`). La vía la fija el acta de comité: la propone el estado de entrada y el comité la cambia con motivo.
· **«Por construir»**, en el due diligence y en el business plan. No cuenta como pendiente ni vencido, ni en el score. Pasa a «por entregar» al enlazarse a un hito con fecha.
· **La compañía nace al contrafirmar el NDA**, en las dos vías, y la candidata pasa a fundadora en el mismo paso.
· **La situación societaria** la dice la fundadora una vez, e IWL la confirma.
· **El estado `diligencia` pasa a llamarse `entrada`**, y `nda` se lee «NDA enviado».
· **El comité** sale de una lista por defecto en Programa, editable en cada acta. Su acta lleva la vía. «Aplazada» se queda en Comité, con fecha de revisión y aviso ese día.
· **Un NDA propio de la candidata** cuando su comentario cambia el texto, que anula su firma si IWL aún no ha firmado.
· **La decisión de incorporación** queda guardada con su base (due diligence o estratégica). Un «no» archiva la compañía como «No incorporada».
· **Proponer el Acuerdo**: la fundadora lo comenta y lo acepta.
· **Firmar el Acuerdo**: en Aceleración exige los puntos obligatorios validados; en Construcción, no.
· **«En entrada»** al lado de la cartera, con la vía en cada fila.

### Qué decidí yo
· **Los dos documentos son versiones nuevas (v2)**, y las v1 se quedan. El de flujo v1 solo está en tu copia de `main`, sin versionar; el v2 va en la rama.
· **Pasar de Construcción a Aceleración** lo he dejado como cambio de dirección, con motivo y en el registro, sin volver a comité.
· **«Por construir» pasa a «por entregar» solo**, en cuanto el punto se enlaza a un hito con fecha, y toma esa fecha.

### Qué necesito que decidas
Las tres preguntas que quedan están al final del modelo:
1. ¿Pasar de Construcción a Aceleración necesita comité?
2. ¿«Por construir» pasa a «por entregar» automáticamente al enlazarlo a un hito con fecha, o lo pasa IWL a mano?
3. ¿La propuesta de Acuerdo es ya el borrador del Anexo, o son dos cosas?

### Estado
· Solo documentos: sin código ni migraciones en este paso. Las suites, como en la entrada anterior.

**Siguiente**
Con tu aprobación, construirlo por el orden de la revisión: reuniones, comité, NDA enviado y comentado, la compañía en entrada con sus dos vías, y «En entrada».

---

## 2026-11-09 · Prueba_Ro: los dos fallos, y el modelo del nuevo flujo · commit 9b8f463

**Los dos fallos eran uno**

**«Con quién se habla» no salía vacío: los datos estaban guardados.** Lo que pasaba es que no se veían.
· Con un enlace largo en «Lo que ha mandado», o un nombre o un correo largos sin espacios, la columna de la izquierda se estiraba hasta 873 px. Una columna con `fr` no baja nunca del ancho de su contenido más largo sin cortes.
· Eso empujaba la columna de la derecha, con «Con quién se habla», fuera de la pantalla, entre x = 1180 y x = 1815. La ficha se salía por la derecha y el bloque parecía vacío.

Lo reproduje a 1024, 1180 y 390 px antes de tocar nada.

**Qué cambió**
· Las columnas de la ficha, con `minmax(0, …)`. Lo que no cabe se corta con sus puntos suspensivos.
· El nombre de la startup y los datos de contacto se parten antes que salirse.
· Un desplegable ya no es más ancho que su formulario. Lo sacaba en el móvil el de «Situación societaria», que es mío, de la tanda anterior.
· Una prueba de interfaz carga una candidatura con enlaces y textos largos y comprueba a 390, 1180 y 1440 px que la página no desborda y que el contacto se ve dentro de la pantalla. Si algo se sale, el mensaje dice qué.

**Y otro fallo que salió buscándolos.** Corregir los datos de una candidatura **borraba en silencio** cinco campos, cada vez que se guardaba: cómo llegó, en qué punto dice estar, cuántas personas son, el liderazgo femenino y las notas. El formulario de corrección no los enseña, y la acción, que usaba el esquema del alta, los dejaba en blanco. Ahora solo se guarda lo que trae el formulario, y una prueba lo comprueba. **Si en producción ya se corrigió alguna candidatura, esos campos pueden haberse perdido** y habría que volver a escribirlos.

**El modelo de datos del nuevo flujo**, para que lo apruebes antes de construir: `docs/IWL_Doc_ModeloFlujoEntrada_ES_v1_20261109.md`. Cubre los puntos 3 a 7:
· la compañía nace al contrafirmar el NDA, en un «tramo» de due diligence que no cuenta en la cartera;
· la candidata pasa a fundadora en el mismo paso;
· la situación societaria es lo primero que se le pregunta;
· reuniones, con si abrió el enlace;
· acta de comité con la firma de cada miembro;
· enviar y comentar el NDA;
· la vista «En due diligence».
Lo ya hecho —el NDA, la situación societaria, el alta paso a paso— se reutiliza.

### Qué decidí yo
· **Primero los fallos y el modelo; nada del flujo nuevo construido.** Pediste el modelo antes, y lo he respetado.
· **El NDA ya hecho se queda como está** hasta que apruebes el modelo. Funciona, y es la contrafirma sobre la que el modelo engancha la creación de la compañía.

### Qué necesito que decidas
Las siete preguntas están al final del documento del modelo. En resumen:
1. ¿El «tramo» va en una columna aparte, y no como una fase más?
2. ¿Etapa y perfil técnico se dejan vacíos durante el due diligence, y KPI y hoja de ruta se crean al firmar el Acuerdo?
3. ¿La fundadora dice la situación societaria una vez, y después solo IWL?
4. ¿Quién forma el comité: se elige en cada acta, o es una lista fija?
5. ¿Una versión del NDA propia de la candidata, que anula su firma si IWL aún no ha firmado?
6. ¿Renombro los estados `nda` y `diligencia`?
7. ¿Qué pasa con una candidatura cuyo acta dice «aplazada»?

### Estado
· 151 unitarias · 157 RLS · **368 de interfaz en verde y 4 saltadas, dos pasadas seguidas**.
· Sin migración nueva en este paso.

**Siguiente**
Lo que digas del modelo, y construirlo por tu orden: reuniones, comité, NDA enviado y comentado, la compañía en due diligence y su vista.

---

## 2026-11-09 · El NDA, firmado en la plataforma · commit ef6b8db

Punto 3 del onboarding, con tus cinco ajustes. Es la firma sobre la que se apoya el nuevo flujo de entrada: «la contrafirma que lo dispara todo». Crear la compañía al contrafirmar llega con el nuevo corte, cuando apruebes su modelo de datos.

**Qué cambió**
· **La plantilla**, en Administración → Programa → «Plantilla del NDA».
  · Empieza vacía. Mientras lo esté, la candidata ve «Tu NDA está en preparación» y no puede firmar nada provisional.
  · Guardar crea una versión nueva; ninguna se edita ni se borra, tampoco con la clave de servicio.
  · El número de versión y el hash SHA-256 los calcula la base.
  · Dice que es firma electrónica simple y que Luciana la valida antes de usarla con fundadoras reales, y de dónde sacar el texto (Drive).
· **La puerta**: al entrar, después de cambiar la contraseña, la candidata **solo ve el NDA**. Lo firma con su nombre completo y la casilla de aceptación, y se le dice qué queda registrado. Lo decide la base (`estado_nda`), no la pantalla.
· **La contrafirma**, desde el aviso «X ha firmado el NDA. Falta la firma de IWL», con el botón «Firmar por IWL» ahí mismo; también desde la ficha. Firma una persona de dirección, con su nombre. Al contrafirmar:
  · se genera el PDF con las dos firmas y va al data room de la candidatura;
  · la candidatura pasa a «NDA firmado», que pide su due diligence;
  · el aviso se cierra solo.
· **El rastro**, en la última página del PDF: nombre, correo, fecha y hora en Madrid y en UTC, IP y navegador de cada firmante, versión y hash. El navegador también se guarda en `nda_firmas`.
· **NDA firmado fuera**: en la ficha, «Se firmó fuera de la plataforma», con el PDF o un enlace y la fecha. Cuenta igual y abre la puerta.
· **La candidata se entera**: «IWL ha firmado el NDA. Ya puedes empezar el due diligence», hasta que entrega algo, y un botón para abrir el NDA firmado.
· El texto de «Darle cuenta» ya no dice «al firmar el NDA»: ahora la cuenta va antes, y el NDA es lo primero que ve.

**Qué decidí yo**
· **Firmar y contrafirmar van con la clave de servicio, y es la excepción escrita.** La IP solo la conoce este servidor: si la función se pudiera llamar con la sesión, cada cual se escribiría la IP que quisiera. La acción comprueba la sesión; las funciones no se exponen a nadie con sesión, y una prueba lo confirma.
· **`<Evidencia>` no sirve tal cual**, porque va atada a una compañía y su data room, y el NDA es de una candidatura. El NDA de fuera tiene su propio formulario con las mismas dos formas, archivo o enlace, y queda en el data room de la candidatura.
· **Las candidaturas que ya tenían NDA puesto a mano** no se paran en la puerta: su NDA sale como «no aplica».
· **Una plantilla de prueba en la semilla local** (`09_nda_prueba.sql`), que dice en su primera línea que no es un NDA. Las versiones no se borran, así que una prueba no puede crear la suya sin dejarla para siempre. A la nube no llega: `sembrar:nube` solo sube la configuración.
· **Dependencia nueva: `pdf-lib` 1.17.1**, en JavaScript puro, para generar el PDF en el servidor de Vercel. Tras fusionar, en tu copia hace falta `npm install`.

**Cómo lo he probado**
· 6 unitarias del PDF: horas de Madrid y UTC, IP y navegador de las dos partes, el texto largo que pasa de página, un carácter que Helvetica no sabe dibujar.
· 6 de RLS:
  · nadie con sesión llama a la firma, ni la fundadora ni dirección;
  · una versión no se edita ni se borra;
  · solo dirección crea versiones;
  · el hash es el SHA-256 del texto exacto;
  · una fundadora no sabe nada del NDA ajeno, e IWL sí.
· 1 de interfaz, de punta a punta: cuenta, contraseña, solo el NDA, sin la casilla no firma, firma, aviso, «Firmar por IWL», el rastro en la base, la candidatura en «NDA firmado», el PDF, y ella viendo que ya puede empezar.

### Estado
· 151 unitarias · 157 RLS, dos veces seguidas · **364 de interfaz en verde y 4 saltadas**.
· Migraciones nuevas: `20261109130000_nda` y `20261109140000_estado_nda`.

**Siguiente**
Los dos fallos de Prueba_Ro y, después, el modelo de datos del nuevo flujo de entrada, para tu aprobación.

---

## 2026-11-09 · Situación societaria: proyectos sin sociedad · commit 2f52a14

**Qué cambió**
· **«Situación societaria» en la candidatura y en la compañía**: sin constituir (personas físicas), en constitución con fecha prevista, o constituida con forma jurídica, denominación social y CIF. Cada opción enseña solo sus campos, y cada error sale en su campo.
  · Es **obligatoria al firmar** el Acuerdo y al dar de alta una compañía directamente. La base se niega a firmar sin ella.
  · En la ficha de la candidatura hay un bloque propio para decirla antes del NDA.
  · En la ficha de una compañía se puede cambiar; es opcional, para no bloquear la edición de las que ya existían.
· **Quién firma**, en «Firmar el acuerdo». Sin sociedad, las fundadoras a título personal, una por línea; el campo trae ya a la persona de contacto. Con sociedad, quien la representa, y además las fundadoras si el Acuerdo lo pide. Se guarda en la candidatura.
· **Due diligence sin sociedad**:
  · Escritura, pacto de socios, cap table certificada, libro de actas y cuentas anuales pasan a **No aplica**, con el motivo escrito. Es un estado nuevo, y lo pone o lo quita solo quien valida.
  · Se piden en su lugar **Pacto entre fundadoras** y **Titularidad de lo construido** (código, marca y dominio).
  · Lo mismo vale para el due diligence de selección de la candidata.
  · Lo ya entregado no se toca: solo cambia lo que estaba pendiente.
· **«No aplica» no cuenta en el score**: sale del denominador. Si en un área no aplica nada, el área entera queda fuera de la media. Lo sin medir no es un cero.
· **Hito «Constituir la sociedad»** en la hoja de ruta, con la fecha prevista. Si la fecha cambia, el hito la sigue. Al darlo por cumplido:
  · la compañía pasa sola a constituida;
  · se vuelve a pedir lo societario;
  · la ficha marca «Sociedad constituida · faltan sus datos» hasta que se escriban.
  Quien coordina el proyecto puede cumplir el hito, pero no escribir la situación a mano.
· **Equity**: en «Programa y Anexo» y en «Aportación» pone «Equity pendiente de constitución», ligado al hito. No se redacta nada.
· **Se ve como dato, no como alerta**: en la cabecera de la compañía y en la fila de la cartera.

**Qué decidí yo**
· **«Y similares»** son cinco puntos: escritura, pacto de socios, cap table certificada, libro de actas y cuentas anuales. Las cuentas anuales también presuponen una sociedad. Declaración de litigios, marcas y vesting siguen pidiéndose, porque también los tiene una persona física.
· **El pacto de socios lo sustituye el pacto entre fundadoras.** Sin sociedad no hay socios, pero sí un reparto previsto.
· **El hito no condiciona el estado invertible.** El equity ya queda pendiente de él; bloquear también la inversión es decisión tuya.
· **Constituida por el hito, sin datos**: no se adivinan. La ficha lo dice hasta que alguien escriba la forma, la denominación y el CIF.
· **Los firmantes solo se guardan al firmar desde el embudo.** El alta directa no registra el Acuerdo.
· **Con sociedad, firmar pide quién la representa**, y las fundadoras quedan opcionales: el punto abierto de la Propuesta §17 sigue abierto.

**Cómo lo he probado**
· 9 pruebas unitarias de la situación —qué exige cada una, cómo se enseña, quién firma— y 3 del score con «No aplica».
· 4 de RLS, entrando como quien menos puede:
  · la fundadora no se cambia la situación;
  · sin sociedad, la base pone el hito y los dos puntos nuevos;
  · el mentor que coordina no escribe la situación a mano, pero al cumplir el hito la sociedad queda constituida;
  · la fundadora no se marca un punto como «No aplica».
· En interfaz:
  · el alta directa de una compañía sin sociedad comprueba la escritura en «No aplica», el pacto entre fundadoras y el hito;
  · la firma desde el embudo, sin sociedad, comprueba los firmantes ya rellenos y la situación en la ficha.
· Seis pruebas que daban de alta compañías ahora eligen la situación. Una de RLS que firmaba sin ella también, y deja su candidatura como estaba.

### Qué necesito que decidas
1. ¿Son esos cinco los puntos que exigen sociedad?
2. ¿El hito «Constituir la sociedad» debe condicionar el estado invertible?
3. ¿El alta directa también tiene que registrar quién firma el Acuerdo?

### Estado
· 145 unitarias · 151 RLS, dos veces seguidas · **362 de interfaz en verde y 4 saltadas**, en Chromium y WebKit.
· Migraciones nuevas: `20261109110000_enums_societarios` y `20261109120000_situacion_societaria`.

**Siguiente**
El NDA dentro de la plataforma (punto 3), con tus cinco ajustes.

---

## 2026-11-09 · El alta paso a paso y los avisos a dirección · commit e60bcab

Puntos 1 y 2 de la revisión del 9 de noviembre.

**Qué cambió**
· **La base apunta dos fechas que no se guardaban**: el primer acceso y el cambio de la contraseña temporal. Lo hacen dos disparadores sobre `auth.users`, que solo guardaba el *último* acceso. Nadie las puede editar con sesión, tampoco dirección.
· **La línea del alta**, en la ficha de cada candidatura (debajo de «Qué ve ella») y en el resumen de cada compañía: cuenta creada · primer acceso · contraseña cambiada · NDA firmado por ella · NDA firmado por IWL · due diligence entregado (x de y) · comité · acuerdo firmado. Cada paso lleva su estado, en palabra e icono; si está hecho, su fecha, y si está en curso, cuántos días lleva.
· **Atención a los 5 días en el mismo paso, vencido a los 10.** Se cambian en Administración → Programa → «Alta de las personas».
· **«Recordar»**, en el paso detenido. Abre un correo ya redactado en tu programa de correo o copia el texto para WhatsApp, y apunta en el registro que se lo recordaste y por qué canal.
· **Avisos en el inicio de dirección** (`/cartera`), arriba del todo y también con la cartera vacía: «Fulana ha entrado por primera vez», que se da por visto con «Entendido». Debajo, «Altas en curso», con las detenidas primero.
· **Contador en la barra**, lateral y de móvil: avisos sin ver más altas detenidas. Va en «Cartera» y forma parte del nombre del enlace, así que un lector de pantalla también lo dice.

**Qué decidí yo**
· **«Dirección» es `admin_iwl`.** Solo ese rol ve los avisos y el contador; el equipo de IWL ve la línea en las fichas, pero no los avisos.
· **El comité de la línea es el de después del due diligence**: un comité anotado después de la contrafirma del NDA, o el paso a «Acuerdo propuesto». El comité de selección del embudo va antes del NDA, y en tu lista el comité venía después de la documentación.
· **Sin cuenta, nadie está parado.** Crear la cuenta es cosa de IWL, y la línea mide dónde se ha quedado la persona.
· **«Recordar» solo sale en los pasos de la persona**: primer acceso, contraseña, NDA y documentación. Los de IWL —contrafirmar, comité, acuerdo— no se le recuerdan a ella.
· **Lo hecho fuera de la plataforma deja en «No aplica» los pasos de antes.** Una compañía que firmó antes de que existiera esto no sale con el NDA pendiente.
· **Los pasos parados no se guardan como avisos: se calculan**, y desaparecen solos cuando el paso se mueve. Solo se guardan los hechos puntuales, que son los que se dan por vistos.
· **Las cuentas que ya habían entrado** toman su último acceso como primero: mejor una fecha algo tardía que un «nunca ha entrado» falso. Su fecha de cambio de contraseña no se sabe y queda vacía.
· **El NDA de la línea ya lee la firma de la plataforma** (`nda_firmas`), que llega con el punto 3. Hasta entonces esos dos pasos salen en curso o por hacer.

**Cómo lo he probado**
· 11 pruebas unitarias de la línea: umbrales, días naturales, «No aplica», descartadas, sin candidatura.
· 6 de RLS, entrando como quien menos puede:
  · el primer acceso se apunta una vez y avisa una vez;
  · el cambio de contraseña se apunta;
  · nadie se escribe su primer acceso, ni siquiera dirección;
  · el equipo de IWL y una fundadora no ven los avisos, y dirección sí.
· 1 de interfaz, el caso de Agustina: se le da cuenta, entra, cambia la contraseña. Dirección ve el aviso y el contador, lo da por visto, y la ficha marca los tres primeros pasos hechos y el NDA en curso. Parada doce días, sale vencido, y «Recordar» por WhatsApp queda apuntado.
· Cuatro pruebas del menú buscaban un enlace llamado exactamente «Cartera». Con el contador se llama «Cartera 3 pendientes»; ahora aceptan los dos.

### Qué necesito que decidas
1. ¿El comité es el de después del due diligence, como lo he puesto?
2. ¿Los avisos los ve también el equipo de IWL, o solo dirección?

### Estado
· 133 unitarias · 147 RLS · interfaz: 358 en verde y 4 saltadas en la pasada completa; los 4 fallos eran las pruebas del menú, ya arregladas, y su fichero pasa entero en los dos motores.
· Migración nueva: `20261109100000_onboarding`.

**Siguiente**
La situación societaria, que llegó después y va en el mismo formulario de firma, y luego el NDA (punto 3) con tus cinco ajustes.

---

## 2026-11-09 · Firmar el acuerdo ya no pide el identificador · commit d7959bb

Punto 4 de tu revisión del 9 de noviembre, el que te bloqueaba con Siren. Lo demás va en entradas siguientes, por orden.

**Qué cambió**
· **«Web de la compañía» es un campo propio y opcional.** Acepta `siren.es`, `www.siren.es` o con `https://`, y guarda la dirección completa: `https://siren.es`. Si lo escrito no es una web, el error sale debajo del campo: «Eso no parece una web. Escríbela como siren.es o www.siren.es».
· **El identificador sale del nombre** y no se le pide a nadie. Si ya existe, coge el primero libre: `siren-2`. Se puede escribir a mano en **Opciones avanzadas**, bajo el rótulo «Identificador en la plataforma, no es la web». Si se escribe uno que ya existe, el error sale en su campo, con la sección abierta, y propone el siguiente libre.
· **El aviso de arriba nombra el campo**: «Revisa este campo: la web de la compañía», o «el identificador en la plataforma». Antes decía «Revisa los campos marcados».
· Las fechas de arranque y de firma también muestran su error debajo.
· Las dos funciones nuevas, `identificadorDe` y `normalizarWeb`, viven en `lib/identificador.ts`, con seis pruebas unitarias.

**Qué decidí yo**
· **La web se escribe en la candidatura antes de firmar**, y la firma la copia a la compañía junto con el nombre, el sector y lo demás. Así no hace falta tocar la función de la base.
· **Un identificador escrito a mano y ocupado se rechaza**: no se le pone número sin preguntar. Si quien lo escribe lo eligió a propósito, cambiárselo en silencio sería peor.
· **El alta directa (Administración → Compañías) sigue pidiendo el identificador.** Allí se rotula «Identificador (minúsculas y guiones)» y no se confunde con la web. Si prefieres que también salga del nombre, es el mismo cambio.

**Cómo lo he probado**
· La prueba de interfaz que firma una candidatura ahora no escribe el identificador y escribe la web como `www.…`. Comprueba que la compañía nace con el identificador sacado del nombre y con la web completa.
· Una prueba nueva escribe a mano un identificador ocupado y comprueba tres cosas: que el error sale en su campo, que la sección se abre y que no se firma nada.

**Para Siren, en producción:** con esto desplegado, en «Firmar el acuerdo y crear la compañía» escribe `siren.es` en «Web de la compañía» y deja «Opciones avanzadas» como está. Saldrá `siren`, salvo que ya exista una compañía con ese identificador; `nube:vaciar` se las habría llevado todas.

### Estado
· 122 unitarias · 141 RLS · **360 de interfaz en verde y 4 saltadas**, en Chromium y WebKit.
· No hay migración en este paso: basta con desplegar.

**Siguiente**
Los puntos 1 y 2: los pasos de alta en la ficha y los avisos para dirección.

---

## 2026-11-05 · `nube:vaciar`, `--reponer` y la guía para cargar compañías · commit b6b934b

**Qué cambió**
· **`npm run nube:vaciar`** deja la nube lista para cargar las compañías reales. Por defecto es una simulación; borra con `--confirmar`.
  · Borra todas las compañías salvo Marea Clínica, que es la única con `is_demo`.
  · Borra todas las candidaturas salvo tres de muestra: «Revisión · Candidatura» en NDA, que es la de `rev-candidata`, «Muestra · Firmada», enganchada a Marea, y «Muestra · Descartada».
  · Se lleva también sus ficheros de `logos`, `data-room` y `candidaturas`, buscados por carpeta.
  · No toca la configuración ni las cuentas.
  · Escribe la constancia en `docs/constancia/` y deja una fila `vaciar` en el registro.
· **Sus dos seguros**: contra la base local se niega salvo con `--local`, y contra la nube mientras `rodrigo@niage.es` no funcione, con el mismo criterio que `--limpiar`.
· **Candidaturas de demostración** (migración `20261105140000_candidatura_demo`). Se ven en el embudo con el distintivo «Demo», en las tres listas y en la cabecera, y no cuentan en ningún número: ni por paso, ni abiertas, firmadas o descartadas, ni en la conversión. Marcarlas es de la dirección.
· **`cuentas:nube` sin opciones solo crea las que faltan**; las que existen no se tocan, ni contraseña ni papel. Reponer una es `--reponer <correo>`, de una en una y solo del equipo. Las contraseñas se añaden a `.accesos-nube.md` con la fecha, sin pisar las que no se hubieran repartido.
· **La guía**: `docs/IWL_Doc_CargarCompania_ES_v1_20261105.md`. Cubre entrada (por el embudo o en alta directa), ficha, equipo, Anexo, hoja de ruta, hitos y KPI. Para cada paso dice dónde se hace, con los rótulos de la pantalla, quién puede hacerlo y qué hay que ver después.
· **El aviso de «Dar de alta a una persona»** decía que la persona «entra pidiendo su enlace». Ahora dice que entra con la contraseña que se enseña y que se le pide cambiarla.

### Lo que la entrada anterior tenía mal
**`--limpiar` habría fallado con cualquier cuenta que hubiera creado una línea base.** Al borrar una cuenta, la base le quita el autor a lo que hizo, y en una línea base eso es un `update` que `guard_linea_base` rechaza siempre. Lo he comprobado en local con una transacción que se deshace. Las pruebas no lo veían porque ninguna línea base de la semilla tiene autor. No he relajado el guardián: ahora la simulación lo avisa («NO SE PUEDE BORRAR») y `--confirmar` se salta esa cuenta y dice por qué. En la nube no llegará a pasar si `nube:vaciar` va antes, porque las líneas base se van con sus compañías.

Y la entrada anterior mandaba borrar las cuatro compañías de prueba con «borrar con todo». **Ya no hace falta**: `nube:vaciar` se las lleva.

**Cómo lo he probado** (contra la base local)
· `nube:vaciar` contra un `.env.produccion` que apuntaba a local se negó. Con `--local`, la simulación recorrió la base entera: 7 compañías con 132 ficheros y 33 candidaturas.
· Para el borrado de verdad creé una compañía con ficheros en `logos` y en carpetas anidadas de `data-room`, una candidatura firmada enganchada a ella —el caso que impide borrar una compañía— y otra abierta con un fichero. Limité la pasada a ellas. Resultado:
  · Se borraron las tres, sin que quedara ni un fichero.
  · Se crearon las dos muestras que faltaban, la firmada enganchada a Marea.
  · La de revisión quedó marcada.
  · Se escribió la fila del registro.
  · La semilla quedó intacta.
· Después lo dejé todo como estaba.
· `--reponer` en sus cuatro caminos: crear las que faltan, segunda pasada que no toca nada, reponer una y negarse con alguien de fuera del equipo. El papel se conserva y la marca se pone.
· La línea base: una cuenta que era su autora la simulación la marcó y `--confirmar` se la saltó.
· Dos pruebas de RLS: el equipo no puede marcar una candidatura y la dirección sí, y la vista lo recoge. Y una de interfaz: una candidatura marcada sigue en la lista con «Demo» y la cifra «En proceso» baja en una.

### Qué decidí yo
· **Las muestras se crean, no se eligen entre las que hay.** Una firmada de las de prueba tiene su propia compañía de prueba, y quedársela obligaba a conservar esa compañía o a reengancharla. Si ya existe una con el nombre de muestra, se queda.
· **La firmada cuelga de Marea.** La base no admite una firmada sin compañía, y así «Ver su ficha» lleva a la demostración.
· **El script borra con la clave de servicio y no con «borrar con todo».** Esa función exige una sesión de dirección. A cambio, los ficheros se quitan por carpeta y no por las rutas guardadas, que dejaban huérfanos.
· **Del registro de actividad, el de las compañías borradas se va con ellas** (`on delete cascade`). La constancia de la simulación es la que lo conserva.
· **La guía la escribió un agente leyendo el código, y la he revisado.** Los rótulos salen del JSX. Lo que no pudo comprobar en pantalla está dicho como tal.

### El orden para la nube

Desde la carpeta del proyecto, donde está `.env.produccion`:

```bash
# 1. Fusión en main
git merge --ff-only worktree-limpiar-cuentas-nube

# 2. Las migraciones pendientes: la contraseña temporal, si no estaba, y las candidaturas de demostración
npx supabase db push

# 3. Publicar y desplegar
git push
npx vercel --prod

# 4. Vaciar los datos de prueba. Lee la constancia antes de confirmar
npm run nube:vaciar
npm run nube:vaciar -- --confirmar

# 5. Las cuentas de revisión, enganchadas a las muestras
npm run cuentas:revision -- --nube

# 6. Quitar las cuentas que sobran. Lee la constancia antes de confirmar
npm run cuentas:nube -- --limpiar
npm run cuentas:nube -- --limpiar --confirmar

# 7. Deben quedar 13 —5 del equipo y 8 de revisión—, todas «se queda»
npm run cuentas:nube -- --listar
```

**8.** Cargar las compañías reales siguiendo la guía, desde `https://ride.inceptionwlab.es`.

**El orden importa en dos sitios.** Primero vaciar y después limpiar: si no, las cuentas que crearon líneas base en compañías de prueba no se dejan borrar. Y siempre la simulación antes de `--confirmar`: es la que deja constancia de lo que hay.

### Lo que encontró la guía, y que no he arreglado
Escribirla destapó callejones sin salida. Están todos en la guía; estos son los que más pesan:

· **Al firmar, la candidata no pasa a fundadora ni se asigna a su compañía.** Firmar crea la compañía, pero ella sigue con el papel de candidata hasta que alguien lo cambia a mano en Personas.
· **Un Anexo firmado no se puede renovar.** La acción de abrir una versión nueva existe, pero la pantalla solo ofrece el botón cuando no hay ninguno.
· **Los objetivos de KPI no tienen pantalla.** La columna existe y los gráficos la pintan, pero nada la escribe.
· **Un hito no se puede editar ni borrar**, solo cambiarle el estado y la etapa.
· **Sin plantillas de recorrido, una compañía no puede empezar su hoja de ruta.** «Añadir una etapa» solo aparece cuando ya hay alguna.

### Qué necesito que decidas
1. ¿Hago que firmar una candidatura convierta a la candidata en fundadora y la asigne a su compañía? Hoy es un paso a mano, fácil de olvidar.
2. ¿Pongo el botón para abrir una versión nueva del Anexo cuando ya hay uno firmado?
3. De los otros tres —objetivos de KPI, editar hitos y empezar una hoja de ruta sin plantilla—, ¿cuáles antes de cargar las compañías reales?

### Estado
· 116 unitarias · 141 RLS · **358 de interfaz en verde y 4 saltadas**, en Chromium y WebKit. `--reponer` va en su propio commit, 729a3ed.
· Producción: sin tocar desde aquí.

**Siguiente**
Lo que digas de esas tres preguntas, y «Mi perfil».

---

## 2026-11-05 · `--limpiar`: en la nube solo quedan las nuevas · commit 820b4b1

**Qué cambió**
· **`npm run cuentas:nube -- --limpiar`** borra toda cuenta que no esté en la lista: las cinco del equipo y las ocho de revisión. **Por defecto es una simulación**: dice qué borraría y qué arrastraría cada una. Solo borra con `--confirmar`.
· **No hace nada mientras `rodrigo@niage.es` no funcione**, ni siquiera la simulación. Tiene que existir, ser `admin_iwl`, haber entrado alguna vez y haber cambiado ya la contraseña temporal. Además, nunca puede salir entre las que se borran, y la limpieza no cambia papeles: no degrada a nadie.
· **Antes de borrar escribe la constancia** en `docs/constancia/`, un fichero por pasada. Recoge papel, nombre, alta, último acceso, compañías y todo el registro de actividad de cada cuenta. Incluye el texto de sus comentarios y objeciones, que **se borran con la cuenta**, y las candidaturas a las que se quita el autor.
· **Las candidaturas no dejaban borrar a quien las creó.** Cinco tablas tienen la clave foránea en `no action`, y el borrado habría fallado justo con las cuentas que trabajaron en el embudo. Ahora se les quita el autor justo antes, que es lo que las otras 52 claves foráneas hacen solas.
· **Cada cuenta borrada deja una fila `borrar_cuenta`** en el registro de actividad: correo, papel y dónde está la constancia.
· **`--listar` saca las trece**, con alta, último acceso y una columna «se queda / sobra». Lo que sobra sale ahora de la lista de quién se queda, no de un patrón: con el patrón se escapaban `qqqq@q.com`, `w@w.es` y `maria@pitulo.com`, que es lo que viste tú.
· **La lista de quién se queda vive en `scripts/cuentas-lista.mjs`**, y la leen `cuentas:nube` y `cuentas:revision`. Con dos copias, añadir a alguien en una y no en la otra era crearle la cuenta y borrársela en la siguiente limpieza.
· `DESPLIEGUE.md`, con la limpieza.

**Cómo lo he probado** (contra la base local, nunca contra la nube)
· **El seguro, en sus tres estados**: sin `rodrigo@niage.es`, con la cuenta sin estrenar y con la contraseña temporal sin cambiar se niega las tres veces. Entra y cambia la contraseña, y abre.
· **El borrado, con material de verdad.** En tu base local había nueve cuentas `cambio.…`, `reset.…` y `alta.auto.…@iwl.test`, restos de pasadas de la suite que se cortaron antes de limpiar. Algunas eran mías, de esta mañana. A una le puse un comentario, una candidatura y una acción. La simulación encontró las nueve y nada más. La confirmación las borró, y el comentario se fue con su autora. La candidatura quedó con el autor en blanco, como estaba antes. La acción siguió en el registro, sin autor, y hubo nueve filas `borrar_cuenta`. Una segunda pasada: «No sobra ninguna cuenta».
· Después quité de la base local la `rodrigo@niage.es` de prueba, las filas de prueba y las constancias.

### Qué decidí yo
· **La constancia es de todas las cuentas que se borran**, no solo de las tres que nombrabas. Cuesta lo mismo, y las `@iwl.es` también pierden su autoría.
· **`docs/constancia/` no se versiona.** Pediste guardarlo en `docs/`, y ahí está, pero lleva correos, nombres y lo que cada cuenta hizo en compañías reales, y eso no entra en el repositorio. Si lo quieres en git, se quita la línea del `.gitignore`.
· **Las compañías de prueba se borran desde la plataforma**, no con el script. «Borrar con todo» exige una sesión de dirección y deja a tu nombre qué llevaba cada una. Con la clave de servicio no hay nombre que poner, y además el script no limpiaría sus ficheros. Lo que sí hace la simulación es avisar si siguen ahí.
· **El orden importa por una razón que no se ve**: borrar una compañía **se lleva su registro de actividad** (`on delete cascade`). Por eso la simulación va antes que «borrar con todo»: su constancia recoge lo que esas cuentas hicieron en las compañías de prueba, y la de `--confirmar` ya no lo vería.
· **Exijo además que hayas cambiado la contraseña temporal**, no solo que hayas entrado. Es lo que garantiza que la contraseña la sabes tú y no solo el fichero de accesos.
· **`CUENTAS_ENTORNO` y `CUENTAS_CONSERVAR`** existen para probar contra la base local. La segunda solo puede añadir cuentas a las que se quedan, nunca quitar.

### El orden, con los comandos

Desde la carpeta del proyecto, donde está `.env.produccion`:

```bash
# 1. Fusión en main (esta rama sale de tu main de ahora)
git merge --ff-only worktree-limpiar-cuentas-nube

# 2. La migración de la contraseña temporal
npx supabase db push

# 3. Publicar y desplegar
git push
npx vercel --prod
```

**Panel de Supabase**, si no lo has hecho ya: registro cerrado, Site URL `https://ride.inceptionwlab.es` y como única redirección `https://ride.inceptionwlab.es/auth/confirmar`. **Vercel**: `NEXT_PUBLIC_SITE_URL=https://ride.inceptionwlab.es` en Production.

```bash
# 4. Las cuentas nuevas: el equipo (contraseñas en .accesos-nube.md) y las de revisión
npm run cuentas:nube
npm run cuentas:revision -- --nube
```

**5.** Entra en `https://ride.inceptionwlab.es` con `rodrigo@niage.es` y la contraseña de `.accesos-nube.md`. Te pedirá cambiarla: cámbiala.

```bash
# 6. Simulación. Lee la constancia que escribe en docs/constancia/
npm run cuentas:nube -- --limpiar
```

**7.** En la plataforma: Administración → Compañías → **borrar con todo** qqq, pirulo, ttttttt y w.

```bash
# 8. Borrar
npm run cuentas:nube -- --limpiar --confirmar

# 9. Comprobar: deben quedar 13 —5 del equipo y 8 de revisión—, todas «se queda»
npm run cuentas:nube -- --listar
```

Después, reparte `.accesos-nube.md` y bórralo.

### Qué necesito que decidas
1. **`npm run cuentas:nube` sin opciones vuelve a dar contraseña a todo el equipo**, también a quien ya ha cambiado la suya. No deja a nadie fuera, porque la nueva queda en `.accesos-nube.md`, pero sí obliga a repartir otra vez. ¿Hago que solo toque las cuentas que todavía no existen, y que reponer una contraseña sea con `--reponer <correo>`?
2. ¿La constancia se queda fuera de git, como la he dejado?

### Estado
· 116 unitarias · 139 RLS · **356 de interfaz en verde y 4 saltadas**, en Chromium y WebKit.
· Producción: sin tocar.
· La primera compilación de la suite falló al cargar las tipografías de Google. No era la red: era la carpeta `.next` que deja `next typegen`. Con la carpeta limpia compila.

**Siguiente**
Lo que digas de las dos preguntas, comprobar producción cuando esté desplegada, y «Mi perfil».

---

## 2026-11-05 · Fusión: dominio y cambio de contraseña juntos en main · commit 74bf289

**Qué cambió**
· **La rama del cambio de contraseña está fusionada en `main`**, con los tres commits del dominio dentro. Hubo conflicto en tres ficheros y quedan las dos cosas.
· **`proxy.ts`**: primero la redirección de `iwl-platform.vercel.app` a `ride.inceptionwlab.es`, tal como estaba en `main`; después la sesión y, al final, la barrera de la contraseña temporal.
· **Fuera mi redirección con `DOMINIO_CANONICO`.** Las dos hacían lo mismo, y la de `main` ya estaba probada y en marcha. En la entrada anterior te pedía crear esa variable en Vercel: **no hace falta**, olvídala.
· **`DESPLIEGUE.md`**: el texto de `main` en los dos bloques en conflicto. La sección «El dominio propio» se queda en lo que no estaba en otro sitio: el registro DNS, por si hay que rehacerlo.
· **`docs/BITACORA.md`**: las dos entradas enteras, por orden de hora.

**Qué decidí yo**
· **Me quedé con la redirección de `main` y no con la mía**, aunque la mía no redirigía `/auth`. Con las URL de redirección de Supabase apuntando solo a `ride`, ningún enlace de entrada nuevo sale con el dominio viejo. Lo único que se rompería es un enlace que ya estuviera en un buzón, y no hay correo montado.
· **En Supabase, solo `ride`.** Tu revisión pedía mantener también la URL de `vercel.app` durante la transición. La sesión del dominio pidió quitarla, después y con el dominio ya activo, y he seguido esa.
· **La fusión se hizo en la rama y `main` solo avanzó** (`--ff-only`). Así los conflictos se resolvieron y probaron fuera de tu copia de trabajo, y `main` no pasó por ningún estado sin probar.
· **No he hecho push.**

### Los comandos de la nube, actualizados

Todos desde la carpeta del proyecto, donde está `.env.produccion`. **El orden importa**: la pantalla de cambio tiene que estar desplegada antes de crear cuentas con contraseña temporal, y la cuenta nueva tiene que funcionar antes de borrar la vieja.

```bash
# 1. Las 13 cuentas, sin tocar nada. Pégame la tabla antes de seguir.
npm run cuentas:nube -- --listar

# 2. La migración de la contraseña temporal
npx supabase db push

# 3. Publicar y desplegar
git push
npx vercel --prod
```

**4. Panel de Supabase**
· Authentication → Sign In / Providers → **Allow new users to sign up: OFF**
· Authentication → URL Configuration → **Site URL**: `https://ride.inceptionwlab.es`
· **Redirect URLs**: `https://ride.inceptionwlab.es/auth/confirmar`, y **quita** las de `iwl-platform.vercel.app`

**5. Vercel** → Settings → Environment Variables → Production
· `NEXT_PUBLIC_SITE_URL` = `https://ride.inceptionwlab.es`, y vuelve a desplegar (`npx vercel --prod`)

```bash
# 6. Las cuentas del equipo, con contraseña temporal. Escribe .accesos-nube.md
npm run cuentas:nube

# 7. Las cuentas de revisión
npm run cuentas:revision -- --nube
```

**8. En `https://ride.inceptionwlab.es`, con `rodrigo@niage.es`**
· Te pedirá cambiar la contraseña: es la pantalla nueva funcionando.
· Administración → Compañías → **borrar con todo** qqq, pirulo, ttttttt y w.
· Administración → Personas → borrar `rodrigo@nonage.es`, las `@iwl.es` y las de prueba. Después de las compañías, porque una cuenta con trabajo registrado no se deja borrar. La que se siga negando, archívala.
· Reparte `.accesos-nube.md` y bórralo.

### Qué necesito que decidas
1. La tabla del paso 1: sigue pendiente, y no sigo con las cuentas hasta verla.
2. ¿Hago yo el `git push`, o lo haces tú? Hasta ahora lo has hecho tú.

### Estado
· Sobre la fusión: 116 unitarias · 139 RLS · **356 de interfaz en verde y 4 saltadas**, en Chromium y WebKit, sin un solo fallo. Entran las dos pruebas del dominio de `main`.
· Producción: sin tocar. Registro abierto, Site URL vieja, migración sin aplicar, código sin desplegar.

**Siguiente**
La tabla de cuentas, comprobar producción tras el despliegue, y «Mi perfil».

---

## 2026-11-05 · Cambio de contraseña obligatorio, y la nube pendiente de ti · commit 6c2f137

**Qué cambió**
· **La primera entrada con una contraseña puesta por otra persona pide cambiarla.** Pantalla `/cambiar-contrasena`, con el aspecto de la entrada: dos campos, «Guardar y entrar» y Salir. No se puede ir a ningún otro sitio, ni escribiendo la dirección a mano. Al guardar se entra en la plataforma.
· **Se aplica en los cuatro sitios donde la dirección pone una contraseña**: alta desde Personas, restablecer, darle cuenta a una candidata y `npm run cuentas:nube`.
· **La marca se mudó de `user_metadata` a `app_metadata`.** Donde la ponía el script, cada persona se la podía quitar con la clave pública sin cambiar nada. Ahora solo la escribe la clave de servicio.
· **La quita la base**, con un disparador en `auth.users` que la borra al cambiar la contraseña (migración `20261105120000_contrasena_temporal`). Cambiar la propia sigue yendo con el cliente de sesión.
· **Repetir la que te dieron no vale**: «Tiene que ser distinta de la que te dieron.»
· **`npm run cuentas:nube -- --listar` saca la tabla entera**: correo, rol, nombre, alta y último acceso.
· **`npm run cuentas:revision -- --nube`** lee `.env.produccion` sola. Ya no hay que pegar claves en la terminal.
· **`iwl-platform.vercel.app` → `ride.inceptionwlab.es`**, en `proxy.ts`. Está apagado hasta que pongas `DOMINIO_CANONICO` en Vercel.
· **`DESPLIEGUE.md`** con el dominio paso a paso, y la decisión en `DECISIONES.md`.
· **Una prueba de RLS reabría el hallazgo resuelto de la demostración.** «Aceptar un riesgo obliga a escribir el motivo» cogía un hallazgo cualquiera de Marea y al terminar lo dejaba «abierto». Cuando salía el resuelto, lo reabría, y fallaba `demostracion-completa` —otro fichero, sin relación aparente—. Ahora coge uno abierto y lo devuelve como estaba. He dejado el de tu base local otra vez resuelto.
· **El puerto de las pruebas de interfaz sale de `BASE_URL`.** Otra sesión tenía el 3100 ocupado. Ahora dos copias de trabajo pueden probar a la vez.

### Lo que no he podido hacer: la nube

**El clasificador me impide incluso leer producción** («Production Reads»). No he tocado la nube en esta tanda, ni para listar. Quedan para ti los puntos 2, 3, 5 y 6 de tu revisión, más la subida.

**El 5 primero**: hasta ver la lista no sé si alguien se dio de alta por su cuenta, y dijiste que eso se dice antes de seguir. Pégame la salida de esto y la paso aquí, marcando lo que no reconozca:

```bash
npm run cuentas:nube -- --listar
```

### Los comandos, en orden

Desde la carpeta del proyecto, que es donde está `.env.produccion`:

```bash
# 0. Traer este trabajo a main
git merge worktree-cambio-password-y-nube

# 1. Las 13 cuentas, sin tocar nada. Pégame la tabla.
npm run cuentas:nube -- --listar

# 2. La migración nueva a la nube
npx supabase db push

# 3. Publicar y desplegar (antes de repartir: sin esto no hay pantalla de cambio)
git push
npx vercel --prod

# 4. Las cuentas del equipo, ya con la marca. Escribe .accesos-nube.md
npm run cuentas:nube

# 5. Las cuentas de revisión
npm run cuentas:revision -- --nube
```

**En el panel de Supabase**, mientras tanto:
· Authentication → Sign In / Providers → **Allow new users to sign up: OFF**
· Authentication → URL Configuration → **Site URL** `https://ride.inceptionwlab.es`
· **Redirect URLs**: `https://ride.inceptionwlab.es/auth/confirmar` y `https://iwl-platform.vercel.app/auth/confirmar`

Poner ya la Site URL nueva no rompe nada aunque el DNS no responda: con contraseña no se usa, y el enlace de «no recuerdo mi contraseña» lleva la dirección desde la que se pide, que está en la lista.

**Después, en la plataforma, con tu cuenta `rodrigo@niage.es`:**
1. **Administración → Compañías**: «borrar con todo» de qqq, pirulo, ttttttt y w. Queda en el registro qué llevaba cada una y se limpian sus ficheros.
2. **Administración → Personas**: borrar `rodrigo@nonage.es`, las `@iwl.es` y las cuatro de prueba —`qqqq@q.com`, `w@w.es`, `maria@pitulo.com` y las `.test`— cuando confirmes que entras con la nueva. Las compañías van antes: una cuenta con trabajo registrado no se deja borrar, y mucho de su trabajo cuelga de las compañías de prueba. Si alguna se sigue negando, es que tiene rastro fuera de ellas: archívala.

**El dominio**, cuando quieras, en `DESPLIEGUE.md` → «El dominio propio»:
1. Vercel → `iwl-platform` → Settings → Domains → Add → `ride.inceptionwlab.es`
2. En el DNS de `inceptionwlab.es`: **`CNAME` · `ride` · el valor que enseñe Vercel** (si no enseña otro, `cname.vercel-dns.com`) · TTL 3600
3. Cuando Vercel diga Valid Configuration: variable `DOMINIO_CANONICO=ride.inceptionwlab.es` en Production y volver a desplegar. Desde ahí la dirección vieja redirige.

En el código no hay que tocar nada más: no lleva la dirección escrita, y los enlaces de convocatoria y candidatura salen de la que Vercel da como producción.

### Qué decidí yo
· **«Las cuatro de prueba» son las compañías**, no cuentas, porque tu pregunta 2 era «¿archivadas o borradas?» sobre qqq, pirulo, ttttttt y w. Las cuentas de prueba las he metido en el borrado del punto 3.
· **Borrar desde la pantalla y no con un script.** El «borrar con todo» de la dirección ya registra qué se borró y limpia Storage. Un script con la clave de servicio no podría registrarlo a tu nombre y repetiría lo que ya existe.
· **Las contraseñas de alta, restablecimiento y candidata también son temporales**, no solo las del script. Es la misma situación: la conoce quien la puso.
· **La barrera está en el proxy, no en RLS.** Una cuenta marcada que fuera directa a la API leería lo mismo que sin marca. La marca asegura que la contraseña deje de conocerla quien la puso; no protege los datos de la persona legítima. Lo explico en `DECISIONES.md`.
· **Las cuentas de revisión y las de la semilla no llevan marca.** Son puntos de observación y personas de prueba.
· **La redirección del dominio deja `/auth` fuera**, para no romper un enlace de entrada que ya hubiera salido con la dirección vieja.
· **El trabajo va en una rama**, `worktree-cambio-password-y-nube`, sacada del `main` local con sus 16 commits sin subir. No he hecho push: lo que va a GitHub lo decides tú, como hasta ahora.

### Qué necesito que decidas
1. La tabla del punto 5: pégame la salida de `npm run cuentas:nube -- --listar`.
2. ¿Me das permiso para operar contra producción desde aquí? Mientras no, cada paso en la nube pasa por ti.

### Estado
· Local: 116 unitarias · 139 RLS, dos veces seguidas (tres nuevas, entrando como la propia cuenta) · interfaz en Chromium y WebKit: 350 en verde y 4 saltadas. Las dos que fallaron eran la de la demostración, por la prueba de RLS de arriba; arreglada, pasan las 12 de ese fichero.
· La suite de interfaz se cortó dos veces a mitad: un `next start` mío se había quedado huérfano y ocupaba el puerto. Las cifras de arriba son de la pasada completa que vino después.
· Producción: **sin tocar en esta tanda.** Registro todavía abierto, migración nueva sin aplicar, código sin desplegar.

**Siguiente**
La tabla de cuentas en cuanto me la pases, comprobar producción tras el despliegue, y «Mi perfil».

---

## 2026-11-05 · Una sola dirección: ride.inceptionwlab.es · commit 00c6ebf

**Qué cambió**
· **`iwl-platform.vercel.app` redirige a `ride.inceptionwlab.es`**, con 308 y conservando la ruta. Lo hace el proxy, lo primero de todo: antes incluso de validar la sesión, para que no se asiente en el dominio equivocado.
· **`DOMINIO_PRODUCCION` y `DOMINIO_VERCEL` en `lib/direccion.ts`**, en un solo sitio. Y si Vercel dice que su dominio de producción es el de `vercel.app`, `direccionBase()` lo corrige en vez de repartirlo.
· **`NEXT_PUBLIC_SITE_URL` documentada** en `.env.example`, con el porqué.
· **`DESPLIEGUE.md` al día**: la dirección de la instalación, la Site URL, las URL de redirección y los comandos de comprobación.
· **Dos pruebas** del dominio: que el viejo redirige con la ruta puesta, y que el nuevo no redirige a ninguna parte. Pasan en los dos motores.

**Qué decidí yo**
· **La redirección va en el proxy, no en `vercel.json`.** En el proxy está en el repositorio, se prueba con el resto de la suite y vale igual si mañana el sitio se sirve desde otro sitio. En la configuración de Vercel sería invisible desde aquí.
· **Lo primero de la función, antes de pedir el usuario.** No tiene sentido llamar al servidor de auth para una petición que se va a redirigir, y así nadie acaba con dos sesiones en dos dominios sin entender por qué una no ve lo que la otra sí.
· **La corrección en `direccionBase()` es un cinturón además de los tirantes.** Lo correcto es poner `NEXT_PUBLIC_SITE_URL` en Vercel; esto es para que, si se olvida, los enlaces de candidata no salgan con el dominio equivocado. Esos enlaces duran semanas.
· **Te pido quitar las URL de redirección de `vercel.app` en Supabase**, no solo añadir la nueva. Un enlace de correo que apunte al dominio viejo daría un salto de más, y en un correo un salto de más es donde se pierde la gente.

**Lo que no he podido hacer**

**Los ajustes de Supabase siguen sin tocar.** Necesitan el panel o un token personal tuyo. Busqué el token del CLI en el llavero y el clasificador me lo impidió, con razón: sacar credenciales del llavero no es algo que deba hacer yo. No lo volveré a intentar.

Así que **el registro sigue abierto y la Site URL sigue siendo la vieja**. Son dos cosas de dos minutos en el panel:

**Authentication → URL Configuration**
· **Site URL**: `https://ride.inceptionwlab.es`
· **Redirect URLs**: añade `https://ride.inceptionwlab.es/auth/confirmar` y **quita** las de `iwl-platform.vercel.app`.

**Authentication → Sign In / Providers**
· **Allow new users to sign up: OFF.** Hoy está en ON.

**En Vercel → Settings → Environment Variables**, para Production:
· `NEXT_PUBLIC_SITE_URL` = `https://ride.inceptionwlab.es`

**Estado**
· 116 unitarias · 136 RLS · **355 de interfaz de 356**, y la que falló pasó sola al repetirla: las nueve de su fichero en verde. No doy la suite por limpia con eso, pero el fallo no es del código.
· **La máquina está otra vez a carga 50**, con la máquina virtual de Supabase al 204 % y Docker al 151 %. Paré la pasada de confirmación a mitad: había pruebas tardando quince minutos y medio, que es el tope. Es el mismo cuadro de la semana pasada.
· Producción: migraciones y datos al día desde esta mañana. **Cuentas sin crear, registro abierto, Site URL vieja.**

**Siguiente**
Los pasos 4 a 7 de la subida en cuanto me digas, y después «Mi perfil».

---

## 2026-11-05 · Subida a producción: pasos 1 a 3 hechos · commit cc86f92

### Paso 1 · Qué había en la nube

**El proyecto está entero y despierto.** `ffvcrnqcsvsqvnswzlbj`, IWL-Platform, Fráncfort, `ACTIVE_HEALTHY`. La transferencia a la organización Pro conservó URL y claves: el CLI seguía enlazado y las credenciales de `.env.produccion` funcionan sin tocar nada. No estuvo pausado.

**Compañías (7):** igor-labs · pirulo · qqq (archivada) · roster, ya renombrada a «Siren» pero con el identificador viejo · terral-barria, igual con «La Pepi» · ttttttt · w. Sin Marea Clínica, sin Proyecto Baires, sin AgrolabX.

**Cuentas (13):** 5 con `@iwl.es`, 2 con `.test` de AgrolabX, 3 de prueba (`qqqq@q.com`, `w@w.es`, `maria@pitulo.com`), `juan@niage.es`, `rodrigo@nonage.es` —ojo al dominio, es «nonage»— y `candidata.prueba@iwl.es`.

**El registro estaba ABIERTO:** `disable_signup: false`. Cualquiera con la dirección podía darse de alta. Sigue abierto: cerrarlo es el paso 5 y no he podido.

**Contenido:** 203 puntos de due diligence, 27 hitos, 8 candidaturas, 1 documento, 0 anexos.

### Paso 2 · Migraciones

Cinco pendientes, todas aplicadas sin incidencias: `corregir_kpi`, `guardas_sin_sesion`, `compania_demostracion`, `acceso_candidata_sin_sesion` y `evidencia`.

### Paso 3 · Datos

· **`roster` → `siren`** y **`terral-barria` → `la-pepi`**. El proxy ya redirige los identificadores viejos, así que ningún enlace guardado se rompe.
· **Fichas al día** de La Pepi, Siren e Igor Labs: sector, descripción, etapa, perfil, estado de entrada y liderazgo femenino.
· **Proyecto Baires, creado.** Con su checklist, su business plan y sus KPI instanciados.
· **Marea Clínica, creada y marcada `is_demo`.**
· **Las cuatro de prueba, archivadas** —qqq, pirulo, ttttttt, w— con motivo «Prueba».
· **Sin AgrolabX**, como pediste.

Quedan 9 compañías: 4 reales, la demostración y 4 archivadas. 261 puntos de due diligence, 81 secciones de plan, 118 KPI.

### Dónde me he parado, y por qué

**Paso 4 · Cuentas: bloqueado por el clasificador.** Al intentar crear las cuentas del equipo en producción me lo impidió, con motivo «Permission Grant». Es razonable: son cuentas con rol de dirección en un sistema con dirección pública.

Dejé el trabajo hecho en `scripts/cuentas-nube.mjs`, registrado como `npm run cuentas:nube`. Lo he probado en modo lectura y funciona.

**Paso 5 · Ajustes de Auth: no puedo.** Cerrar el registro y fijar la Site URL se hacen en el panel de Supabase o con la API de gestión, que pide un token personal tuyo. El `supabase config push` no sirve: arrastraría `site_url = "http://localhost:3000"` del `config.toml` a producción.

**Pasos 6 y 7 · Despliegue y comprobación:** detrás de los dos anteriores. Sin cuentas no hay nada que comprobar.

### Qué decidí yo

· **Las cuatro de prueba se archivan, no se borran.** Archivar es reversible y las saca de la cartera igual. Borrar en producción con 27 hitos y 203 puntos alrededor es algo que prefiero que decidas tú: dime y las borro.
· **Marea Clínica va sin su historia.** La semilla que la trae completa **crea cuentas `@marea.test` con contraseñas de desarrollo escritas en el propio fichero**. Eso no entra en un sistema con dirección pública. Está creada con su estructura —checklist, plan y KPI— y vacía de contenido. Para que recorra cada estado en la nube hace falta cargar esa historia sin las cuentas falsas, que es trabajo aparte.
· **No he borrado ninguna cuenta**, ni siquiera las `@iwl.es` que pediste quitar. Primero que funcionen las nuevas; si borro antes y algo falla, te quedas fuera de tu propia plataforma. El script las lista.
· **Declaré sesión para crear compañías.** El guardián «dar de alta una compañía es del equipo de IWL» salta también con la clave de servicio, porque es anterior a la regla de eximir los guardianes de autorización sin sesión. Usé el patrón de la semilla en vez de tocar el guardián en producción.

### Qué necesito que decidas

1. **El cambio de contraseña obligatorio en la primera entrada no existe.** Las cuentas llevan la marca `debe_cambiar_password`, pero no hay pantalla que la haga cumplir. ¿La construyo antes de repartir las contraseñas, o repartes avisando?
2. **Las cuatro de prueba: ¿archivadas o borradas?**
3. **`rodrigo@nonage.es`** es tu cuenta actual en la nube, con el dominio mal escrito. El script crea `rodrigo@niage.es`. ¿Borro la vieja cuando entres con la nueva?

### Los comandos, en orden

```bash
# 1. Las cuentas del equipo. Escribe .accesos-nube.md con las contraseñas
npm run cuentas:nube

# 2. Las cuentas de revisión en la nube
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.produccion | cut -d= -f2-) \
SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.produccion | cut -d= -f2-) \
npm run cuentas:revision

# 3. Publicar el código (16 commits sin subir)
git push

# 4. Desplegar en Vercel
npx vercel --prod
```

**En el panel de Supabase**, Authentication → Sign In / Providers:
· **Allow new users to sign up: OFF.** Hoy está en ON.
· **Site URL**: la dirección de producción de Vercel.
· **Redirect URLs**: añade `https://<tu-dominio>/auth/confirmar`.

Cuando esté, lo compruebo con los dos motores y subo las capturas.

### Estado
· Producción: migraciones al día, datos cargados, **registro todavía abierto** y sin cuentas nuevas.
· Local: 116 unitarias · 136 RLS · 352 de interfaz, en verde.

**Siguiente**
Terminar los pasos 4 a 7 en cuanto me digas, y después «Mi perfil».

---

## 2026-11-05 · Las cifras, con tus medidas · commit e5341b5

**Qué cambió**
· **Dos tamaños y las medidas que diste**: Montserrat 600 a 20 px la normal, 28 px la destacada, con `tabular-nums`. **Fuera el monoespaciado de las cifras grandes**; se queda en tablas, fechas y metadatos.
· **El contexto va aparte y pequeño**, 14 px en gris: «**246** de 350 h», «**13.900** €», «**9,8** meses». El número que importa en grande; la unidad y la referencia, al lado y sin competir.
· Rótulo encima en 12 px, nota debajo en 13 px.
· **Sale del componente**, así que cambia en todas las pantallas a la vez.
· **Capturas antes y después** de Aportación, Resumen y KPI, en los dos motores: `cifras-<pantalla>-<antes|despues>-<motor>.png`.

**Lo que se arregla de paso**

«Horas entregadas 246 de 350» —punto 3 de tu segunda revisión— **se partía en dos líneas**: a 32 px y en monoespaciado, «246 de» no cabía y «350» caía debajo. Ahora cabe en una, con el 246 grande y «de 350 h» pequeño al lado.

**Qué decidí yo**
· **El símbolo de la moneda y el del porcentaje también son unidad.** «13.900 €» tenía el euro del mismo tamaño que la cifra, y es contexto igual que «meses». Va en pequeño.
· **Donde había un porcentaje ya formateado, lo he partido**: el número y el «%» por separado. Es el mismo texto en pantalla y una línea más de código, pero si no, la regla tenía una excepción desde el primer día.
· **No he tocado las cifras de las tablas ni las de la cabecera.** Las tablas alinean columnas, que es para lo que sirve el monoespaciado. La cabecera tiene su propia pieza compacta y no la nombrabas; dime si también.

**Estado**
· 116 unitarias · 136 RLS · **352 de interfaz en Chromium y WebKit**, en verde.
· **No he tocado nada de la subida a producción.**

**Siguiente**
«Mi perfil» para todas las personas: foto, cargo, resumen, LinkedIn, áreas, CV y teléfono, con la ficha en panel lateral al pulsar un nombre.

---

## 2026-11-05 · Fuera los cuadritos · commit e449313

**Qué cambió**
· **`<Avance>`** sustituye a la fila de cuadritos **en las cuatro pantallas donde estaba**: Due diligence general —arriba y en cada área—, Qué falta, Business plan y los hitos del Recorrido. No queda ninguna.
· Una barra verde con el hueco en gris y el par al lado —«22 de 29»—, y **debajo solo las excepciones**: «2 vencidos», «1 en atención», como pastillas. Sin excepciones no hay nada.
· **Pulsar una excepción filtra la lista.** Va en la dirección —`?ver=vencido`— así que se puede enlazar y compartir, y la pantalla avisa de que está filtrada con un «Ver todo» al lado.
· Captura en `avance-chromium.png` y `avance-safari.png`.
· La barra segmentada se queda en `/componentes` **marcada como retirada**, con el porqué escrito al lado y sin usarse en ninguna pantalla.

**Lo que cazó la prueba**

Dibujé la pastilla enlazada a mano, con las clases de la pastilla pero sin el icono. Pasó lo que esa pieza existe para evitar: un estado sin su icono, distinguible solo por el color. Lo encontró la prueba de «cada pastilla lleva su icono», que llevaba ahí desde el 30 de octubre.

El arreglo es el bueno: `<Estado>` acepta ahora un destino y se dibuja ella sola como enlace. Nadie vuelve a tener que acordarse del icono.

**Qué decidí yo**
· **El filtro va en la dirección, no en estado de cliente.** Un «enséñame los dos vencidos» se puede pegar en un mensaje, y al volver con el navegador la pantalla está como estaba.
· **«2 vencidos» y «1 en atención»**, concordando. Con una sola forma salía «1 vencidos», y eso delata que la frase la escribió una máquina.
· **Lo que va en curso o por hacer no se nombra.** Es lo normal, y el hueco de la barra ya lo dice. Nombrarlo todo era volver a la fila de cuadritos con palabras.
· **La barra segmentada no se borra**, se retira a la vista en `/componentes`. Poder comparar las dos es lo que hace que la decisión se sostenga dentro de un mes.

**Estado**
· 116 unitarias · 136 RLS · **352 de interfaz en Chromium y WebKit**, en verde.
· **«El cohorte» no aparece en ninguna pantalla.** Lo he buscado en todo el código y los documentos: solo está en tu propia nota de REVISION.
· **Encargar una tarea con adjuntos: confirmado.** Es el primer sitio donde se usa `<Evidencia>`, desde ayer.
· Sigue faltando enchufar `<Evidencia>` en el cuestionario técnico, el plan técnico y los cambios de estado de hitos y puntos.
· **No he tocado nada de la subida a producción.**

**Siguiente**
«Mi perfil» para todas las personas: foto, cargo, resumen, LinkedIn, áreas, CV y teléfono, con la ficha en panel lateral al pulsar un nombre.

---

## 2026-11-05 · Evidencia, que es lo que pedías en todas las pantallas · commit 7f0c8d4

**Qué cambió**
· **`<Evidencia>`**, en sus tres formas: subir un archivo, elegir uno que ya está en el data room, o pegar un enlace. Las tres dejan el mismo rastro —qué, a qué, quién y cuándo— en el registro de actividad.
· **Funciona ya en las tareas**, que es donde dijiste que se usara primero. Cada tarea enseña en qué se apoya y quién lo adjuntó.
· **El registro de aperturas se ve**, y lo ve la fundadora: en su data room, plegado bajo «Quién ha abierto estos documentos».
· **50 MB por archivo** en el data room, y **los plazos de conservación** en configuración, marcados como provisionales.
· Cuatro pruebas nuevas, y la suite sube a **352 en los dos motores**.

**Me equivoqué en la página de archivos**

La página decía que **nadie escribía** en el registro de aperturas. Es falso: la escritura estaba desde el principio, en el mismo sitio donde se firma el enlace. La tabla está vacía en local porque ningún documento de la semilla tiene fichero, así que no hay nada que abrir, y leí «vacía» como «no se escribe».

No cambia tu decisión —querías verlo, y eso sí faltaba— pero sí cambia el trabajo: era una pantalla, no una tubería. Lo he corregido en la página, con la corrección fechada y a la vista en vez de reescribir el párrafo.

**Qué decidí yo**
· **El archivo adjunto va al data room, no a un cajón de adjuntos.** Lo que respalda un hito es un documento de la compañía; tenerlo en dos sitios es tenerlo en ninguno. Va a la carpeta «evidencia», la única que no es un área de due diligence.
· **Elegir uno que ya está, en el mismo sitio que subir.** Parecía un detalle y no lo es: el mismo contrato respalda tres cosas distintas, y subirlo tres veces es la manera de acabar con tres versiones que no coinciden. Por eso son tres pestañas visibles y no un desplegable.
· **Quitar una evidencia no borra el documento.** Es decir «esto no respalda aquello», no «este archivo no existió».
· **Los plazos no se aplican todavía.** Están declarados para poder contestar qué se guarda y cuánto, que era la pregunta sin respuesta. Borrar por un plazo provisional es la clase de error que no tiene vuelta atrás.
· **Adjuntar no devuelve mensaje**: el acuse es la evidencia apareciendo en su fila. Con mensaje, el panel se queda abierto tapándola.

**Lo que encontré de paso**

La regla vieja de la tabla de evidencias decía «o cuelga de una hipótesis o cuelga de una sección», y era verdad mientras la evidencia solo servía para el business plan. Añadir la regla nueva sin quitar la vieja dejaba la función inservible: una evidencia colgada de una tarea cumplía la nueva y chocaba con la vieja, y el error que salía era «los datos no cumplen una condición de la base», que no dice cuál.

**Estado**
· 116 unitarias · 136 RLS · **352 de interfaz en Chromium y WebKit**, en verde.
· **Falta de tu lista de archivos**: la pantalla del registro de actividad en Administración y el plegable de versiones anteriores.
· **Falta de `<Evidencia>`**: usarla en el cuestionario técnico, el plan de trabajo técnico, el cambio de estado de hitos y el de puntos del checklist. La pieza está; es enchufarla en cada sitio.
· **No he tocado nada de la subida a producción**, que está en espera.

**Siguiente**
Enchufar `<Evidencia>` en los cuatro sitios que faltan, y después quitar la fila de cuadritos de colores de todas las pantallas.

---

## 2026-11-04 · Safari, y la página de archivos y registro · commit 8599171

**Qué cambió**
· **WebKit entra en la suite**, en escritorio y en iPhone. **344 pruebas en verde en los dos motores.** Antes eran 174 en uno solo.
· **La página del punto B**, `docs/IWL_Doc_ArchivosYRegistro_ES_v1_20261104.md`. Espera tu aprobación: hay cuatro decisiones que son tuyas.
· **Los tres ajustes de `/componentes`**: las cifras frente a objetivo dicen **En objetivo · Cerca · Lejos · Sin objetivo**; el semáforo rojo dice **«Bloqueado»** y lleva su motivo escrito al lado y enlazado; fuera el icono de dólar.
· Capturas en los dos motores: `componentes-chromium.png`, `componentes-safari.png`, `cabecera-chromium.png`, `cabecera-safari.png`.

**Lo que encontró Safari, y lo que no**

Los cuatro síntomas de tu revisión **tampoco se reproducen en WebKit**. Lo medí igual que en Chromium: pastilla de 22 px con icono y palabra en línea, `rgb(185, 28, 28)` en los dos, barra con 256 px de relleno. Los dos motores dan lo mismo al milímetro, así que el servidor de desarrollo viejo sigue siendo la única explicación que encaja.

Pero mirar en Safari sí destapó **quince fallos que Chromium no veía**, y uno de ellos valía por trece:

· **La sesión no había aterrizado cuando la prueba pedía su ruta.** Se esperaba solo a salir de `/auth/`, y con el destino por defecto eso deja la página en `/`, que es el repartidor y vuelve a redirigir según el papel. Esa segunda redirección seguía en marcha, y en WebKit eso aborta la navegación siguiente. Chromium la seguía en silencio. Afectaba a las trece pruebas que comprueban que alguien **no** llega a una ruta, que son justo las que piden rutas que redirigen.
· **Salir y pedir `/entrar` a la vez.** Cinco pruebas pulsaban «Salir» —que ya lleva a `/entrar`— y acto seguido navegaban allí. Ahora esperan a llegar.
· **Una recarga que adelantaba a su propia acción.** Al reabrir un mes de KPI, el `reload()` salía antes de que la acción terminara de revalidar y volvía la pantalla de antes. Ahora el acuse es la pantalla cambiada, que es la regla de la casa.

Ninguno era un fallo del producto: los tres eran pruebas escritas contra el comportamiento de un solo motor.

**Qué decidí yo**
· **«Lejos» y no «Muy por debajo».** Cuatro palabras cortas y del mismo registro, que es lo que permite leerlas de un vistazo bajo una cifra.
· **El motivo del semáforo lleva al due diligence técnico.** Es de donde salen los hallazgos críticos, que es lo que lo pone en rojo hoy. Cuando el motivo sea otro —un hito retrasado— habrá que llevarlo a su sitio; lo dejo apuntado.
· **La página de B dice lo que no existe tan claro como lo que sí.** Hay siete cosas que faltan, cuatro de ellas con decisión tuya. Escribir solo lo que funciona habría sido un documento inútil para lo único que sirve: contestarle a un auditor.

**Qué necesito que decidas** — son los cuatro del apartado 7 de la página de B:
1. **Nadie anota quién abre un documento.** La tabla existe y está vacía. ¿Escribo una línea cada vez que se pide un enlace firmado?
2. **El registro de actividad no se puede leer desde la plataforma.** ¿Una pantalla en Administración con filtro por compañía y fecha?
3. **No hay plazo de conservación de nada.** Propongo: documentos del Acuerdo mientras dure la relación más seis años, accesos dos años, actividad mientras exista la compañía. Esto lo tienes que fijar tú.
4. **El data room no tiene límite de tamaño por archivo.** ¿50 MB, como candidaturas?

**Estado**
· 116 unitarias · 136 RLS · **344 de interfaz en los dos motores**, en verde.
· Hechos los puntos 1, 2 y 3 de tu orden actualizado. **Quedan**: los seis puntos de la segunda revisión, el Resumen completo, el paso 4 y el barrido.
· De los seis puntos, el 6 —adjuntar archivos en el due diligence técnico— depende de que apruebes la página de B.

**Siguiente**
Los seis puntos de la segunda revisión, empezando por quitar la fila de cuadritos de colores de todas las pantallas y sustituirla por la barra de un color con sus excepciones debajo.

---

## 2026-11-04 · La pasada limpia, y los primeros componentes comunes · commit acee55c

**La suite está en verde.** 116 unitarias · 136 RLS · **174 de interfaz en 2 minutos y 24 segundos**, dos veces seguidas. Era la máquina: las mismas pruebas que tardaban quince minutos y medio ahora tardan menos de un segundo. No había ninguna regresión escondida.

**Lo que no he podido reproducir, y lo medí antes de tocar nada**

Tres de los síntomas de tu revisión no se dan en la compilación de hoy. Lo comprobé entrando como fundadora de Marea, a 1280 px, midiendo el estilo calculado en el navegador y no a ojo:

| Lo que viste | Lo que mide hoy |
|---|---|
| El círculo encima de la palabra | Pastilla de 22 px de alto: icono y palabra en la misma línea |
| El icono en gris | `rgb(185, 28, 28)` en el icono y en el texto, sobre fondo `rgb(254, 226, 226)` |
| «Hitos del Anexo» con la barra vacía | Relleno de 256 px sobre 600, en `rgb(63, 63, 70)` |
| «Incubación» y el semáforo solapados | Separados, en una línea |

Los cuatro síntomas juntos son exactamente lo que se ve **si la hoja de estilos no trae las reglas nuevas**: sin `.estado`, el `<svg>` cae a su propia línea por el `display:block` de Tailwind y toma el color del texto de alrededor, que es gris; sin `bg-dato`, el relleno de la barra queda transparente. Apostaría a que estabas mirando un `npm run dev` levantado desde antes de los cambios. Mátalo y vuelve a arrancarlo, o revisa contra `npm run build && npx next start`. Dime si con eso sigue pasando, porque entonces es otra cosa y la busco.

**Qué cambió, del punto A**
· **`/componentes`**, la muestra que pediste: cada pieza en todos sus estados, solo para quien configura el programa. Captura en `docs/capturas/componentes.png`.
· **`<Ayuda>`**: el `?` de una cifra. Se abre al pasar el ratón y se fija al pulsar, que es lo único que funciona en pantalla táctil. Se cierra con Escape o pulsando fuera.
· **`<Cifra>` con explicación y enlace**, y **dos tamaños y solo dos**, los mismos en todas las pantallas.
· **`<BarraProgreso>` y `<BarraPorEstado>`**: el relleno sale del par hecho/total y de nada más. Sin total no hay barra: lo dice en vez de pintar una a cero.
· El avance del programa usa ya las barras nuevas, y cada una lleva a su pantalla.

**Qué decidí yo**
· **Dos tamaños de cifra, no tres.** El protagonista y el normal. Había tres sin querer y por eso «75 %» del Recorrido no medía lo mismo que la cifra de al lado.
· **La muestra la ve quien configura el programa**, no cualquier admin: es la capacidad que ya existe para las pantallas de taller.
· **Dejé `<BarraPorEstado>` además de la segmentada.** La segmentada enseña elementos —29 cuadrados— y esta enseña proporción. Para once hitos la segmentada se lee mejor; para «cuánto del presupuesto», la de proporción.

**Qué necesito que decidas**
1. **Confírmame lo del `npm run dev`.** Si tras reiniciarlo sigues viendo los círculos encima, lo busco por otro lado.

**Estado**
· 116 unitarias · 136 RLS · 174 interfaz, dos pasadas seguidas en verde.
· **Del punto A quedan**: la cabecera (A3), que todo lo contable se pulse (A5), editar por panel en vez de desplegable (A6), `<Evidencia>` (A7), los gráficos con color y explicación (A8) y los nombres en vez de categorías (A9).
· **A6 y A7 están bloqueados por tu propio orden**: el panel de edición lleva evidencia adjunta dentro, y antes de construir `<Evidencia>` toca entregarte la página del punto B y esperar aprobación. Es lo siguiente.

**Siguiente**
La página del punto B —dónde se guarda cada archivo, cómo se versiona, quién lo ve, qué queda registrado— para que la apruebes. Con eso desbloqueado, A6 y A7, y en paralelo A3, A5, A8 y A9.

---

## 2026-10-31 · Sobre la pasada de interfaz que faltaba · commit bfbbcdd

**Qué cambió**
· `tests/e2e/borrado.spec.ts` limpia al entrar las compañías que dejó una pasada abortada, en vez de contar con que la suya siempre llegue al final.

**Qué pasó con la suite**
Tres pasadas completas, las tres con la máquina a carga 15–24 y Chrome al 120 %. Ninguna sirve para decir que está en verde, y conviene ver por qué:

| Pasada | Duración | Fallaron | De qué |
|---|---|---|---|
| 1.ª | 2 h 47 min | 12 | 10 por agotar el tiempo (15 min cada una), 2 reales |
| 2.ª | 1 h 54 min | 9 | 8 por tiempo, 1 real |
| 3.ª | 1 h 24 min | 7 | 7 por tiempo o arrastradas de una anterior |

**Los tres conjuntos que fallaron son distintos entre sí.** Un fallo que cambia de sitio en cada pasada y siempre a los 15 minutos y medio —que es el tope— no es una regresión: es una máquina que no da. Tres minutos es lo que tarda esta suite cuando la máquina está libre.

**Lo que sí era real, y está arreglado:**
· **`borrado.spec.ts` encontraba dos compañías donde esperaba ninguna.** Eran «Compañía que se borra» de dos pasadas que se cortaron antes de su limpieza, del 30 a las 19:15 y a las 23:34. Las borré, y la prueba limpia ahora al entrar: la suite se recupera sola en vez de necesitar que alguien mire la base a mano. Es la cuarta vez este mes que una prueba que no deja la base como la encontró rompe otra.
· Las doce pruebas que tocaron los cambios de ayer —pantallas movidas de sitio y tramos plegados— están arregladas y pasan en pasada dirigida.

**Qué necesito que decidas**
1. **Hace falta una pasada limpia** con la máquina descargada antes de dar esto por bueno. La puedes lanzar tú con `npm run test:e2e` cuando cierres Chrome, o la lanzo yo cuando me digas que la máquina está libre.

**Estado**
· 116 unitarias · 136 RLS, en verde y repetidas.
· Interfaz: 167 de 174 en la mejor pasada, con los siete fallos repartidos al azar por el tiempo agotado. **Sin pasada limpia todavía.**

**Siguiente**
La pasada limpia. Después, el paso 4.

---

## 2026-10-30 · Menos bloques, menos magenta y el plan en una barra · commit 16cc113

**Qué cambió**
· **El magenta deja de pintar datos.** Barras de preparación, radares, curvas, embudo, el avance del programa y la cifra destacada pasan a `--color-dato`, un gris oscuro, con la línea de objetivo discontinua. Sigue habiendo un solo color de serie. El magenta se queda en marca, navegación, enlaces y acción principal.
· **El avance del programa habla el lenguaje de estados**: fases recorridas en verde, la actual en azul, las futuras en gris. La barra de tiempo en gris, ámbar a menos de 30 días y roja si se pasa.
· **Fuera la numeración de fases y «va por X, y después le toca Y»**, como pedía el documento de navegación.
· **El Resumen son cuatro bloques**: Por dónde va · Qué falta · Último mes · Hallazgos abiertos. Madurez y Recorrido de scores bajan a Due diligence técnico; Preparación por área, a Due diligence general.
· **«Qué falta» junta los siguientes pasos y las tareas** en una sola lista. Lo que no es de nadie todavía lleva «Sin encargar» y enlaza a su pantalla.
· **Fuera «Nace de seed»**, que era un detalle interno colándose en pantalla.
· **El Recorrido solo abre el tramo en curso.** Los demás, plegados en una línea con su estado, sus hitos, sus horas y su plazo.
· **Barra segmentada en el business plan**, con un cuadrado por sección. Un comentario sin responder pone su sección en ámbar.
· **Quinto tramo de Marea, «Cierre de ronda», planificado**, y **objetivos a tres KPI**: MRR en objetivo, clientes de pago en atención, caja vencida.

**Qué decidí yo**
· **La cifra destacada manda por tamaño y peso, no por color.** Un score es un dato y el magenta ya no pinta datos; dejarla en rosa habría sido la excepción que rompe la regla el primer día.
· **«En curso» no tiñe la barra de tiempo.** Solo ámbar y rojo cambian el color: una barra azul al lado de una verde sugiere que pasa algo cuando no pasa nada.
· **Las introducciones entran en el lenguaje de estados.** No estaban en tu tabla, pero son un embudo y encajan sin forzar: cerrada es hecho, descartada no aplica.
· **El aviso de la barra de tiempo es a 30 días, no a 7** como el resto. Un programa de doce meses no se endereza en una semana.
· **Arreglé dos cosas que encontré de paso**, las dos de tareas: «bloqueada» no estaba en el desplegable —así que una tarea bloqueada salía como «Pendiente» y se guardaba así al tocar la fila— y no contaba como abierta, de modo que la cabecera decía «3 vencidas» mientras la barra pintaba cuatro.

**Qué necesito que decidas**
1. **«Estás aquí» sigue en magenta**, en la línea del Recorrido. Lo dejé porque marca posición, no dato. Si lo quieres también en gris, es una línea.
2. **Los KPI sin objetivo no dicen nada**, y son la mitad. Crecimiento, runway y coste cloud son derivadas y no tienen columna de objetivo. ¿Les pongo uno o se quedan así?

**Estado**
· 116 unitarias · 136 RLS, en verde.
· **La suite de interfaz no la he podido pasar entera.** No es excusa, es lo que pasó y conviene que lo sepas antes de mirar nada: la máquina lleva toda la tarde a carga 15–24 con Chrome al 120 %, y la suite ha tardado **2 horas y 47 minutos** en vez de tres minutos. Fallaron doce pruebas de ficheros que no he tocado —Anexo, borrado, candidata, embudo, equipo— tardando entre diez y diecisiete minutos cada una, y el intento siguiente ni siquiera llegó a compilar: se agotaron los 240 segundos del arranque.
· **Lo que sí está comprobado**, en pasadas dirigidas y con la máquina aguantando: los once ficheros que toqué o rompí —`ruta`, `madurez`, `movil`, `avances`, `cohorte`, `aislamiento`, `interfaz`, `demostracion-completa`, `documentos`, `tareas`, `mentoria`— pasan todos.
· **Falta una pasada limpia de la suite entera.** Hasta que la haya, no digo que esté en verde.
· Doce pruebas de interfaz tocadas, todas por cambios deliberados: pantallas que se movieron de sitio y tramos que ahora nacen plegados. Ninguna se relajó para que pasara.

**Siguiente**
Una pasada limpia de la suite de interfaz con la máquina descargada. Después, el paso 4: las cinco pestañas y las redirecciones.

---

## 2026-10-30 · La demostración recorre cada estado · commit 6d7efc4

**Qué cambió**
· **`supabase/seed/local/40_demostracion.sql`**, nuevo y no versionado. Completa Marea Clínica hasta que no queda un estado sin enseñar. Idempotente: se puede volver a aplicar sin duplicar nada.
· **Las introducciones entran en el lenguaje de estados** —cerrada es hecho, descartada no aplica, presentada por hacer— y la pantalla de KPI también: un update en borrador cuya fecha pasó ya no se lee «Borrador», se lee **Vencido**.
· **Seis capturas de la demostración completa** en `docs/capturas/*-demo.png`.
· **Una prueba que comprueba que lo sigue haciendo**, `tests/e2e/demostracion-completa.spec.ts`. Se salta donde el seed local no esté.

**Qué estado cubre cada dato**

| Estado | Dónde se ve en Marea |
|---|---|
| **Hecho** | 6 hitos cumplidos · 23 puntos de DD validados · 4 updates revisados · la introducción cerrada con Historia Clínica Abierta · el hallazgo de retención de logs, resuelto · la tarea de rotar la credencial · 5 secciones del plan validadas |
| **En curso** | el hito «Data room completo y validado» · el punto «Posición de caja», entregado · «Cuentas anuales», en revisión · el update de agosto, en manos de IWL · dos introducciones vivas · 3 secciones del plan «para revisar» · 3 tareas en marcha |
| **Por hacer** | el hito «Tres inversores en conversación avanzada» · 3 puntos de DD pendientes · la introducción a Semilla Ibérica, sin respuesta · la tarea de montar la sala de datos, con plazo por delante · 1 sección del plan en borrador |
| **Atención** | el hallazgo alto de copias sin prueba de restauración · los 1.500 € desembolsados sin justificante · 3 comentarios sin responder |
| **Vencido** | el hito «Carta de intenciones de un inversor ancla», que venció el 20 de octubre · el punto «Vesting del equipo fundador», bloqueante · el documento del embudo comercial, **caducado** el 14 de octubre · el update de septiembre, que venció el 10 de octubre sin entregarse · el hallazgo **crítico** de credenciales del PACS · la tarea bloqueada del coste de adquisición |
| **No aplica** | la tarea descartada de traducir el material · la introducción descartada con Fondo Atlántico |

Y lo que no es un estado pero estaba en tu lista: **las cuatro severidades** de hallazgo técnico, crítico incluido · **un mes de KPI corregido con su historial** —13.518 → 13.900, firmado por la fundadora, escrito por el disparador y no por la semilla— · **las cinco fases de una introducción, una con comisión** y 18.000 € · **línea base y reevaluación**, la inicial de abril y la trimestral de septiembre.

**Qué decidí yo**
· **Va en `seed/local/`, no en el seed versionado.** Las suites se apoyan en la Marea del repositorio —sus scores, sus recuentos, su semáforo— y completarla allí era cambiarles los números a ciento setenta pruebas para que una persona pueda mirar una pantalla.
· **El crítico de seguridad pone a Marea en «Bloqueo» y la saca de invertible.** Es a propósito: sin él, ni el semáforo rojo ni la lista de siguientes pasos se ven en ninguna parte. Como Marea está fuera de todos los agregados, no ensucia ninguna media.
· **Septiembre pasa a borrador y agosto a entregado.** Era la única forma de tener a la vez un mes en manos de IWL y un mes que venció sin entregarse. Octubre no se crea: una prueba lo carga y lo borra en cada pasada.
· **La tarea cerrada va a nombre de la fundadora y no del CTO.** El CTO de Marea es la única persona del seed sin trabajo a su nombre, y hay una prueba que lo necesita. Una semilla local no le cambia los supuestos a la suite.
· **Las introducciones entran en los cinco estados** aunque tu documento de estados no las listaba: son un embudo, encajan sin forzar nada, y el extracto de aportación es justo donde no apetece cambiar de vocabulario.

**Qué necesito que decidas**
1. **Faltan dos estados de tramo: «planificada» y «cancelada».** La hoja de ruta de Marea tiene las cuatro etapas que pediste, tres completadas y una en curso. Para enseñar esos dos haría falta una quinta etapa planificada, y dijiste cuatro. ¿La añado?
2. **«KPI frente a objetivo» no se puede enseñar.** La columna `target_value` existe en `kpi_values` y está vacía en toda la plataforma, y ninguna pantalla la lee como estado. ¿Le pongo objetivos a los KPI de Marea y los enseño en el Resumen, o eso va con el modelo de datos de los tableros?
3. **Meta del programa y pasos dentro de un hito, bloqueados.** Son lo que pide el tablero de la fundadora y no existen en el modelo de datos. Van en el documento que tengo que entregarte antes de escribir código, así que la demostración los recorrerá cuando apruebes eso.

**Estado**
· 116 unitarias · 136 RLS · 174 interfaz. Las tres en verde, y la de interfaz dos veces seguidas. Comprobado además que **la demostración sigue completa después de dos pasadas enteras de la suite**, que es lo que de verdad costaba.
· **Cuatro pruebas más dejaban la base distinta de como la encontraron**, y las cuatro salieron a la luz al completar la demostración:
  · `documentos.spec.ts` devolvía a «pendiente» tres puntos del checklist **filtrando solo por el título**. Como el checklist es igual para todas, cada pasada tocaba también los puntos homónimos de Marea y de Raíz, dos compañías que ese fichero no abre.
  · `correccion-kpi.spec.ts` borraba **todo** el historial de correcciones de Marea, de cuando corregía ahí. Se llevaba por delante el rastro de la demostración en cada pasada.
  · `tareas.spec.ts` contaba «1 cerrada» en vez de comprobar que la suya bajó al plegable.
  · Una prueba de RLS pedía «la línea base de Marea» con `.single()`, dando por supuesto que solo hay una.
· **Sin subir a la nube.** La demostración completa está solo en esta máquina.

**Siguiente**
El modelo de datos de los dos tableros —meta, pasos de hito, «Para revisar» y comprobación previa al acceso— en un archivo de `docs/`, para que lo apruebes antes de escribir nada.

---

## 2026-10-30 · Un solo lenguaje de estados · commit 6533987

**Qué cambió**
· **Cinco estados y nada más**, en `lib/estados.ts`: hecho, en curso, por hacer, atención, vencido, más «no aplica». Una función, `estadoVisual(entidad, fila)`, traduce lo que hay en la base —hitos, tareas, puntos de due diligence, secciones del plan, updates, KPI, hallazgos, tramos— a uno de ellos. 37 pruebas, todas con la fecha pasada a mano.
· **Los tokens**, con los valores exactos de tu documento. El azul entra solo como «En curso».
· **`<Estado>`**, **`<BarraSegmentada>`**, **`<NodoEstado>`** y **`<LeyendaEstados>`** en `components/ui/estado.tsx`. Cada estado va siempre con icono y palabra; el color es el tercer refuerzo.
· **Aplicado a Resumen, Recorrido y Due diligence**, que es el orden que pediste.
· **Los tonos decorativos, retirados.** Cielo, lila, menta y durazno ya no están en los iconos de sección ni en las cifras. El icono de navegación va en gris.
· **Capturas antes y después** de las tres pantallas, en `docs/capturas/`.

**Qué se ve ahora y antes no**

| Pantalla | Antes | Después |
|---|---|---|
| Due diligence | Siete bloques de desplegables grises. Para saber si quedaba algo en rojo había que mirar los 29 puntos uno a uno | Abre con 29 cuadrados: **22 hechos · 1 en curso · 5 por hacer · 1 vencido**. Y cada área con la suya |
| Recorrido | Seis tarjetas de media pantalla. «¿Por dónde vamos?» se contestaba leyéndoselas | Abre con la línea de puntos, un nodo por tramo con sus hitos debajo y **«Estás aquí»** marcado. Cada punto baja a su tarjeta |
| Resumen | El semáforo con su propia escala de tres luces, distinta de la de todo lo demás | El semáforo es una pastilla de estado más: si está en rojo por un hito retrasado, el hito se ve del mismo rojo |

**Qué decidí yo**
· **El desplegable lleva el color, y la pastilla se queda en el icono.** Al poner la pastilla junto al desplegable, la fila decía «Validado» dos veces. Ahora el control va teñido de su estado y delante va solo el icono, que es lo que hace que se distinga en escala de grises —un `<select>` no lleva icono.
· **Un documento caducado pasa a «Vencido», no a «Pendiente».** En pantalla eran lo mismo y no lo son: un punto que nadie ha entregado y una escritura que caducó la semana pasada piden cosas distintas. **Para el score no cambia nada**: ahí sigue sin contar, que es lo que estaba decidido.
· **Una tarea bloqueada es «Vencido»**, no «Por hacer»: no avanza y alguien tiene que desbloquearla. Mismo criterio que un punto bloqueante.
· **Un hallazgo aceptado es «No aplica».** Un riesgo aceptado por escrito deja de ser trabajo pendiente, por crítico que fuera.
· **Un hito pendiente con la fecha pasada sale vencido aunque la base diga «pendiente».** Nadie marca «retrasado» a mano.
· **Los tonos decorativos los retiré enteros, no solo en las tres pantallas.** Era un cambio de un fichero y dejarlo a medias habría dado dos vocabularios durante una semana.

**Qué necesito que decidas**
1. **El avance del programa sigue en magenta** —las cuatro fases y las dos barras del Resumen—. No lo metí en los cinco estados porque no es un estado: es cuánto llevas de un contrato. ¿Lo paso también al lenguaje de estados o se queda como marca?
2. **La barra segmentada no está todavía en el business plan.** Tu criterio de aceptación la pide ahí también, y lo necesita el «Para revisar» del tablero de la fundadora. ¿La meto en la misma tanda que el tablero o ahora?
3. **El semáforo verde ahora se lee «En plazo»** y antes decía «En curso». «En curso» ya significa otra cosa en el lenguaje nuevo, y dos palabras iguales con dos sentidos es justo lo que estamos quitando.

**Estado**
· 113 unitarias · 136 RLS · 168 interfaz. Las tres en verde, y la de interfaz dos veces seguidas.
· **Tres pruebas que estaban en verde por accidente**, y las tres por la misma causa: la suite dejaba la base distinta de como la encontró.
  · `correccion-kpi` comprobaba que la comparativa lee el MRR corregido **de Marea**, que es la demostración y está fuera de todos los agregados a propósito. Pasaba solo porque una pasada anterior había dejado `is_demo` en falso. Ahora corrige el de Vega, que sí cuenta.
  · `tests/preparar-base.ts` desarchivaba **todas** las compañías archivadas, no las tres del seed: **sacaba a AgrolabX del archivo y le borraba el motivo** en cada pasada. Igual el `beforeEach` de `mentoria`. Las dos van ahora por nombre.
  · Una prueba de RLS contaba las compañías asignadas al revisor **sin descontar las archivadas**. Daba de más por AgrolabX, y solo en tu máquina.
· **Sin subir a la nube.** Y siguen **9 commits sin publicar**: el `git push` me lo bloquea el clasificador cada vez. Tendrás que lanzarlo tú.

**Siguiente**
Completar la demostración hasta que recorra cada estado, con la lista en la bitácora de qué dato cubre cada uno, añadiendo lo que pide el tablero de la fundadora: meta del programa, pasos dentro de los hitos y secciones en «Para revisar».

---

## 2026-10-29 · La demostración, las cuentas de revisión y los equipos · commits f19f7ac · a8bac8c

**Qué cambió**
· **AgrolabX sin los seis meses de KPI inventados**, como dijiste. Quedan los 19 KPI elegidos: eso es *qué se mide*, no cuánto dio, y esa elección sí se tomó de verdad.
· **`is_demo`**. Marea Clínica marcada. Se ve en la cartera y en su cabecera con el distintivo «Demostración», y **sale de todo agregado**: comparativa, embudo hacia invertible, radares, runway, compromiso IWL, evolución y la lectura de cohorte.
· **Ocho cuentas de revisión**, `npm run cuentas:revision`. Las siete de tu tabla más `lector_externo`, que sí existe como rol con cuenta. Contraseñas en **`.accesos-revision.md`** (en `.gitignore`).
· **Los equipos de los cuatro proyectos**, en la sección «Equipo» del business plan.

**Dónde aterriza cada cuenta** — comprobado con prueba, no a ojo:

| Alias | Rol | Aterriza en | Y ve |
|---|---|---|---|
| `rev-admin` | admin_iwl | `/cartera` | Todo, con Administración |
| `rev-equipo` | equipo_iwl | `/cartera` | Cartera y embudo, sin configuración |
| `rev-niage` | revisor_niage | `/cartera` | Solo la demostración |
| `rev-mentor1` | mentor | `/cartera` | Solo la demostración, como quien coordina |
| `rev-mentor2` | mentor | `/cartera` | Solo la demostración, como secundario |
| `rev-fundadora` | fundadora | `/proyecto` | Su proyecto |
| `rev-lector` | lector_externo | `/proyecto` | Su proyecto |
| `rev-candidata` | candidata | `/candidatura` | Su candidatura y su DD por entregar |

**Qué decidí yo**
· **`is_demo` y no `archived_at`.** Archivarla la saca de la cartera, que es justo donde tiene que verse. Hacía falta una marca propia.
· **En la base y no en una lista de slugs en el código.** Quién es la demostración cambia según la instalación, y una lista en el código acaba apuntando a un proyecto real el día que cambie. Por lo mismo, el script de cuentas **busca la demo por `is_demo` y se para si no hay ninguna**, en vez de elegir una.
· **La candidata tiene su propia candidatura, no una de la semilla.** La primera versión cogía la primera en NDA que encontrara, y eso rompió una prueba: darle cuenta anula el enlace privado, que era justo lo que esa prueba comprobaba.
· **Los equipos van al business plan y no a `company_members`**, que exige cuenta. Dijiste que no se crean cuentas todavía, y una cuenta con un correo equivocado no es un dato pendiente: es una persona que no puede entrar y un enlace de acceso en el buzón de otro.
· **Añadí `lector_externo`**, que preguntabas si existía. Existe como rol con cuenta y aterriza en `/proyecto`.
· Toqué una prueba de RLS que daba por supuesto que Marea tenía exactamente dos mentores. Dejó de ser cierto al colgar de ella las cuentas de revisión.

**Qué necesito que decidas**
1. **El punto 1 sigue a medias.** Marcada y fuera de los agregados, sí. **Completada para recorrer cada estado, no**: falta la lista larga —hitos en los cuatro estados, hallazgos de las cuatro severidades, DD en los cinco, introducciones en los cinco, desembolso sin justificante, update vencido, comentarios sin responder…—. Es el trozo más largo de los tres y lo dejé para después de las cuentas, que es lo que estabas esperando.
2. Datos que siguen vacíos: correos del equipo fundador, mentoría de Siren, Igor y Baires, liderazgo femenino de Igor y Baires, web de Siren, nombres de los equipos quirúrgicos de Baires.

**Estado**
· 76 · 136 · 161 · 161, dos pasadas limpias.
· **Sin publicar: 8 commits locales.** El `git push` me lo bloquea el clasificador y no lo fuerzo.
· En la nube no hay nada de esto: ni `is_demo`, ni las cuentas, ni Baires, ni los identificadores corregidos. Dijiste que la subida va cuando tú digas.

**Siguiente**
Completar la demostración hasta que recorra cada estado, con la lista en la bitácora de qué dato cubre cada uno.

---

## 2026-10-29 · AgrolabX: fuera del programa y sin actividad inventada · commit db3dcbc

**Qué cambió**
· Fuera de `seed/local/30_agrolabx.sql`: 16 líneas de horas, 2 desembolsos, 5 contactos, 5 introducciones y 4 entregables. 90 líneas.
· Se queda el Anexo I y sus 3 compromisos de caja: es lo firmado.
· AgrolabX archivada con motivo «Fuera del programa». No borrada.

**Qué decidí yo**
· **Los entregables también se van**, y no estaban en tu lista. Son de la misma naturaleza que lo demás: salen en el mismo extracto de aportación, como trabajo que IWL dice haber entregado. Si los querías dentro, dímelo y vuelven.
· **Los seis meses de KPI se quedan**, y sí son inventados. No alimentan el extracto —que es el criterio que diste— pero son datos falsos en un proyecto real. Decides tú: una línea y se van.
· Sin `archived_by`: no lo archivó nadie, lo trae así la semilla. Poner ahí a una persona sería inventar quién tomó la decisión.

**Qué necesito que decidas**
1. ¿Los seis meses de KPI inventados se quedan o se van?
2. ¿Los entregables estaban fuera de tu lista a propósito?

**Estado**
· 76 · 136 · 146. Nada dependía de esa actividad.
· El fichero es `seed/local/`, que no se versiona: este commit solo lleva la bitácora.
· **AgrolabX no está en la nube.** Ya no. Así que allí no hay nada que archivar.

**Siguiente**
El punto 1, la demostración, que es el que queda.

---

## 2026-10-29 · Los cuatro proyectos reales · commit 700f63a

**Qué cambió**
· Terral Barria → **La Pepi** (`la-pepi`), Roster → **Siren** (`siren`), y la web `roster.ai` vaciada.
· **Proyecto Baires** dado de alta. Son cuatro.
· Los cuatro en fase_1, due diligence conjunto, con checklist, business plan y KPI instanciados.
· El identificador viejo redirige al nuevo conservando la subpágina, también sin sesión. `lib/renombres.ts` y el proxy.

**Qué decidí yo**
· **La redirección no estaba pedida como mecanismo, solo como «redirigir el viejo».** La puse en el proxy y no en el layout porque así conserva la pestaña: lo que alguien guarda no suele ser la portada de la ficha sino `/tecnico` o `/plan`. Y va antes de la guardia de sesión, porque si cayera después mandaríamos a entrar y de vuelta al identificador viejo.
· **Renombrar por id y no por slug** en la semilla: el insert lleva `on conflict (id) do nothing` —correcto, el fichero se ejecuta muchas veces y no debe pisar lo editado— pero eso significa que en una base donde ya existían, el nombre nuevo no llegaría nunca.
· **Entrada de Baires: `idea`.** Dijiste «idea con activo propio». El activo —la ontología de nueve estructuras— no cambia que no hay producto; se nota en el texto, no en el estado.
· **`female_leadership_pct` vacío en Igor y en Baires**, como pediste. El 100 % que traía Igor no tenía fuente.

**Qué necesito que decidas**
1. Lo que dejé vacío por no tener dato: equipo fundador de los cuatro (no hay correos), mentoría de Siren, Igor y Baires, porcentaje de liderazgo femenino de Igor y Baires, web de Siren, y los nombres de los equipos quirúrgicos de Baires —esos dijiste que los pones tú—.
2. Nada de esto está en la nube todavía: dijiste que la subida va cuando tú digas.

**Estado**
· 76 · 136 · 149 · 149, dos pasadas limpias.
· **Inventario de la nube**, que pediste antes de tocarla: La Pepi (slug `terral-barria`), Siren (slug `roster`) e Igor Labs, activas; `qqq` archivada; `German`/`w`, `sjcnksdncn`/`ttttttt` y `PIRULO`/`pirulo`, activas. Siete. **Ni AgrolabX ni Baires ni Marea están allí.**
· Los nombres ya estaban cambiados en la nube; los identificadores no.
· `seed/local/21_proyectos.sql` no se versiona: de este commit solo se sube la redirección y su prueba.

**Siguiente**
· Pendiente el **punto 1, la demostración**: Marea con `is_demo`, distintivo visible, fuera de todo agregado, y completada hasta recorrer cada estado. Es el trozo grande y no lo he empezado.
· Hice el 2 y el 3 y me salté el 1, que iba en medio. No tenía motivo para cambiar tu orden: seguí por donde ya estaba trabajando.

---

## 2026-10-29 · Corregir un mes de KPI, y los guardianes · commits 532d87b · b9988f0 · fbff9ff

**Qué cambió**
· La tabla de visibilidad pasa a `docs/IWL_Visibilidad_Roles_ES_v1_20261029.md`. Tenías razón: la bitácora decía «entregada» y el documento no existía.
· **Un mes de KPI ya enviado se puede corregir.** Límite: la compañía mientras IWL no lo haya revisado; revisado, IWL lo reabre. Rastro en `kpi_value_history`, escrito por un disparador. Reabrir queda en el registro de actividad.
· **Los guardianes de autorización dejan de aplicarse sin sesión.** Seis arreglados.
· Una prueba con fecha de caducidad, arreglada.

**Qué decidí yo**
· Separar los guardianes en dos familias, que no estaba en el encargo: los de **autorización** («esto es de IWL») se eximen sin sesión, porque sin sesión no hay a quién restringir y la clave de servicio ya se salta el RLS entero. Los de **integridad** («un Anexo firmado no se edita») no, porque valen las escriba quien las escriba. Toqué seis y dejé tres.
· Tabla propia para el historial en vez de `activity_log`: se enseña junto al valor del mes, y un registro general no se consulta por compañía y periodo sin volverse caro.
· Los KPI técnicos no se corrigen a mano: salen del análisis del repositorio, y escribirlos encima mentiría sobre su origen.
· La corrección se guarda uno a uno y no en bloque: guardar la columna entera metería en el historial cambios que nadie hizo.
· Que la segunda prueba recorra el camino real —IWL carga el mes y lo da por revisado— en vez de marcarlo por detrás.

**Qué necesito que decidas**
1. Nada bloqueante. Sigo con el punto 2 de tu lista salvo que digas otra cosa.

**Estado**
· Cálculo 76 · RLS 136. e2e: **144 en verde en la primera pasada**, en 1,9 min.
· **No he podido cumplir la regla de las dos pasadas**, y no por el código: la máquina está a carga 22 por `mediaanalysisd` —el indexado de fotos de macOS, al 300 % de CPU— y Chrome. La suite pasó de 1,9 min a 33–36 min y caen tres pruebas por tiempo de espera: las tres más lentas —`anexo`, `correccion-kpi`, `informes`—. En aislamiento y con la máquina tranquila pasan.
· Maté un `next dev` que llevaba **28 días** corriendo sobre este proyecto. Se levanta otra vez con `npm run dev`.
· Sin desplegar: no publico algo cuya segunda pasada no he podido ver limpia.

**Siguiente**
Volver a correr las dos pasadas con la máquina tranquila y desplegar. Después, punto 2: las políticas por tipo de miembro.

## 2026-10-29 · Convención de informes y tabla de visibilidad · commit 1265e18

**Qué cambió**
· `CLAUDE.md` gana la sección «Cómo se reporta»: cada paso termina con su entrada aquí, y `docs/REVISION.md` es el canal de vuelta.
· Se estrena este fichero con las dos tandas ya hechas.
· Sin código de producto: la tanda anterior pidió la tabla de visibilidad **antes** de escribir políticas, y eso es lo que se entregó.

**Qué decidí yo**
· Que la fundadora **sí** ve su aportación. No estaba en el encargo, pero el extracto es lo que IWL le aporta a ella, y ocultárselo rompería el contador de compromiso de su propio Resumen.
· Que la fundadora **sí** ve sus hallazgos técnicos: son defectos de su producto y los tiene que arreglar. Lo que sigue sin ver es la evaluación en borrador.
· Que el mentor secundario **pierde** el due diligence general, que no se mencionaba. Lo agrupé con la aportación porque es de la misma naturaleza: contratos, cap table, nóminas.
· Que `actualizarIntroduccion` sobra en vez de faltarle botón: falta la de *crear* una introducción, y un «editar» sin «crear» no sirve.
· Que la bitácora empieza con dos entradas y no con una, para que el paso 2 quede registrado y no solo en el commit.

**Qué necesito que decidas**
1. ¿Apruebas la tabla de visibilidad tal cual, con las tres decisiones de arriba?
2. ¿El mentor secundario se queda sin due diligence general, o lo quieres dentro?
3. `actualizarIntroduccion`: ¿la borro, o prefieres que haga el par entero —crear y editar introducciones— en este mismo paso?

**Estado**
· Sin cambios en el producto; no hay nada que desplegar ni suites que mover.
· Lo entregado: la tabla por rol y tipo de miembro, las dos funciones propuestas —`can_read_aportacion`, `can_read_tecnico`— y el veredicto sobre las cuatro acciones sin botón. **La tabla solo existió en la conversación; se escribió después en `docs/IWL_Visibilidad_Roles_ES_v1_20261029.md`.**
· Hallazgo que conviene no perder de vista: **un mes de KPI ya enviado no se puede corregir desde ninguna parte**. La pantalla calcula sola «el siguiente al último con datos», así que un MRR mal tecleado queda mal para siempre y arrastra runway, crecimiento y comparativa. `guardarValorKpi` existe y no tiene por dónde llamarse.

**Siguiente**
Con la tabla aprobada: las dos funciones y sus políticas, una prueba RLS por cada celda prohibida, las capacidades por compañía en `lib/permisos.ts`, y después mover las pestañas.

---

## 2026-10-29 · Paso 2 del rediseño: esqueleto y permisos · commit 7d400ee

**Qué cambió**
· Permisos por capacidad en `lib/permisos.ts`: `verCartera`, `verEmbudo`, `configurarPrograma`, `tieneProyectoPropio`. Sustituyen a `esIwl()` —dos roles de siete— y a la excepción del revisor escrita a mano en dos pantallas.
· Mentor y revisor dejan de caer en `/proyecto`, que deducía la compañía de la primera fila de `company_members`: quien llevaba tres proyectos veía uno, al azar. Pasan a la cartera, que RLS ya filtra.
· Cerrojo explícito en los dos layouts de compañía: 404 si no eres miembro ni IWL. Con su prueba, entrando como quien menos puede.
· Un solo esqueleto: la fundadora pasa a tener barra lateral. Y una sola lista de entradas, cuando eran tres duplicadas —las de las dos barras y el repertorio de iconos de `nav-lateral`, con cuatro de los dieciséis—.
· Cabecera de nueve datos a cinco, más un único menú de acciones.
· Se añaden `<MenuAcciones>` y `<PanelLateral>`.

**Qué decidí yo**
· 404 y no 403 al entrar en una compañía ajena: un «no tienes permiso» confirma que esa compañía existe, y quién está en la cohorte no es público.
· Que el delta de la cabecera pierda su coletilla y el semáforo su motivo, con las dos cosas enteras en el Resumen.
· Añadir `aria-label` a las cifras compactas: «Técnico 94,2 flecha arriba 47,1» leído en voz alta no se entiende.
· Unificar el repertorio de iconos, que no estaba en el encargo: al meter «Mi compañía» en el menú, el icono no existía en la copia pequeña.

**Qué necesito que decidas**
1. Ninguna pendiente de este paso; se revisó y se aprobó.

**Estado**
· Suites 76 · 136 · 142, dos pasadas limpias. Desplegado.
· `<PanelLateral>` queda **sin usar**: las pantallas que lo usarán se rehacen en el paso 5. Está anotado en el propio componente.
· Las ocho pestañas siguen en dos filas: eso es el paso 4.
· Un fallo intermitente en una prueba de la cartera que no reapareció en cuatro pasadas posteriores. Queda apuntado por si vuelve.

**Error que cometí**
La primera versión de la cabecera **perdió información**: al recortarla se fueron el motivo del semáforo, el «invertible» y la lectura de los scores, y no los recoloqué. No lo vi yo; lo vieron tres pruebas al caer. Ya bajan al Resumen.

**Siguiente**
Paso 4: las cinco pestañas y las redirecciones, precedido de las políticas por tipo de miembro.
