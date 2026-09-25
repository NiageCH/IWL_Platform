-- =============================================================================
-- 011 · Hoja de ruta a medida
--
-- IWL es una incubadora boutique: cada proyecto se organiza a medida. Hasta
-- ahora la plataforma tenía las fases del programa, que son iguales para
-- todos, y una lista plana de hitos. Eso sirve para saber si una compañía
-- cumple, pero no para contar el recorrido que IWL diseñó para ella.
--
-- Lo que falta es la pieza intermedia: una hoja de ruta propia de cada
-- proyecto, con sus tramos, su objetivo por tramo y la aportación que IWL
-- compromete en cada uno. Se parte de una plantilla según el estado en que
-- entra la startup y a partir de ahí es suya.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- El estado de entrada
--
-- `company_stage` (pre_semilla, semilla, serie_a) es la etapa de inversión, y
-- responde a «cuánto ha levantado». Esto es otro eje y responde a «qué tiene
-- construido»: hay proyectos que entran con una idea, otros con un MVP y
-- otros facturando. Son independientes —se puede facturar sin haber levantado
-- nada— y es este el que decide la hoja de ruta.
-- -----------------------------------------------------------------------------

create type estado_entrada as enum (
  'idea',              -- Tesis y equipo, sin construir
  'prototipo',         -- Algo que se enseña, no se usa todavía
  'mvp',               -- En manos de usuarios reales
  'primeros_clientes', -- Alguien paga, sin recurrencia demostrada
  'facturacion'        -- Ingreso recurrente
);

alter table companies add column entry_state estado_entrada;

comment on column companies.entry_state is
  'Estado en que la compañía entra al programa. Decide la plantilla de hoja de ruta. No confundir con stage, que es la etapa de inversión.';

create type estado_etapa as enum (
  'planificada', 'en_curso', 'completada', 'cancelada'
);

-- =============================================================================
-- Plantillas
--
-- La plantilla es el punto de partida, no el corsé. Se copia al instanciar,
-- igual que el checklist de due diligence y las secciones del business plan:
-- si se referenciara, cambiar la plantilla reescribiría la hoja de ruta de
-- proyectos que ya están en marcha.
-- =============================================================================

create table roadmap_templates (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  entry_state  estado_entrada not null,
  description  text,
  -- Duración orientativa, que el Anexo puede ajustar
  duration_months smallint check (duration_months between 1 and 60),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index roadmap_templates_estado_idx on roadmap_templates (entry_state)
  where is_active;

create trigger roadmap_templates_touch
  before update on roadmap_templates
  for each row execute function app.touch_updated_at();

create table roadmap_template_stages (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references roadmap_templates (id) on delete cascade,
  code          text not null,
  name          text not null,
  -- Qué se persigue en este tramo. Sin objetivo, una etapa es solo un plazo
  objective     text not null,
  order_index   smallint not null,
  planned_weeks smallint check (planned_weeks > 0),
  -- Lo que IWL prevé poner en este tramo
  planned_hours numeric(8,1) check (planned_hours >= 0),
  planned_cash  numeric(12,2) check (planned_cash >= 0),
  unique (template_id, code)
);

create index roadmap_template_stages_orden_idx
  on roadmap_template_stages (template_id, order_index);

create table roadmap_template_milestones (
  id            uuid primary key default gen_random_uuid(),
  template_stage_id uuid not null
                references roadmap_template_stages (id) on delete cascade,
  title         text not null,
  success_criteria text not null,
  gates_investable boolean not null default false,
  order_index   smallint not null,
  -- Semanas desde el inicio de la etapa hasta la fecha prevista
  offset_weeks  smallint check (offset_weeks >= 0),
  unique (template_stage_id, order_index)
);

create index roadmap_template_milestones_orden_idx
  on roadmap_template_milestones (template_stage_id, order_index);

-- =============================================================================
-- La hoja de ruta del proyecto
-- =============================================================================

create table roadmap_stages (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  annex_id      uuid references annexes (id) on delete set null,
  -- De dónde salió, para saber qué se ha tocado respecto de la plantilla
  template_stage_id uuid references roadmap_template_stages (id) on delete set null,
  name          text not null,
  objective     text not null,
  order_index   smallint not null,
  starts_on     date,
  ends_on       date,
  status        estado_etapa not null default 'planificada',

  -- El compromiso de IWL en este tramo. El Anexo dice el total; aquí se
  -- reparte, que es lo que permite ver si la aportación va al ritmo del plan
  planned_hours numeric(8,1) check (planned_hours >= 0),
  planned_cash  numeric(12,2) check (planned_cash >= 0),

  notes         text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint roadmap_stages_fechas check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index roadmap_stages_company_idx on roadmap_stages (company_id, order_index);

create trigger roadmap_stages_touch
  before update on roadmap_stages
  for each row execute function app.touch_updated_at();

-- Los hitos pasan a colgar de una etapa. Se admite que no cuelguen de
-- ninguna: los que nacen del plan técnico o de la due diligence aparecen
-- cuando aparecen, y no siempre encajan en un tramo previsto
alter table milestones
  add column stage_id uuid references roadmap_stages (id) on delete set null;

create index milestones_stage_idx on milestones (stage_id);

-- Las horas también se imputan a la etapa, para poder decir «en validación
-- comercial pusimos cuarenta horas» y no solo «pusimos trescientas en total»
alter table contribution_hours
  add column stage_id uuid references roadmap_stages (id) on delete set null;

create index contribution_hours_stage_idx on contribution_hours (stage_id);

-- =============================================================================
-- Instanciar una hoja de ruta
--
-- Copia la plantilla entera —etapas e hitos— y calcula las fechas encadenando
-- las duraciones previstas desde la fecha de arranque.
-- =============================================================================

/*
 * El algoritmo, sin comprobar permisos.
 *
 * Se separa del guard para que el seed pueda sembrar hojas de ruta de demo
 * sin sesión, en vez de repetir el cálculo de fechas en otro sitio y que las
 * dos versiones se separen con el tiempo.
 */
create or replace function app.copiar_hoja_de_ruta(
  target_company uuid,
  template uuid,
  inicio date default current_date,
  target_annex uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  etapa record;
  nueva_etapa_id uuid;
  cursor_fecha date := inicio;
  fin_etapa date;
  creadas integer := 0;
begin
  if exists (select 1 from roadmap_stages where company_id = target_company) then
    raise exception 'Esta compañía ya tiene hoja de ruta. Edítala o borra sus etapas antes de instanciar otra.'
      using errcode = '23505';
  end if;

  for etapa in
    select * from roadmap_template_stages
    where template_id = template
    order by order_index
  loop
    fin_etapa := cursor_fecha + (coalesce(etapa.planned_weeks, 4) * 7 - 1);

    insert into roadmap_stages (
      company_id, annex_id, template_stage_id, name, objective, order_index,
      starts_on, ends_on, planned_hours, planned_cash, created_by
    ) values (
      target_company, target_annex, etapa.id, etapa.name, etapa.objective,
      etapa.order_index, cursor_fecha, fin_etapa,
      etapa.planned_hours, etapa.planned_cash, auth.uid()
    )
    returning id into nueva_etapa_id;

    insert into milestones (
      company_id, annex_id, stage_id, title, success_criteria,
      due_date, origin, gates_investable, created_by
    )
    select
      target_company, target_annex, nueva_etapa_id, m.title, m.success_criteria,
      cursor_fecha + (coalesce(m.offset_weeks, coalesce(etapa.planned_weeks, 4)) * 7),
      'anexo', m.gates_investable, auth.uid()
    from roadmap_template_milestones m
    where m.template_stage_id = etapa.id
    order by m.order_index;

    cursor_fecha := fin_etapa + 1;
    creadas := creadas + 1;
  end loop;

  if creadas = 0 then
    raise exception 'La plantilla no tiene etapas' using errcode = '23503';
  end if;

  return creadas;
end;
$$;

create or replace function app.instanciar_hoja_de_ruta(
  target_company uuid,
  template uuid,
  inicio date default current_date,
  target_annex uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  creadas integer;
begin
  if not app.is_iwl() then
    raise exception 'Diseñar la hoja de ruta es del equipo de IWL'
      using errcode = '42501';
  end if;

  creadas := app.copiar_hoja_de_ruta(target_company, template, inicio, target_annex);

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    target_company, auth.uid(), 'roadmap_stages', target_company, 'instanciar',
    jsonb_build_object('plantilla', template, 'etapas', creadas, 'inicio', inicio)
  );

  return creadas;
end;
$$;

revoke all on function app.copiar_hoja_de_ruta(uuid, uuid, date, uuid)
  from public, anon, authenticated;
grant execute on function app.instanciar_hoja_de_ruta(uuid, uuid, date, uuid)
  to authenticated;

/* PostgREST solo expone `public`; aquí va la puerta */
create or replace function public.instanciar_hoja_de_ruta(
  target_company uuid,
  template uuid,
  inicio date default current_date,
  target_annex uuid default null
)
returns integer
language sql
security invoker
set search_path = public
as $$
  select app.instanciar_hoja_de_ruta(target_company, template, inicio, target_annex)
$$;

revoke all on function public.instanciar_hoja_de_ruta(uuid, uuid, date, uuid)
  from public, anon;
grant execute on function public.instanciar_hoja_de_ruta(uuid, uuid, date, uuid)
  to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table roadmap_templates           enable row level security;
alter table roadmap_template_stages     enable row level security;
alter table roadmap_template_milestones enable row level security;
alter table roadmap_stages              enable row level security;

-- Las plantillas son configuración del programa: las lee quien tiene sesión,
-- las escribe la dirección
create policy roadmap_templates_select on roadmap_templates
  for select to authenticated using (true);
create policy roadmap_templates_write on roadmap_templates
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy roadmap_template_stages_select on roadmap_template_stages
  for select to authenticated using (true);
create policy roadmap_template_stages_write on roadmap_template_stages
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

create policy roadmap_template_milestones_select on roadmap_template_milestones
  for select to authenticated using (true);
create policy roadmap_template_milestones_write on roadmap_template_milestones
  for all to authenticated using (app.is_admin()) with check (app.is_admin());

/*
 * La hoja de ruta la diseña IWL y la lee la compañía.
 *
 * La fundadora no mueve sus etapas: el plan es lo acordado y cambiarlo es una
 * conversación, no un formulario. Lo que sí hace es cargar avances y mover
 * hitos, que tienen sus propias políticas.
 */
create policy roadmap_stages_select on roadmap_stages
  for select to authenticated using (app.can_read_company(company_id));
create policy roadmap_stages_write on roadmap_stages
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());

-- =============================================================================
-- El alta, con estado de entrada y hoja de ruta
--
-- Se rehace la función entera porque cambia su firma. La hoja de ruta es
-- opcional en el alta: se puede diseñar ahí, con la plantilla que corresponda
-- al estado de entrada, o más tarde desde la ficha cuando el diagnóstico haya
-- dicho de qué va el proyecto. Lo que no es opcional es el estado de entrada,
-- porque es lo que clasifica el recorrido.
-- =============================================================================

drop function if exists public.crear_compania(
  text, text, company_stage, company_tech_profile, text, text, text, uuid,
  numeric, date, text
);
drop function if exists app.crear_compania(
  text, text, company_stage, company_tech_profile, text, text, text, uuid,
  numeric, date, text
);

create or replace function app.crear_compania(
  p_name text,
  p_slug text,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text,
  p_entry_state estado_entrada default null,
  p_roadmap_template uuid default null,
  p_roadmap_start date default null,
  p_sector text default null,
  p_one_liner text default null,
  p_cohort_id uuid default null,
  p_female_leadership_pct numeric default null,
  p_founded_on date default null,
  p_website text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nueva_id uuid;
  org_id uuid;
  fase_id uuid;
begin
  if not app.is_iwl() then
    raise exception 'Dar de alta una compañía es del equipo de IWL'
      using errcode = '42501';
  end if;

  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'El identificador de la compañía se escribe en minúsculas y con guiones, como «marea-clinica»'
      using errcode = '22023';
  end if;

  select id into org_id from organizations where slug = 'iwl';
  if org_id is null then
    raise exception 'No existe la organización de IWL' using errcode = '23503';
  end if;

  select id into fase_id from phases where code = p_phase_code;

  insert into companies (
    organization_id, cohort_id, name, slug, sector, one_liner,
    phase_id, stage, tech_profile, entry_state, female_leadership_pct,
    founded_on, website, created_by
  ) values (
    org_id, p_cohort_id, p_name, p_slug, p_sector, p_one_liner,
    fase_id, p_stage, p_tech_profile, p_entry_state, p_female_leadership_pct,
    p_founded_on, p_website, auth.uid()
  )
  returning id into nueva_id;

  -- Sin esto, la compañía nace sin nada en lo que trabajar
  perform app.instanciar_checklist_dd(nueva_id);
  perform app.instanciar_business_plan(nueva_id);
  perform app.instanciar_kpis(nueva_id);

  if p_roadmap_template is not null then
    perform app.instanciar_hoja_de_ruta(
      nueva_id, p_roadmap_template, coalesce(p_roadmap_start, current_date)
    );
  end if;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    nueva_id, auth.uid(), 'companies', nueva_id, 'alta',
    jsonb_build_object(
      'nombre', p_name, 'etapa', p_stage, 'estado_entrada', p_entry_state
    )
  );

  return nueva_id;
end;
$$;

create or replace function public.crear_compania(
  p_name text,
  p_slug text,
  p_stage company_stage,
  p_tech_profile company_tech_profile,
  p_phase_code text,
  p_entry_state estado_entrada default null,
  p_roadmap_template uuid default null,
  p_roadmap_start date default null,
  p_sector text default null,
  p_one_liner text default null,
  p_cohort_id uuid default null,
  p_female_leadership_pct numeric default null,
  p_founded_on date default null,
  p_website text default null
)
returns uuid
language sql
security invoker
set search_path = public
as $$
  select app.crear_compania(
    p_name, p_slug, p_stage, p_tech_profile, p_phase_code,
    p_entry_state, p_roadmap_template, p_roadmap_start,
    p_sector, p_one_liner, p_cohort_id, p_female_leadership_pct,
    p_founded_on, p_website
  )
$$;

do $$
declare
  firma text := 'text, text, company_stage, company_tech_profile, text, estado_entrada, uuid, date, text, text, uuid, numeric, date, text';
begin
  execute format('revoke all on function app.crear_compania(%s) from public, anon', firma);
  execute format('revoke all on function public.crear_compania(%s) from public, anon', firma);
  execute format('grant execute on function app.crear_compania(%s) to authenticated', firma);
  execute format('grant execute on function public.crear_compania(%s) to authenticated', firma);
end;
$$;
