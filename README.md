# Plataforma IWL

Plataforma de seguimiento de la cohorte de **Inception Woman Lab**, desde que una startup se presenta hasta que se gradúa.

Antes de la cartera está el **embudo**: convocatoria, candidaturas, comité, NDA, due diligence y acuerdo. Al firmar, la candidatura crea su compañía. A partir de ahí cada compañía mantiene su business plan vivo y su due diligence vivo, reporta sus KPI cada mes y ve su avance; el equipo de IWL ve la cartera completa, entra proyecto a proyecto y mide lo que la incubadora aporta.

Dos vistas sobre los mismos datos, con un aislamiento estricto entre compañías que decide la base y no la interfaz. Se trabaja sobre papel en las dos; lo oscuro se reserva para la barra lateral y la pantalla de entrada, que es donde va la marca.

| Vista | Quién | Ve |
|---|---|---|
| Compañía | El equipo fundador | Solo su proyecto. Carga información, responde comentarios, reporta KPI |
| IWL | Equipo de IWL e ingeniería de Niage Technology | Toda la cartera, dashboard de cohorte, revisión y validación |


## Tres principios

**Carga única.** Un dato se introduce una vez. Business plan, due diligence, KPI, informes y extracto se alimentan del mismo origen. Si algo se pide dos veces, está mal modelado.

**Se evalúa contra la etapa.** El score técnico mide la distancia al nivel objetivo de la etapa (pre-semilla, semilla, serie A), nunca la distancia a la perfección. Una compañía pre-semilla con nivel 2 donde el objetivo es 2 está al cien por cien: no le falta nada para su momento.

**Nadie valida su propio trabajo.** La compañía carga, IWL valida. Lo impiden triggers en la base, no comprobaciones en la interfaz: una política decide si puedes escribir la fila, no a qué valor puedes ponerla. La única excepción, deliberada y documentada, es el mentor que coordina un proyecto: es parte de IWL y sí puntúa.

## Arranque

Requiere Node 20.9 o superior (se desarrolla con 24) y Docker.

```bash
npm install
npm run db:start     # Supabase en Docker. La primera vez descarga imágenes
npm run db:reset     # Migraciones, datos semilla, instantáneas y cuentas locales
npm run db:env       # Escribe .env.local con las claves de la instancia
npm run dev          # http://localhost:3000
```

`npm run db:stop` para el stack al terminar.

### Entrar

Con correo y contraseña. **No hay autoservicio**: el registro está cerrado y las cuentas las crea la dirección de IWL. En local, las de la semilla comparten contraseña:

```
iwl-local-2026
```

| Correo | Rol | Ve |
|---|---|---|
| `admin@iwl.test` | admin_iwl | Todo, incluida la configuración del programa |
| `programa@iwl.test` | equipo_iwl | Toda la cartera |
| `revisor@niage.test` | revisor_niage | Marea Clínica y Raíz Sensórica |
| `revisor2@niage.test` | revisor_niage | Vega Predictiva |
| `fundadora@marea.test` | fundadora | Marea Clínica |
| `fundadora@vega.test` | fundadora | Vega Predictiva |
| `fundadora@raiz.test` | fundadora | Raíz Sensórica |
| `mentor@iwl.test` | mentor | Coordina Marea Clínica, apoya en Raíz Sensórica |
| `mentor2@iwl.test` | mentor | Coordina Raíz Sensórica, apoya en Marea Clínica |
| `fundadora@agrolabx.test` | fundadora | AgrolabX, si tienes las semillas locales |
| `cto@marea.test` | fundadora | Marea Clínica, como segunda persona del equipo |

Los dos mentores están cruzados a propósito: el papel va en la asignación, no en la persona, y esa es la situación que hay que poder probar.

Hay un séptimo rol, **`candidata`**, que no tiene cuenta en la semilla: se crea sobre la marcha cuando una candidatura firma el NDA, y desaparece cuando firma el acuerdo y pasa a ser equipo fundador. Para verlo, da acceso a una candidatura desde el embudo.

### Las pantallas que se ven sin cuenta

Tres, y cada una por un motivo:

| Dirección | Quién la ve |
|---|---|
| `/entrar` | Todo el mundo |
| `/presentarse` | Quien quiere presentar su startup. Solo admite candidaturas si hay convocatoria abierta, que se abre desde **Embudo** |
| `/candidatura/<testigo>` | Una candidata, con su enlace privado. El testigo se copia desde su ficha en el embudo |

También hay enlace de entrada por correo, para quien no recuerde su contraseña. **No sale a internet**: Supabase lo intercepta y lo deja en una bandeja que corre junto a la base, en **http://127.0.0.1:54324**. La pantalla de entrada enlaza a ella cuando detecta que estás en local.

Las tres compañías de la semilla son ficticias, de sectores distintos —software, IA y hardware— y están en momentos distintos a propósito: una casi invertible, una bloqueada por un hallazgo crítico y una con un punto bloqueante.

### Tu cuenta de desarrollo

`npm run db:reset` recrea los usuarios y se lleva por delante cualquier cuenta que no esté en la semilla. Copia `.altas-locales.example.json` a `.altas-locales.json` con la tuya:

```json
[{ "correo": "tu@correo.com", "rol": "admin_iwl" }]
```

El reset la vuelve a dar de alta al terminar. El fichero no se versiona.

### Dar de alta a una persona

Lo normal es hacerlo desde **Administración → Personas**, que además permite ponerle contraseña. Desde la línea de comandos:

```bash
npm run alta -- ana@ejemplo.com equipo_iwl
npm run alta -- ana@compania.com fundadora marea-clinica fundadora
```

Genera una contraseña y la imprime al terminar. Contra un proyecto remoto, exporta antes `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

## Comandos

```bash
npm run dev            # Aplicación en local
npm run build          # Build de producción
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Cálculo de scores, métricas derivadas y formato
npm run test:rls       # Aislamiento entre compañías contra Supabase local
npm run test:e2e       # Interfaz con Playwright, escritorio y móvil
npm run db:types       # Regenera lib/supabase/database.types.ts
npm run snapshots      # Genera las instantáneas de preparación
npm run informes       # Los cuatro informes de una compañía, en PDF
npm run alta           # Alta de una persona
npm run claves         # Contraseña nueva y distinta para cada cuenta
npm run sembrar:nube   # Lleva configuración y datos locales al proyecto remoto
```

La primera vez, `npx playwright install chromium`.

Antes de cerrar un paso: `npm run typecheck && npm run lint && npm run test && npm run test:rls`.

**Tras tocar una migración**: `npm run db:reset` y `npm run db:types`, y vuelve a pasar el typecheck. Los tipos generados cambian con la versión del CLI, y un cast que valía puede dejar de valer.

## Qué hay construido

Fase 1 del documento de alcance completa, más el registro de aportación, la línea base, la hoja de ruta a medida, los informes y la administración.

| Módulo | Estado |
|---|---|
| Auth, roles y aislamiento por compañía | Completo. Contraseña, registro cerrado |
| Configuración del programa como dato | 7 áreas, 10 dimensiones con 50 criterios, niveles objetivo por etapa, 25 KPI |
| Ficha de compañía y cabecera | Completa, con movimiento desde la línea base |
| Programa, Anexo e hitos | Completo: fases, compromiso firmado, pilares e hitos con criterio |
| Aportación de IWL | Completo: horas, caja, introducciones, entregables, extracto y contador |
| Due diligence técnico | Completo: scorecard radar, puntuación con evidencia, hallazgos, plan y cuestionario |
| Due diligence general y data room | Completo: checklist, documentos con caducidad y enlaces firmados |
| Business plan | Completo: edición con versionado, estados, hipótesis y comentarios |
| KPI y update mensual | Completo: carga del mes, series y métricas derivadas |
| Dashboard IWL | Cohorte, evolución, embudo por bandas, mapa de intervención, comparativa |
| Hoja de ruta a medida | Completo: estado de entrada, plantillas por recorrido, etapas e hitos |
| Avances y aportación | Completo: dos carriles —compañía e IWL—, el lado lo decide la base |
| Madurez | Completo: pesos configurables, y lo sin medir no rellena huecos |
| Mentoría | Completo: principal coordina y puntúa, secundario tiene horas y tareas |
| Informes | Completo: técnico interno, técnico para inversor, aportación y mensual |
| Administración | Completo: compañías, personas, perfiles, recorridos, archivado, logos |
| Embudo de selección | Completo: convocatoria, formulario público, pasos con comité, NDA, acuerdo y firma, que crea la compañía |
| Lo que ve la candidata | Completo: enlace privado desde que se presenta, cuenta al firmar el NDA, y su expediente de due diligence |
| Worker de análisis de repositorios | Contrato y orquestador escritos, sin ejecutar todavía |

Fuera de esto: alertas por correo, sesiones y dedicación por pilar, informe de cohorte con exportaciones, y enlaces de solo lectura para mentores externos.

## Cómo está montado

| Capa | Elección |
|---|---|
| Aplicación | Next.js 16 (App Router) con TypeScript estricto |
| Interfaz | Tailwind CSS 4, con iconos de lucide |
| Datos, auth y ficheros | Supabase: Postgres, contraseña y enlace mágico, Storage y Row Level Security. Región UE |
| Gráficos | Recharts |
| Informes | Se imprimen desde el navegador, con CSS de impresión |
| Tests | Vitest, Playwright y tests de RLS contra Supabase local |
| Worker | Contenedor Docker con scc, Syft, Grype, OSV-Scanner, Gitleaks y Semgrep |

### Estructura

```
app/
  (fundadora)/     Vista de la compañía
  (iwl)/           Consola de cartera, embudo y administración
  informe/         Los cuatro informes, para imprimir
  presentarse/     El formulario de candidatura, sin cuenta
  candidatura/     Lo que ve una candidata: por enlace o con sesión
  entrar/ perfil/  Acceso y cuenta propia
components/
  vistas/          Una por módulo, compartidas entre las dos vistas
  formularios/     Server Actions con validación en el borde
  informe/         Piezas de los informes: portada, secciones, cifras, tablas
lib/
  scoring/         Cálculo puro y probado: scores, invertible, derivadas
  datos/           Lectura, con el cliente de sesión
  acciones/        Server Actions
supabase/
  migrations/      SQL versionado, con las políticas de RLS
  seed/            Configuración real y tres compañías ficticias
worker/            Analizador de repositorios. No guarda código
```

### Decisiones que conviene conocer antes de tocar nada

**El cálculo vive en un solo sitio.** `lib/scoring` es puro y con tests de tabla. La interfaz nunca recalcula, y el script que genera el histórico usa el mismo código: una función SQL habría sido más corta y habría creado una segunda implementación que acabaría divergiendo.

**Las instantáneas están congeladas.** Cambiar los niveles objetivo no reescribe la historia. Si lo hiciera, una compañía «mejoraría» sin haber tocado nada.

**Las tarifas se copian, no se referencian.** Cada línea de horas guarda la tarifa del día en que se imputó, así un cambio de tarifa no altera el valor de lo ya registrado.

**Las plantillas se copian al instanciar.** Checklist, business plan y hojas de ruta. Editar la plantilla no toca lo que está en marcha, y al revés.

**Archivar conserva, borrar es solo para lo vacío.** Una compañía con actividad no se borra: se archiva y deja de aparecer, incluso para su propio equipo.

**El rol de una cuenta no lo pide quien se registra.** Toda cuenta nace con el de menos alcance; quien deba tener otro lo recibe después, con la clave de servicio. El porqué está en `DECISIONES.md`, y cuesta poco leerlo.

**Nunca negro puro, y dos registros de color.** El lienzo oscuro es carbón: con `#000000` no queda sitio por debajo y ninguna tarjeta se levanta. Los gráficos usan un solo color cromático y distinguen las series por relleno, trazo y etiqueta; los iconos y chips tienen paleta propia, con la condición de que el color nunca sea la única señal.

**Los logos viven en un bucket privado.** Se guarda la ruta y la dirección se firma al leer, como el data room. Un logo no es secreto, pero la lista de quién está en la cohorte sí: un bucket público con rutas predecibles deja enumerarla.

**Una candidatura no es una compañía.** La mayoría no llegan, no tienen equipo con cuenta, y lo que importa de ellas —por qué se descartó y en qué paso— no cabe en la ficha de una compañía. Viven en sus propias tablas y crean la compañía al firmar, por la misma puerta que el alta manual.

**Lo entregado en la selección no se copia.** Al firmar, la ficha de la compañía lee del expediente de su candidatura: `candidatura_peticiones.item_template_id` y `dd_items.template_id` salen del mismo catálogo, así que cada punto reconoce lo suyo. Copiar duplicaría el almacenamiento y crearía dos copias que divergen.

**El worker no almacena código.** Clona en un contenedor efímero, analiza y borra en un `finally`. De un secreto detectado se guarda el tipo y la ubicación, nunca el valor.


## Base de datos

Las migraciones están en `supabase/migrations`, en orden cronológico. Toda tabla de negocio nace con RLS y sus políticas en la misma migración: una tabla sin políticas es un fallo, no un pendiente. `npm run test:rls` lo comprueba entrando como cada persona.

Los datos semilla, en `supabase/seed`:

- `01_config.sql` · la configuración real del programa, y las organizaciones
- `02_companies.sql` · tres compañías ficticias y quienes las acompañan
- `03_actividad.sql` · seis meses de actividad
- `04_historico.sql` · evaluaciones sucesivas, para que el movimiento enseñe un recorrido
- `05_hoja_de_ruta.sql` · plantillas de recorrido y planes instanciados
- `06_avances.sql` · avances de los dos lados y partidas de aportación
- `07_anexos.sql` · Anexos firmados, con sus compromisos
- `08_mentoria.sql` · mentores cruzados, con horas y tareas

Y, dentro de `02_companies.sql`, seis candidaturas de demostración: una en cada punto del embudo, más una firmada y una descartada con su informe de comité. Hacen falta para que el embudo se pueda mirar y para que las pruebas tengan sobre qué trabajar.

`supabase/seed/local/*.sql` se aplica al final y **no se versiona**: es donde van los proyectos reales, cuyos Anexos llevan importes, tarifas y porcentajes de equity. Ver `supabase/seed/local.LEEME.md`.

## Publicar

En marcha en **https://iwl-platform.vercel.app**, con la base en Supabase,
región de Fráncfort.

**Un `git push` no publica.** El proyecto de Vercel no está conectado al
repositorio, así que se despliega a mano y en este orden:

```bash
npx supabase db push     # la base primero: el código nuevo pide columnas nuevas
npx vercel --prod        # y después el código
```

Al revés, la web queda unos minutos pidiendo algo que todavía no existe. Cómo
comprobar que ha entrado de verdad —sin fiarse de que el despliegue diga
«Ready»— y cómo levantar otra instalación, en `DESPLIEGUE.md`.

## Documentación del proyecto

- **Guía de uso** · cómo se usa la plataforma, para quien la va a usar:
  https://claude.ai/code/artifact/f95a0370-aa0c-48e1-8eaf-f365b2ee8399
  No vive en el repositorio a propósito: va dirigida a las fundadoras y a
  los mentores, que no lo abren, y se comparte como enlace.
- `CLAUDE.md` · convenciones, comandos y reglas de trabajo
- `DECISIONES.md` · cada decisión técnica o de producto, con su motivo
- `DESPLIEGUE.md` · cómo ponerla en internet, paso a paso
- `IWL_Doc_EspecPlataformaSeguimiento_ES_v2_20260923.md` · el alcance
