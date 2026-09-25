-- =============================================================================
-- 008 · Anexo de Programa, hitos y configuración de la aportación
--
-- El Anexo es lo que las dos partes firman: qué pilares se activan, cuánto
-- dura, qué hitos se acuerdan y qué se compromete IWL. Sin él, la plataforma
-- mide a la compañía y no mide al programa (documento de aportación, §1).
--
-- Los hitos ya estaban contemplados en el cálculo del estado invertible, que
-- hasta ahora recibía siempre una lista vacía porque esta tabla no existía.
-- =============================================================================

create type estado_anexo as enum ('borrador', 'firmado', 'cerrado');

create type estado_hito as enum ('pendiente', 'en_curso', 'cumplido', 'retrasado');

-- De dónde nace un hito. Los que vienen del plan técnico llevan su origen (§4.5)
create type origen_hito as enum ('anexo', 'plan_tecnico', 'due_diligence', 'acordado');

-- -----------------------------------------------------------------------------
-- annexes · el Anexo de Programa de cada compañía
-- -----------------------------------------------------------------------------

create table annexes (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies (id) on delete cascade,
  version           smallint not null default 1,
  status            estado_anexo not null default 'borrador',
  signed_on         date,
  starts_on         date,
  ends_on           date,
  -- Duración acordada, de 6 a 18 meses según el Anexo (§3)
  duration_months   smallint check (duration_months between 1 and 60),

  -- Compromiso de IWL. Es lo que el contador de compromiso mide contra lo
  -- entregado, y funciona en los dos sentidos: si IWL va por detrás, se ve.
  committed_hours   numeric(8,1) check (committed_hours >= 0),
  committed_hours_value numeric(12,2) check (committed_hours_value >= 0),
  committed_cash    numeric(12,2) check (committed_cash >= 0),
  committed_seniors smallint check (committed_seniors >= 0),
  equity_pct        numeric(5,2) check (equity_pct between 0 and 100),
  other_commitments text,

  notes             text,
  created_by        uuid references profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (company_id, version)
);

create index annexes_company_idx on annexes (company_id, version desc);

create trigger annexes_touch
  before update on annexes
  for each row execute function app.touch_updated_at();

/*
 * Un Anexo firmado no se reescribe: se firma una versión nueva.
 *
 * Es el documento que sostiene el equity y la aportación comprometida. Si se
 * pudiera editar después de firmar, el extracto de aportación dejaría de
 * cuadrar con lo que las dos partes acordaron.
 */
create or replace function app.guard_anexo_firmado()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('firmado', 'cerrado')
     and (
       new.committed_hours is distinct from old.committed_hours
       or new.committed_cash is distinct from old.committed_cash
       or new.equity_pct is distinct from old.equity_pct
       or new.signed_on is distinct from old.signed_on
     ) then
    raise exception 'Un Anexo firmado no se edita. Firma una versión nueva.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger annexes_guard_firmado
  before update on annexes
  for each row execute function app.guard_anexo_firmado();

-- Pilares del Anexo, con su intensidad y cadencia acordadas
create table annex_pillars (
  id          uuid primary key default gen_random_uuid(),
  annex_id    uuid not null references annexes (id) on delete cascade,
  company_id  uuid not null references companies (id) on delete cascade,
  pillar_id   uuid not null references pillars (id) on delete restrict,
  intensity   smallint not null default 1 check (intensity between 0 and 3),
  cadence     text,
  -- Horas previstas para este pilar, si el Anexo las reparte
  planned_hours numeric(8,1) check (planned_hours >= 0),
  created_at  timestamptz not null default now(),
  unique (annex_id, pillar_id)
);

-- -----------------------------------------------------------------------------
-- milestones · hitos con fecha, criterio y evidencia (§4.5)
-- -----------------------------------------------------------------------------

create table milestones (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  annex_id      uuid references annexes (id) on delete set null,
  phase_id      uuid references phases (id) on delete set null,
  title         text not null,
  description   text,
  -- Qué tiene que pasar para darlo por cumplido. Sin esto, «cumplido» es
  -- una opinión de quien mira
  success_criteria text not null,
  due_date      date,
  status        estado_hito not null default 'pendiente',
  origin        origen_hito not null default 'anexo',
  -- Los hitos de producto y tracción condicionan el estado invertible (§3)
  gates_investable boolean not null default false,
  -- De dónde viene, cuando nace del plan técnico
  plan_item_id  uuid references tech_plan_items (id) on delete set null,
  evidence      text,
  completed_on  date,
  confirmed_by  uuid references profiles (id) on delete set null,
  confirmed_at  timestamptz,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index milestones_company_idx on milestones (company_id, due_date);
create index milestones_gate_idx on milestones (company_id)
  where gates_investable and status <> 'cumplido';

create trigger milestones_touch
  before update on milestones
  for each row execute function app.touch_updated_at();

/*
 * Dar un hito por cumplido lo confirma IWL.
 *
 * La compañía puede moverlo a «en curso» y aportar evidencia, que es su
 * trabajo; confirmar que está hecho es valoración, y vale aquí la misma regla
 * que en el resto: nadie valida su propio trabajo (documento de aportación §5).
 */
create or replace function app.guard_hito_cumplido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cumplido'
     and (tg_op = 'INSERT' or old.status is distinct from 'cumplido')
     and not app.is_iwl() then
    raise exception 'Confirmar un hito como cumplido es del equipo de IWL'
      using errcode = '42501';
  end if;

  if new.status = 'cumplido' and new.confirmed_at is null then
    new.confirmed_by := auth.uid();
    new.confirmed_at := now();
    new.completed_on := coalesce(new.completed_on, current_date);
  end if;

  if new.status <> 'cumplido' then
    new.confirmed_by := null;
    new.confirmed_at := null;
    new.completed_on := null;
  end if;

  return new;
end;
$$;

create trigger milestones_guard_cumplido
  before insert or update on milestones
  for each row execute function app.guard_hito_cumplido();

-- -----------------------------------------------------------------------------
-- Configuración de la aportación
-- -----------------------------------------------------------------------------

/*
 * Materias de la aportación.
 *
 * No son los pilares. Un pilar es una línea del programa («mentoría
 * especializada»); una materia es el área de conocimiento en la que se
 * imputan las horas («estrategia comercial»). Una sesión de mentoría puede
 * ser de estrategia comercial o de producto, y el extracto tiene que poder
 * decir cuál.
 */
create table contribution_subjects (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  description  text,
  order_index  smallint not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger contribution_subjects_touch
  before update on contribution_subjects
  for each row execute function app.touch_updated_at();

/*
 * Tarifas por perfil, con su vigencia.
 *
 * Las tarifas no se escriben en cada línea de horas: cambian entre cohortes y
 * el histórico tiene que seguir cuadrando (documento de aportación §8). Cada
 * línea de horas guarda la tarifa que tenía el día que se imputó, copiada de
 * aquí, de modo que un cambio de tarifa no altera lo ya registrado (§10).
 */
create table rate_cards (
  id            uuid primary key default gen_random_uuid(),
  profile_code  text not null,
  profile_name  text not null,
  -- Lo que IWL aplica a la compañía
  applied_rate  numeric(10,2) not null check (applied_rate >= 0),
  -- Lo que costaría en el mercado. La diferencia es la aportación real
  market_rate   numeric(10,2) not null check (market_rate >= 0),
  -- De dónde sale la tarifa de mercado: sin fuente no es defendible
  source        text,
  valid_from    date not null,
  valid_to      date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint vigencia_coherente check (valid_to is null or valid_to >= valid_from)
);

create index rate_cards_perfil_idx on rate_cards (profile_code, valid_from desc);

create trigger rate_cards_touch
  before update on rate_cards
  for each row execute function app.touch_updated_at();

/** Tarifa vigente de un perfil en una fecha */
create or replace function app.tarifa_vigente(perfil text, fecha date)
returns rate_cards
language sql
stable
as $$
  select *
  from rate_cards
  where profile_code = perfil
    and valid_from <= fecha
    and (valid_to is null or valid_to >= fecha)
  order by valid_from desc
  limit 1
$$;

-- =============================================================================
-- RLS
-- =============================================================================

alter table annexes               enable row level security;
alter table annex_pillars         enable row level security;
alter table milestones            enable row level security;
alter table contribution_subjects enable row level security;
alter table rate_cards            enable row level security;

-- El Anexo lo escribe IWL; la compañía lo lee, que para eso lo firma
create policy annexes_select on annexes
  for select to authenticated using (app.can_read_company(company_id));
create policy annexes_write on annexes
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

create policy annex_pillars_select on annex_pillars
  for select to authenticated using (app.can_read_company(company_id));
create policy annex_pillars_write on annex_pillars
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- Los hitos los mueven las dos partes; confirmarlos, solo IWL (trigger)
create policy milestones_select on milestones
  for select to authenticated using (app.can_read_company(company_id));
create policy milestones_insert on milestones
  for insert to authenticated with check (app.is_iwl());
create policy milestones_update on milestones
  for update to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));
create policy milestones_delete on milestones
  for delete to authenticated using (app.is_iwl());

-- Configuración: la lee quien tiene sesión, la escribe admin
create policy contribution_subjects_select on contribution_subjects
  for select to authenticated using (true);
create policy contribution_subjects_write on contribution_subjects
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

/*
 * Las tarifas las ve IWL y también la compañía.
 *
 * Decidido con Rodrigo siguiendo la recomendación del documento (§7.1): la
 * fundadora ve las horas y su valor en euros. Es el argumento del equity y
 * esconderlo lo debilita.
 */
create policy rate_cards_select on rate_cards
  for select to authenticated using (true);
create policy rate_cards_write on rate_cards
  for all to authenticated using (app.is_admin()) with check (app.is_admin());
