-- =============================================================================
-- 015 · Qué puede hacer cada mentor
--
-- Decidido con Rodrigo: el mentor principal es parte de IWL y responde del
-- avance del proyecto que coordina, así que puntúa el due diligence, confirma
-- hitos y mueve el plan. Lo hace solo en los proyectos donde es principal: no
-- ve la cartera ni toca la configuración del programa.
--
-- Esto flexibiliza a propósito la regla de que quien hace el trabajo no lo
-- certifica. El documento la puso para la fundadora (§5, §11) y ahí sigue
-- intacta: una fundadora no puede puntuarse ni validarse. Para el coordinador
-- se acepta, porque en una incubadora boutique el mentor principal es quien
-- conoce el proyecto y esperar a IWL para cada confirmación paraliza.
--
-- Lo que no toca un mentor, ni siendo principal:
--   · el Anexo y el equity, que son contractuales
--   · la caja: compromisos y desembolsos
--   · las objeciones de la compañía sobre horas, que pueden ser a las suyas
--   · congelar líneas base
--   · la configuración del programa y el alta de personas
-- =============================================================================

/**
 * Quién coordina una compañía.
 *
 * IWL siempre, y el mentor principal en los proyectos que lleva. Es el
 * permiso que sustituye a `app.is_iwl()` en todo lo que es de un proyecto
 * concreto y no del programa entero.
 */
create or replace function app.coordina_company(target_company uuid)
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
      and member_role = 'mentor_principal'
  )
$$;

grant execute on function app.coordina_company(uuid) to authenticated;

-- Las asignaciones de mentoría que había pasan a secundarias: el principal se
-- designa a mano, porque decir quién coordina un proyecto es una decisión
update company_members set member_role = 'mentor_secundario'
where member_role = 'mentor';

-- -----------------------------------------------------------------------------
-- Escritura y validación
-- -----------------------------------------------------------------------------

/*
 * Escritura del lado de la compañía: fundadora, IWL y quien coordina.
 */
create or replace function app.can_write_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.coordina_company(target_company) or exists (
    select 1 from company_members
    where company_id = target_company
      and profile_id = auth.uid()
      and member_role = 'fundadora'
  )
$$;

/*
 * Validar y puntuar.
 *
 * La fundadora sigue fuera por construcción, que es el criterio de
 * aceptación §11 y no se relaja. Entran el revisor de Niage asignado y el
 * mentor que coordina.
 */
create or replace function app.can_validate_company(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.coordina_company(target_company) or (
    app.actor_role() = 'revisor_niage'
    and exists (
      select 1 from company_members
      where company_id = target_company
        and profile_id = auth.uid()
        and member_role = 'revisor_niage'
    )
  )
$$;

-- -----------------------------------------------------------------------------
-- Las políticas que son de un proyecto, no del programa
-- -----------------------------------------------------------------------------

drop policy if exists company_pillars_write on company_pillars;
create policy company_pillars_write on company_pillars
  for all to authenticated
  using (app.coordina_company(company_id))
  with check (app.coordina_company(company_id));

drop policy if exists dd_items_insert on dd_items;
create policy dd_items_insert on dd_items
  for insert to authenticated with check (app.coordina_company(company_id));

drop policy if exists dd_items_delete on dd_items;
create policy dd_items_delete on dd_items
  for delete to authenticated using (app.coordina_company(company_id));

drop policy if exists milestones_insert on milestones;
create policy milestones_insert on milestones
  for insert to authenticated with check (app.coordina_company(company_id));

drop policy if exists milestones_delete on milestones;
create policy milestones_delete on milestones
  for delete to authenticated using (app.coordina_company(company_id));

drop policy if exists roadmap_stages_write on roadmap_stages;
create policy roadmap_stages_write on roadmap_stages
  for all to authenticated
  using (app.coordina_company(company_id))
  with check (app.coordina_company(company_id));

drop policy if exists deliverables_write on deliverables;
create policy deliverables_write on deliverables
  for all to authenticated
  using (app.coordina_company(company_id))
  with check (app.coordina_company(company_id));

drop policy if exists contribution_items_write on contribution_items;
create policy contribution_items_write on contribution_items
  for all to authenticated
  using (app.coordina_company(company_id))
  with check (app.coordina_company(company_id));

drop policy if exists introductions_insert on introductions;
create policy introductions_insert on introductions
  for insert to authenticated with check (app.coordina_company(company_id));

drop policy if exists introductions_delete on introductions;
create policy introductions_delete on introductions
  for delete to authenticated using (app.coordina_company(company_id));

drop policy if exists progress_entries_update on progress_entries;
create policy progress_entries_update on progress_entries
  for update to authenticated
  using (author_id = auth.uid() or app.coordina_company(company_id))
  with check (app.can_write_company(company_id));

drop policy if exists progress_entries_delete on progress_entries;
create policy progress_entries_delete on progress_entries
  for delete to authenticated
  using (author_id = auth.uid() or app.coordina_company(company_id));

/*
 * Las horas: las registra quien coordina, y cada mentor las suyas.
 *
 * Un mentor secundario tiene horas asignadas en un proyecto y tiene que poder
 * imputarlas; lo que no puede es imputar horas a nombre de otra persona ni
 * corregir las que ya registró alguien más. Sin esto, el libro de horas de
 * una incubadora con mentores externos lo tendría que rellenar la dirección,
 * y un libro que no rellena quien trabaja no se rellena.
 */
drop policy if exists contribution_hours_write on contribution_hours;

create policy contribution_hours_insert on contribution_hours
  for insert to authenticated
  with check (
    app.coordina_company(company_id)
    or (app.can_read_company(company_id) and profile_id = auth.uid())
  );

create policy contribution_hours_update on contribution_hours
  for update to authenticated
  using (app.coordina_company(company_id) or profile_id = auth.uid())
  with check (app.coordina_company(company_id) or profile_id = auth.uid());

create policy contribution_hours_delete on contribution_hours
  for delete to authenticated
  using (app.coordina_company(company_id) or profile_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Los guardas que decidían por `is_iwl`
-- -----------------------------------------------------------------------------

/*
 * Confirmar un hito como cumplido.
 *
 * La compañía lo mueve a «en curso» y aporta evidencia; confirmar que está
 * hecho es valoración y la hace quien coordina.
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
     and not app.coordina_company(new.company_id) then
    raise exception 'Confirmar un hito como cumplido es de IWL o de quien coordina el proyecto'
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

/*
 * El carril de un avance.
 *
 * El mentor principal escribe en el de IWL: en ese proyecto es IWL. El
 * secundario también, porque su trabajo es aportación del programa y no de la
 * compañía. Lo que decide el carril sigue siendo quién escribe, nunca el
 * formulario.
 */
create or replace function app.asignar_lado_avance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.side := case
      when app.is_iwl() or exists (
        select 1 from company_members
        where company_id = new.company_id
          and profile_id = auth.uid()
          and member_role in ('mentor_principal', 'mentor_secundario')
      ) then 'iwl'
      else 'compania'
    end;
    new.author_id := coalesce(new.author_id, auth.uid());
  else
    new.side := old.side;
    new.author_id := old.author_id;
  end if;
  return new;
end;
$$;

-- Diseñar la hoja de ruta de un proyecto también es coordinarlo
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
  if not app.coordina_company(target_company) then
    raise exception 'Diseñar la hoja de ruta es de IWL o de quien coordina el proyecto'
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

create or replace function app.activar_kpis_de_sector(
  target_company uuid,
  codigos text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  creados integer;
begin
  if not app.coordina_company(target_company) then
    raise exception 'Activar KPI es de IWL o de quien coordina el proyecto'
      using errcode = '42501';
  end if;

  insert into company_kpis (company_id, kpi_id, order_index)
  select target_company, k.id, k.order_index
  from kpi_definitions k
  where k.code = any(codigos) and k.is_active and not k.is_derived
  on conflict do nothing;

  get diagnostics creados = row_count;
  return creados;
end;
$$;

comment on function app.coordina_company(uuid) is
  'IWL, o el mentor principal asignado a esa compañía. Es el permiso de todo lo que es de un proyecto concreto y no del programa entero.';

-- -----------------------------------------------------------------------------
-- Los dos que quedaban
-- -----------------------------------------------------------------------------

/*
 * Revisar el update mensual.
 *
 * Es la lectura que hace el programa de lo que ha contado la compañía, así
 * que la hace quien coordina el proyecto.
 */
create or replace function app.guard_revision_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'revisado'
     and (tg_op = 'INSERT' or old.status is distinct from 'revisado')
     and not app.coordina_company(new.company_id) then
    raise exception 'Revisar el update mensual es de IWL o de quien coordina el proyecto'
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

/*
 * Borrar del data room.
 *
 * Un documento de la sala de datos lo quita quien coordina, no cualquiera de
 * IWL que pase por ahí. La ruta del fichero empieza por el identificador de
 * la compañía, que es lo que permite decidirlo por proyecto.
 */
drop policy if exists data_room_delete on storage.objects;
create policy data_room_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'data-room'
    and app.coordina_company((storage.foldername(name))[1]::uuid)
  );
