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

Seguimiento de la cohorte de Inception Woman Lab. Dos vistas sobre los mismos
datos: la compañía ve su proyecto, IWL ve la cartera. El due diligence técnico
—que hace Niage— es el módulo central, y todo se evalúa contra la etapa de
cada compañía, no contra un ideal.

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

## Reglas que no se rompen

**Quien autoriza es la base.** Toda escritura va con el cliente de sesión. La
interfaz esconde lo que la base prohíbe, nunca al revés: si discrepan, manda la
base y en pantalla solo se vería un botón que da error. La única excepción es
crear cuentas en `auth.users`, que necesita la clave de servicio; ahí se
comprueba la autorización a mano y está comentado por qué.

**Nadie valida su propio trabajo.** Una fundadora no puntúa ni valida sus
puntos. Es criterio de aceptación y no se relaja. Para el mentor que coordina
sí se relajó, a propósito y documentado.

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

Papel blanco para la compañía, consola oscura para IWL. Un solo color de
acento, el magenta, y solo en filetes, cifras destacadas y gráficos: nunca
como fondo de un bloque de texto.

**En los gráficos, el color nunca es la única señal.** Toda serie lleva
etiqueta de texto, y se comprueba el contraste para daltonismo antes de usar
dos colores. Cuando dos series no se distinguen, se usan dos paneles o relleno
frente a trazo, no dos tonos parecidos.

**Qué se puede pulsar se ve sin pasar el ratón.** La convención, en
`globals.css`:

- `.enlace` — lleva a otra página. Subrayado fino permanente.
- `.accion` — hace algo aquí mismo. Subrayado discontinuo.
- Botón con fondo — la acción principal de un formulario.

Todo lo pulsable tiene foco visible. Quitarlo no es una opción.

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
