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

## 2026-09-28 · El papel de un mentor va en la asignación, no en la persona

`company_member_role` gana `mentor_principal` y `mentor_secundario`. El rol de la persona sigue siendo `mentor` a secas; lo que cambia por proyecto es qué papel tiene en cada uno.

Sale de cómo trabaja IWL: la misma mentora coordina un proyecto y entra de apoyo en otro. Si el permiso dependiera de su rol global, coordinaría las dos o ninguna.

El valor `mentor` se queda en el enum porque Postgres no deja quitarlo sin recrear el tipo, y recrearlo obligaría a reescribir todas las políticas que lo comparan. Ninguna pantalla lo ofrece.

## 2026-09-28 · El mentor principal es parte de IWL en su proyecto

Decisión de Rodrigo. Quien coordina puntúa el due diligence, confirma hitos, mueve el plan y revisa el update mensual, en los proyectos donde es principal. No ve la cartera ni toca la configuración: eso sigue siendo de IWL.

Esto flexibiliza a propósito la regla de que quien hace el trabajo no lo certifica. El documento la puso para la fundadora (§5, §11) y ahí sigue intacta: una fundadora no puede puntuarse ni validarse, y eso es criterio de aceptación. Para el coordinador se acepta porque en una incubadora boutique es quien conoce el proyecto, y esperar a la dirección para cada confirmación paraliza.

Lo que no toca un mentor ni siendo principal: el Anexo y el equity, la caja, las objeciones de la compañía sobre horas —que pueden ser a las suyas—, congelar líneas base, y el alta de personas.

La función `app.coordina_company` es lo que sustituye a `app.is_iwl()` en todo lo que es de un proyecto y no del programa.

## 2026-09-28 · Cada mentor imputa sus propias horas

El libro de horas era solo de IWL. Con mentores externos eso significa que lo rellena la dirección, y un libro que no rellena quien trabaja no se rellena.

Ahora un mentor puede insertar horas donde `profile_id = auth.uid()`, en cualquier proyecto que lea. Lo que no puede es imputarlas a nombre de otra persona ni corregir las de nadie más.

## 2026-09-28 · Las tareas se asignan desde el programa, no desde la compañía

Una fundadora se apunta trabajo propio, pero no puede crear tareas a nombre de un mentor: la lista de pendientes de la mentoría la llenaría la compañía. Pedir es otra cosa y ya tenía su sitio, el apartado «qué pide a IWL» del update mensual.

La comprobación está en un trigger y no en la política porque necesita mirar `company_members`.

## 2026-09-28 · Archivar conserva, borrar es para lo vacío

Decisión de Rodrigo. Una compañía con due diligence, horas imputadas y equity acordado se archiva: sale de la cartera y su equipo deja de verla, pero el histórico sigue entero y se puede restaurar. El extracto de aportación justifica una participación y esa prueba tiene que sobrevivir a que el proyecto salga del programa.

El borrado real solo para lo creado por error. Y quien decide si hay algo dentro es la base, no el formulario: una comprobación que vive en la interfaz se salta con una llamada directa, y esto no tiene deshacer. La interfaz solo la consulta para no ofrecer lo imposible.

Lo mismo con las personas: quien ha imputado horas o validado algo se archiva. Un extracto donde las horas las puso «alguien que ya no está» no justifica nada.

## 2026-09-28 · La cartera no enseña las archivadas

Lo encontró el test de archivado: se archivaba una compañía y seguía en `/cartera` con todos sus datos.

IWL sigue viéndolas desde administración, porque el archivo es suyo. Pero la cartera es la lista de proyectos vivos: una graduada de hace dos años arrastrando el score de su último mes ensucia todas las medias de la cohorte.

## 2026-09-28 · Qué se puede pulsar se ve sin pasar el ratón

Los enlaces solo se subrayaban al hacer hover, así que en reposo eran texto normal: había que ir probando dónde. Con una tipografía sobria y sin color en el cuerpo, el subrayado es lo único que queda para decir «esto lleva a otro sitio».

La convención, en `globals.css`: `.enlace` navega y lleva subrayado fino permanente; `.accion` hace algo en la misma página y lleva subrayado discontinuo; el botón con fondo es la acción principal de un formulario. Todo lo pulsable tiene foco visible, que el navegador ya daba y muchos diseños quitan.

Lo señaló Rodrigo mirando la aplicación: «es difícil darse cuenta de qué es clicable».

## 2026-09-28 · Cada persona lleva su cargo y en qué entra

Asignar mentoría era elegir un nombre de una lista y acordarse de a qué se dedica. Ahora el perfil guarda cargo y áreas, y las áreas van en un array y no en una frase: la pregunta al montar un equipo es «quién sabe de fondeo», y eso no se responde buscando subcadenas.

Al elegir a alguien se ve además cuántos proyectos lleva y cuántas horas tiene comprometidas. Poner a alguien en su quinto proyecto es una decisión distinta de ponerla en el primero.

## 2026-09-28 · El equipo se monta desde el proyecto

Asignar solo se podía desde la ficha de cada persona, de una en una: para poner a cuatro mentoras en un proyecto había que recorrer la lista entera cuatro veces. La pregunta real es «quién lleva este proyecto» y se hace mirando el proyecto.

Las dos vías coexisten, porque la pregunta inversa —«qué lleva esta persona»— también es real y se hace desde su ficha.

## 2026-09-28 · El correo se corrige hasta el primer acceso

El correo es la identidad en `auth.users`, así que cambiarlo después de que alguien entre la dejaría fuera. Pero al dar de alta a un equipo entero se teclean correos, y un error de escritura no puede obligar a borrar la cuenta y crearla otra vez.

La base comprueba `last_sign_in_at`. Hasta el primer acceso no hay nada que romper; después, la interfaz explica por qué no se puede y qué hacer en cambio.

## 2026-09-28 · Faltaban las convenciones del proyecto

`CLAUDE.md` contenía una sola línea, `@AGENTS.md`: una importación de algo que nunca llegó a escribirse. Y no podía escribirse, porque AGENTS.md está en `.gitignore` desde el principio —Next 16 lo regenera en cada arranque— así que aunque se hubiera creado no habría llegado al repositorio.

La decisión original ya estaba tomada y anotada en `next.config.ts`: las convenciones van en CLAUDE.md, a mano, con `agentRules: false` para que Next no lo pise. Simplemente no se llegó a hacer. La especificación lo pedía en su §12 y llevaba sin cumplirse desde el primer commit, sin que se notara porque el trabajo seguía saliendo.

## 2026-09-28 · Las etiquetas de los enums, en un solo sitio

La misma etiqueta se escribía distinta en cada pantalla: «Coordina» en personas y «coordina» en compañías. Lo encontró una prueba que buscaba una y encontraba la otra.

Están en `lib/etiquetas.ts`, junto a las de etapa, perfil y estado de entrada, que ya se habían duplicado antes por lo mismo.

## 2026-09-28 · Una persona sin nombre no se enseña en blanco

El desplegable de asignación mostraba opciones vacías. La causa venía de lejos: `scripts/alta.mjs` creaba las cuentas con el rol en los metadatos pero sin nombre, así que el perfil nacía sin él. Y como esos metadatos solo se envían al crear, una cuenta antigua se quedaba en blanco para siempre.

Tres arreglos, de fondo a superficie: el script pone nombre siempre, derivándolo del correo si no se le da uno; al actualizar una cuenta que ya existía también lo escribe; y la interfaz nunca deja un hueco —si no hay nombre usa el correo, y si tampoco lo dice—.

Lo señaló Rodrigo: «se asigna un mentor pero no el nombre».

## 2026-09-28 · Las pruebas borran las cuentas que crean

La prueba que da de alta a alguien dejaba la cuenta puesta. Al cabo de unas cuantas pasadas había nueve «Persona de prueba» en el desplegable de asignación y encontrar a alguien de verdad era imposible.

Borrar el perfil no basta, porque la cuenta vive en `auth.users` y el perfil se recrearía. El helper `borrarCuenta` quita las dos cosas.

Es el mismo problema que ya había aparecido con los ajustes de configuración y con las hojas de ruta: una prueba que no limpia lo que crea envenena la base de desarrollo, y el síntoma aparece semanas después en un sitio que no tiene nada que ver.

## 2026-09-28 · Las compañías de demostración se archivan, no se borran

Una instalación de trabajo tiene proyectos de verdad y las tres ficticias solo estorban: ensucian las medias de la cohorte y hacen ruido en los listados. Pero no se pueden quitar del repositorio, por dos razones que van en direcciones opuestas y las dos mandan.

La especificación las pide (§10): son lo único que puede llevar el seed versionado, porque ahí nunca van nombres reales. Y las pruebas se apoyan en ellas, que es lo mismo dicho de otra forma: en cualquier otra máquina son las únicas compañías que existen.

Así que el seed local las archiva —Marea Clínica se queda como ejemplo, porque es la que tiene hoja de ruta, avances por los dos lados, línea base y los cuatro informes— y las suites las desarchivan al arrancar, en `tests/preparar-base.ts`. Sin eso, media suite de RLS no encontraba nada: una compañía archivada deja de ser visible para su equipo fundador, que es justo lo que esas pruebas comprueban.

No se restaura el estado al terminar. Quien trabaja con proyectos reales recupera su vista con `npm run db:reset`; dejarlas como estaban obligaría a adivinar cuáles se archivaron a propósito y cuáles las archivó una prueba.

## 2026-09-28 · Los estilos salen de inceptionwomanlab.es, medidos y no copiados a ojo

El acento ya coincidía: la plataforma usaba `#FF007A`, el mismo de la web. Lo que la separaba era el lienzo —un gris azulado frente al negro puro— y sobre todo la tipografía.

Se ha traído lo que da la cara de la marca: Zalando Sans Expanded en los titulares, en mayúsculas y con el tracking apretado de la web; el lienzo negro con los grises de zinc; los botones en cápsula, en mayúsculas y con la letra separada.

Y lo que no se ha traído, con su motivo. El amarillo `#FFD600` de los antetítulos es muy característico, pero un segundo color cromático obliga a rehacer el sistema de gráficos, donde las series se distinguen por relleno y trazo precisamente para no depender del color. Tampoco se ha copiado el botón rosa con texto blanco: en la web se queda en 3,8 de contraste y no llega al mínimo legible. Se usa el mismo tono cinco puntos más oscuro, que llega a 4,6.

Los valores se sacaron leyendo el estilo calculado de la web, no mirando capturas.

## 2026-09-28 · Qué se puede pulsar, segunda vuelta

La primera vez se puso subrayado permanente a los enlaces, y no sirvió: el subrayado usaba un gris de filete fijo que sobre el lienzo negro es invisible. El problema siguió ahí hasta que Rodrigo lo señaló por segunda vez, ahora nombrando los sitios —la cartera, el menú, administración—.

Tres cosas faltaban. El subrayado ahora sale de `currentColor`, así que se ve sobre cualquier fondo. El menú y las secciones de administración se leen como pestañas, con la abierta marcada: antes eran texto que solo cambiaba de color al pasar, y sin pasar no decían nada. Y una fila de tabla se ilumina y enciende una flecha al final.

La flecha es un enlace de verdad y no un adorno. La primera versión estiraba el enlace del nombre sobre la fila entera, que es la técnica habitual, pero sobre un `<tr>` no funciona: `position: relative` en una fila de tabla no crea bloque contenedor en todos los navegadores y la capa acaba cubriendo otra cosa. Lo encontró la prueba que intentaba pulsar en una celda del medio. En las listas, donde sí es de fiar, se mantiene.

Hay pruebas de todo esto para que no se pierda en el siguiente retoque.

## 2026-09-28 · Se entra con contraseña, y la pone la dirección

Decidido con Rodrigo para poder enseñar la plataforma a unas cuantas personas sin montar antes el envío de correo. El enlace mágico sigue estando como segunda vía, para quien no recuerde su contraseña, pero ya no es la puerta principal.

Esto resuelve además un problema que arrastrábamos: con contraseña, **los correos no tienen que ser buzones reales**. Una cuenta se puede dar de alta con la dirección que le corresponde a esa persona aunque todavía no la use, que es justo el caso del equipo de IWL.

La dirección pone la contraseña al dar de alta y la plataforma la enseña **una sola vez**, para copiarla y pasarla. No se guarda en claro en ninguna parte: Supabase conserva el hash, y en el registro de actividad queda que se cambió y para quién, nunca el valor. Un historial se consulta y se exporta; una contraseña ahí dentro es una contraseña filtrada.

Si no se escribe ninguna, se genera: tres palabras y un número, que se dicta por teléfono sin deletrear y aguanta mucho mejor que la que se inventa quien está dando de alta a siete personas seguidas.

Lo que esto tiene de malo, y hay que saberlo: mientras nadie cambie la suya, la dirección las conoce, y hay que pasarlas por algún canal. Para una cohorte pequeña es asumible. Cada persona puede cambiarla desde Mi cuenta, y esa pantalla lo dice.

## 2026-09-28 · El registro queda cerrado

`enable_signup = false` en `[auth]`. Aquí está el due diligence de la cohorte y no puede haber autoservicio: el alta la hace la dirección desde administración, que usa la clave de servicio y por tanto no pasa por esa comprobación.

Llevaba abierto desde el principio, a propósito, para poder recorrer la plataforma sin fricción. Cerrarlo era condición para sacarla a internet.

Ojo con el sitio: `enable_signup = false` en `[auth.email]` apaga el inicio de sesión por correo entero, no solo el registro. Ya pasó una vez.

## 2026-09-28 · El mensaje de acceso fallido no distingue el caso

«El correo o la contraseña no son correctos», tanto si la contraseña está mal como si el correo no existe. Distinguirlos le confirmaría a cualquiera qué direcciones están dadas de alta, y aquí las direcciones son las de las fundadoras de la cohorte.

## 2026-09-28 · Tras entrar, navegación completa y no `router.push`

El inicio de sesión dejaba a veces en la raíz sin pasar al proyecto. Era una carrera: la cookie de sesión la acaba de escribir el navegador y el servidor tiene que leerla para decidir a dónde va cada persona, pero con una navegación de cliente unas veces llega y otras la página se renderiza todavía sin sesión.

Fallaba una de cada varias veces, que es la peor forma de fallar: parece cosa del navegador de quien lo sufre. Lo encontró la prueba nueva de acceso al correrla dentro de la suite entera, no en aislamiento.

## 2026-09-28 · Las pruebas limpian lo que tocan, y lo que no se veía

Tres cosas aparecieron a la vez al perseguir unos fallos que cambiaban de sitio en cada pasada.

Las pruebas de administración dejaban una compañía por ejecución: había seis en la base antes de que nadie lo mirara. La de mentoría cambiaba una puntuación de Marea y no la reponía, y eso hacía fallar a otra prueba **de otro fichero** —la del revisor de Niage, que comprueba que el score se mueve al puntuar— porque el score de partida ya no era el de la semilla. El síntoma aparecía a un mundo de distancia de la causa.

Y el tercero no era de las pruebas: en desarrollo, Next compila cada página la primera vez que alguien la pide, y esa espera se la comía la primera prueba que tocara cada ruta. El arranque de la suite las pide todas una vez, en fila, antes de empezar.

Es la cuarta vez que aparece lo mismo, así que queda en las convenciones: **una prueba que crea algo lo borra, la que cambia algo lo repone, y ninguna de las dos usa para ello el camino que está probando.**

## 2026-09-28 · El alta por línea de comandos también pone contraseña

`scripts/alta.mjs` creaba las cuentas sin contraseña, así que solo podían entrar por enlace de correo. Se vio al preguntar Rodrigo si `iwl-local-2026` valía para todas: valía, pero porque esas cuentas las crea el seed, no el script.

Ahora genera una —tres palabras y un número— y la imprime al terminar, o acepta la que se le pase como sexto argumento.

## 2026-09-28 · Qué se puede pulsar, tercera vuelta

«Redactar la sección» era un `<button>` sin ninguna marca: el control con el que se escribe todo el business plan parecía una línea de texto suelta. Los barridos anteriores no lo cogieron porque buscaban las clases que ya tenían forma de enlace, y este no tenía ninguna.

Y el `<details>` tampoco se anunciaba: el triángulo que pone el navegador es diminuto y del color del texto, y sobre el lienzo negro no se ve. Ahora lleva una flecha propia en el acento que gira al abrir.

Para que no haya una cuarta vuelta, hay una prueba que **recorre todos los botones y desplegables de una página** y falla si alguno no tiene ni fondo, ni borde, ni subrayado. Es la única forma de que esto no dependa de acordarse.

## 2026-09-29 · La contraseña del seed no puede viajar a la nube

Los seeds locales crean al equipo de IWL con `crypt('iwl-local-2026')`: la misma contraseña para las siete cuentas, dos de ellas de dirección, y escrita en claro en el propio fichero. En el portátil de cada cual eso es cómodo y no expone nada, porque la base solo escucha en `localhost`.

Al sembrar el proyecto de la nube esa contraseña se fue con los datos. La base pasó a tener una dirección pública y siete cuentas abiertas con una clave que está en un archivo.

La respuesta no es quitar la contraseña del seed —hace falta para entrar en local sin montar el envío de correo—, sino que **sembrar la nube obligue a rotarlas antes de dar la dirección a nadie**. Eso es `scripts/claves.mjs`: pone una contraseña distinta a cada cuenta y deja la tabla en `.accesos-nube.md`, que está en `.gitignore` y se borra después de repartirla. El script de siembra lo avisa al terminar y la guía de despliegue lo pone como paso obligatorio, no como recomendación.

Las cuentas de dominio `.test` se saltan: son marcadores de los seeds y no las usa nadie.

## 2026-09-29 · El estado de entrada de AgrolabX vive con AgrolabX

`21_proyectos.sql` ponía `entry_state = 'mvp'` a AgrolabX con un `update ... where slug = 'agrolabx'`, y lo hacía desde ahí para no tocar el fichero que lleva sus condiciones comerciales. Funcionaba mientras AgrolabX se cargaba en `10_agrolabx.sql`, antes.

Al renombrarlo a `30_agrolabx.sql` —para que la configuración y el equipo entren primero— el orden se invirtió: el `update` pasó a ejecutarse cuando la compañía todavía no existía, no encontraba fila, y AgrolabX se quedaba sin estado. No falló nada; simplemente salía en blanco en la nube.

Un `update` a una fila que crea otro fichero depende del orden de los ficheros, y el orden de los ficheros es un nombre que alguien puede cambiar. Ahora el estado se pone en el mismo fichero que crea la compañía.

## 2026-09-29 · Un fallo que parecía nuestro y era del Supabase local

La prueba de subir un documento al data room empezó a fallar con «No se ha podido subir el fichero: database error, code: 42P10». El 42P10 de Postgres es *no hay ninguna restricción única que case con el ON CONFLICT*, así que lo primero fue buscar el upsert en nuestro código. No había ninguno: la acción solo hace `insert`.

El registro del contenedor de Storage dio la consulta entera. La emite el propio servicio:

```
insert into storage.objects (name, owner, owner_id, bucket_id, metadata, user_metadata, version)
values (…) on conflict (name, bucket_id) do update set …
```

Y los únicos índices únicos de esa tabla son `(bucket_id, name, version)` y dos **parciales** —`where archived_at is null` y `where not is_versioned`—. Postgres solo acepta un índice parcial como árbitro si la propia sentencia lleva un `where` que lo implique, y esta no lo lleva. El servicio estaba pidiendo algo que su propio esquema no permite: la imagen `storage-api:v1.72.1` había aplicado las migraciones del esquema versionado pero seguía emitiendo la consulta de antes.

Se arregla actualizando el CLI, que es quien elige las imágenes: v1.72.1 → v1.77.5. La versión queda fijada en `package.json` para que no dependa de lo que tenga cada portátil en la caché.

Lo importante es que **no afectaba a la nube**: allí el servicio va al día. Se comprobó subiendo y borrando un fichero contra el Storage del proyecto antes de tocar nada en local, precisamente para no salir a arreglar un problema que no existía.

## 2026-09-29 · El mínimo de doce caracteres no estaba puesto donde se lee

`config.toml` tenía `minimum_password_length = 12` bajo `[auth.email]`, con un comentario explicando por qué doce. Gotrue no lee esa clave de ahí: solo la de `[auth]`, que seguía en 6. El CLI la acepta sin quejarse, así que no había nada que lo avisara.

Se vio mirando el entorno del contenedor —`GOTRUE_PASSWORD_MIN_LENGTH=6`— en vez de fiarse de lo que decía el fichero. La validación del formulario de administración sí exigía doce, o sea que en la práctica nadie llegó a poner una corta por esa vía, pero el suelo del servicio estaba donde no tocaba y cualquier otro camino lo habría saltado.

Queda como costumbre: **un ajuste de configuración se comprueba en lo que corre, no en lo que está escrito.**

## 2026-09-29 · El rol de una cuenta lo pedía quien se registraba

Antes de desplegar comprobé qué rol recibe una cuenta que se crea sola, porque el registro en la nube estaba abierto —es como nace todo proyecto de Supabase— y eso decidía si se podía publicar sin cerrarlo primero.

`app.handle_new_user()` sacaba el rol de `raw_user_meta_data`. Ahí es donde gotrue guarda el objeto `data` que manda el cliente en la petición de registro. Lo escribe quien se da de alta. Probado contra la instancia local, con el registro abierto un momento:

```
POST /auth/v1/signup
{"email":"…","password":"…","data":{"role":"admin_iwl"}}
→ 200, y el perfil queda con rol admin_iwl
```

Eso es la cartera entera y el due diligence de todas las compañías, para cualquiera que diera con la dirección.

Ahora hay dos cierres, y el de la base es el que manda:

1. **El registro cerrado** en la configuración de auth. Es la puerta, y una puerta se puede quedar abierta por un descuido o por una prueba que no se limpia.
2. **El trigger no lee nada del cliente.** Una cuenta nueva nace con `fundadora`, que es el rol de menos alcance —no uno inofensivo: no da acceso a nada por sí mismo, porque lo que deja ver una compañía es estar en `company_members`—. Quien deba tener otro rol lo recibe después y con la clave de servicio.

Eso último no costó nada porque `scripts/alta.mjs` y la acción de administración **ya** actualizaban `profiles.role` justo después de crear la cuenta: el rol de los metadatos era redundante en los dos. Las únicas que dependían del trigger eran las semillas, que ahora lo ponen con un `update` explícito.

El nombre sí se sigue leyendo de los metadatos. Es presentación: quien se lo invente solo consigue salir con un nombre falso en una pantalla a la que no llega.

Queda en `tests/rls/registro.test.ts`, que crea cuentas pidiendo cada rol elevado y comprueba que todas salen con el de menos alcance, y que una recién creada no ve ninguna compañía.

**Lo general:** un dato que viene del cliente no puede decidir una autorización, por muy de sistema que parezca el sitio donde viaja. `raw_user_meta_data` suena a interno y no lo es.

## 2026-09-30 · Ni negro puro ni pantalla de un solo tono

Rodrigo pasó cuatro referencias y dijo que la plataforma se veía «demasiado oscura y algo estática/plana». Lo de plana tenía una causa concreta y medible: `--color-lienzo` era **`#000000`**, negro puro, y los tres escalones de superficie iban `#000000` → `#09090b` → `#18181b`. Eso son 9 y 24 puntos de luminancia sobre 255. No se ven.

Con negro de fondo no queda sitio por debajo: una tarjeta solo puede subir, y subía tan poco que no se separaba de nada. Ninguna de las cuatro referencias usa negro —carbón, gris muy oscuro, azul marino, índigo—, y no es una casualidad estética.

Tres cambios en los cimientos:

- **El lienzo oscuro pasa a carbón** (`#0d0d11`), y las superficies se separan de verdad. Además se recuperan las sombras, que en oscuro existían pero en claro eran un píxel al 4 %, o sea nada.
- **La escala de radios de Tailwind sube** en vez de tocar las clases de cada componente. `rounded-md` aparecía veintiuna veces; redefinir `--radius-md` de 6 a 10 px y `--radius-lg` de 8 a 16 px redondea todo a la vez y deja un solo sitio donde cambiarlo.
- **Lo oscuro y lo claro conviven en la misma pantalla.** La consola de IWL era oscura de arriba abajo; ahora el área de trabajo es clara —como la de la compañía, donde ya lo era— y lo oscuro se concentra en la barra de navegación, que es la franja de la marca.

Para lo último hizo falta que `oscuro` fuese un selector y no solo el valor de arranque de `@theme`: sin eso no se puede pintar una isla oscura dentro de una página clara. Ahora `<Oscuro>` funciona a cualquier profundidad y ningún componente se entera, que era la regla de siempre.

### Y la regla del color único

Las referencias usan de cuatro a seis colores. La regla dice uno, y existe por una razón concreta: que los gráficos se lean con daltonismo.

Se resolvió separando las dos cosas, que nunca debieron ir juntas. **Los gráficos no han cambiado**: un acento, y las series se distinguen por relleno, trazo y etiqueta. Lo que hay ahora es una paleta funcional —cielo, lila, menta, durazno— **solo para iconos, pastillas y estados**, y con una condición que es la que salva la regla: el color nunca es la única señal. Un chip lleva su palabra dentro, un icono lleva su rótulo al lado. Quien no distinga el tono lee exactamente lo mismo.

Dicho de otro modo: la regla protegía la legibilidad de los datos, no prohibía el color en la decoración. Ya había cuatro tonos cromáticos en los tokens —verde, ámbar, rosa y el magenta— y nadie los contaba como una infracción, precisamente porque siempre iban con texto.

### Un detalle de cascada que costó un rato

`.chip-icono` declaraba `--tono: var(--color-acento)` como valor por defecto, y la utilidad que lo fija desde el marcado tiene **la misma especificidad**. Como `globals.css` va después de las utilidades de Tailwind, ganaba siempre la clase y los cuatro chips salían del mismo rosa.

Un valor por defecto en CSS no se declara: se pone como reserva en el punto de uso, `var(--tono, var(--color-acento))`. Así lo de fuera gana sin depender del orden de la hoja.

### Los iconos no cuestan dependencia

`lucide-react` estaba **instalado y sin usar en ningún sitio**. Se pasan por nombre a `NavSecciones` —quien llama es casi siempre un componente de servidor, y una función no cruza esa frontera— y como componente a `Cifra`, que se renderiza en servidor.

Y van siempre acompañados de su rótulo. Un icono suelto es una adivinanza.

## 2026-09-30 · Un ancho fijo siempre encuentra una ventana donde no cabe

Rodrigo abrió la cartera rediseñada y la vio rota: textos superpuestos y el menú todavía arriba. Las dos cosas tenían la misma raíz, y la raíz era mía: **probé el diseño a un solo ancho, y con ventana de sobra.**

La lista de la cohorte se montó con una rejilla de siete columnas declaradas en rem. Sumaban unos 936 px. Con los 256 de la barra lateral, una fila pedía cerca de 1200 px de ventana. Pero la barra lateral aparecía a partir de 1024, así que **entre 1024 y 1200 la barra ya estaba pero la fila no cabía**: las columnas se aplastaban por debajo de su contenido y los textos chocaban. A 1512, que es donde yo miraba, no pasaba nada.

Y el menú arriba era lo mismo por el otro lado: con el corte en `lg`, cualquier ventana de portátil sin maximizar se quedaba con la barra compacta, que es justo lo que el rediseño quería dejar atrás.

Tres cambios:

- **La fila deja de tener anchos fijos.** Dos líneas: arriba quién es y cómo está, abajo lo que mide, en una fila que envuelve. Se coloca sola donde haya sitio.
- **La barra lateral aparece en `md`**, 768 px, no en `lg`.
- **La barra compacta envuelve en dos líneas.** A 390 px, marca más tres pastillas más el botón de salir sumaban más que la pantalla y empujaban el documento entero.

Queda una prueba que recorre **siete anchos** —390, 760, 768, 900, 1024, 1180 y 1440— y falla si el documento se desborda en horizontal en cualquiera de ellos, más otra que comprueba que a cada ancho se ve **exactamente un menú**, ni los dos ni ninguno. Los anchos están elegidos a propósito: uno justo antes de cada corte y otro justo después, que es donde se rompe.

**La regla:** un diseño no se comprueba en la ventana que uno tiene abierta. Se comprueba en el intervalo donde cambia de forma, y sobre todo justo después de cada punto de corte.

Y la de siempre, otra vez: cuando algo se ve mal, se mide antes de opinar. El culpable se encontró recorriendo el DOM y preguntando qué elemento tiene el borde derecho más allá del ancho de la ventana, no mirando la pantalla.

## 2026-09-30 · El logo de cada compañía

Rodrigo lo pidió para la lista de la cohorte, y tiene sentido más allá de ahí: en los siguientes pasos y en los scorecards cada compañía salía con un cuadro de iniciales, que identifica, pero un logo identifica mejor y es lo que una fundadora reconoce como suyo.

Se guarda **la ruta en Storage, no la dirección**, y el bucket es privado con la dirección firmada al leer, igual que el data room. Un logo no es secreto, pero la lista de quién está en la cohorte sí: un bucket público con rutas predecibles deja enumerarla.

Quién lo pone: **solo IWL**. Una fundadora carga su business plan y sus documentos, pero el logo es un dato de ficha y las fichas las lleva la incubadora. Lo impide la política de Storage, no la pantalla.

La ruta lleva marca de tiempo. Reusar el nombre al cambiar el logo deja el anterior en pantalla hasta que caduca la caché de Storage; con un nombre nuevo el cambio se ve al momento, y el fichero viejo se borra después de que el nuevo entre bien.

Las direcciones se firman **todas de una vez** en `lib/datos/logos.ts`. Una por compañía serían tantas llamadas como filas tenga la cohorte.

### Un formulario no puede vivir dentro de una condición que su propio éxito vuelve falsa

Dos veces el mismo error, en el mismo componente.

El formulario de subir se cerraba solo al acabar bien, con `onOk`. Como el mensaje de resultado vive **dentro** del formulario, cerrarlo lo desmontaba antes de que nadie lo leyera: la subida funcionaba y no decía que hubiera funcionado.

Y el de quitar estaba dentro de un `{logo ? ... : null}`. Quitar el logo deja `logo` en nulo, la rama se desmonta, y otra vez se lleva por delante su propia confirmación. Ahora el formulario se monta siempre y lo que aparece y desaparece es su botón.

Las dos las cogió la prueba, no la vista: en pantalla, con el chip actualizándose detrás, era fácil dar por bueno que «algo había pasado».

## 2026-09-30 · Al recrear una vista, partir de su última definición

`20260930120000_logos.sql` necesitaba añadir una columna a `admin_companias`, y `create or replace view` no deja meterla en medio de la lista. Así que la recreó entera copiando la definición de `20260928140000_vista_personas.sql`, que es donde la vista nació.

Pero `20260928150000_perfiles.sql` la había ampliado después con el cargo, las horas asignadas y las imputadas. Recrearla desde la copia vieja las borró, y la pantalla de equipo pasó a enseñar «0,0 de — h» para todo el mundo.

Nadie lo vio en pantalla: «0,0 de — h» parece un dato vacío legítimo. Lo cogió una prueba que esperaba «de 80 h» después de asignar ochenta horas.

**La regla:** buscar el nombre de una vista devuelve la migración donde nació, que casi nunca es la que manda. Antes de recrearla hay que mirar **todas** las migraciones que la tocan y partir de la última.

## 2026-09-30 · Calentar las rutas sin sesión no calienta nada

Había un calentamiento en el arranque de las pruebas, puesto justamente para que Next compilara las páginas antes de que la primera prueba las pidiera. Pedía las rutas con un `fetch` **sin cookies**: todas devolvían la redirección a `/entrar` y la página de verdad no llegaba a compilarse nunca.

O sea, el remedio estaba escrito, comentado y explicado, y no hacía lo que decía. Los plantones de treinta segundos siguieron saliendo, solo que de tarde en tarde y por eso más difíciles de atribuir: una pasada tardaba 2,2 minutos y la siguiente 5, con dos fallos en sitios distintos.

Ahora el arranque abre un navegador, entra como dirección y como fundadora, y visita las rutas de cada una. Las pasadas pasan a durar lo mismo y la suite pasa dos veces seguidas, que es la condición.

**Lo general:** una mitigación que no se comprueba es una creencia. Si el arranque dice que calienta, hay que mirar si la respuesta que recibe es la página o un 307.

## 2026-09-30 · Estaba lento porque el código corría en Washington

Rodrigo notó que la plataforma iba lenta y propuso moverla a AWS. La causa no era el alojamiento.

La cabecera lo decía:

```
x-vercel-id: cdg1::iad1::…
```

`cdg1` es el borde de París, que es el que recibe la petición. Pero **`iad1` es Washington**, y ahí es donde se ejecutaba el código. La base está en Fráncfort. O sea que cada consulta SQL cruzaba el Atlántico: unos 90 ms de ida y vuelta.

Y no es una consulta por página. `leerCartera` resuelve **compañía por compañía** con `leerCompania`, que hace dieciséis consultas cada una. Van en paralelo entre compañías, pero eso siguen siendo dieciséis viajes transatlánticos encadenados por carga de cartera: más de un segundo solo en latencia, antes de calcular nada.

Se arregla con tres líneas en `vercel.json`: `"regions": ["fra1"]`. Medido en `/entrar`, que apenas toca la base, el primer byte pasó de 302 a 231 ms —unos 70 ms, que es justo un viaje ahorrado—, y en las pantallas que consultan de verdad el ahorro se multiplica por dieciséis.

**Mover a AWS no habría arreglado esto**, y podría haberlo empeorado: el problema no era quién aloja, sino que el cómputo y los datos estaban en continentes distintos. Poner la aplicación en AWS Fráncfort daría la misma mejora que estas tres líneas, a cambio de mantener la infraestructura a mano.

Lo que queda por ahí, y es de otra naturaleza: dieciséis consultas por compañía es un patrón N+1. Con la latencia en cinco milisegundos ya no duele, pero el día que la cohorte tenga treinta compañías volverá a doler. Está anotado en el propio `leerCartera`: si crece, pasa a una vista materializada.

**Lo general:** «va lento» tiene casi siempre una causa concreta y medible. Antes de cambiar de plataforma conviene mirar la cabecera.

## 2026-10-01 · El embudo de selección: todo lo que pasa antes de ser compañía

La plataforma empezaba cuando una startup ya estaba dentro. Pero el trabajo empieza mucho antes: se abre una convocatoria, se presentan, se revisa lo que mandan, hay una reunión, hay un comité que escribe un informe y decide, se firma un NDA, se hace el due diligence, se propone un acuerdo con su equity, y solo entonces —si se firma— hay compañía. Todo eso vivía en Drive y en la cabeza de quien lo llevaba.

### Tabla aparte, no compañía desde el día cero

Fue la decisión de arquitectura, y hay tres razones:

- **La mayoría de las candidaturas no llegan a compañía.** Meterlas en `companies` llenaría la cartera de proyectos que no existen, y la cartera es la lista de lo que IWL acompaña.
- **Una candidata no tiene equipo con cuenta.** Todo el aislamiento se apoya en `company_members`, y ahí no habría a quién dar acceso.
- **Lo que se quiere saber de una candidata** —por qué se descartó, en qué paso, cuánto tardó— no tiene sitio en la ficha de una compañía.

Al firmar, la candidatura crea su compañía con `app.crear_compania`, que es la misma puerta que el alta manual, y se queda apuntando a ella. Así una compañía nacida del embudo es idéntica a cualquier otra, y de cualquiera se puede llegar a cómo entró.

### El descarte guarda desde dónde se cayó

`descartada_desde` además del motivo. Sin eso, «descartada» solo dice que no entró; con eso se puede ver que la mitad se caen antes del comité, que es el tipo de cosa por la que se cambia un proceso. La pantalla lo enseña agregado.

### El formulario público no es un `insert` con política para `anon`

Es la parte delicada. Quien se presenta no tiene cuenta, así que hace falta dejar escribir a `anon`. Una política de `insert` sobre la tabla dejaría a cualquiera con la clave pública —que va en el navegador de todo el mundo— darse de alta **ya preseleccionada**, o con un equity pactado, o en una cohorte cerrada.

En su lugar hay una función `security definer` que recibe solo los campos del formulario y pone ella la cohorte, el estado inicial y las fechas. `anon` tiene permiso sobre esa función y sobre nada más: no puede leer ni su propia candidatura.

Las envolturas públicas de esas dos funciones van en `security definer`, al revés que el resto. `anon` no tiene USAGE sobre el esquema `app` y no conviene dárselo: le abriría todas las funciones de ahí.

Hay además una trampa para robots —un campo invisible— y, si viene relleno, se responde que todo ha ido bien sin guardar nada. Decirle que se le ha visto solo le enseña a esquivarla.

### El histórico lo escribe la base

Los cambios de paso los registra un disparador, no la pantalla. Así el recorrido de una candidatura está completo aunque alguien la mueva desde otro sitio, y «cuánto lleva en comité» es un dato y no una reconstrucción.

### Lo que encontré por el camino

**`numeroOpcional` no toleraba que el campo faltara.** `z.string()` con un campo que el formulario no envía recibe `undefined` y falla, y el formulario entero devolvía «revisa los campos marcados» sin marcar ninguno. `.optional()` va antes del transform, igual que en `textoOpcional`.

**El constraint `firmada_tiene_compania` hizo bien su trabajo y rompió mi limpieza.** Borrar la compañía deja `company_id` en nulo por la clave ajena, y entonces la candidatura sigue siendo `firmada` sin compañía. Había que borrar la candidatura primero. La regla estaba bien; el orden, mal.

## 2026-10-01 · Un formulario no vive dentro de una condición que su propio éxito vuelve falsa

Cuatro veces el mismo fallo en dos días: el logo al subirlo, el logo al quitarlo, firmar una candidatura y descartarla.

El mensaje de resultado vive **dentro** del `<Formulario>`. Si al acabar bien el formulario se desmonta —porque el panel se cierra solo, o porque la rama que lo envolvía deja de cumplirse— se lleva su propia confirmación. La acción funciona y parece no haber hecho nada.

Y es un patrón que aparece solo: un panel de «descartar» se enseña a las que no están descartadas, uno de «firmar» a las que no han firmado. El éxito de la acción es exactamente lo que hace falsa la condición.

Dos salidas, y las dos valen:

- **El formulario se queda montado** y lo que aparece y desaparece es su botón. Es lo que se hizo con el logo.
- **El acuse es la pantalla cambiada.** Después de firmar sale el bloque «Firmada» con el enlace a su ficha; después de descartar, el motivo y desde dónde se cayó. Eso informa mejor que un mensaje, y entonces **es eso lo que comprueba la prueba**, no un texto que ya no existe.

Queda en las convenciones. Lo caro no fue arreglarlo: fue encontrarlo cuatro veces, porque en pantalla —con la página actualizándose detrás— es facilísimo dar por bueno que algo ha pasado.

## 2026-10-01 · Un servidor de desarrollo que lleva horas puesto miente

Después de añadir el embudo, la suite de navegador pasó de 2,7 a entre 7 y 9 minutos, con dos o tres fallos por pasada, siempre en pruebas distintas y siempre esperas de treinta segundos. Añadir cinco pruebas no triplica una suite, así que parecía que algo del módulo nuevo había ensuciado el conjunto.

No había tal. El `next dev` llevaba horas en marcha y acumulaba treinta y cinco minutos de CPU. Matarlo, borrar `.next/cache` y volver a arrancarlo dejó la suite en **114 pruebas en 2,5 minutos, dos pasadas seguidas**.

Lo que cuesta de esto es que el síntoma apunta a donde uno acaba de tocar. Antes de buscar la causa en el código nuevo conviene descartar el entorno, que es más barato: reiniciar el servidor cuesta treinta segundos y leer un diff de mil líneas buscando un cuello de botella que no existe, una tarde.

Queda en las convenciones, al lado de la regla de pasar dos veces: **si la suite se vuelve lenta y falla en sitios que cambian, reiniciar el servidor de desarrollo antes de sospechar del código.**

## 2026-10-01 · Qué ve la candidata, y por qué dos accesos distintos

El embudo daba control a IWL y dejaba al candidato a oscuras: rellenaba el formulario, leía «recibida» y no volvía a saber nada. Rodrigo preguntó justo por eso.

Dos puertas, y cada una llega cuando hace falta:

**Un enlace privado desde que se presenta.** Una dirección con 192 bits de aleatorio. Sin cuenta ni contraseña: pedirle que se registre para ver si le han leído el pitch es pedirle demasiado, y lo que más pasa después de mandar una candidatura es acordarse de algo que faltaba. Ahí ve en qué punto está y puede añadirlo.

**Una cuenta al firmar el NDA.** Es cuando empieza a entregar material del due diligence, y es cuando un enlace deja de bastar: una dirección se reenvía y no se puede retirar. **Al dar la cuenta, el enlace se anula**, y las dos cosas van juntas en la misma función de la base para que nadie pueda hacer una sin la otra. Tener la puerta buena y la mala abiertas a la vez no es tener dos puertas.

### Cuatro momentos, no nueve pasos

A la candidata no se le enseña el estado interno. «Comité» o «due diligence» son jerga de dentro, y saber el punto exacto no le aporta nada: invita a interpretar silencios. Se agrupa en cuatro —recibida, en estudio, avanzando, cerrada— y cada uno dice en una frase qué toca.

**Y no ve el motivo del descarte.** Está escrito para decidir, no para comunicar: «el equipo no tiene perfil técnico» es una frase útil en un comité y una mala forma de enterarse. Se le dice que el proceso se cerró y que hablaréis; eso se cuenta por teléfono, no en una pantalla. Hay una prueba que comprueba que el motivo no aparece por ninguna parte.

Un enlace inventado y uno anulado dan el mismo 404. Distinguirlos le diría a quien va probando que ha acertado con una dirección real.

### Lo que salió mal, y una lección que ya estaba escrita

**`gen_random_bytes` no estaba donde la función lo buscaba.** Es de pgcrypto, y en Supabase pgcrypto vive en `extensions`, no en `public`. Una función con `search_path` fijado a `public` la tiene delante y no la ve. El error que llegaba a quien se presentaba era «la función no existe», que no señala a ninguna parte.

**Una vista congela sus columnas al crearse.** `embudo_candidaturas` se creó con `c.*`, y las columnas que añadió esta migración no aparecían. Segunda vez en el proyecto; esta vez al menos se recreó desde la definición buena.

**Y la quinta vez del formulario dentro de su propia condición.** Escribí la convención por la mañana y por la tarde construí otro. Este era el peor de todos: **el mensaje llevaba la contraseña**, que se enseña una sola vez. Darle la cuenta hacía falsa la rama que contenía el formulario, y la credencial desaparecía antes de que nadie pudiera copiarla. Arreglado en el componente, no en la prueba: el formulario se monta siempre y lo que aparece y desaparece es su contenido.

Que una regla esté escrita no impide repetirla. Lo que sí la coge es una prueba que mire el mensaje —y en este caso, que mire que la contraseña sigue en pantalla.

### Una aserción que pasaba por el motivo equivocado

`expect(error).not.toBeNull()` después de un `update` que RLS no deja pasar. No falla: una escritura sin política afecta a cero filas, y PostgREST lo devuelve como correcto. La prueba habría seguido pasando el día que la política desapareciera. Ahora comprueba que la fila no cambió.

## 2026-10-01 · Cómo entrega una candidata la documentación del due diligence

Rodrigo preguntó dónde se carga la información cuando una candidatura llega a due diligence, y la pregunta destapó que había construido media funcionalidad: la candidata podía subir ficheros a su sala de datos, pero **IWL no los veía en ninguna parte** y **nadie le decía qué mandar**. Una subida sin el otro lado es tanto como no tenerla.

### Se reutiliza el checklist que ya existe

La plataforma ya tenía un catálogo de due diligence: 7 áreas y 29 puntos, el que se aplica a las compañías. Al pasar una candidatura a NDA se instancia ese mismo catálogo.

No se inventó una lista nueva a propósito. Si la información que hace falta para decidir es la misma, la lista tiene que ser la misma: dos catálogos paralelos se desincronizan el primer mes, y entonces nadie sabe cuál es el bueno.

Se pide **al entrar en NDA**, con un disparador y no con un botón: el NDA es exactamente el momento en que se puede pedir —antes no hay confidencialidad que lo cubra— y una lista que llega tarde es una semana de correos preguntando qué hace falta.

### Cada punto lleva su propia subida

En la pantalla de la candidata, cada documento pedido tiene su propio campo. Un único «sube aquí tus documentos» obligaría a las dos partes a adivinar qué responde a qué: a ella a nombrar bien los ficheros, y a IWL a abrirlos para saberlo.

Y lo que falta va arriba. Lo entregado se queda, pero apagado: lo que se mira al abrir esa página es qué queda por hacer.

### Lo que no puede hacer la candidata

**Pedirse cosas a sí misma.** Lo que hay que entregar lo decide quien evalúa; si la candidata pudiera escribir su propia lista, «qué falta» dejaría de significar nada.

**Retirar lo entregado.** Si se equivoca de fichero sube el bueno y lo dice. Dejar que borre convierte el expediente en algo que no se puede citar en un comité.

### Las direcciones se firman al pulsar, no al pintar

Un documento entregado se abre con una dirección firmada que dura cinco minutos, generada al hacer clic. No se pintan enlaces firmados en la página: estarían en el HTML de todas las fichas abiertas, y una dirección a documentación de due diligence que vive en una pestaña olvidada es una dirección que acaba reenviada.

### Lo que queda, y es una decisión de verdad

Cuando la candidata firma, esos documentos **no pasan a la sala de datos de la compañía**. Hoy se le volvería a pedir lo mismo, y eso choca de frente con el primer principio del proyecto: un dato se introduce una vez.

No se ha hecho aquí porque copiar veintinueve ficheros entre buckets dentro de una acción de servidor roza el límite de tiempo del plan de Vercel, y conviene pensarlo antes: o se copian en segundo plano, o la ficha de la compañía lee del expediente de su candidatura sin copiar nada. Queda anotado y sin resolver.

## 2026-10-01 · Lo entregado en la selección no se vuelve a pedir

Al firmar, una candidatura se convierte en compañía y la compañía estrena su checklist de due diligence: los mismos veintinueve puntos que ya había entregado siendo candidata. Pedírselos otra vez choca con el primer principio del proyecto.

Rodrigo eligió, entre las dos salidas, **no copiar nada**: la ficha de la compañía lee del expediente de su candidatura.

Es la buena. Copiar veintinueve ficheros entre buckets dentro de una acción de servidor roza el límite de tiempo del alojamiento, duplica el almacenamiento y crea dos copias que pueden divergir. Y conceptualmente el expediente de la candidatura **es** el sitio donde pasó: es su procedencia, no un trasto heredado.

El puente lo da el catálogo. `candidatura_peticiones.item_template_id` y `dd_items.template_id` salen de la misma tabla de plantillas, así que el punto del checklist de la compañía y lo que entregó siendo candidata se reconocen sin inventar ninguna correspondencia. En la pantalla de due diligence, cada punto que ya se entregó lo dice y enlaza con el documento.

### Una política no se salta el RLS de las tablas que consulta

La primera versión de la política era una subconsulta directa:

```sql
using (exists (select 1 from candidaturas c where c.id = ... and app.can_read_company(c.company_id)))
```

Y no funcionaba desde una fundadora. Las políticas **no** son `security definer`: la subconsulta a `candidaturas` pasa por el RLS de `candidaturas`, que solo deja a IWL. Desde una fundadora, ese `exists` mira una tabla vacía y da falso siempre.

La salida es la que ya usaba el resto del proyecto sin que yo hubiera entendido del todo por qué: una función `security definer` que responde la pregunta concreta —`app.puede_ver_expediente`— y nada más. Es el mismo patrón de `app.can_read_company`.

Lo cogió una prueba que entra como fundadora de la compañía resultante. Una que solo probara con IWL habría pasado.

### Y la otra mitad: lo que no firmó sigue cerrado

Abrir el expediente al equipo de la compañía no puede abrir de paso el de las candidaturas que se quedaron por el camino. Hay una prueba que lo comprueba: una fundadora no ve los documentos de una candidatura sin firmar.

### Una limpieza que borraba la semilla

El `afterAll` de la prueba nueva hacía `delete` sobre Cauce Salud, que es una fila de la semilla. La pasada siguiente no la encontraba y fallaba **otra** prueba, de otro bloque, por un motivo sin relación aparente.

Restaurar y borrar no son lo mismo: lo que la prueba creó se borra, lo que encontró se deja como estaba.

## 2026-10-01 · Las pruebas de interfaz corren contra una compilación, no contra `next dev`

Tercera vez que la suite se degradaba: pasaba de dos minutos y medio a nueve, con dos o cinco fallos por pasada, siempre en pruebas distintas y siempre esperas de treinta segundos. La causa estaba identificada —un `next dev` de varias horas se ensucia— y el remedio era reiniciarlo a mano, que no es un remedio.

Las pruebas reutilizaban el servidor de desarrollo (`reuseExistingServer: true`), que es justamente el que se degrada. Ahora levantan **una compilación de producción en el puerto 3100**, y nunca tocan el 3000 donde vive `npm run dev`.

Lo que se gana:

- **De 3,5–8 minutos a 1,3.** Y estable: dos pasadas seguidas sin un fallo.
- **Se va el calentamiento entero.** Existía porque `next dev` compila cada ruta la primera vez que se pide; había que mantener una lista de veintitantas rutas y acordarse de ampliarla con cada pantalla nueva. Contra una compilación no hay nada que compilar. Quitar la causa salió más barato que sostener el remedio.
- **Se prueba lo que se publica.** Que es lo que encontró el fallo de abajo.

Cuesta una compilación al empezar, unos cuarenta segundos. Barato.

### Y lo que apareció en cuanto se hizo

`/presentarse` salía como `○` en la compilación: **prerenderizada**. No usa cookies ni nada dinámico, así que Next la daba por estática y la congelaba con el estado que tuviera la convocatoria el día del despliegue.

O sea: la plataforma ya publicada estaba sirviendo «no hay ninguna convocatoria abierta» de forma permanente. Abrirla desde el embudo no habría cambiado la página pública. Rodrigo lo habría descubierto repartiendo un enlace que no funcionaba.

Arreglado con `export const dynamic = "force-dynamic"`. Es una página que se pide poco y tiene que decir la verdad: renderizarla en cada petición no cuesta nada comparado con eso.

**Contra `next dev` esto no se ve nunca**, porque ahí todo es dinámico. Es exactamente la clase de fallo que solo aparece cuando se prueba lo que de verdad se publica, y la razón por la que el cambio mereció la pena el mismo día.

## 2026-10-02 · Faltaba el paso en que la candidata se presenta

Rodrigo abrió el enlace de una candidata y le daba las gracias por un material que no había mandado. Tenía razón: faltaba el paso.

Había **dos caminos** y solo uno estaba construido.

El del formulario público funcionaba: ella rellena, se crea la candidatura con lo que escribió. Pero **al terminar no recibía su enlace**: la pantalla le decía «te escribimos al correo» y no hay envío de correo montado, así que su candidatura desaparecía de su vista al cerrar la pestaña. Ahora se le enseña la dirección para que la guarde, con su botón de copiar.

El de la invitación no estaba. IWL conoce a alguien en un evento, la da de alta a mano con el nombre y un correo, y le manda el enlace. Ella llegaba a una pantalla que le agradecía algo que no había hecho y **no tenía dónde contar quién es**: la ficha la había escrito IWL con dos campos. Ahora el enlace lleva el mismo juego de campos que el formulario público, y la cabecera cambia: en vez de «Recibida, gracias» dice «Cuéntanos quiénes sois».

### Lo que distingue un camino del otro no son los campos

La primera versión miraba si faltaban datos. No sirve: una candidatura dada de alta a mano puede tener sector y descripción —escritos por IWL— y aun así ella no haber mandado nada.

Lo que lo distingue es **quién la creó**. `created_by` va relleno cuando la da de alta alguien de IWL y vacío cuando entra por el formulario público, donde lo escribió ella. Esa es la señal.

### Un `update` parcial no borra lo que ya estaba

`app.completar_candidatura` actualiza solo los campos que llegan con algo. Si IWL apuntó el sector al darla de alta y ella deja ese campo vacío, el sector se queda. Vaciar un campo a propósito es una conversación, no un descuido de formulario.

## 2026-10-02 · Una prueba que pasaba porque la fila ya estaba como ella quería

La prueba de abrir la convocatoria llevaba días pasando y empezó a fallar en cuanto otro fichero dejó la fila cerrada antes de que le tocara.

La secuencia era: pulsar Guardar, esperar al mensaje, leer la fila. El mensaje aparece en cuanto la acción devuelve, pero la fila tarda un instante más en verse desde otra conexión. O sea que la lectura era una carrera —y la ganaba solo porque la convocatoria ya estaba abierta de la pasada anterior.

Dos lecciones, y la segunda es la que cuesta:

- **Una aserción sobre un sistema externo después de una acción de interfaz se espera, no se supone.** `expect.poll` en vez de una lectura directa.
- **Una prueba que depende del estado que dejó la anterior pasa por el motivo equivocado.** Esta llevaba días en verde sin comprobar nada: la fila ya valía lo que ella esperaba.

Encontrarlo costó un rato largo, y lo que más lo alargó fue dar por hecho que el mensaje y la fila van a la vez. Separar «la acción terminó bien» de «el dato quedó escrito» es lo que hizo que el fallo señalara a dónde mirar.

### Y de paso, un fallo silencioso de verdad

`configurarConvocatoria` hacía el `update` y devolvía «Convocatoria abierta» sin mirar si había cambiado algo. Un `update` que una política no deja pasar afecta a cero filas y **no devuelve error**. Ahora pide `select` y comprueba que volvió una fila: si no, lo dice. Es la peor forma de fallar, la que parece que ha funcionado, y es la segunda vez que aparece en este proyecto.

## 2026-10-02 · La dirección que se reparte tiene que verse

Rodrigo abrió la convocatoria y no encontró por dónde se entra al formulario. Normal: **no había ningún enlace a `/presentarse` en toda la plataforma**. La ruta existía en el código y en el comentario de un panel, y para repartirla había que acordarse y escribirla a mano.

Es un error de bulto por mi parte, y de una clase concreta: construir una pantalla pública y no preguntarse cómo llega nadie hasta ella. Una página sin cuenta no sale en ningún menú —por definición, quien la usa no ha entrado— así que la única forma de que exista para el equipo es ponerla donde el equipo la va a buscar.

Ahora, al abrir la convocatoria, el embudo enseña la dirección entera con su botón de copiar y un «abrir». Está al lado de donde se abre y se cierra, que es donde se piensa en ella.

La composición de la dirección vive en `lib/direccion.ts`, porque hacía falta en dos sitios —ese enlace y el privado de cada candidata— y ya estaba duplicada. En Vercel sale de `VERCEL_PROJECT_PRODUCTION_URL`, que apunta siempre al dominio de producción aunque se esté mirando un despliegue de vista previa: el enlace que se reparte no puede ser el de una rama.

Hay una prueba que falla si deja de verse.

## 2026-10-02 · Un formulario que se vacía al fallar

Rodrigo rellenó el formulario público entero —una startup llamada dronesec—, pulsó enviar, y se encontró con «revisa los campos marcados», **ninguno marcado**, y el formulario en blanco. Todo lo escrito, perdido.

Tres fallos encadenados, y los tres daban la misma sensación de que la plataforma se había tragado el trabajo:

### Un porcentaje se escribe como lo escribe una persona

El campo pide un porcentaje y él puso `50 %`. También habría puesto `33,3`. `Number()` devuelve `NaN` con las dos cosas, así que la validación lo rechazaba sin más.

Ahora hay `numeroEscritoAMano()`: quita el signo de porcentaje y los espacios, cambia la coma por el punto, y entonces convierte. Si después de eso sigue sin ser un número, es que de verdad no lo es. Pedirle a alguien que escriba un número «bien» cuando el ordenador puede entenderlo es trasladarle un problema nuestro.

### Si algo falla, se dice cuál

El mensaje decía «revisa los campos marcados» y no había ninguno marcado: los `<Campo>` del formulario público no estaban conectados a sus errores. Dos arreglos: los once campos llevan ya el suyo, y el mensaje de cabecera **nombra los campos**, con las palabras de la pantalla y no con el nombre de la columna. «Revisa este campo: liderazgo femenino» sirve aunque el marcado se pierda de vista al hacer scroll.

Solo los nombra si sabe decirlos **todos** en castellano, y si no vuelve al genérico. Las columnas van en inglés —es la convención de Postgres— y un diccionario de ciento y pico entradas no se mantiene; enseñar `evidence_url` sería peor que no decir nada, porque además suena a avería. Están los del formulario público, que es el que rellena gente de fuera.

### Y lo escrito se queda donde estaba

Esto no era de esta pantalla: **React 19 reinicia un formulario no controlado después de cada acción**. Es lo que se quiere cuando la acción va bien —el formulario queda limpio para lo siguiente— y es lo peor que puede pasar cuando va mal.

`<Formulario>` guarda ahora lo enviado y lo devuelve a su sitio cuando el resultado no es `ok`. Los ficheros no: el navegador no deja escribir el valor de un `input[type=file]`, así que ese sí hay que volver a elegirlo.

Va en el componente común a propósito. Era un agujero de **todos** los formularios de la plataforma, no del público, y arreglarlo en uno solo habría dejado los otros quince esperando a que alguien se encontrara con lo mismo.

## 2026-10-02 · Restablecer una contraseña: estaba, no se encontraba, y no funcionaba

Rodrigo dijo que no había forma de resetear contraseñas desde el panel. La
había —`/admin/personas`, en la fila de cada persona— y eso ya es un fallo:
una función que no se encuentra no existe. Pero al mirarla de cerca había dos
cosas peores.

### Escrita igual que las otras cuatro

«Poner contraseña» era uno de cinco enlaces grises de 12 px —Editar, Corregir
el correo, Poner contraseña, Archivar, Borrar— y en la primera fila caía justo
detrás de una frase explicativa igual de gris. El ojo pasaba por encima.

Ahora lleva icono de llave en magenta y el texto en el color del titular. Es
la única de la fila que destaca, **a propósito**: a las demás se llega estando
ya aquí, y a esta se viene buscándola, normalmente con alguien al teléfono que
no puede entrar.

Y cambia el verbo según el caso: «Poner contraseña» si no ha entrado nunca,
«Restablecer contraseña» si ya entró. Es la palabra que uno busca, y el dato
ya estaba —`correo_editable` es exactamente `last_sign_in_at is null`.

### El panel se cerraba y se llevaba la contraseña

Cuarta vez que aparece el mismo fallo, y la más cara. El `<Formulario>` vivía
dentro de `if (abierto)` y el `onOk` hacía `setAbierto(false)`: al guardar se
desmontaba y se llevaba por delante el acuse **y la contraseña recién
generada**. Pulsabas Generar, pulsabas Guardar, y el panel se cerraba sin
decir nada. Parecía que no había funcionado; había funcionado del todo, que es
peor: la cuenta quedaba con una contraseña que no sabía nadie.

Ahora el panel se queda puesto hasta que se pulsa Hecho, con la contraseña a
la vista, en monoespaciado y con botón de copiar.

### Y la propia no se cambia desde ahí

Al probarlo salió una tercera, que no se buscaba. Restablecerse **la propia**
contraseña desde el panel te echa: va por la clave de servicio, y cambiar así
una contraseña invalida las sesiones de esa persona. El servidor te saca en el
mismo instante en que se guarda, así que la contraseña nueva queda puesta y no
se enseña nunca. Te quedas fuera de tu propia cuenta —y si eres la única
dirección, no hay quien te la vuelva a poner.

En esa fila ya no sale el botón: sale «Tu contraseña se cambia en Mi cuenta»,
que va por el cliente de sesión y la renueva sin tirarte.

### Lo que sigue sin haber

No hay «he olvidado mi contraseña». Hace falta un proveedor de correo, que se
dejó para más adelante a propósito. Mientras tanto, quien se queda fuera se lo
pide a la dirección y esto es lo que la dirección usa.

## 2026-10-02 · Nueve correcciones de Rodrigo, probando la plataforma

### Lo pulsable, por tercera vez

«Siguen sin parecer botones, solo te das cuenta si pones el mouse arriba.»
Dicho para la ficha de empresa y para administración, que resultaron ser la
misma clase CSS.

Dos convenciones no bastaban. `.pestana` inactiva era texto gris suelto y
`.accion` era un subrayado discontinuo: las dos solo se delataban al pasar
el ratón, y **en una pantalla táctil no hay ratón que pasar**. Ahora las dos
llevan cápsula con borde y superficie, visibles en reposo.

La lección, que ya iba por la tercera vuelta: un subrayado distingue un
enlace de un párrafo, pero no distingue un control de un enlace. Cuando hay
cinco acciones seguidas en una fila, lo que hace falta es que se vean cinco
controles.

Y los iconos de sección llevan tono propio —cielo, lila, menta, durazno—
que se pasa al acento cuando la pestaña está abierta. Decorativo y nada
más: el rótulo va siempre al lado.

### El amarillo de la web, de vuelta, con una condición

Se dejó fuera en su día para no meter un segundo color cromático en los
gráficos. Vuelve como `--color-filete-marca`, un pelo de 1 px bajo el
título de cada bloque, y **no entra en ningún gráfico**. No lleva
información: es el acabado de un borde, así que la regla de los gráficos
—una sola serie cromática, el resto por relleno, trazo y etiqueta— queda
intacta.

### «Graduación» no era la palabra

La fase 3 se llamaba «Cierre y graduación». Esto no es una escuela y lo que
termina es un proceso de aceleración. Pasa a «Fin del programa», en una
migración y no solo en la semilla: la semilla inserta con `on conflict do
nothing` y en la nube no habría cambiado nada.

### El due diligence técnico era un callejón sin salida

Rodrigo preguntó cómo se carga la información de esa sección. La respuesta
era: no se puede. La pantalla decía «todavía no hay una evaluación técnica
publicada» y no había forma de abrir una; las tres que existían venían de la
semilla, así que **cualquier compañía nueva se quedaba con el módulo central
muerto para siempre**.

Faltaban dos cosas y sobraba una. Faltaban abrir y publicar. Y sobraba un
filtro: la vista leía solo `status = 'publicada'`, así que escondía el
borrador a su propio autor. Ahora no filtra y manda RLS, que ya decía
exactamente lo que había que decir —quien evalúa ve el borrador, la
compañía no—.

Al abrirla se repitió por **quinta vez** el formulario que vive dentro de
una condición que su propio éxito vuelve falsa. Aquí la salida buena es la
documentada: el acuse es la pantalla cambiada. Donde había un hueco aparece
el scorecard con su aviso de borrador, y eso es lo que comprueba la prueba.

### Subir un documento desde su propia línea

El data room tenía un único formulario al final de la página donde había que
volver a elegir el área y el punto que ya estabas mirando. En una checklist
de treinta líneas, eso es bajar y buscar treinta veces.

Y la transición cambia: subir deja el punto **en revisión**, no en
«entregado». Entregar y que alguien lo mire son dos cosas, y la segunda es
la que le interesa saber a quien acaba de subir el fichero. Desde ahí solo
lo mueve IWL, y lo impone un disparador, no la pantalla.

El disparador lleva `auth.uid() is not null`: sin sesión no hay a quién
restringir, y la clave de servicio ya se salta el RLS entero por diseño.
Bloquearla no protegía nada y sí impedía que una prueba dejase las cosas
como las encontró.

Sobre apuntar todos a un Drive con una carpeta por candidato: no hace
falta. El data room ya es privado, con enlace firmado por consulta, versiones
y registro de accesos. Un Drive compartido da menos y hay que mantenerlo a
mano.

### La comparativa eran dos hojas de cálculo

«Poco clara», y con razón: dos tablas anchas de las que había que sacar las
conclusiones a ojo. Ahora son tres gráficos, cada uno con una pregunta por
título:

- **¿Quién va por delante?** — no niveles brutos, sino **cuánto lleva cada
  una de lo que exige su etapa**, en porcentaje. Es la única forma honesta
  de ponerlas en la misma barra: un 2 en pre-semilla y un 2 en serie A no
  significan lo mismo. 100 es llegar.
- **¿Dónde flojea la cohorte?** — brecha media por dimensión, lo peor
  arriba, con cuántas compañías están por debajo. Si fallan varias en lo
  mismo es trabajo de programa; si falla una, de su mentoría.
- **¿A quién se le acaba el dinero?** — el gráfico de runway que ya existía.

La tabla no se borra: baja al final como «Las cifras, una a una». Los
gráficos contestan preguntas; la tabla sirve para cuando hace falta el dato
exacto. Arriba estorbaba porque era lo primero que se veía y no contestaba
nada.

### Administración de personas: una lista para buscar, una ficha para leer

La lista llevaba dentro todo lo que se sabe de cada persona —cargo, áreas,
biografía, cada asignación con sus horas, sus tareas y sus fechas— y con
diecinueve personas era un muro por el que no se podía buscar a nadie.

La lista se queda con nombre, posición, correo y dónde está asignada. Todo
lo demás vive en `/admin/personas/<id>`. En una lista se busca; lo que esa
persona es se lee cuando ya la has encontrado.

### Adjuntar, no extraer

Rodrigo pidió cargar un business plan ya hecho y que el sistema extrajera la
información a sus secciones, y lo mismo con un CV o un LinkedIn. Se le
ofrecieron tres caminos y eligió el de adjuntar sin IA.

Es la decisión correcta por ahora: extraer necesita una IA leyendo
documentos, con su dependencia, su clave y su coste por uso, y lo que
resuelve de verdad —no volver a buscar el documento en un correo de hace
meses— se consigue adjuntándolo.

Dos sitios distintos porque son dos cosas distintas. El business plan es de
una compañía y vive en `documents`, que ya tiene versiones, caducidad y
registro de accesos; solo le faltaba una columna `kind` para poder decir
«este documento es EL business plan», con índice único porque es singular.
El CV es de una persona, y `documents` cuelga de una compañía: va a su
propio bucket con la misma forma que el logo. Lo ve IWL y su dueña, nadie
más: un CV es un documento personal, no un dato del programa.
