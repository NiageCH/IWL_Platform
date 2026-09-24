-- =============================================================================
-- 004 · Due diligence general y data room (§4.3)
--
-- El checklist por compañía se instancia desde `dd_item_templates`. Los
-- documentos viven en Storage; aquí van sus metadatos, versiones y accesos.
-- =============================================================================

create type estado_punto_dd as enum (
  'pendiente',
  'entregado',
  'en_revision',
  'validado',
  'bloqueante'
);

-- -----------------------------------------------------------------------------
-- documents · metadatos. El fichero está en Storage, nunca en la base
-- -----------------------------------------------------------------------------

create table documents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  area_id       uuid references dd_areas (id) on delete set null,
  name          text not null,
  description   text,
  -- Carpeta del data room, espejo de las áreas (§4.3)
  folder        text not null default 'general',
  -- Al vencer, los puntos que dependen de este documento vuelven a pendiente
  expires_on    date,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index documents_company_idx on documents (company_id, folder);

create trigger documents_touch
  before update on documents
  for each row execute function app.touch_updated_at();

create table document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents (id) on delete cascade,
  company_id   uuid not null references companies (id) on delete cascade,
  version      smallint not null,
  -- Ruta en el bucket de Storage
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes >= 0),
  uploaded_by  uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (document_id, version)
);

create index document_versions_document_idx
  on document_versions (document_id, version desc);

-- Registro de accesos al data room (§4.3)
create table document_access_log (
  id           bigint generated always as identity primary key,
  document_id  uuid not null references documents (id) on delete cascade,
  company_id   uuid not null references companies (id) on delete cascade,
  profile_id   uuid references profiles (id) on delete set null,
  action       text not null,            -- consulta · descarga
  created_at   timestamptz not null default now()
);

create index document_access_log_document_idx
  on document_access_log (document_id, created_at desc);

-- -----------------------------------------------------------------------------
-- dd_items · el checklist de cada compañía
-- -----------------------------------------------------------------------------

create table dd_items (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  area_id       uuid not null references dd_areas (id) on delete restrict,
  template_id   uuid references dd_item_templates (id) on delete set null,
  title         text not null,
  description   text,
  is_required   boolean not null default true,
  status        estado_punto_dd not null default 'pendiente',
  owner_id      uuid references profiles (id) on delete set null,
  due_date      date,
  document_id   uuid references documents (id) on delete set null,
  -- Se copia de la plantilla al instanciar, para que cambiar la plantilla no
  -- reescriba el historial de las compañías ya evaluadas
  validity_months smallint check (validity_months > 0),
  expires_on    date,
  validated_by  uuid references profiles (id) on delete set null,
  validated_at  timestamptz,
  notes         text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, template_id)
);

create index dd_items_company_area_idx on dd_items (company_id, area_id);
create index dd_items_status_idx on dd_items (company_id, status);

create trigger dd_items_touch
  before update on dd_items
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- dd_item_status_history · quién movió cada punto y cuándo
-- -----------------------------------------------------------------------------

create table dd_item_status_history (
  id           bigint generated always as identity primary key,
  dd_item_id   uuid not null references dd_items (id) on delete cascade,
  company_id   uuid not null references companies (id) on delete cascade,
  from_status  estado_punto_dd,
  to_status    estado_punto_dd not null,
  note         text,
  changed_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index dd_item_status_history_item_idx
  on dd_item_status_history (dd_item_id, created_at desc);

-- El historial lo escribe la base, no la aplicación: así no hay forma de
-- mover un estado sin dejar rastro.
create or replace function app.registrar_cambio_estado_dd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into dd_item_status_history (dd_item_id, company_id, from_status, to_status, changed_by)
    values (new.id, new.company_id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into dd_item_status_history (dd_item_id, company_id, from_status, to_status, changed_by)
    values (new.id, new.company_id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger dd_items_historial
  after insert or update on dd_items
  for each row execute function app.registrar_cambio_estado_dd();

-- -----------------------------------------------------------------------------
-- Validar es de IWL, nunca de la compañía evaluada
--
-- La política de escritura deja editar el punto a la fundadora, porque tiene
-- que poder adjuntar documento y marcarlo como entregado. Lo que no puede es
-- dar por validado su propio punto: eso lo corta este trigger (§5, §11).
-- -----------------------------------------------------------------------------

create or replace function app.guard_validacion_dd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'validado'
     and (tg_op = 'INSERT' or old.status is distinct from 'validado')
     and not app.can_validate_company(new.company_id) then
    raise exception 'Validar un punto de due diligence es del equipo de IWL'
      using errcode = '42501';
  end if;

  -- Marcar algo como bloqueante también es una valoración
  if new.status = 'bloqueante'
     and (tg_op = 'INSERT' or old.status is distinct from 'bloqueante')
     and not app.can_validate_company(new.company_id) then
    raise exception 'Marcar un punto como bloqueante es del equipo de IWL'
      using errcode = '42501';
  end if;

  if new.status = 'validado' and new.validated_at is null then
    new.validated_by := auth.uid();
    new.validated_at := now();
  end if;

  if new.status <> 'validado' then
    new.validated_by := null;
    new.validated_at := null;
  end if;

  return new;
end;
$$;

create trigger dd_items_guard_validacion
  before insert or update on dd_items
  for each row execute function app.guard_validacion_dd();

-- -----------------------------------------------------------------------------
-- findings · hallazgos del due diligence general (§4.3)
--
-- Los técnicos van en `tech_findings`, con su propia dimensión y su propio
-- flujo. Aquí van los del resto de áreas.
-- -----------------------------------------------------------------------------

create table findings (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id) on delete cascade,
  area_id         uuid not null references dd_areas (id) on delete restrict,
  dd_item_id      uuid references dd_items (id) on delete set null,
  severity        severidad_hallazgo not null,
  title           text not null,
  description     text not null,
  impact          text,
  resolution_plan text,
  due_date        date,
  status          estado_hallazgo not null default 'abierto',
  acceptance_note text,
  resolved_at     timestamptz,
  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint aceptar_riesgo_general_lleva_motivo
    check (status <> 'aceptado' or acceptance_note is not null)
);

create index findings_company_idx on findings (company_id, status);

create trigger findings_touch
  before update on findings
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Instanciar el checklist al dar de alta una compañía
-- -----------------------------------------------------------------------------

create or replace function app.instanciar_checklist_dd(target_company uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  creados integer;
begin
  insert into dd_items (
    company_id, area_id, template_id, title, description,
    is_required, validity_months
  )
  select
    target_company, t.area_id, t.id, t.title, t.description,
    t.is_required, t.validity_months
  from dd_item_templates t
  join dd_areas a on a.id = t.area_id
  where t.is_active and a.is_active
  on conflict (company_id, template_id) do nothing;

  get diagnostics creados = row_count;
  return creados;
end;
$$;

grant execute on function app.instanciar_checklist_dd(uuid) to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table documents              enable row level security;
alter table document_versions      enable row level security;
alter table document_access_log    enable row level security;
alter table dd_items               enable row level security;
alter table dd_item_status_history enable row level security;
alter table findings               enable row level security;

create policy documents_select on documents
  for select to authenticated using (app.can_read_company(company_id));
create policy documents_write on documents
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

create policy document_versions_select on document_versions
  for select to authenticated using (app.can_read_company(company_id));
create policy document_versions_insert on document_versions
  for insert to authenticated with check (app.can_write_company(company_id));
-- Una versión no se edita ni se borra: se sube otra
create policy document_versions_delete on document_versions
  for delete to authenticated using (app.is_admin());

-- El registro de accesos lo escribe cualquiera que acceda, y lo lee quien ve
-- la compañía. Nadie lo modifica.
create policy document_access_log_select on document_access_log
  for select to authenticated using (app.can_read_company(company_id));
create policy document_access_log_insert on document_access_log
  for insert to authenticated
  with check (profile_id = auth.uid() and app.can_read_company(company_id));

create policy dd_items_select on dd_items
  for select to authenticated using (app.can_read_company(company_id));
create policy dd_items_insert on dd_items
  for insert to authenticated with check (app.is_iwl());
create policy dd_items_update on dd_items
  for update to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));
create policy dd_items_delete on dd_items
  for delete to authenticated using (app.is_iwl());

create policy dd_item_status_history_select on dd_item_status_history
  for select to authenticated using (app.can_read_company(company_id));

create policy findings_select on findings
  for select to authenticated using (app.can_read_company(company_id));
create policy findings_write on findings
  for all to authenticated
  using (app.can_validate_company(company_id))
  with check (app.can_validate_company(company_id));

-- =============================================================================
-- Storage · un bucket privado para el data room
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('data-room', 'data-room', false)
on conflict (id) do nothing;

-- La primera carpeta de la ruta es el id de la compañía: `<company_id>/...`.
-- Es lo que permite aplicar el mismo aislamiento a los ficheros.
create policy data_room_select on storage.objects
  for select to authenticated using (
    bucket_id = 'data-room'
    and app.can_read_company((storage.foldername(name))[1]::uuid)
  );

create policy data_room_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'data-room'
    and app.can_write_company((storage.foldername(name))[1]::uuid)
  );

create policy data_room_update on storage.objects
  for update to authenticated using (
    bucket_id = 'data-room'
    and app.can_write_company((storage.foldername(name))[1]::uuid)
  );

create policy data_room_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'data-room'
    and app.is_iwl()
  );
