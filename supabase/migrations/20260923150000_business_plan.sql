-- =============================================================================
-- 005 · Business plan vivo (§4.2)
--
-- Secciones con estado, historial de versiones con autor, comentarios anclados
-- e hipótesis con su evidencia. La evidencia puede ser un documento, un KPI,
-- un hito o un resultado del due diligence técnico: por eso `evidence_links`
-- es polimórfica.
-- =============================================================================

create type estado_seccion_bp as enum ('borrador', 'en_revision', 'validada');

create type tipo_evidencia as enum (
  'documento',
  'kpi',
  'hito',
  'hallazgo_tecnico',
  'dimension_tecnica',
  'enlace'
);

-- -----------------------------------------------------------------------------
-- bp_sections · una fila por sección y compañía
-- -----------------------------------------------------------------------------

create table bp_sections (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  template_id   uuid not null references bp_section_templates (id) on delete restrict,
  content       text,
  status        estado_seccion_bp not null default 'borrador',
  -- Número de la última versión guardada. Lo lleva el trigger
  current_version smallint not null default 0,
  validated_by  uuid references profiles (id) on delete set null,
  validated_at  timestamptz,
  updated_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, template_id)
);

create index bp_sections_company_idx on bp_sections (company_id);

create trigger bp_sections_touch
  before update on bp_sections
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- bp_section_versions · historial con autor de cada cambio
-- -----------------------------------------------------------------------------

create table bp_section_versions (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references bp_sections (id) on delete cascade,
  company_id  uuid not null references companies (id) on delete cascade,
  version     smallint not null,
  content     text,
  status      estado_seccion_bp not null,
  author_id   uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (section_id, version)
);

create index bp_section_versions_section_idx
  on bp_section_versions (section_id, version desc);

-- Cada cambio de contenido deja versión. La lleva la base para que no dependa
-- de que la aplicación se acuerde de escribirla.
--
-- Va en dos triggers: el número de versión se asigna antes de escribir la fila,
-- y la versión se inserta después, cuando la sección ya existe y la clave
-- ajena puede apuntar a ella.
create or replace function app.numerar_version_bp()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.content is not distinct from old.content then
    return new;
  end if;

  new.current_version := coalesce(old.current_version, 0) + 1;
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function app.guardar_version_bp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.current_version = old.current_version then
    return null;
  end if;

  insert into bp_section_versions (section_id, company_id, version, content, status, author_id)
  values (new.id, new.company_id, new.current_version, new.content, new.status, auth.uid());

  return null;
end;
$$;

create trigger bp_sections_numerar_version
  before insert or update on bp_sections
  for each row execute function app.numerar_version_bp();

create trigger bp_sections_guardar_version
  after insert or update on bp_sections
  for each row execute function app.guardar_version_bp();

-- Validar una sección es de IWL. La fundadora la mueve a «en revisión» (§5)
create or replace function app.guard_validacion_bp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'validada'
     and (tg_op = 'INSERT' or old.status is distinct from 'validada')
     and not app.can_validate_company(new.company_id) then
    raise exception 'Validar una sección del business plan es del equipo de IWL'
      using errcode = '42501';
  end if;

  if new.status = 'validada' and new.validated_at is null then
    new.validated_by := auth.uid();
    new.validated_at := now();
  elsif new.status <> 'validada' then
    new.validated_by := null;
    new.validated_at := null;
  end if;

  return new;
end;
$$;

create trigger bp_sections_guard_validacion
  before insert or update on bp_sections
  for each row execute function app.guard_validacion_bp();

-- -----------------------------------------------------------------------------
-- hypotheses · hipótesis clave por sección, con su evidencia (§4.2)
-- -----------------------------------------------------------------------------

create table hypotheses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  section_id  uuid not null references bp_sections (id) on delete cascade,
  statement   text not null,
  -- Cómo se sabrá si la hipótesis se sostiene
  validation_criteria text,
  status      text not null default 'sin_contrastar'
              check (status in ('sin_contrastar', 'en_contraste', 'confirmada', 'refutada')),
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index hypotheses_section_idx on hypotheses (section_id);

create trigger hypotheses_touch
  before update on hypotheses
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- evidence_links · qué respalda una hipótesis o una sección
-- -----------------------------------------------------------------------------

create table evidence_links (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  hypothesis_id uuid references hypotheses (id) on delete cascade,
  section_id    uuid references bp_sections (id) on delete cascade,
  kind          tipo_evidencia not null,
  -- Id de la fila referida, en la tabla que corresponde al tipo
  target_id     uuid,
  -- Para `kpi` y `dimension_tecnica`, el código en lugar del id
  target_code   text,
  url           text,
  label         text not null,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint evidencia_apunta_a_algo
    check (target_id is not null or target_code is not null or url is not null),
  constraint evidencia_cuelga_de_algo
    check (hypothesis_id is not null or section_id is not null)
);

create index evidence_links_hypothesis_idx on evidence_links (hypothesis_id);
create index evidence_links_section_idx on evidence_links (section_id);

-- -----------------------------------------------------------------------------
-- comments · comentarios anclados con hilo de respuesta (§4.2, §4.9)
-- -----------------------------------------------------------------------------

create table comments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  -- Dónde está anclado: 'bp_section', 'dd_item', 'tech_finding', …
  entity      text not null,
  entity_id   uuid not null,
  parent_id   uuid references comments (id) on delete cascade,
  body        text not null,
  -- Perfiles mencionados, para notificar
  mentions    uuid[] not null default '{}',
  resolved_at timestamptz,
  resolved_by uuid references profiles (id) on delete set null,
  author_id   uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index comments_entity_idx on comments (company_id, entity, entity_id, created_at);

create trigger comments_touch
  before update on comments
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- tasks · tareas por compañía (§4.9)
-- -----------------------------------------------------------------------------

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  title       text not null,
  description text,
  owner_id    uuid references profiles (id) on delete set null,
  due_date    date,
  status      text not null default 'pendiente'
              check (status in ('pendiente', 'en_curso', 'hecha', 'descartada')),
  -- Origen, cuando la tarea nace de otro sitio
  source_entity text,
  source_id     uuid,
  created_by  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index tasks_company_idx on tasks (company_id, status);

create trigger tasks_touch
  before update on tasks
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Instanciar las secciones al dar de alta una compañía
-- -----------------------------------------------------------------------------

create or replace function app.instanciar_business_plan(target_company uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  creadas integer;
begin
  insert into bp_sections (company_id, template_id)
  select target_company, t.id
  from bp_section_templates t
  where t.is_active
  on conflict (company_id, template_id) do nothing;

  get diagnostics creadas = row_count;
  return creadas;
end;
$$;

grant execute on function app.instanciar_business_plan(uuid) to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table bp_sections         enable row level security;
alter table bp_section_versions enable row level security;
alter table hypotheses          enable row level security;
alter table evidence_links      enable row level security;
alter table comments            enable row level security;
alter table tasks               enable row level security;

create policy bp_sections_select on bp_sections
  for select to authenticated using (app.can_read_company(company_id));
create policy bp_sections_insert on bp_sections
  for insert to authenticated with check (app.can_write_company(company_id));
create policy bp_sections_update on bp_sections
  for update to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

-- El historial no se reescribe
create policy bp_section_versions_select on bp_section_versions
  for select to authenticated using (app.can_read_company(company_id));

create policy hypotheses_select on hypotheses
  for select to authenticated using (app.can_read_company(company_id));
create policy hypotheses_write on hypotheses
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

create policy evidence_links_select on evidence_links
  for select to authenticated using (app.can_read_company(company_id));
create policy evidence_links_write on evidence_links
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

-- Comentar puede cualquiera que vea la compañía: es la conversación entre la
-- fundadora, IWL y el revisor. Cada persona edita y borra solo lo suyo.
create policy comments_select on comments
  for select to authenticated using (app.can_read_company(company_id));
create policy comments_insert on comments
  for insert to authenticated
  with check (author_id = auth.uid() and app.can_read_company(company_id));
create policy comments_update on comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
create policy comments_delete on comments
  for delete to authenticated using (author_id = auth.uid() or app.is_admin());

create policy tasks_select on tasks
  for select to authenticated using (app.can_read_company(company_id));
create policy tasks_write on tasks
  for all to authenticated
  using (app.can_read_company(company_id) and app.can_write_company(company_id))
  with check (app.can_read_company(company_id) and app.can_write_company(company_id));
