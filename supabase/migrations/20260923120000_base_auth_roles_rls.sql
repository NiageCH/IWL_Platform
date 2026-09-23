-- =============================================================================
-- 001 · Base: organizaciones, perfiles, compañías, pertenencia, roles y RLS
--
-- Sección 5 del documento de alcance. Todo lo que se cree a partir de aquí se
-- apoya en las funciones de `app` para decidir quién ve y quién puede validar.
-- Regla dura: una fundadora nunca valida ni puntúa sus propios puntos.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Esquema privado para las funciones de autorización. No se expone por PostgREST.
create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enumerados
-- -----------------------------------------------------------------------------

-- Rol global de la persona en la plataforma (§5)
create type app_role as enum (
  'admin_iwl',
  'equipo_iwl',
  'revisor_niage',
  'fundadora',
  'mentor',
  'lector_externo'
);

-- Papel de una persona dentro de una compañía concreta
create type company_member_role as enum (
  'fundadora',        -- equipo fundador
  'responsable_iwl',  -- responsable de IWL asignado
  'revisor_niage',    -- revisor técnico de Niage asignado
  'mentor'            -- mentor asignado en fase 2
);

-- Etapa de inversión. Determina el nivel objetivo de cada dimensión técnica (§4.4)
create type company_stage as enum ('pre_semilla', 'semilla', 'serie_a');

-- Perfil tecnológico. Decide qué dimensiones «si aplica» se activan y qué juego
-- de pesos se usa para el score técnico
create type company_tech_profile as enum ('software', 'software_ia', 'hardware');

-- Semáforo. Siempre se acompaña de texto en la interfaz, nunca solo color (§8)
create type traffic_light as enum ('verde', 'ambar', 'rojo');

-- -----------------------------------------------------------------------------
-- Utilidades comunes
-- -----------------------------------------------------------------------------

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- organizations · IWL y Niage Technology
-- -----------------------------------------------------------------------------

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger organizations_touch
  before update on organizations
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- profiles · una fila por persona con acceso, espejo de auth.users
-- -----------------------------------------------------------------------------

create table profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  organization_id  uuid references organizations (id) on delete set null,
  email            text not null,
  full_name        text,
  role             app_role not null default 'fundadora',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index profiles_role_idx on profiles (role);

create trigger profiles_touch
  before update on profiles
  for each row execute function app.touch_updated_at();

-- Alta automática del perfil al crearse el usuario en auth
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::app_role,
      'fundadora'::app_role
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- -----------------------------------------------------------------------------
-- Configuración del programa (§3). Datos, no código.
-- -----------------------------------------------------------------------------

create table phases (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,      -- 'fase_0' … 'fase_3'
  name         text not null,
  description  text,
  order_index  smallint not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger phases_touch
  before update on phases
  for each row execute function app.touch_updated_at();

create table pillars (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  description  text,
  order_index  smallint not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger pillars_touch
  before update on pillars
  for each row execute function app.touch_updated_at();

create table cohorts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  name             text not null,
  start_date       date,
  end_date         date,
  -- Objetivo interno de compañías invertibles al cierre (§4.7)
  investable_target smallint,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger cohorts_touch
  before update on cohorts
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- companies · la unidad de aislamiento de toda la plataforma
-- -----------------------------------------------------------------------------

create table companies (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations (id) on delete restrict,
  cohort_id              uuid references cohorts (id) on delete set null,
  name                   text not null,
  slug                   text not null unique,
  sector                 text,
  one_liner              text,
  phase_id               uuid references phases (id) on delete set null,
  stage                  company_stage not null default 'pre_semilla',
  tech_profile           company_tech_profile not null default 'software',
  -- Porcentaje de liderazgo femenino en el equipo fundador (§4.1)
  female_leadership_pct  numeric(5,2) check (female_leadership_pct between 0 and 100),
  founded_on             date,
  website                text,
  created_by             uuid references profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index companies_cohort_idx on companies (cohort_id);
create index companies_phase_idx on companies (phase_id);

create trigger companies_touch
  before update on companies
  for each row execute function app.touch_updated_at();

-- Cap table simplificada (§4.1)
create table cap_table_entries (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  holder_name text not null,
  holder_type text not null default 'fundadora',  -- fundadora · inversor · empleada · otro
  percentage  numeric(6,3) not null check (percentage >= 0 and percentage <= 100),
  notes       text,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index cap_table_entries_company_idx on cap_table_entries (company_id);

create trigger cap_table_entries_touch
  before update on cap_table_entries
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- company_members · quién pertenece o está asignado a cada compañía
-- -----------------------------------------------------------------------------

create table company_members (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies (id) on delete cascade,
  profile_id   uuid not null references profiles (id) on delete cascade,
  member_role  company_member_role not null,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, profile_id, member_role)
);

create index company_members_profile_idx on company_members (profile_id);
create index company_members_company_idx on company_members (company_id);

create trigger company_members_touch
  before update on company_members
  for each row execute function app.touch_updated_at();

-- Pilares activos por compañía, con intensidad y cadencia (§4.5)
create table company_pillars (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  pillar_id   uuid not null references pillars (id) on delete cascade,
  intensity   smallint not null default 1 check (intensity between 0 and 3),
  cadence     text,
  is_active   boolean not null default true,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, pillar_id)
);

create trigger company_pillars_touch
  before update on company_pillars
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Funciones de autorización
--
-- Todas son SECURITY DEFINER y leen las tablas de pertenencia saltándose RLS.
-- Es lo que evita la recursión infinita: las políticas de `company_members`
-- no pueden consultar `company_members` por la vía normal.
-- -----------------------------------------------------------------------------

create or replace function app.actor_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid() and is_active
$$;

-- Equipo de IWL: ve la cartera completa
create or replace function app.is_iwl()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app.actor_role() in ('admin_iwl', 'equipo_iwl'), false)
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app.actor_role() = 'admin_iwl', false)
$$;

-- Papeles que esta persona tiene en una compañía concreta
create or replace function app.member_roles(target_company uuid)
returns company_member_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(member_role), '{}')
  from company_members
  where company_id = target_company and profile_id = auth.uid()
$$;

-- Lectura: IWL ve todo; el resto solo las compañías donde está asignado
create or replace function app.can_read_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_iwl() or exists (
    select 1 from company_members
    where company_id = target_company and profile_id = auth.uid()
  )
$$;

-- Escritura del lado de la compañía: fundadora del equipo, o IWL
create or replace function app.can_write_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_iwl() or exists (
    select 1 from company_members
    where company_id = target_company
      and profile_id = auth.uid()
      and member_role = 'fundadora'
  )
$$;

-- Validar y puntuar. La fundadora queda fuera por construcción: solo IWL y el
-- revisor de Niage asignado a esa compañía. Criterio de aceptación §11.
create or replace function app.can_validate_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_iwl() or (
    app.actor_role() = 'revisor_niage'
    and exists (
      select 1 from company_members
      where company_id = target_company
        and profile_id = auth.uid()
        and member_role = 'revisor_niage'
    )
  )
$$;

grant execute on function
  app.actor_role(), app.is_iwl(), app.is_admin(),
  app.member_roles(uuid), app.can_read_company(uuid),
  app.can_write_company(uuid), app.can_validate_company(uuid)
  to authenticated;

-- -----------------------------------------------------------------------------
-- activity_log · registro de actividad (§4.9)
-- -----------------------------------------------------------------------------

create table activity_log (
  id          bigint generated always as identity primary key,
  company_id  uuid references companies (id) on delete cascade,
  actor_id    uuid references profiles (id) on delete set null,
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index activity_log_company_idx on activity_log (company_id, created_at desc);

-- =============================================================================
-- Row Level Security
--
-- Toda tabla nace con RLS habilitada y sus políticas en esta misma migración.
-- Una tabla sin políticas es un fallo, no un pendiente.
-- =============================================================================

alter table organizations     enable row level security;
alter table profiles          enable row level security;
alter table phases            enable row level security;
alter table pillars           enable row level security;
alter table cohorts           enable row level security;
alter table companies         enable row level security;
alter table cap_table_entries enable row level security;
alter table company_members   enable row level security;
alter table company_pillars   enable row level security;
alter table activity_log      enable row level security;

-- organizations: lectura para toda persona autenticada, escritura solo admin
create policy organizations_select on organizations
  for select to authenticated using (true);
create policy organizations_write on organizations
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- profiles: cada persona se ve a sí misma; IWL ve a todo el mundo;
-- y se ven entre sí quienes comparten compañía
create policy profiles_select_self on profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_select_iwl on profiles
  for select to authenticated using (app.is_iwl());
create policy profiles_select_shared_company on profiles
  for select to authenticated using (
    exists (
      select 1
      from company_members mine
      join company_members theirs on theirs.company_id = mine.company_id
      where mine.profile_id = auth.uid() and theirs.profile_id = profiles.id
    )
  );
-- Cada persona edita su nombre, nunca su propio rol.
-- El rol se compara con app.actor_role(), que es SECURITY DEFINER: un subselect
-- sobre `profiles` aquí dispararía la política otra vez y entraría en recursión.
create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = app.actor_role());
create policy profiles_admin_all on profiles
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

-- Configuración del programa: lectura para todo el mundo autenticado,
-- escritura solo admin_iwl (§5)
create policy phases_select on phases
  for select to authenticated using (true);
create policy phases_write on phases
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy pillars_select on pillars
  for select to authenticated using (true);
create policy pillars_write on pillars
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy cohorts_select_iwl on cohorts
  for select to authenticated using (app.is_iwl());
create policy cohorts_select_member on cohorts
  for select to authenticated using (
    exists (
      select 1 from companies c
      join company_members m on m.company_id = c.id
      where c.cohort_id = cohorts.id and m.profile_id = auth.uid()
    )
  );
create policy cohorts_write on cohorts
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- companies: el aislamiento principal
create policy companies_select on companies
  for select to authenticated using (app.can_read_company(id));
-- La fundadora edita la ficha de su compañía, pero no su etapa ni su fase:
-- eso lo mueve IWL. Se comprueba con un trigger, no con la política.
create policy companies_update on companies
  for update to authenticated
  using (app.can_write_company(id))
  with check (app.can_write_company(id));
create policy companies_insert on companies
  for insert to authenticated with check (app.is_iwl());
create policy companies_delete on companies
  for delete to authenticated using (app.is_admin());

create or replace function app.guard_company_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if app.is_iwl() then
    return new;
  end if;
  if new.stage is distinct from old.stage
     or new.phase_id is distinct from old.phase_id
     or new.cohort_id is distinct from old.cohort_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'La etapa, la fase y la cohorte las fija el equipo de IWL'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger companies_guard_governance
  before update on companies
  for each row execute function app.guard_company_governance();

-- cap_table_entries
create policy cap_table_select on cap_table_entries
  for select to authenticated using (app.can_read_company(company_id));
create policy cap_table_write on cap_table_entries
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

-- company_members: lectura para quien ya ve la compañía, escritura solo IWL.
-- Una fundadora no se añade compañeras de equipo por su cuenta.
create policy company_members_select on company_members
  for select to authenticated using (app.can_read_company(company_id));
create policy company_members_write on company_members
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- company_pillars: los fija IWL en el Anexo; la compañía los lee
create policy company_pillars_select on company_pillars
  for select to authenticated using (app.can_read_company(company_id));
create policy company_pillars_write on company_pillars
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- activity_log: se lee si se ve la compañía. Nadie lo edita desde la aplicación.
create policy activity_log_select on activity_log
  for select to authenticated using (
    company_id is null and app.is_iwl()
    or company_id is not null and app.can_read_company(company_id)
  );
create policy activity_log_insert on activity_log
  for insert to authenticated with check (
    actor_id = auth.uid()
    and (company_id is null or app.can_read_company(company_id))
  );
