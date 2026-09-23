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

En local el correo no sale a internet: Supabase lo captura en Inbucket. Pide el enlace mágico desde `/entrar` con cualquiera de los correos de la semilla y ábrelo desde la bandeja local, en el puerto que indique `npx supabase status` (`Inbucket URL`).

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
```

Antes de cerrar un paso: `npm run typecheck && npm run lint && npm run test && npm run test:rls`.

## Base de datos

Las migraciones están en `supabase/migrations`, en orden cronológico. Los datos semilla, en `supabase/seed`:

- `01_config.sql` · configuración real del programa: fases, pilares, áreas de due diligence con su checklist, dimensiones técnicas con criterios y niveles objetivo, secciones de business plan, biblioteca de KPI y reglas de alerta.
- `02_companies.sql` · tres compañías ficticias de sectores distintos y las personas que las acompañan.
- `03_actividad.sql` · actividad de los últimos meses.

Toda tabla de negocio nace con Row Level Security y sus políticas en la misma migración. `npm run test:rls` lo comprueba entrando como cada persona.

## Despliegue

Vercel en región UE, con Supabase en región UE. Pendiente de configurar: ver `DECISIONES.md`.
