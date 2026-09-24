-- =============================================================================
-- 007 · Movimiento: instantáneas de preparación en el tiempo
--
-- Hasta aquí la plataforma enseñaba la foto de hoy. Un score de 94 no dice si
-- la compañía viene de 71 o de 98, y para un programa de aceleración lo que
-- importa no es el nivel sino el recorrido (§4.4, «con evolución en el
-- tiempo»).
--
-- Una instantánea congela los dos scores y el estado invertible en una fecha.
-- Congela de verdad: no se recalculan al cambiar la configuración, porque
-- entonces dejarían de ser historia y pasarían a ser una opinión de hoy sobre
-- el pasado. La primera instantánea de cada compañía es su línea base.
-- =============================================================================

create type motivo_instantanea as enum (
  'linea_base',     -- primera medición, al entrar en el programa
  'evaluacion',     -- se ha publicado una evaluación técnica
  'mensual',        -- cierre del update del mes
  'manual'          -- la pide el equipo de IWL
);

create table readiness_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references companies (id) on delete cascade,
  taken_on           date not null,
  -- La etapa en el momento de medir: el score se lee contra ella
  stage              company_stage not null,
  tech_score         numeric(5,1) check (tech_score between 0 and 100),
  -- Si todas las dimensiones aplicables estaban puntuadas
  tech_complete      boolean not null default false,
  preparation_score  numeric(5,1) check (preparation_score between 0 and 100),
  investable         boolean not null default false,
  open_critical      smallint not null default 0 check (open_critical >= 0),
  runway_months      numeric(6,1),
  reason             motivo_instantanea not null,
  note               text,
  created_by         uuid references profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (company_id, taken_on)
);

create index readiness_snapshots_company_idx
  on readiness_snapshots (company_id, taken_on);

-- -----------------------------------------------------------------------------
-- Vista de movimiento
--
-- Por compañía: la línea base, la última medición y la distancia entre las dos.
-- Es lo que la cartera enseña como «↑ +12,4 desde el inicio».
-- -----------------------------------------------------------------------------

create or replace view readiness_movement as
with base as (
  select distinct on (company_id)
    company_id,
    taken_on          as baseline_on,
    tech_score        as baseline_tech,
    preparation_score as baseline_preparation
  from readiness_snapshots
  order by company_id, taken_on asc
),
ultima as (
  select distinct on (company_id)
    company_id,
    taken_on          as latest_on,
    tech_score        as latest_tech,
    preparation_score as latest_preparation,
    investable        as latest_investable,
    open_critical     as latest_open_critical
  from readiness_snapshots
  order by company_id, taken_on desc
)
select
  u.company_id,
  b.baseline_on,
  b.baseline_tech,
  b.baseline_preparation,
  u.latest_on,
  u.latest_tech,
  u.latest_preparation,
  u.latest_investable,
  u.latest_open_critical,
  round(u.latest_tech - b.baseline_tech, 1)               as tech_movement,
  round(u.latest_preparation - b.baseline_preparation, 1) as preparation_movement,
  (select count(*) from readiness_snapshots s where s.company_id = u.company_id)
                                                          as snapshot_count
from ultima u
join base b on b.company_id = u.company_id;

alter view readiness_movement set (security_invoker = true);
grant select on readiness_movement to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table readiness_snapshots enable row level security;

create policy readiness_snapshots_select on readiness_snapshots
  for select to authenticated using (app.can_read_company(company_id));

-- Las escribe la aplicación al publicar una evaluación o al cerrar el mes.
-- La compañía no se toma instantáneas a sí misma: sería medirse solo cuando
-- conviene.
create policy readiness_snapshots_insert on readiness_snapshots
  for insert to authenticated with check (app.is_iwl());

-- Una instantánea no se edita. Si estuviera mal, se borra y se vuelve a tomar,
-- y eso lo hace quien administra.
create policy readiness_snapshots_delete on readiness_snapshots
  for delete to authenticated using (app.is_admin());

-- -----------------------------------------------------------------------------
-- Bandas de preparación
--
-- Un 64 no dice nada por sí solo; «en desarrollo» sí. Las bandas dan a la
-- cohorte una lectura de un vistazo y son la base del embudo (§4.7).
-- Van en configuración para que IWL las pueda mover.
-- -----------------------------------------------------------------------------

insert into platform_settings (key, value, description) values
  ('bandas_preparacion',
   '[
      {"codigo": "inicio",       "nombre": "Inicio",       "desde": 0,  "hasta": 40},
      {"codigo": "en_desarrollo","nombre": "En desarrollo","desde": 40, "hasta": 65},
      {"codigo": "consolidada",  "nombre": "Consolidada",  "desde": 65, "hasta": 85},
      {"codigo": "preparada",    "nombre": "Preparada",    "desde": 85, "hasta": 100}
    ]'::jsonb,
   'Tramos del score de preparación, para leer la cohorte de un vistazo. «Preparada» es la banda alta del score; el estado invertible es otra cosa y lo decide la sección 3 del documento, no la banda.')
on conflict (key) do nothing;
