# Plataforma IWL

Plataforma de seguimiento de la cohorte de Inception Woman Lab. Cada compañía mantiene su business plan vivo y su due diligence vivo, reporta KPI cada mes y ve su avance en el programa. El equipo de IWL ve la cartera completa y saca informes.

El alcance completo está en `IWL_Doc_EspecPlataformaSeguimiento_ES_v2_20260923.md`. Las convenciones de trabajo, en `CLAUDE.md`. Las decisiones tomadas, en `DECISIONES.md`.

## Requisitos

- Node.js 20.9 o superior. El proyecto se desarrolla con Node 24.
- Docker, para levantar Supabase en local.

## Arranque local

```bash
npm install
npm run db:start     # Levanta Supabase en Docker. La primera vez descarga imágenes
npm run db:reset     # Aplica migraciones y datos semilla
npm run db:env       # Escribe .env.local con las claves de la instancia local
npm run dev          # http://localhost:3000
```

`npm run db:stop` para el stack cuando termines.

### Entrar en la aplicación en local

**El correo no sale a internet.** Supabase lo intercepta y lo deja en una bandeja que corre junto a la base, en **http://127.0.0.1:54324**. La propia pantalla de entrada enlaza a ella cuando detecta que estás en local.

1. Abre http://localhost:3000/entrar
2. Escribe uno de los correos de la tabla de abajo y pulsa **Enviar enlace de entrada**
3. Abre http://127.0.0.1:54324 y pincha el enlace del mensaje

El enlace caduca en una hora y vale para un solo uso. Si `npm run db:reset` recrea la base, las sesiones abiertas dejan de valer y hay que pedir un enlace nuevo.

Personas de la semilla, todas con datos ficticios:

| Correo | Rol | Ve |
|---|---|---|
| `admin@iwl.test` | admin_iwl | Todo, incluida la configuración |
| `programa@iwl.test` | equipo_iwl | Las tres compañías |
| `revisor@niage.test` | revisor_niage | Marea Clínica y Raíz Sensórica |
| `revisor2@niage.test` | revisor_niage | Vega Predictiva |
| `fundadora@marea.test` | fundadora | Marea Clínica |
| `fundadora@vega.test` | fundadora | Vega Predictiva |
| `fundadora@raiz.test` | fundadora | Raíz Sensórica |
| `mentor@iwl.test` | mentor | Marea Clínica |

### Dar de alta a una persona

```bash
npm run alta -- ana@iwl.es equipo_iwl
npm run alta -- ana@compania.com fundadora marea-clinica fundadora
npm run alta -- cto@niage.es revisor_niage vega-predictiva revisor_niage
```

Crea la cuenta, le fija el rol y la asigna a una compañía. Contra un proyecto remoto, exporta antes `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

**Tu cuenta de desarrollo, para que sobreviva a `db:reset`.** Copia `.altas-locales.example.json` a `.altas-locales.json` y pon la tuya:

```json
[{ "correo": "tu@correo.com", "rol": "admin_iwl" }]
```

`npm run db:reset` la vuelve a dar de alta al terminar. El fichero no se versiona: son correos reales. Sin él, cada reset te deja fuera y acabas en la pantalla «sin compañía asignada».

Durante el desarrollo el registro está abierto: entrar con un correo cualquiera crea la cuenta, con rol `fundadora` y sin compañía, y acaba en la pantalla «sin compañía asignada». Cómo cerrarlo antes de desplegar está en `DECISIONES.md`.

## Variables de entorno

Ver `.env.example`. En local las genera `npm run db:env` desde la instancia de Supabase; no hay que copiarlas a mano ni versionarlas.

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública. Todas sus consultas pasan por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio. Solo en servidor y en el worker |
| `RESEND_API_KEY` | Correo transaccional. Fase 2 |

## Comandos

```bash
npm run dev            # Aplicación en local
npm run build          # Build de producción
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest: cálculo de scores y métricas derivadas
npm run test:rls       # Aislamiento entre compañías contra Supabase local
npm run test:e2e       # Playwright
npm run db:types       # Regenera lib/supabase/database.types.ts
npm run snapshots      # Genera las instantáneas de preparación
npm run alta           # Da de alta a una persona
```

`npm run db:reset` encadena las instantáneas: tras recrear la base, el histórico de movimiento está listo.

Antes de cerrar un paso: `npm run typecheck && npm run lint && npm run test && npm run test:rls`.

## Base de datos

Las migraciones están en `supabase/migrations`, en orden cronológico. Los datos semilla, en `supabase/seed`:

- `01_config.sql` · configuración real del programa: fases, pilares, áreas de due diligence con su checklist, dimensiones técnicas con criterios y niveles objetivo, secciones de business plan, biblioteca de KPI y reglas de alerta.
- `02_companies.sql` · tres compañías ficticias de sectores distintos y las personas que las acompañan.
- `03_actividad.sql` · actividad de los últimos meses.

Toda tabla de negocio nace con Row Level Security y sus políticas en la misma migración. `npm run test:rls` lo comprueba entrando como cada persona.

## Qué hay construido

Fase 1 del documento de alcance, pasos 1 a 8:

| Módulo | Estado |
|---|---|
| Auth, roles y aislamiento por compañía | Completo, con 45 tests de RLS y 25 de interfaz |
| Configuración del programa como dato | Completa: fases, pilares, áreas, dimensiones, KPI, alertas |
| Ficha de compañía y cabecera | Completa |
| Due diligence técnico | Completo: scorecard radar, puntuación con evidencia, hallazgos, plan de trabajo, cuestionario y sesiones |
| Due diligence general y data room | Completo: checklist con estados, subida de documentos con caducidad y enlaces firmados |
| Business plan | Completo: edición con versionado, estados, hipótesis y comentarios |
| Update mensual y KPI | Completo: carga del mes, series y métricas derivadas |
| Dashboard IWL | Lectura de apertura, preparación en el tiempo, hallazgos por severidad, meses de caja, embudo por bandas, mapa de intervención y scorecards en paralelo |
| Movimiento en el tiempo | Instantáneas congeladas, línea base, evolución de los dos scores y recorrido en la cartera |
| Comparativa | Compañías sobre la misma vara, cada una contra el objetivo de su etapa |

Quién puede escribir qué lo decide la base, no la interfaz: las políticas de Row Level Security y unos triggers que impiden que la parte evaluada se valide a sí misma. La interfaz oculta lo que la base prohíbe, nunca al revés.

Queda fuera, y es trabajo de administración por ahora: alta de compañías y edición de la configuración, que se hacen desde Supabase Studio.

Fuera de fase 1, según la §9 del documento: worker de análisis de repositorios, GitHub App, informes en PDF, Anexo de Programa e hitos, sesiones y dedicación, alertas por correo y exportaciones.

## Despliegue

Vercel en región UE, con Supabase en región UE. Pendiente de configurar: ver `DECISIONES.md`.
