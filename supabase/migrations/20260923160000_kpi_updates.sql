-- =============================================================================
-- 006 · Update mensual y KPI (§4.6)
--
-- La fundadora carga el KPI una vez y aparece en dashboard, plan financiero e
-- informe sin volver a introducirlo (§11). Las métricas derivadas no se
-- teclean: las calcula `lib/scoring/kpi-derivados.ts`.
-- =============================================================================

create type estado_update as enum ('borrador', 'entregado', 'revisado');

-- -----------------------------------------------------------------------------
-- company_kpis · qué KPI sigue cada compañía
--
-- El núcleo común se activa para todas; los de sector y los propios se añaden
-- por compañía. `target_value` sale del Anexo de Programa (§4.6).
-- -----------------------------------------------------------------------------

create table company_kpis (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies (id) on delete cascade,
  kpi_id         uuid references kpi_definitions (id) on delete cascade,
  -- KPI propio de la compañía, sin definición en la biblioteca
  custom_code    text,
  custom_name    text,
  custom_unit    kpi_unit,
  is_active      boolean not null default true,
  order_index    smallint not null default 0,
  created_by     uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint kpi_de_biblioteca_o_propio
    check (num_nonnulls(kpi_id, custom_code) = 1),
  constraint kpi_propio_lleva_nombre_y_unidad
    check (custom_code is null or (custom_name is not null and custom_unit is not null))
);

create unique index company_kpis_biblioteca_idx
  on company_kpis (company_id, kpi_id) where kpi_id is not null;
create unique index company_kpis_propio_idx
  on company_kpis (company_id, custom_code) where custom_code is not null;

create trigger company_kpis_touch
  before update on company_kpis
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- monthly_updates · el update del mes (§4.6)
-- -----------------------------------------------------------------------------

create table monthly_updates (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  -- Primer día del mes al que corresponde el update
  period        date not null,
  status        estado_update not null default 'borrador',
  achievements  text,
  blockers      text,
  -- Qué pide la compañía a IWL este mes
  requests      text,
  due_date      date,
  submitted_at  timestamptz,
  submitted_by  uuid references profiles (id) on delete set null,
  reviewed_at   timestamptz,
  reviewed_by   uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, period),
  constraint periodo_es_primero_de_mes check (extract(day from period) = 1)
);

create index monthly_updates_company_idx
  on monthly_updates (company_id, period desc);

create trigger monthly_updates_touch
  before update on monthly_updates
  for each row execute function app.touch_updated_at();

-- Entregar el update lo hace la compañía; revisarlo, IWL
create or replace function app.guard_revision_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'revisado'
     and (tg_op = 'INSERT' or old.status is distinct from 'revisado')
     and not app.is_iwl() then
    raise exception 'Revisar el update mensual es del equipo de IWL'
      using errcode = '42501';
  end if;

  if new.status = 'entregado' and new.submitted_at is null then
    new.submitted_at := now();
    new.submitted_by := auth.uid();
  end if;

  if new.status = 'revisado' and new.reviewed_at is null then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;

  return new;
end;
$$;

create trigger monthly_updates_guard_revision
  before insert or update on monthly_updates
  for each row execute function app.guard_revision_update();

-- -----------------------------------------------------------------------------
-- kpi_values · el dato de cada KPI en cada mes
--
-- Una fila por compañía, KPI y periodo. El update mensual es la vía normal de
-- carga, pero un valor puede existir sin update: los KPI técnicos los escribe
-- el worker de análisis (§4.6).
-- -----------------------------------------------------------------------------

create table kpi_values (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  company_kpi_id uuid not null references company_kpis (id) on delete cascade,
  update_id     uuid references monthly_updates (id) on delete set null,
  period        date not null,
  value         numeric(16,4),
  -- Objetivo del Anexo para ese mes, si lo hay (§4.6)
  target_value  numeric(16,4),
  note          text,
  -- 'manual' · 'csv' · 'analisis'
  source        text not null default 'manual',
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_kpi_id, period),
  constraint periodo_kpi_es_primero_de_mes check (extract(day from period) = 1)
);

create index kpi_values_company_periodo_idx on kpi_values (company_id, period desc);

create trigger kpi_values_touch
  before update on kpi_values
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Activar el núcleo común de KPI al dar de alta una compañía
-- -----------------------------------------------------------------------------

create or replace function app.instanciar_kpis(target_company uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  creados integer;
  perfil company_tech_profile;
begin
  select tech_profile into perfil from companies where id = target_company;

  insert into company_kpis (company_id, kpi_id, order_index)
  select target_company, k.id, k.order_index
  from kpi_definitions k
  where k.is_active
    and not k.is_derived
    and (
      k.category in ('nucleo', 'tecnico')
      or (k.category = 'sector' and k.sector = 'ia' and perfil = 'software_ia')
      or (k.category = 'sector' and k.sector = 'hardware' and perfil = 'hardware')
    )
  on conflict do nothing;

  get diagnostics creados = row_count;
  return creados;
end;
$$;

grant execute on function app.instanciar_kpis(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Vista de lectura: el valor de cada KPI con su definición resuelta
-- -----------------------------------------------------------------------------

create or replace view kpi_series as
select
  v.company_id,
  v.period,
  coalesce(k.code, ck.custom_code)   as code,
  coalesce(k.name, ck.custom_name)   as name,
  coalesce(k.unit, ck.custom_unit)   as unit,
  k.direction                        as direction,
  k.category                         as category,
  v.value,
  v.target_value,
  v.source,
  v.note
from kpi_values v
join company_kpis ck on ck.id = v.company_kpi_id
left join kpi_definitions k on k.id = ck.kpi_id
where ck.is_active;

alter view kpi_series set (security_invoker = true);
grant select on kpi_series to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table company_kpis    enable row level security;
alter table monthly_updates enable row level security;
alter table kpi_values      enable row level security;

create policy company_kpis_select on company_kpis
  for select to authenticated using (app.can_read_company(company_id));
create policy company_kpis_write on company_kpis
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

create policy monthly_updates_select on monthly_updates
  for select to authenticated using (app.can_read_company(company_id));
create policy monthly_updates_write on monthly_updates
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

create policy kpi_values_select on kpi_values
  for select to authenticated using (app.can_read_company(company_id));
create policy kpi_values_write on kpi_values
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));
