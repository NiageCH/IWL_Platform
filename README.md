# Plataforma IWL

Plataforma de seguimiento de la cohorte de **Inception Woman Lab**. Cada compañía mantiene su business plan vivo y su due diligence vivo, reporta sus KPI cada mes y ve su avance en el programa. El equipo de IWL ve la cartera completa, entra proyecto a proyecto y mide lo que la incubadora aporta.

Dos vistas sobre los mismos datos, con un aislamiento estricto entre compañías que decide la base y no la interfaz.

| Vista | Quién | Ve |
|---|---|---|
| Compañía | El equipo fundador | Solo su proyecto. Carga información, responde comentarios, reporta KPI |
| IWL | Equipo de IWL e ingeniería de Niage Technology | Toda la cartera, dashboard de cohorte, revisión y validación |

## Tres principios

**Carga única.** Un dato se introduce una vez. Business plan, due diligence, KPI, informes y extracto se alimentan del mismo origen. Si algo se pide dos veces, está mal modelado.

**Se evalúa contra la etapa.** El score técnico mide la distancia al nivel objetivo de la etapa (pre-semilla, semilla, serie A), nunca la distancia a la perfección. Una compañía pre-semilla con nivel 2 donde el objetivo es 2 está al cien por cien: no le falta nada para su momento.

**Nadie valida su propio trabajo.** La compañía carga, IWL valida. Lo impiden triggers en la base, no comprobaciones en la interfaz: una política decide si puedes escribir la fila, no a qué valor puedes ponerla.

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

**El correo no sale a internet.** Supabase lo intercepta y lo deja en una bandeja que corre junto a la base, en **http://127.0.0.1:54324**. La pantalla de entrada enlaza a ella cuando detecta que estás en local.

1. Abre http://localhost:3000/entrar
2. Escribe uno de los correos de abajo y pulsa **Enviar enlace de entrada**
3. Abre la bandeja y pincha el enlace del mensaje

| Correo | Rol | Ve |
|---|---|---|
| `admin@iwl.test` | admin_iwl | Todo, incluida la configuración |
| `programa@iwl.test` | equipo_iwl | Toda la cartera |
| `revisor@niage.test` | revisor_niage | Marea Clínica y Raíz Sensórica |
| `revisor2@niage.test` | revisor_niage | Vega Predictiva |
| `fundadora@marea.test` | fundadora | Marea Clínica |
| `fundadora@vega.test` | fundadora | Vega Predictiva |
| `fundadora@raiz.test` | fundadora | Raíz Sensórica |
| `mentor@iwl.test` | mentor | Marea Clínica |

Las tres compañías de la semilla son ficticias, de sectores distintos —software, IA y hardware— y están en momentos distintos a propósito: una casi invertible, una bloqueada por un hallazgo crítico y una con un punto bloqueante.

### Tu cuenta de desarrollo

`npm run db:reset` recrea los usuarios y se lleva por delante cualquier cuenta que no esté en la semilla. Copia `.altas-locales.example.json` a `.altas-locales.json` con la tuya:

```json
[{ "correo": "tu@correo.com", "rol": "admin_iwl" }]
```

El reset la vuelve a dar de alta al terminar. El fichero no se versiona.

### Dar de alta a una persona

```bash
npm run alta -- ana@ejemplo.com equipo_iwl
npm run alta -- ana@compania.com fundadora marea-clinica fundadora
```

Contra un proyecto remoto, exporta antes `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

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
```

La primera vez, `npx playwright install chromium`.

Antes de cerrar un paso: `npm run typecheck && npm run lint && npm run test && npm run test:rls`.

## Qué hay construido

Fase 1 del documento de alcance, completa, más el registro de aportación y la línea base del documento complementario.

| Módulo | Estado |
|---|---|
| Auth, roles y aislamiento por compañía | Completo |
| Configuración del programa como dato | 7 áreas, 10 dimensiones con 50 criterios, niveles objetivo por etapa, 25 KPI |
| Ficha de compañía y cabecera | Completa, con movimiento desde la línea base |
| Programa, Anexo e hitos | Completo: fases, compromiso firmado, pilares e hitos con criterio |
| Aportación de IWL | Completo: horas, caja, introducciones, entregables, extracto y contador |
| Due diligence técnico | Completo: scorecard radar, puntuación con evidencia, hallazgos, plan y cuestionario |
| Due diligence general y data room | Completo: checklist, documentos con caducidad y enlaces firmados |
| Business plan | Completo: edición con versionado, estados, hipótesis y comentarios |
| KPI y update mensual | Completo: carga del mes, series y métricas derivadas |
| Dashboard IWL | Lectura de cohorte, evolución, embudo por bandas, mapa de intervención, comparativa |
| Worker de análisis de repositorios | Contrato y orquestador escritos, sin ejecutar todavía |

Fuera de esto: informes en PDF, alertas por correo, sesiones y dedicación por pilar, pantalla de administración, y el rol de mentor con enlaces de solo lectura.

## Cómo está montado

| Capa | Elección |
|---|---|
| Aplicación | Next.js 16 (App Router) con TypeScript estricto |
| Interfaz | Tailwind CSS 4 |
| Datos, auth y ficheros | Supabase: Postgres, enlace mágico, Storage y Row Level Security. Región UE |
| Gráficos | Recharts |
| Tests | Vitest, Playwright y tests de RLS contra Supabase local |
| Worker | Contenedor Docker con scc, Syft, Grype, OSV-Scanner, Gitleaks y Semgrep |

### Estructura

```
app/
  (fundadora)/     Vista de la compañía, en claro
  (iwl)/           Consola de cartera, en oscuro
components/
  vistas/          Una por módulo, compartidas entre las dos vistas
  formularios/     Server Actions con validación en el borde
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

**El worker no almacena código.** Clona en un contenedor efímero, analiza y borra en un `finally`. De un secreto detectado se guarda el tipo y la ubicación, nunca el valor.

**Un solo color cromático.** Los gráficos usan el acento como única serie y diferencian por etiqueta de texto; las referencias van en trazo discontinuo gris. La paleta se valida contra cada superficie antes de usarla.

## Base de datos

Las migraciones están en `supabase/migrations`, en orden cronológico. Toda tabla de negocio nace con RLS y sus políticas en la misma migración: una tabla sin políticas es un fallo, no un pendiente. `npm run test:rls` lo comprueba entrando como cada persona.

Los datos semilla, en `supabase/seed`:

- `01_config.sql` · la configuración real del programa
- `02_companies.sql` · tres compañías ficticias y quienes las acompañan
- `03_actividad.sql` · seis meses de actividad
- `04_historico.sql` · evaluaciones sucesivas, para que el movimiento enseñe un recorrido

`supabase/seed/local/*.sql` se aplica al final y **no se versiona**: es donde van los proyectos reales, cuyos Anexos llevan importes, tarifas y porcentajes de equity. Ver `supabase/seed/local.LEEME.md`.

## Documentación del proyecto

- `CLAUDE.md` · convenciones, comandos y reglas de trabajo
- `DECISIONES.md` · cada decisión técnica o de producto, con su motivo
- `IWL_Doc_EspecPlataformaSeguimiento_ES_v2_20260923.md` · el alcance

## Despliegue

Vercel en región UE, con Supabase en región UE. Pendiente de configurar.

**Antes de desplegar hay que cerrar el registro abierto.** Hoy cualquiera que escriba un correo en `/entrar` se crea una cuenta; se dejó así para poder recorrer la plataforma sin fricción. Cómo cerrarlo, y una trampa que cuesta una tarde, está en `DECISIONES.md`.
