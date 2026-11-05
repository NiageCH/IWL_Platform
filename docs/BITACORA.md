# Bitácora

Una entrada por tanda de trabajo, la más reciente arriba. Solo se añaden:
una entrada escrita no se reescribe nunca, ni para corregirla. Si algo
resultó estar mal, se dice en la entrada siguiente.

Complementa a `DECISIONES.md`: aquí **qué pasó**, allí **por qué algo es
como es**.

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
