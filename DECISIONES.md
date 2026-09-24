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

## 2026-09-23 · Sin modo oscuro

La identidad de IWL (§8) es papel blanco con texto en zinc. Un modo oscuro obligaría a una segunda paleta que el documento no define y que cambiaría el uso del acento magenta. Se fija `color-scheme: light` y se retira el bloque `prefers-color-scheme` del scaffold. Si más adelante se quiere, se decide paleta antes de implementarlo.

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
