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
