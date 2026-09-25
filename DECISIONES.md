# DECISIONES.md

Registro de decisiones técnicas y de producto. Una entrada por decisión, con fecha, opción elegida y motivo.
Cuando algo no está resuelto en `IWL_Doc_EspecPlataformaSeguimiento_ES_v2_20260923.md`, se decide aquí y se sigue.

---

## 2026-09-23 · Gestor de paquetes: npm

El documento no fija gestor. `pnpm` no está instalado en la máquina de desarrollo; `npm` 11 sí. Se usa npm y se versiona `package-lock.json`.

## 2026-09-23 · Next.js 16 con Turbopack

`create-next-app` instala Next 16.3.6 y React 19.2. Implicaciones que afectan a cómo se escribe el código en este repositorio:

- Turbopack es el compilador por defecto en `next dev` y `next build`. No se añade configuración de webpack.
- **APIs de request asíncronas.** `cookies()`, `headers()`, `draftMode()`, y `params` y `searchParams` en páginas y layouts son promesas. Siempre `await`.
- **`middleware.ts` se llama ahora `proxy.ts`**, con función exportada `proxy` y runtime Node.js fijo. Ahí va el refresco de sesión de Supabase.
- Tipos de ruta generados: se usan los helpers globales `PageProps<'/ruta'>`, `LayoutProps<'/ruta'>` y `RouteContext<'/ruta'>` en lugar de tipar props a mano.
- `next lint` ya no existe. El script `lint` invoca ESLint directamente con la configuración plana.
- `revalidateTag` exige segundo argumento (perfil de `cacheLife`). Para escrituras con lectura inmediata del propio cambio se usa `updateTag` dentro de Server Actions.

## 2026-09-23 · `@types/node` en ^24

El scaffold fija `@types/node@^20`, que entra en conflicto con el peer de Vitest 5 (`^22 || >=24`). Se sube a `^24`, alineado con el Node 24 de desarrollo y con el runtime de Vercel.

## 2026-09-23 · Sin modo oscuro · REVERTIDA el 2026-09-24

Se decidió papel blanco siguiendo el §8. Rodrigo pidió después el tema oscuro para que resalte el fucsia. Ver la entrada del 24 de septiembre.

## 2026-09-23 · Tokens de color con nombre en español

Los colores se exponen en Tailwind como `papel`, `titular`, `secundario`, `metadato`, `filete`, `acento` y `acento-texto`, no como `primary`/`muted`. El nombre dice el papel que cumple el color en la identidad de IWL, lo que evita que el acento magenta se use como color de fondo o de texto grande, que es justo lo que el documento prohíbe.

## 2026-09-23 · Supabase solo en local durante la fase 1

Decidido con Rodrigo. Migraciones y datos semilla versionados en el repositorio, base levantada con `supabase start` sobre Docker. El proyecto cloud en región UE se crea cuando haya algo que enseñar. Consecuencia: ninguna credencial real entra en el repositorio durante esta fase.

## 2026-09-24 · Cuánto vale cada estado de un punto de due diligence

El documento define los estados (§4.3) pero no su peso en el score de preparación. Se fija en `lib/scoring/score-preparacion.ts`, no en la interfaz: pendiente 0 · entregado 0,5 · en revisión 0,75 · validado 1 · bloqueante 0.

Entregado ya suma porque el trabajo de la compañía está hecho y lo que falta es la revisión de IWL: si no sumara, el score castigaría a la fundadora por la cola de trabajo de IWL. Bloqueante suma cero aunque haya documento, porque hay algo que impide seguir. Los puntos opcionales suman si están y no restan si faltan.

## 2026-09-24 · Umbrales del estado invertible

El documento define «proyecto invertible» en prosa (§3) y dice que lo calcula la plataforma. Los números concretos se fijan en `UMBRALES_INVERTIBLE`: score técnico ≥ 80, score de preparación ≥ 80 y runway ≥ 6 meses, además de cero hallazgos críticos abiertos y los hitos del Anexo que condicionan el estado.

Están expuestos como constante para que la administración los pueda mover. **Pendiente de confirmar con IWL**: son una primera propuesta, no una decisión de producto tomada.

## 2026-09-24 · El runway es una métrica derivada, no un KPI que se teclea

La §4.6 lo menciona en el núcleo común y otra vez entre las derivadas. Se implementa solo como derivada, calculada de caja entre burn mensual. Tecleado además sería pedir dos veces el mismo dato y abrir la puerta a que no cuadren, que es justo lo contrario del principio de carga única.

## 2026-09-24 · Plantilla de checklist de due diligence

El documento habla de `dd_items` por compañía pero no de dónde salen. Se añade `dd_item_templates` como configuración, y `app.instanciar_checklist_dd()` la copia al dar de alta una compañía. La copia guarda título, descripción y validez en el punto: cambiar la plantilla después no reescribe el historial de las compañías ya evaluadas.

Lo mismo para las secciones del business plan (`bp_section_templates`) y para el núcleo de KPI.

## 2026-09-24 · Validar se impide con triggers, no solo con políticas

«Una fundadora no puede validar ni puntuar sus propios puntos» necesita que la fundadora **sí** pueda editar la fila (adjuntar documento, marcar entregado) pero **no** ponerla en cierto estado. Una política RLS decide si se puede escribir la fila entera, no a qué valor: por eso los estados `validado` y `bloqueante` los corta un trigger `BEFORE`, que además sella quién validó y cuándo.

Mismo patrón en las secciones del business plan y en el update mensual.

## 2026-09-24 · Enlaces de entrada en flujo implícito

El flujo propio de la aplicación es PKCE y se cierra en servidor (`/auth/confirmar`). Algunos enlaces llegan con el token en el fragmento de la URL, que nunca viaja al servidor. En lugar de dejarlo en un error, se derivan a `/auth/sesion`, una página cliente que lee el fragmento, establece la sesión y lo borra de la barra de direcciones para que no quede un token en el historial.

## 2026-09-24 · `agentRules: false` en next.config

Next 16 escribe un fichero de reglas para agentes en cada `next dev` y, sin `AGENTS.md` presente, lo escribe **encima de CLAUDE.md**. Aquí CLAUDE.md lo mantenemos a mano con las convenciones del proyecto, así que esa generación se desactiva. Lo específico de Next 16 está en este mismo fichero.

## 2026-09-24 · Los tests restauran lo que tocan

Los tests de RLS y de interfaz trabajan contra los datos semilla, que son también los datos con los que se enseña la plataforma. Todo test que escriba restaura el valor anterior con la clave de servicio. Se descubrió al ver cadenas como «Revisión 1790234166797» en el nombre de una compañía en pantalla.

## 2026-09-24 · La validación de identificadores no usa `z.uuid()`

Zod 4 valida los UUID según el RFC, comprobando versión y variante. El tipo `uuid` de Postgres no: acepta cualquier hexadecimal con formato 8-4-4-4-12. Con `z.uuid()`, las Server Actions rechazaban identificadores que la base acepta sin problema, incluidos los de los datos semilla y cualquier UUID v1 o v7.

Se sustituye por una expresión regular que comprueba solo el formato. La regla general: **la validación de entrada nunca puede ser más estricta que la columna**, porque entonces rechaza datos válidos y el fallo aparece lejos de su causa.

Se descubrió probando a guardar una puntuación desde el navegador: la acción devolvía «Revisa los campos marcados» sin marcar ningún campo, porque el identificador que fallaba iba en un campo oculto. Cubierto ahora por `lib/acciones/resultado.test.ts`.

## 2026-09-24 · La interfaz oculta lo que la base prohíbe, y no al revés

A la fundadora no se le ofrece el estado «validado» ni el formulario de puntuar. No porque eso la detenga (quien la detiene es un trigger), sino porque enseñar un control que va a fallar al pulsarlo es una mala interfaz.

Las dos capas son independientes a propósito: `lib/datos/permisos.ts` decide qué se enseña, las políticas y los triggers deciden qué se puede. Si discrepan, manda la base y lo único que se ve es un botón que da error. Nunca al contrario.

## 2026-09-24 · Un campo no controlado necesita `key` para seguir al servidor

Los selects de estado se montan con `defaultValue`. Tras guardar, el Server Component vuelve a renderizar con el valor nuevo, pero React no actualiza un campo no controlado que ya estaba montado: se guardaba bien y la pantalla seguía enseñando el estado anterior hasta recargar.

Se resuelve dando al campo una `key` con el valor que viene del servidor, de modo que React lo vuelva a montar cuando cambia. Aplicado a los estados de punto de due diligence, de punto de plan, de sección del business plan y de update mensual.

Se descubrió con un test de interfaz que subía un documento y comprobaba que su punto del checklist quedaba en entregado: la base lo tenía, la pantalla no.

## 2026-09-24 · El data room guarda los ficheros bajo el id de la compañía

Ruta en Storage: `<company_id>/<area>/<document_id>/<fichero>`. La primera carpeta es lo que permite que las políticas de `storage.objects` apliquen a los ficheros el mismo aislamiento que a las filas, reutilizando `app.can_read_company` y `app.can_write_company`.

El bucket es privado y no hay URL pública: cada consulta se sirve con un enlace firmado de un minuto y queda registrada en `document_access_log`.

Al subir un documento enlazado a un punto del checklist, ese punto pasa a entregado y hereda la caducidad. Es carga única aplicada al data room: entregar un documento y decir que lo has entregado son el mismo gesto.

## 2026-09-24 · Acceso abierto durante el desarrollo · PENDIENTE de cerrar

Ahora mismo cualquiera que escriba un correo en `/entrar` se crea una cuenta, con rol `fundadora` y sin compañía. Se deja así a propósito para poder recorrer la plataforma sin fricción, decidido con Rodrigo.

**Antes de cualquier despliegue hay que cerrarlo.** Aquí se guarda el due diligence de las compañías de la cohorte y no puede haber autoservicio. El cierre son dos cambios:

- `enable_signup = false` en la sección `[auth]` de `supabase/config.toml`.
- `shouldCreateUser: false` en `signInWithOtp`, en `app/entrar/formulario.tsx`.

**Cuidado con un detalle que cuesta una tarde:** poner `enable_signup = false` en `[auth.email]` **apaga el inicio de sesión por correo entero**, no solo el registro. La respuesta del servidor es `email_provider_disabled` y no entra nadie, tampoco quien ya tenía cuenta. Lo que hay que cerrar es el de `[auth]`.

El alta la hace IWL con `npm run alta -- <correo> <rol> [slug] [papel]`, que crea la cuenta, fija el rol y la asigna a una compañía. Es lo que sustituye a la pantalla de administración hasta que exista.

## 2026-09-24 · Movimiento: instantáneas congeladas, no recálculo

Tras revisar CRRATE con Rodrigo, se añade lo que el propio documento pedía y no estaba: la evolución en el tiempo (§4.4), la comparativa entre compañías y el embudo visual (§4.7).

El movimiento se apoya en `readiness_snapshots`: una fila congela los dos scores y el estado invertible en una fecha. **No se recalculan.** Si al cambiar los niveles objetivo se recalculara la historia, una compañía «mejoraría» sin haber tocado nada, y el recorrido dejaría de significar algo. La primera instantánea de cada compañía es su línea base.

Las genera `npm run snapshots`, encadenado a `npm run db:reset`. El script usa el mismo `lib/scoring` que la pantalla: una función SQL habría sido más corta pero habría creado una segunda implementación del mismo score, y las dos acabarían divergiendo.

El score de preparación histórico se reconstruye de `dd_item_status_history`, que ya existía. Un punto sin cambios anteriores a esa fecha cuenta como pendiente: el checklist se instancia entero al dar de alta la compañía, así que existía aunque nadie lo hubiera tocado.

## 2026-09-24 · La evolución va en dos paneles, no en un gráfico de dos series

La identidad de IWL tiene un solo color cromático. Una segunda serie tendría que ir en gris, y esa pareja (`#D6005F` con `#3F3F46`) no separa lo suficiente para quien no distingue el color: el validador da ΔE 7,6 en protanopia, por debajo del umbral. Dos paneles con el mismo eje de 0 a 100 resuelven la comparación sin pedir prestado un color que la identidad no tiene.

La misma razón por la que en el scorecard radar el objetivo es un contorno discontinuo y no una segunda serie de color.

## 2026-09-24 · Bandas de preparación

Un 64 no dice nada; «en desarrollo» sí. Cuatro tramos configurables en `platform_settings`: Inicio, En desarrollo, Consolidada, Preparada.

**No son el estado invertible.** Estar en la banda alta es tener buen score de preparación; ser invertible además exige cero hallazgos críticos abiertos, los hitos del Anexo y runway suficiente. La interfaz lo dice explícitamente debajo del embudo, porque confundir las dos cosas sería justo el tipo de error que esta plataforma existe para evitar.

## 2026-09-24 · Mapa de intervención

Idea tomada de CRRATE, que no estaba en el documento de alcance. Agrega, por dimensión técnica, el peso multiplicado por los niveles que faltan en toda la cohorte, y ordena por ese número. Responde «dónde pongo la capacidad de mentoría este trimestre», que es una pregunta que IWL se hace de verdad y que hasta ahora obligaba a abrir las tres fichas y sumar a mano.

Ordena por demanda acumulada y no por número de compañías afectadas: una brecha grande donde el peso es alto rinde más que varias pequeñas donde pesa poco.

## 2026-09-24 · La comparativa mide contra el objetivo de cada etapa

Poner el nivel bruto de una pre-semilla al lado del de una serie A en la misma columna sería engañoso: un 2 no significa lo mismo en las dos. La tabla enseña siempre «nivel / objetivo de su etapa» y la etapa en la cabecera de cada columna.

Los KPI de sector (unidades fabricadas, coste de inferencia) quedan fuera de la comparativa: no se comparan entre compañías de sectores distintos.

## 2026-09-24 · Tema oscuro · se aparta del §8 a petición de Rodrigo

El documento fija papel blanco (§8). Rodrigo pide gris oscuro para que el fucsia resalte, y se hace. Queda anotado que es una desviación consciente del documento de alcance, no un descuido.

Lo que **no** cambia: sigue habiendo un solo color cromático. Lo que cambia es el lienzo, y con él los pasos de gris, que se invierten. Y los informes en PDF siguen siendo papel blanco: son documentos para imprimir y enviar a un inversor, no pantallas.

Tres niveles de elevación y no más: en una interfaz densa, cada nivel extra de profundidad es una decisión menos clara sobre qué importa. La profundidad se consigue con superficie más clara que el fondo, borde superior que recoge luz y sombra; no con relieve simulado, que en una herramienta de due diligence envejece mal y resta credibilidad.

## 2026-09-24 · Los gráficos usan una sola serie, siempre

Sobre el fondo oscuro se volvió a validar la paleta, como exige cambiar de superficie. El acento `#FF007A` pasa todas las comprobaciones en solitario. Una rampa de cuatro pasos para severidad **no** pasa: los pasos adyacentes quedan a ΔE 5,4 en deuteranopia y 6,7 en visión normal, muy por debajo del suelo de 15, y los dos pasos oscuros bajan de 3:1 de contraste.

Conclusión, que vale para todo gráfico nuevo: **una serie de datos en acento, y la diferencia por etiqueta de texto**. Las referencias (objetivo, línea base, umbral) van en trazo discontinuo gris, que se distingue por la forma y no por el color. Cuando hay dos medidas que comparar, dos paneles con el mismo eje, no dos series en uno.

## 2026-09-24 · Cuatro gráficos nuevos en el dashboard

- **Preparación en el tiempo**: media de la cohorte, agrupada por mes. Solo cuenta a quien ya estaba: una compañía que entra en junio no arrastra la media de marzo.
- **Hallazgos por severidad**: los críticos en el tono de alerta, porque bloquean el estado invertible.
- **Meses de caja**: barras por compañía con el umbral de 6 meses marcado. Quien está por debajo va en el tono de alerta y además lleva su cifra escrita.
- **Scorecards de la cohorte**: un radar por compañía, en paralelo. No superpuestos, que necesitaría un color por compañía; en paralelo se comparan las formas, que es lo que se quiere ver.

## 2026-09-24 · Las cuentas de desarrollo sobreviven a `db:reset`

`npm run db:reset` recrea los usuarios, así que cualquier cuenta que no esté en los datos semilla desaparece. Con el registro abierto, al volver a entrar se crea otra con rol `fundadora` y sin compañía, y la persona acaba en «sin compañía asignada» sin relacionarlo con el reset que hizo diez minutos antes.

Pasó dos veces con la cuenta de Rodrigo. Se arregla en el sitio correcto: `npm run db:reset` encadena ahora `altas:locales`, que lee `.altas-locales.json` y vuelve a dar de alta esas cuentas con su rol. El fichero no se versiona, porque son correos reales de personas concretas; hay un ejemplo versionado al lado.

La lección, que vale para más sitios: cuando algo se rompe de forma repetida por un efecto secundario previsible de un comando del proyecto, el arreglo va en el comando, no en las instrucciones de recuperación.

## 2026-09-24 · Tema por vista: documento claro, consola oscura

El oscuro en toda la plataforma pesaba demasiado. Se reparte según lo que se hace en cada sitio, que es una razón de producto y no una preferencia:

- **Vista de la compañía, clara.** Ahí se redacta el business plan, se lee el checklist y se trabaja con texto largo. El papel sigue siendo mejor para eso, y además devuelve el §8 justo donde importa.
- **Consola de IWL, oscura.** Se mira de seguido, está llena de gráficos y el fucsia se enciende sobre el gris.

Lo decide el layout de cada grupo de rutas con `<Marco tema="...">`, que solo redefine tokens. **Ningún componente sabe en qué tema está**: todos leen los mismos nombres y aquí se decide qué valen. Los gráficos también, con `var(--color-...)` en los atributos de SVG, que los navegadores resuelven; con hexadecimales fijos habría que duplicar cada componente.

Sobre papel cambian dos cosas: el acento para texto pequeño baja a `#C4005C`, porque el magenta puro no tiene contraste suficiente sobre blanco, y desaparecen el brillo y las sombras largas, que sobre claro solo ensucian.

## 2026-09-24 · Registro de aportación y línea base

Del documento `IWL_Doc_PlataformaAportacionYBaseline_ES_v1_20260924.md`, que mide a la incubadora donde la v2 solo medía a la compañía. Entra en fase 1, antes del business plan, como dice su §11.

**Las tarifas se copian, no se referencian.** Cada línea de horas guarda la tarifa que tenía el día que se imputó. Si se referenciara `rate_cards`, cambiar una tarifa reescribiría el valor de las horas ya registradas y el extracto dejaría de cuadrar con lo que se comunicó en su día. Cubierto por un test que cambia la tarifa y comprueba que lo ya imputado no se mueve.

**La línea base no se edita: se crea otra.** Lo corta un trigger que ni siquiera la clave de servicio esquiva. El contenido se congela en JSON y no como referencias a otras tablas: si fueran referencias, editar un KPI de hace seis meses cambiaría el punto de partida.

**Un Anexo firmado no se reescribe: se firma una versión nueva.** Es el documento que sostiene el equity.

**Confirmar un hito es de IWL.** La compañía lo mueve a «en curso» y aporta evidencia; darlo por cumplido es valoración, y vale la misma regla que en el resto.

### Decisiones del §7, tomadas con Rodrigo

- **§7.1** La fundadora ve las horas y su valor en euros. Es el argumento del equity.
- **§7.2** Las horas no necesitan confirmación previa, pero la compañía puede objetar. Tabla `objections`: sin ella, ese derecho sería una frase en un documento.
- **§7.3** Solo IWL crea introducciones; la compañía actualiza el resultado.
- **§7.4** Comisión: la marca IWL al crear la introducción, con **ventana de 18 meses** desde la presentación. La ventana se guarda en la fila y no se calcula al vuelo, para que cambiar la política mañana no reescriba lo ya acordado.
- **§7.7** Si no llega el update: recordatorio, aviso al responsable y **marca visible en la cartera**. Nada se bloquea.
- **§7.8** La fundadora ve el **informe técnico completo**, con hallazgos. Es su plan de trabajo.

Pendientes de §7 que no bloquean y siguen abiertos: qué consecuencia tiene que IWL incumpla su compromiso de horas (§7.6). El contador ya lo hace visible en los dos sentidos; la consecuencia es una decisión de negocio.

## 2026-09-24 · La compañía ve el contacto de su propia introducción

La agenda de contactos es de IWL y se comparte entre la cartera: ninguna compañía tiene por qué verla entera. Pero con solo esa regla, el extracto de la fundadora decía «reunión celebrada con alguien», que no es información.

Se añade una política: se puede leer un contacto si existe una introducción de tu compañía con él. La introducción es parte de lo que IWL aporta y saber con quién fue es la mitad de su valor.

## 2026-09-24 · Un score sin evaluaciones es un hueco, no un número

El proyecto de referencia entró con el estado técnico sin evaluar y la cabecera enseñaba «4,5». Ese número salía de las dimensiones cuyo objetivo en pre-semilla es 0, que cuentan como cubiertas. Técnicamente correcto y completamente engañoso: parecía una medición y era la ausencia de una.

Ahora, sin ninguna dimensión evaluada, la cifra es «—» y la nota dice «Due diligence técnico pendiente». `ScoreTecnico` lleva `evaluadas` y `aplicables` para poder distinguir los tres casos: sin evaluar, a medias, y completo.

## 2026-09-24 · Los tests no cuentan filas que dependen de datos locales

Dos tests de RLS y uno de interfaz se rompieron al cargar el proyecto de referencia desde una semilla local, porque afirmaban que la cohorte tenía exactamente tres compañías. Una instalación puede tener semillas locales con proyectos reales, y un test que cuenta filas empieza a fallar por una razón que no tiene nada que ver con lo que prueba.

Ahora comprueban la relación —ve todas las que hay, ve exactamente las que tiene asignadas— leyendo las asignaciones de la base en vez de escribirlas en el test.

## 2026-09-24 · Separador de miles también en cuatro dígitos

El español escribe 9000 sin punto, pero en una columna donde conviven 9.000 y 14.500 eso hace que dos cifras del mismo tipo se lean distinto. En una tabla financiera manda la legibilidad de la columna, así que `euros` y `numero` fuerzan `useGrouping: "always"`. El porcentaje usa espacio duro antes del símbolo, igual que hace Intl con el euro.

## 2026-09-25 · Los umbrales del estado invertible salen del código

Vivían en `UMBRALES_INVERTIBLE`, una constante de TypeScript donde IWL no los podía tocar. El documento define «proyecto invertible» en prosa y deja los números abiertos: son suyos. Ahora están en `platform_settings` y se editan desde la administración.

La constante sigue existiendo como valor por defecto, para que el cálculo funcione aunque falte la configuración. Lo que **no** se configura y bloquea siempre: un hallazgo crítico abierto, un punto bloqueante y los hitos del Anexo que condicionan el estado.

## 2026-09-25 · Dar de alta una compañía instancia todo, en la misma transacción

`app.crear_compania` crea la fila y además el checklist de due diligence, las nueve secciones del business plan y los KPI que le tocan por perfil. Van juntas porque una compañía sin nada de eso no es una compañía: es una ficha vacía en la que no se puede trabajar. Y en la misma transacción, para que no pueda quedar a medias.

La función vive en `app`, que es donde está lo interno, con una puerta en `public` que solo delega: PostgREST solo expone `public`, y no tiene sentido abrir el esquema entero para una llamada.

## 2026-09-25 · Una compañía nueva ya puede cargar su primer KPI

La vista de KPI devolvía temprano cuando no había valores y el formulario de carga quedaba fuera. Para cargar el primer dato hacía falta tener datos, así que una compañía recién dada de alta se quedaba atascada.

Lo encontró el test de administración que da de alta una compañía y comprueba que queda lista para trabajar. Es el tipo de fallo que no aparece con datos semilla, porque ahí todas las compañías ya tienen meses cargados.

## 2026-09-25 · La clave de servicio aparece en un solo sitio

Todas las acciones escriben con el cliente de sesión, para que mande RLS. La excepción es el alta de personas: crear una cuenta en `auth.users` no se puede hacer de otra forma. Ahí, y solo ahí, se comprueba la autorización a mano antes de usar la clave, y está comentado por qué.

## 2026-09-25 · El estado de entrada es otro eje, distinto de la etapa de inversión

`stage` (pre-semilla, semilla, serie A) responde a «cuánto ha levantado». `entry_state` (idea, prototipo, MVP, primeros clientes, facturación) responde a «qué tiene construido». Son independientes: se puede facturar sin haber levantado nada.

Hacía falta el segundo porque es el que decide el recorrido. Una incubadora boutique no tiene un programa, tiene varios, y el que le toca a un proyecto depende de lo que trae hecho, no de lo que ha recaudado.

## 2026-09-25 · La hoja de ruta se copia de una plantilla, no la referencia

Al aplicar un recorrido a una compañía se copian sus etapas y sus hitos. A partir de ahí son de ese proyecto y editarlos no toca la plantilla; y al revés, reorganizar el catálogo no reescribe el plan de nadie que esté en marcha.

Es el mismo patrón del checklist de due diligence y de las secciones del business plan, y por la misma razón. La plantilla es el punto de partida, no el corsé: eso es lo que significa «a medida».

## 2026-09-25 · Borrar una etapa no borra sus hitos

`milestones.stage_id` es `on delete set null`. Un hito acordado con la compañía no desaparece porque IWL reorganice los tramos del plan: pasa a la lista de hitos sin etapa y sigue contando para el estado invertible.

Lo mismo vale para los que nacen del plan técnico o del due diligence, que aparecen cuando aparecen y no siempre encajan en un tramo previsto.

## 2026-09-25 · El carril de un avance lo decide la base, no el formulario

`progress_entries.side` lo pone un trigger según quién escribe: IWL en su carril, la compañía en el suyo. No es un campo que se elija.

Si se pudiera elegir, IWL podría apuntarse avances en el carril de la compañía y al revés, y los dos carriles dejarían de significar nada. Un avance tampoco cambia de carril al editarlo.

## 2026-09-25 · La aportación existe aunque no haya Anexo firmado

La pantalla de aportación se cortaba entera cuando faltaba el Anexo y escondía las horas y el dinero ya puestos. El Anexo fija el compromiso —contra qué se mide—, pero lo entregado existe desde el primer día.

Ahora se avisa de que no hay compromiso contra el que medir y se enseña todo lo demás. Lo encontró mirar la ficha de una compañía real en el navegador, no un test.

## 2026-09-25 · Compras, eventos y reuniones se registran aparte de las horas

Hasta ahora la aportación recogía horas, caja, introducciones y entregables. Faltaba lo que IWL pone y no es ninguna de esas cuatro cosas: una licencia que asume, un estand al que lleva al proyecto, una tarde de reuniones que organiza.

Cada línea lleva dos importes: lo que le cuesta a IWL y lo que le costaría a la compañía por su cuenta. La diferencia es la aportación real, igual que con las tarifas. Un estand cuesta lo mismo lo pague quien lo pague, pero una compañía sola no entra en la agenda de un fondo.

No sustituye a `introductions`: una introducción es presentar a alguien y seguir el embudo hasta el final; una reunión de aquí es una reunión concreta con su fecha y su resultado.

## 2026-09-25 · El índice de madurez no rellena huecos

Cinco ejes: tecnología, gobierno, plan, tracción y solidez. Todos se calculan con datos que alguien ya ha validado; ninguno se estima.

Un eje sin datos no cuenta como cero: el índice se reparte sobre el peso de los ejes que sí se pueden medir, como en el score técnico. Un proyecto sin evaluar tiene que parecer no evaluado, no inmaduro. La pantalla dice siempre qué parte del peso está medida.

El eje de plan se mide contra los hitos que **ya vencían**, no contra todo el recorrido. Si no, un proyecto que va perfecto en su primer mes puntuaría bajísimo solo por tener el plan por delante, y la madurez bajaría cada vez que se alarga la hoja de ruta.

## 2026-09-25 · La línea base guarda las entradas del cálculo, no su resultado

El contenido congelado incluye los números que alimentan el índice de madurez, no el índice ya calculado. Así, si IWL cambia los pesos de los ejes, los dos extremos de la comparación se recalculan con la misma vara.

Guardar el resultado compararía dos formas distintas de medir y el salto entre el inicio y hoy dejaría de significar nada.

## 2026-09-25 · Las pruebas restauran la configuración por fuera de lo que prueban

Los tests de interfaz que tocan umbrales o pesos los devolvían a su sitio usando el mismo formulario que estaban probando. Si el test se cortaba a mitad, el valor quedaba cambiado y la siguiente pasada fallaba por algo que no tenía que ver con lo que se quería comprobar.

Ahora se restauran con la clave de servicio en un `afterEach`. Lo mismo con los datos: el test que crea una hoja de ruta borra también sus hitos, porque borrar la etapa no los borra a ellos.

## 2026-09-25 · Los hitos vuelven a contar para el estado invertible

`leerCompania` pasaba `hitos: []` con un comentario que decía «llegan con el Anexo, en fase 2». Cuando llegaron, nadie quitó el array vacío: el cálculo los daba por cumplidos sin decirlo, y una compañía podía salir «invertible» con los hitos de producto y tracción pendientes, que es precisamente lo que la definición exige.

Lo destapó la hoja de ruta, que es la primera que genera hitos para todas las compañías. Un valor de relleno con un comentario que anuncia su caducidad se queda ahí hasta que algo lo rompe.

## 2026-09-25 · Los informes se imprimen desde el navegador, no se generan en el servidor

Un motor de PDF en el servidor obligaría a rehacer la maquetación con sus primitivas, y los radares de Recharts no sobreviven: habría que reimplementar los gráficos. Chromium headless en Vercel son cincuenta megas de dependencia frágil.

Las páginas de informe con CSS de impresión reutilizan el diseño que ya existe, los SVG salen tal cual y las fuentes ya están cargadas. El PDF es idéntico a lo que se ve.

Lo que se pierde: no se puede adjuntar un PDF a un correo automáticamente. Cuando lleguen las alertas se enviará el enlace, no el archivo. Para generarlos en lote está `npm run informes`, que usa el Chromium de Playwright desde la máquina local sin arrastrarlo a producción.

## 2026-09-25 · El informe de inversor no describe lo que sigue abierto

Es la misma regla del worker: los problemas se cuentan por tipo y ubicación, nunca con lo que haría falta para aprovecharlos. Un informe de due diligence circula por correo y acaba en carpetas que nadie controla.

La versión de inversor lleva el score, el scorecard entero y el recuento por severidad. El detalle de cada hallazgo —descripción, evidencia, recomendación— se queda en la versión interna. Hay una prueba que extrae las evidencias del informe interno y comprueba que ninguna aparece en el de inversor: quitar la sección no basta si el mismo texto se cuela en otro sitio.

## 2026-09-25 · Los informes se prueban generando el PDF de verdad

Las pruebas emulan el medio de impresión y llaman a `page.pdf()`. Comprueban que el archivo empieza por `%PDF`, que tiene tamaño de documento con contenido y que el botón de imprimir desaparece en papel.

Un informe que se ve bien en pantalla y sale roto al imprimirlo es exactamente el fallo que ninguna aserción sobre el DOM detecta.

## 2026-09-25 · Las compañías de demostración tienen Anexo firmado

Las únicas con Anexo eran las de los datos locales y, peor, los que dejaban los tests de RLS al pasar: el extracto de Marea salía con 100 horas comprometidas y un cumplimiento del 238 %, cifras que no venía de ninguna parte.

Ahora el seed trae Anexo, pilares, partidas de caja y desembolsos, con las horas y el dinero cuadrando con lo que reparte cada hoja de ruta por etapa. Si no cuadraran, el contador mediría contra un número que el plan nunca pretendió cumplir. De paso, los tests ya no crean Anexos: encuentran el que hay.

## 2026-09-25 · El valor de un KPI se formatea en un solo sitio

`unit` guarda el tipo de magnitud («moneda», «numero», «porcentaje»), no el símbolo. El informe mensual lo concatenó tal cual y enseñaba «15.079 moneda» y «99,9 porcentaje».

La vista de KPI ya tenía la función bien resuelta; el informe la reimplementó mal. Ahora está en `lib/etiquetas` y la usan las dos, junto con los nombres de etapa, perfil y estado de entrada, que estaban repetidos en cada pantalla.
