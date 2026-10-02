<!--
  Las convenciones viven aquí y no en AGENTS.md.

  Next 16 regenera AGENTS.md en cada `next dev` y, si existe, lo escribe
  encima de CLAUDE.md. Por eso AGENTS.md está en .gitignore y este fichero se
  mantiene a mano, con `agentRules: false` en next.config.ts para que Next no
  lo pise.

  Durante un tiempo este fichero contenía solo «@AGENTS.md», una importación
  de algo que nunca llegó a escribirse.
-->

# Plataforma IWL · convenciones del proyecto

Seguimiento de la cohorte de Inception Woman Lab, desde que una startup se
presenta hasta que se gradúa. Dos vistas sobre los mismos datos: la compañía ve
su proyecto, IWL ve la cartera. El due diligence técnico —que hace Niage— es el
módulo central, y todo se evalúa contra la etapa de cada compañía, no contra un
ideal.

Antes de la cartera está el **embudo**: convocatoria, candidaturas, comité,
NDA, due diligence y acuerdo. Una candidatura no es una compañía —la mayoría no
llegan— así que vive en sus propias tablas y crea la compañía al firmar.

La especificación completa está en
`IWL_Doc_EspecPlataformaSeguimiento_ES_v2_20260923.md`. Las decisiones tomadas
y por qué, en `DECISIONES.md`: **cuando algo parezca raro, mirar ahí antes de
cambiarlo**.

## Arranque

```bash
npx supabase start     # Postgres, Auth y Storage en local
npm run db:reset       # migraciones + semillas + instantáneas + cuentas locales
npm run dev            # http://localhost:3000
```

Los enlaces de entrada no salen a internet: llegan a la bandeja local en
http://127.0.0.1:54324. Las personas de prueba están en el README.

| Comando | Qué hace |
|---|---|
| `npm test` | Cálculo puro: scores, madurez, derivadas |
| `npm run test:rls` | Quién ve y escribe qué, contra la base de verdad |
| `npm run test:e2e` | La interfaz, en escritorio y en móvil |
| `npm run db:types` | Regenera los tipos tras tocar una migración |
| `npm run informes` | Los cuatro informes de una compañía en PDF |

**Tras cambiar una migración**: `npm run db:reset` y `npm run db:types`. Sin lo
segundo, TypeScript sigue con el esquema viejo.

**Una vista se recrea desde su última definición**, no desde la primera que
aparezca al buscarla. `admin_personas` se rehízo una vez a partir de una
versión vieja y perdió por el camino las horas asignadas y las imputadas;
la pantalla del equipo se quedó enseñando «0,0 de — h» sin que fallara
nada.

## Cómo está montado

- **Next 16** con App Router y Server Actions. `proxy.ts`, no `middleware.ts`.
- **Supabase**: Postgres 17 con Row Level Security, Auth por enlace mágico,
  Storage privado. PostgREST solo expone `public`; lo interno vive en `app`.
- **Tailwind 4** con tokens en `@theme`. El tema lo decide `<Marco>`.

```
lib/scoring/    Cálculo puro y probado. Sin base de datos, sin React.
lib/datos/      Lectura. Usa el cliente de sesión, así que manda RLS.
lib/acciones/   Server Actions, con Zod validando en la entrada.
components/     vistas/ (compuestas) · formularios/ (cliente) · ui/ (primitivas)
supabase/       migrations/ (ordenadas) · seed/ (versionado) · seed/local/ (no)
```

### Las tres pantallas sin sesión

Casi todo pide cuenta. Tres no, y conviene saber por qué cada una:

- `/entrar` — la puerta.
- `/presentarse` — el formulario de candidatura. Quien se presenta no tiene
  cuenta y no la tendrá hasta que firme el NDA, si llega.
- `/candidatura/<testigo>` — el enlace privado de una candidata. El testigo
  lleva 192 bits de aleatorio y va en la propia dirección.

Las dos últimas **no escriben por una política para `anon`**. Lo hacen por
funciones `security definer` que reciben solo los campos del formulario y
ponen ellas la cohorte, el estado y las fechas. Con una política de `insert`,
cualquiera con la clave pública —que va en el navegador— podría darse de alta
ya preseleccionado.

El proxy las deja pasar por nombre, y `/candidatura/` lleva barra a propósito:
sin ella abriría también `/candidatura`, que es la pantalla de quien ya tiene
cuenta.

## Reglas que no se rompen

**Quien autoriza es la base.** Toda escritura va con el cliente de sesión. La
interfaz esconde lo que la base prohíbe, nunca al revés: si discrepan, manda la
base y en pantalla solo se vería un botón que da error. La única excepción es
crear cuentas en `auth.users`, que necesita la clave de servicio; ahí se
comprueba la autorización a mano y está comentado por qué.

**Una política no se salta el RLS de las tablas que consulta.** Las políticas
no son `security definer`: una subconsulta dentro de un `using (...)` pasa por
las políticas de la tabla que lee, así que desde una fundadora puede estar
mirando una tabla vacía y dar falso siempre. Cuando una política necesita
preguntar algo sobre otra tabla, la pregunta va en una función
`security definer` que responde eso y nada más —`app.can_read_company`,
`app.puede_ver_expediente`—. Y se prueba **entrando como quien tiene menos
permisos**: una prueba que solo entra como IWL pasa en verde con la política
rota.

**Nadie valida su propio trabajo.** Una fundadora no puntúa ni valida sus
puntos. Es criterio de aceptación y no se relaja. Para el mentor que coordina
sí se relajó, a propósito y documentado.

**De un módulo `"use client"` no se llama a una función desde el servidor.**
Next lo rechaza en ejecución, no al compilar: el tipado no avisa y la
pantalla se cae con un error de servidor. Lo compartido entre los dos lados
—mapas, constantes, funciones puras— vive en `lib/`, como `lib/secciones.ts`.

**El cálculo vive en `lib/scoring`.** Una sola vez. Las instantáneas y los
informes lo reutilizan; no se reimplementa en SQL ni en un componente.

**Lo sin medir no es un cero.** Un score se reparte sobre lo que de verdad
tiene datos. Un proyecto sin evaluar tiene que parecer no evaluado, no malo.

**Lo congelado no se edita.** Líneas base, instantáneas y Anexos firmados. Las
tarifas se copian en cada línea de horas, no se referencian: cambiar una tarifa
no puede reescribir el histórico.

**Las plantillas se copian al instanciar.** Checklist, business plan y hojas de
ruta. Editar la plantilla no toca lo que está en marcha, y al revés.

**Nada identificable en el repositorio.** Nombres de compañías y personas
reales van a `supabase/seed/local/`, que está en `.gitignore`. El worker nunca
almacena código, y un secreto se registra como tipo y ubicación, jamás su
valor.

## Interfaz

**Se trabaja sobre papel; lo oscuro es la marca.** El área de trabajo va en
claro en las dos vistas. Lo oscuro se reserva para la barra lateral y la
pantalla de entrada, que es lo que da carácter sin convertir la pantalla en
una cueva. Antes la consola de IWL era oscura de arriba abajo y sobre negro
puro: se veía plana, porque sin sitio por debajo ninguna tarjeta puede
levantarse.

Una isla oscura dentro de una página clara se hace con `<Oscuro>`, que
redefine los tokens. Ningún componente sabe en qué tema está.

**Nunca negro puro.** El lienzo oscuro es carbón, `#0d0d11`, y los escalones
de superficie se separan de verdad. Con `#000000` los tres niveles iban 0 → 9
→ 24 sobre 255, una diferencia que no se ve.

**Dos registros de color, y no se mezclan:**

- **Los gráficos usan un solo color cromático**, el magenta. Las series se
  distinguen por relleno, trazo y etiqueta de texto, nunca por tono. Esto no
  se relaja: es de lo que depende que la pantalla se lea con daltonismo.
- **Los iconos, chips y estados tienen una paleta funcional** —cielo, lila,
  menta, durazno— con una condición: **el color nunca es la única señal**. Un
  chip lleva su palabra dentro, un icono lleva su rótulo al lado. Quien no
  distinga el tono lee exactamente lo mismo.

**Los valores salen de inceptionwomanlab.es**: grises de zinc, rosa `#FF007A`
y titulares en Zalando Sans Expanded, en mayúsculas y apretados. Esa
tipografía solo va en los titulares grandes: en una tabla o en un párrafo
largo cansa.

El amarillo de la web vive en `--color-filete-marca` y es **solo un filete
de 1 px** bajo el título de cada bloque. No entra en ningún gráfico: no
lleva información, es el acabado de un borde, y así la regla del color
único en los gráficos queda intacta.

Sobre papel, `#FF007A` se queda en 3,8 contra el blanco: vale para un filete
o una barra, no para leer. Ahí el texto usa `--color-acento-texto` y los
botones `--color-acento-solido`, que son el mismo tono más oscuro.

**Las etiquetas de dato van en texto normal**, no en mayúscula monoespaciada.
Lo estuvieron, encima de cada cifra y en cada esquina de bloque, y era el
rasgo que convertía la pantalla en un panel técnico de plantilla. El
monoespaciado se queda en las cifras, que es donde sirve para alinear.

**Las piezas con relieve**, en `globals.css`: `.tarjeta` (superficie, filete,
esquina y sombra), `.chip-icono` (icono en su mancha de color), `.pastilla`
(etiqueta con su palabra dentro) y `.item-lateral` (enlace de la barra). El
tono se pasa con `--tono` desde el marcado, y las clases lo toman **como
valor de reserva en el punto de uso**, no declarándolo: declararlo pierde
contra la utilidad de Tailwind, que tiene la misma especificidad y va antes
en la hoja.

Sobre papel, `#FF007A` se queda en 3,8 contra el blanco: vale para un filete
o una barra, no para leer. Ahí el texto usa `--color-acento-texto` y los
botones `--color-acento-solido`, que son el mismo tono más oscuro.

**Qué se puede pulsar se ve sin pasar el ratón.** La convención, en
`globals.css`:

- `.enlace` — lleva a otra página. Subrayado permanente, en `currentColor` al
  60 %: con un gris fijo desaparecía sobre el lienzo negro.
- `.accion` — hace algo aquí mismo. Cápsula con borde y superficie,
  visible sin pasar el ratón. Fue un subrayado discontinuo y no bastaba:
  distingue un enlace de un párrafo, no un control de un enlace.
- `.fila-enlace` — una fila o tarjeta que lleva a otro sitio: se ilumina al
  pasar y enciende una flecha, que es un enlace de verdad.
- `.pestana` — navegación. La abierta lleva fondo y color de acento.
- Botón en cápsula, en mayúsculas — la acción principal de un formulario.

`.estirado` cubre el contenedor entero, pero **solo en listas**: sobre un
`<tr>`, `position: relative` no crea bloque contenedor en todos los
navegadores y la capa acaba en otro sitio.

**Que algo se pueda pulsar no puede depender de que haya un ratón.** Las
pestañas y las acciones llevan borde y superficie en reposo. Se intentó dos
veces con señales que solo aparecían al pasar por encima —texto gris que
cambiaba de color, subrayado discontinuo— y las dos veces Rodrigo dijo que
no se notaban. En una pantalla táctil no hay `hover` que valga.

Todo lo pulsable tiene foco visible. Quitarlo no es una opción.

**Un formulario no vive dentro de una condición que su propio éxito vuelve
falsa.** El mensaje de resultado está dentro del `<Formulario>`: si al
acabar se desmonta —porque el panel se cierra solo, o porque la rama que lo
envolvía deja de cumplirse— se lleva su propia confirmación y la acción
parece no haber hecho nada. O el formulario se queda montado, o **el acuse
es la pantalla cambiada**, y entonces es eso lo que comprueba la prueba, no
un mensaje que ya no existe. Ha pasado cuatro veces: con el logo, al firmar
una candidatura, al descartarla y al restablecer una contraseña —esta la
peor, porque el mensaje llevaba la contraseña y el panel se lo llevaba al
cerrarse: quedaba una cuenta con una clave que no sabía nadie.

**Lo que se enseña una sola vez se cierra a mano.** Una contraseña recién
puesta, un testigo, cualquier cosa que no se pueda volver a consultar: el
panel se queda puesto con un botón de Hecho, nunca se cierra solo al
guardar.

**Los estados vacíos dicen qué hacer**, no que no hay nada. Y los errores se
escriben como se los diría una persona a otra: qué ha pasado y qué hacer, sin
signos de exclamación.

## Al escribir

En castellano: identificadores, comentarios, mensajes y commits. Los nombres de
tablas y columnas van en inglés, que es la convención de Postgres y de Supabase.

Los comentarios explican **por qué**, no qué. Si el qué no se entiende leyendo
el código, el problema es el código.

**Cada cambio termina con las tres suites en verde**, y las pruebas tienen que
poder pasar dos veces seguidas: la que toca configuración la restaura por fuera
del camino que prueba, y la que crea datos los limpia.

**Restaurar y borrar no son lo mismo.** Lo que la prueba creó se borra —cuentas
incluidas, que viven en `auth.users` y no se van con el perfil—; lo que
encontró se deja como estaba. Un `delete` sobre una fila de la semilla hace
fallar a otra prueba, de otro fichero, por un motivo sin relación aparente.

**La suite de interfaz corre contra una compilación**, no contra
`next dev`: `npm run build` y `next start` en el puerto 3100, cada vez. Se
hizo porque un servidor de desarrollo que lleva horas puesto se degrada —la
suite pasó de minuto y medio a ocho, fallando en sitios distintos en cada
pasada— y el síntoma apunta siempre a lo último que se tocó. Con la
compilación la suite tarda lo mismo siempre, y de paso destapó un fallo que
solo existía en producción: una página pública que se prerrenderizaba.

**Un diseño se comprueba en varios anchos, no en la ventana que uno tenga
abierta.** Sobre todo justo antes y justo después de cada punto de corte, que
es donde se rompe: una rejilla de anchos fijos que cabe a 1512 px puede
solaparse a 1180. Hay pruebas para siete anchos en `tests/e2e/interfaz.spec.ts`.
