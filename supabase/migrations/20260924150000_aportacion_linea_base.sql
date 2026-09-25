-- =============================================================================
-- 009 · Registro de aportación y línea base
--
-- Cuatro libros que alimentan un extracto: horas, caja, introducciones y
-- entregables. Es lo que convierte la aportación de IWL en algo defendible,
-- lo que sostiene el equity y lo que la fundadora quiere ver cuando se
-- pregunta qué está recibiendo.
--
-- Y la línea base: sin un punto de partida inmutable, «avance» es una opinión.
-- =============================================================================

create type estado_caja as enum ('comprometido', 'desembolsado', 'justificado');

create type tipo_contacto as enum (
  'inversor',
  'cliente',
  'partner',
  'proveedor',
  'organismo_publico'
);

create type estado_introduccion as enum (
  'presentada',
  'reunion_celebrada',
  'en_negociacion',
  'cerrada',
  'descartada'
);

create type tipo_linea_base as enum ('inicial', 'trimestral', 'previa_ronda');

create type estado_objecion as enum ('abierta', 'aceptada', 'rechazada');

-- -----------------------------------------------------------------------------
-- Libro 1 · Horas
-- -----------------------------------------------------------------------------

create table contribution_hours (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  annex_id      uuid references annexes (id) on delete set null,
  worked_on     date not null,
  -- Quién las hizo. Puede no tener cuenta en la plataforma
  profile_id    uuid references profiles (id) on delete set null,
  person_name   text not null,
  profile_code  text not null,
  subject_id    uuid not null references contribution_subjects (id) on delete restrict,
  description   text not null,
  hours         numeric(6,2) not null check (hours > 0 and hours <= 24),

  /*
   * Las tarifas se copian de `rate_cards` en el momento de imputar.
   *
   * No se referencian: si se referenciaran, cambiar una tarifa reescribiría
   * el valor de las horas ya registradas y el extracto dejaría de cuadrar con
   * lo que se comunicó en su día (criterio de aceptación del documento §10).
   */
  applied_rate  numeric(10,2) not null check (applied_rate >= 0),
  market_rate   numeric(10,2) not null check (market_rate >= 0),
  rate_card_id  uuid references rate_cards (id) on delete set null,

  session_id    uuid references tech_review_sessions (id) on delete set null,
  deliverable_id uuid,

  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index contribution_hours_company_idx
  on contribution_hours (company_id, worked_on desc);
create index contribution_hours_subject_idx on contribution_hours (subject_id);

create trigger contribution_hours_touch
  before update on contribution_hours
  for each row execute function app.touch_updated_at();

/** Rellena las tarifas desde la tabla vigente si no vienen dadas */
create or replace function app.completar_tarifas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tarifa rate_cards;
begin
  if new.applied_rate is null or new.market_rate is null or new.rate_card_id is null then
    select * into tarifa from app.tarifa_vigente(new.profile_code, new.worked_on);

    if tarifa.id is null then
      raise exception 'No hay tarifa vigente para el perfil % el %', new.profile_code, new.worked_on
        using errcode = '23503';
    end if;

    new.applied_rate := coalesce(new.applied_rate, tarifa.applied_rate);
    new.market_rate := coalesce(new.market_rate, tarifa.market_rate);
    new.rate_card_id := coalesce(new.rate_card_id, tarifa.id);
  end if;

  return new;
end;
$$;

create trigger contribution_hours_tarifas
  before insert on contribution_hours
  for each row execute function app.completar_tarifas();

-- -----------------------------------------------------------------------------
-- Libro 2 · Caja
-- -----------------------------------------------------------------------------

create table cash_commitments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  annex_id      uuid references annexes (id) on delete set null,
  -- Partida: marketing, hardware, prototipo…
  heading       text not null,
  description   text,
  amount        numeric(12,2) not null check (amount >= 0),
  tranche       smallint check (tranche > 0),
  -- Qué tiene que pasar para que se desembolse
  condition     text,
  expected_on   date,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index cash_commitments_company_idx on cash_commitments (company_id);

create trigger cash_commitments_touch
  before update on cash_commitments
  for each row execute function app.touch_updated_at();

create table cash_disbursements (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies (id) on delete cascade,
  commitment_id  uuid references cash_commitments (id) on delete set null,
  amount         numeric(12,2) not null check (amount > 0),
  disbursed_on   date not null,
  -- El justificante lo sube la compañía. Sin él, queda pendiente de justificar
  document_id    uuid references documents (id) on delete set null,
  justified_on   date,
  notes          text,
  created_by     uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index cash_disbursements_company_idx
  on cash_disbursements (company_id, disbursed_on desc);

create trigger cash_disbursements_touch
  before update on cash_disbursements
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Libro 3 · Contactos e introducciones
--
-- Este libro es lo que sostiene las comisiones de financiación del Acuerdo:
-- sin rastro de quién presentó a quién y cuándo, esa cláusula no se puede
-- reclamar.
-- -----------------------------------------------------------------------------

create table contacts (
  id            uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete set null,
  name          text not null,
  kind          tipo_contacto not null,
  organization  text,
  role          text,
  -- De dónde sale el contacto: red de IWL, mentor, evento…
  source        text,
  notes         text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger contacts_touch
  before update on contacts
  for each row execute function app.touch_updated_at();

create table introductions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  contact_id    uuid not null references contacts (id) on delete restrict,
  -- Quién de IWL hizo la presentación. Es la mitad del rastro
  introduced_by uuid references profiles (id) on delete set null,
  introducer_name text not null,
  introduced_on date not null,
  status        estado_introduccion not null default 'presentada',
  outcome       text,
  amount        numeric(12,2) check (amount >= 0),
  closed_on     date,

  /*
   * Si esta introducción cuenta para la comisión de financiación.
   *
   * Lo marca IWL al crearla, y la ventana es de 18 meses desde la
   * presentación: decidido con Rodrigo (documento §7.4). Pasada la ventana,
   * una operación cerrada deja de generar comisión. El criterio se guarda en
   * la fila y no se calcula al vuelo, para que cambiar la política mañana no
   * reescriba lo que ya se acordó.
   */
  counts_for_commission boolean not null default false,
  commission_window_months smallint not null default 18
    check (commission_window_months > 0),

  notes         text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint cerrada_lleva_fecha
    check (status <> 'cerrada' or closed_on is not null)
);

create index introductions_company_idx
  on introductions (company_id, introduced_on desc);

create trigger introductions_touch
  before update on introductions
  for each row execute function app.touch_updated_at();

/**
 * Si una introducción genera comisión: marcada, cerrada con importe y dentro
 * de su ventana.
 */
create or replace function app.genera_comision(i introductions)
returns boolean
language sql
immutable
as $$
  select
    i.counts_for_commission
    and i.status = 'cerrada'
    and i.closed_on is not null
    and i.amount is not null
    and i.closed_on <= (i.introduced_on + (i.commission_window_months || ' months')::interval)::date
$$;

-- -----------------------------------------------------------------------------
-- Libro 4 · Entregables
-- -----------------------------------------------------------------------------

create table deliverables (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  subject_id    uuid references contribution_subjects (id) on delete set null,
  title         text not null,
  description   text,
  delivered_on  date not null,
  document_id   uuid references documents (id) on delete set null,
  url           text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index deliverables_company_idx on deliverables (company_id, delivered_on desc);

create trigger deliverables_touch
  before update on deliverables
  for each row execute function app.touch_updated_at();

alter table contribution_hours
  add constraint contribution_hours_deliverable_fkey
  foreign key (deliverable_id) references deliverables (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Objeciones
--
-- Las horas de IWL no necesitan confirmación previa de la compañía, para no
-- crear fricción, pero la compañía puede objetar por escrito dentro de los
-- quince días siguientes (documento §5 y §7.2). Sin este registro, ese
-- derecho no existiría de verdad.
-- -----------------------------------------------------------------------------

create table objections (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  -- Qué se objeta: 'contribution_hours', 'cash_disbursements', 'introductions'
  entity        text not null,
  entity_id     uuid not null,
  reason        text not null,
  status        estado_objecion not null default 'abierta',
  resolution    text,
  resolved_by   uuid references profiles (id) on delete set null,
  resolved_at   timestamptz,
  raised_by     uuid not null references profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index objections_company_idx on objections (company_id, status);
create index objections_entity_idx on objections (entity, entity_id);

create trigger objections_touch
  before update on objections
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Línea base
--
-- Al firmar el Anexo se congela una foto. Inmutable, fechada, no editable.
-- Todo lo que viene después se mide contra ella.
--
-- Se congela **después** del due diligence técnico, no antes: si se congelara
-- antes, el primer salto de score sería trabajo de diagnóstico y no avance
-- real (documento §4).
-- -----------------------------------------------------------------------------

create table baselines (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  kind          tipo_linea_base not null,
  taken_on      date not null,
  stage         company_stage not null,
  /*
   * El contenido congelado, entero, en JSON.
   *
   * No son referencias a otras tablas: si lo fueran, editar un KPI de hace
   * seis meses cambiaría la línea base y dejaría de ser un punto de partida.
   * Lo que se guarda aquí es lo que se leyó el día que se firmó.
   */
  content       jsonb not null,
  notes         text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (company_id, kind, taken_on)
);

create index baselines_company_idx on baselines (company_id, taken_on desc);

/*
 * Una línea base no se edita: se crea otra.
 *
 * Es el criterio de aceptación del documento (§10) y la razón de ser de la
 * tabla. Si se pudiera editar, no sería una línea base.
 */
create or replace function app.guard_linea_base()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Una línea base no se edita. Crea una nueva.'
    using errcode = '42501';
end;
$$;

create trigger baselines_inmutable
  before update on baselines
  for each row execute function app.guard_linea_base();

-- =============================================================================
-- Vistas del extracto
-- =============================================================================

/**
 * Horas con su valor, ya calculado.
 *
 * El descuento es la diferencia entre lo que costaría en el mercado y lo que
 * IWL aplica: es la aportación real, y es el número que sostiene el equity.
 */
create or replace view contribution_hours_valued as
select
  h.id,
  h.company_id,
  h.worked_on,
  h.person_name,
  h.profile_code,
  h.description,
  h.hours,
  h.applied_rate,
  h.market_rate,
  s.code                              as subject_code,
  s.name                              as subject_name,
  round(h.hours * h.applied_rate, 2)  as applied_value,
  round(h.hours * h.market_rate, 2)   as market_value,
  round(h.hours * (h.market_rate - h.applied_rate), 2) as discount_value,
  exists (
    select 1 from objections o
    where o.entity = 'contribution_hours'
      and o.entity_id = h.id
      and o.status = 'abierta'
  )                                   as objected
from contribution_hours h
join contribution_subjects s on s.id = h.subject_id;

alter view contribution_hours_valued set (security_invoker = true);
grant select on contribution_hours_valued to authenticated;

/**
 * Contador de compromiso.
 *
 * Va en la cabecera del proyecto, visible para las dos partes. Funciona en
 * los dos sentidos: si IWL va por detrás de lo comprometido, se ve.
 */
create or replace view commitment_counter as
select
  c.id                                            as company_id,
  a.id                                            as annex_id,
  a.committed_hours,
  a.committed_cash,
  a.equity_pct,
  coalesce(h.delivered_hours, 0)                  as delivered_hours,
  coalesce(h.applied_value, 0)                    as delivered_hours_value,
  coalesce(h.market_value, 0)                     as delivered_market_value,
  coalesce(d.disbursed, 0)                        as disbursed_cash,
  coalesce(d.justified, 0)                        as justified_cash,
  coalesce(i.total, 0)                            as introductions_made,
  coalesce(i.closed, 0)                           as introductions_closed,
  coalesce(e.total, 0)                            as deliverables_count,
  case
    when a.committed_hours is null or a.committed_hours = 0 then null
    else round(coalesce(h.delivered_hours, 0) / a.committed_hours * 100, 1)
  end                                             as hours_pct,
  case
    when a.committed_cash is null or a.committed_cash = 0 then null
    else round(coalesce(d.disbursed, 0) / a.committed_cash * 100, 1)
  end                                             as cash_pct
from companies c
left join lateral (
  select * from annexes a2
  where a2.company_id = c.id and a2.status in ('firmado', 'cerrado')
  order by a2.version desc limit 1
) a on true
left join lateral (
  select
    sum(hours)                  as delivered_hours,
    sum(hours * applied_rate)   as applied_value,
    sum(hours * market_rate)    as market_value
  from contribution_hours where company_id = c.id
) h on true
left join lateral (
  select
    sum(amount)                                          as disbursed,
    sum(amount) filter (where justified_on is not null)  as justified
  from cash_disbursements where company_id = c.id
) d on true
left join lateral (
  select
    count(*)                                   as total,
    count(*) filter (where status = 'cerrada') as closed
  from introductions where company_id = c.id
) i on true
left join lateral (
  select count(*) as total from deliverables where company_id = c.id
) e on true;

alter view commitment_counter set (security_invoker = true);
grant select on commitment_counter to authenticated;

-- =============================================================================
-- RLS
--
-- La compañía ve su extracto completo, con horas y valor en euros: es el
-- argumento del equity y esconderlo lo debilita (documento §7.1). Lo que no
-- puede es escribirlo: los libros los lleva IWL.
-- =============================================================================

alter table contribution_hours  enable row level security;
alter table cash_commitments    enable row level security;
alter table cash_disbursements  enable row level security;
alter table contacts            enable row level security;
alter table introductions       enable row level security;
alter table deliverables        enable row level security;
alter table objections          enable row level security;
alter table baselines           enable row level security;

create policy contribution_hours_select on contribution_hours
  for select to authenticated using (app.can_read_company(company_id));
create policy contribution_hours_write on contribution_hours
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

create policy cash_commitments_select on cash_commitments
  for select to authenticated using (app.can_read_company(company_id));
create policy cash_commitments_write on cash_commitments
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- El desembolso lo registra IWL; el justificante lo enlaza la compañía
create policy cash_disbursements_select on cash_disbursements
  for select to authenticated using (app.can_read_company(company_id));
create policy cash_disbursements_insert on cash_disbursements
  for insert to authenticated with check (app.is_iwl());
create policy cash_disbursements_update on cash_disbursements
  for update to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));
create policy cash_disbursements_delete on cash_disbursements
  for delete to authenticated using (app.is_iwl());

/*
 * Los contactos son de IWL: la red se comparte entre la cartera y ninguna
 * compañía tiene por qué ver la agenda entera.
 *
 * Pero sí ve los contactos de las introducciones que le afectan. Sin eso, su
 * extracto diría «reunión celebrada con alguien», que no es información: la
 * introducción es parte de lo que IWL le aporta y tiene derecho a saber con
 * quién fue.
 */
create policy contacts_select_iwl on contacts
  for select to authenticated using (app.is_iwl());

create policy contacts_select_presentados on contacts
  for select to authenticated using (
    exists (
      select 1 from introductions i
      where i.contact_id = contacts.id
        and app.can_read_company(i.company_id)
    )
  );

create policy contacts_write on contacts
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- Solo IWL crea introducciones; la compañía actualiza el resultado (§7.3)
create policy introductions_select on introductions
  for select to authenticated using (app.can_read_company(company_id));
create policy introductions_insert on introductions
  for insert to authenticated with check (app.is_iwl());
create policy introductions_update on introductions
  for update to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));
create policy introductions_delete on introductions
  for delete to authenticated using (app.is_iwl());

create policy deliverables_select on deliverables
  for select to authenticated using (app.can_read_company(company_id));
create policy deliverables_write on deliverables
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- Objetar es de la compañía; resolver, de IWL
create policy objections_select on objections
  for select to authenticated using (app.can_read_company(company_id));
create policy objections_insert on objections
  for insert to authenticated
  with check (raised_by = auth.uid() and app.can_write_company(company_id));
create policy objections_update on objections
  for update to authenticated using (app.is_iwl()) with check (app.is_iwl());

create policy baselines_select on baselines
  for select to authenticated using (app.can_read_company(company_id));
create policy baselines_insert on baselines
  for insert to authenticated with check (app.is_iwl());
create policy baselines_delete on baselines
  for delete to authenticated using (app.is_admin());

/*
 * Una introducción solo se puede objetar o actualizar mientras la comisión
 * siga siendo reclamable. Para el resto, el rastro queda como está.
 */
comment on column introductions.counts_for_commission is
  'Marcado por IWL al crear la introducción. Con la ventana de 18 meses, es lo que sostiene una reclamación de comisión.';
