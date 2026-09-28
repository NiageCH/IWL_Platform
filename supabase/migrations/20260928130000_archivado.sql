-- =============================================================================
-- 017 · Archivar en vez de borrar
--
-- Decidido con Rodrigo. Una compañía con due diligence, horas imputadas y
-- equity acordado no se borra: su extracto de aportación justifica una
-- participación, y esa prueba tiene que sobrevivir a que el proyecto salga
-- del programa, se cierre o se venda.
--
-- El borrado real se reserva para lo que se creó por error y no tiene nada
-- dentro. Y no es la interfaz quien decide si lo tiene: lo comprueba la base,
-- porque una comprobación que vive solo en el formulario se salta con una
-- llamada directa.
-- =============================================================================

alter table companies
  add column archived_at   timestamptz,
  add column archived_by   uuid references profiles (id) on delete set null,
  add column archive_reason text;

create index companies_activas_idx on companies (organization_id)
  where archived_at is null;

comment on column companies.archived_at is
  'Fuera de la cartera y de los listados, pero con su histórico intacto. Una compañía archivada se puede restaurar.';

alter table profiles
  add column archived_at timestamptz;

comment on column profiles.is_active is
  'Una persona inactiva no entra. Se conserva porque sus horas, sus validaciones y sus tareas llevan su nombre.';

-- -----------------------------------------------------------------------------
-- Archivar y restaurar
-- -----------------------------------------------------------------------------

create or replace function app.archivar_compania(
  target_company uuid,
  motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.is_admin() then
    raise exception 'Archivar una compañía es de la dirección de IWL'
      using errcode = '42501';
  end if;

  update companies
  set archived_at = now(), archived_by = auth.uid(), archive_reason = motivo
  where id = target_company and archived_at is null;

  if not found then
    raise exception 'Esa compañía no existe o ya estaba archivada'
      using errcode = '23505';
  end if;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    target_company, auth.uid(), 'companies', target_company, 'archivar',
    jsonb_build_object('motivo', motivo)
  );
end;
$$;

create or replace function app.restaurar_compania(target_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.is_admin() then
    raise exception 'Restaurar una compañía es de la dirección de IWL'
      using errcode = '42501';
  end if;

  update companies
  set archived_at = null, archived_by = null, archive_reason = null
  where id = target_company;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    target_company, auth.uid(), 'companies', target_company, 'restaurar', '{}'::jsonb
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Qué cuenta como tener algo dentro
-- -----------------------------------------------------------------------------

/**
 * Si una compañía tiene actividad real.
 *
 * El checklist de due diligence, las secciones del business plan y los KPI no
 * cuentan: los crea el alta y están en todas desde el primer segundo. Lo que
 * cuenta es lo que alguien puso a mano después.
 */
create or replace function app.compania_tiene_actividad(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from contribution_hours where company_id = target_company)
    or exists (select 1 from documents where company_id = target_company)
    or exists (select 1 from milestones where company_id = target_company)
    or exists (select 1 from tech_scores s
               join tech_assessments a on a.id = s.assessment_id
               where a.company_id = target_company)
    or exists (select 1 from tech_findings where company_id = target_company)
    or exists (select 1 from kpi_values where company_id = target_company)
    or exists (select 1 from baselines where company_id = target_company)
    or exists (select 1 from progress_entries where company_id = target_company)
    or exists (select 1 from annexes where company_id = target_company)
    or exists (select 1 from cash_disbursements where company_id = target_company)
$$;

grant execute on function app.compania_tiene_actividad(uuid) to authenticated;

/**
 * Borrar de verdad.
 *
 * Solo lo que se creó por error. La comprobación está aquí y no en el
 * formulario porque una comprobación que vive en la interfaz se salta con una
 * llamada directa a la API, y esto no tiene deshacer.
 */
create or replace function app.borrar_compania(target_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  nombre text;
begin
  if not app.is_admin() then
    raise exception 'Borrar una compañía es de la dirección de IWL'
      using errcode = '42501';
  end if;

  select name into nombre from companies where id = target_company;
  if nombre is null then
    raise exception 'Esa compañía no existe' using errcode = '23503';
  end if;

  if app.compania_tiene_actividad(target_company) then
    raise exception 'Esta compañía tiene trabajo registrado y no se puede borrar. Archívala: sale de la cartera y conserva su histórico, que es lo que justifica la aportación de IWL.'
      using errcode = '23503';
  end if;

  delete from companies where id = target_company;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    null, auth.uid(), 'companies', target_company, 'borrar',
    jsonb_build_object('nombre', nombre)
  );
end;
$$;

/** Si una persona ha dejado rastro que lleve su nombre */
create or replace function app.persona_tiene_actividad(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from contribution_hours where profile_id = target_profile)
    or exists (select 1 from progress_entries where author_id = target_profile)
    or exists (select 1 from tasks where owner_id = target_profile)
    or exists (select 1 from tech_assessments where reviewer_id = target_profile)
    or exists (select 1 from documents where created_by = target_profile)
    or exists (select 1 from milestones where confirmed_by = target_profile)
$$;

grant execute on function app.persona_tiene_actividad(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------

do $$
begin
  execute 'revoke all on function app.archivar_compania(uuid, text) from public, anon';
  execute 'revoke all on function app.restaurar_compania(uuid) from public, anon';
  execute 'revoke all on function app.borrar_compania(uuid) from public, anon';
  execute 'grant execute on function app.archivar_compania(uuid, text) to authenticated';
  execute 'grant execute on function app.restaurar_compania(uuid) to authenticated';
  execute 'grant execute on function app.borrar_compania(uuid) to authenticated';
end;
$$;

/* PostgREST solo expone `public`: aquí van las puertas */
create or replace function public.archivar_compania(
  target_company uuid,
  motivo text default null
)
returns void language sql security invoker set search_path = public
as $$ select app.archivar_compania(target_company, motivo) $$;

create or replace function public.restaurar_compania(target_company uuid)
returns void language sql security invoker set search_path = public
as $$ select app.restaurar_compania(target_company) $$;

create or replace function public.borrar_compania(target_company uuid)
returns void language sql security invoker set search_path = public
as $$ select app.borrar_compania(target_company) $$;

do $$
begin
  execute 'revoke all on function public.archivar_compania(uuid, text) from public, anon';
  execute 'revoke all on function public.restaurar_compania(uuid) from public, anon';
  execute 'revoke all on function public.borrar_compania(uuid) from public, anon';
  execute 'grant execute on function public.archivar_compania(uuid, text) to authenticated';
  execute 'grant execute on function public.restaurar_compania(uuid) to authenticated';
  execute 'grant execute on function public.borrar_compania(uuid) to authenticated';
end;
$$;

/*
 * Una compañía archivada deja de ser visible para su equipo fundador.
 *
 * IWL la sigue viendo, porque el archivo es suyo y tiene que poder
 * consultarlo y restaurarla. La fundadora no: para ella el proyecto salió del
 * programa, y dejarle una ficha viva que ya nadie atiende es peor que no
 * dejarle nada.
 */
create or replace function app.can_read_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_iwl() or (
    exists (
      select 1 from company_members
      where company_id = target_company and profile_id = auth.uid()
    )
    and not exists (
      select 1 from companies
      where id = target_company and archived_at is not null
    )
  )
$$;

/*
 * Las dos comprobaciones, expuestas.
 *
 * La interfaz las usa para avisar antes de ofrecer el borrado, en vez de
 * dejar que el usuario lo intente y se lleve un error. La decisión sigue
 * siendo de la base: esto solo sirve para no proponer lo imposible.
 */
create or replace function public.compania_tiene_actividad(target_company uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select app.compania_tiene_actividad(target_company) $$;

create or replace function public.persona_tiene_actividad(target_profile uuid)
returns boolean language sql stable security invoker set search_path = public
as $$ select app.persona_tiene_actividad(target_profile) $$;

do $$
begin
  execute 'revoke all on function public.compania_tiene_actividad(uuid) from public, anon';
  execute 'revoke all on function public.persona_tiene_actividad(uuid) from public, anon';
  execute 'grant execute on function public.compania_tiene_actividad(uuid) to authenticated';
  execute 'grant execute on function public.persona_tiene_actividad(uuid) to authenticated';
end;
$$;
