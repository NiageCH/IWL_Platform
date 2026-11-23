-- =============================================================================
-- El mentor principal, desde la preselección (REVISION, 23 nov)
--
-- Lo elige el comité al preseleccionar, y entra con la compañía, porque es
-- quien verifica su lista de entrada y prepara la hoja de ruta. Mientras la
-- compañía está en entrada ve la ficha, la lista y el asistente, y
-- verifica; dirección puede verificar en su lugar, y queda quién lo hizo.
-- La due diligence (los documentos de la sociedad) sigue siendo solo de
-- dirección y del equipo, y de ella: el mentor no la ve en entrada.
-- =============================================================================

alter table comite_actas
  add column if not exists mentor_principal_id uuid references profiles (id) on delete set null;

comment on column comite_actas.mentor_principal_id is
  'El mentor principal que propone el comité al preseleccionar. Entra con la compañía en entrada.';

-- Lo firmado del acta incluye el mentor
CREATE OR REPLACE FUNCTION app.guard_acta_firmada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- Se borra la candidatura entera: el acta se va con ella
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;

  if exists (select 1 from comite_firmas where acta_id = old.id and firmado_at is not null) then
    if tg_op = 'DELETE' then
      raise exception 'Un acta que alguien ha firmado no se borra.' using errcode = '42501';
    end if;
    if (new.fecha, new.resumen, new.decision, new.estadio, new.estadio_propuesto, new.estadio_motivo, new.mentor_principal_id,
        new.motivo, new.revision_on, new.puede_volver, new.mensaje)
       is distinct from
       (old.fecha, old.resumen, old.decision, old.estadio, old.estadio_propuesto, old.estadio_motivo, old.mentor_principal_id,
        old.motivo, old.revision_on, old.puede_volver, old.mensaje) then
      raise exception 'Un acta que alguien ha firmado no se edita. Redacta otra.' using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

-- Al nacer la compañía, entra su mentor principal
CREATE OR REPLACE FUNCTION app.crear_compania_en_entrada(p_candidatura uuid, p_actor uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c candidaturas%rowtype;
  v_company uuid;
  v_org uuid;
begin
  select * into c from candidaturas where id = p_candidatura for update;
  if not found or c.company_id is not null then
    return c.company_id;
  end if;

  select id into v_org from organizations where slug = 'iwl';

  insert into companies (
    organization_id, cohort_id, name, slug, sector, one_liner, website,
    entry_state, female_leadership_pct, tramo, created_by, is_demo,
    stage, tech_profile
  ) values (
    v_org, c.cohort_id, c.nombre, app.slug_libre(c.nombre), c.sector, c.one_liner, c.website,
    coalesce(c.estado_verificado, c.estado_declarado), c.liderazgo_femenino_pct,
    'entrada', p_actor, c.is_demo,
    -- Las columnas tienen valor por defecto; en entrada se dejan sin decidir
    null, null
  )
  returning id into v_company;

  perform app.instanciar_checklist_dd(v_company);
  perform app.instanciar_business_plan(v_company);

  -- La situación, si ya se dijo en la candidatura: el disparador ajusta lo societario
  if c.situacion_societaria is not null then
    update companies
    set situacion_societaria = c.situacion_societaria,
        constitucion_prevista = c.constitucion_prevista,
        forma_juridica = c.forma_juridica,
        denominacion_social = c.denominacion_social,
        cif = c.cif
    where id = v_company;
  end if;

  -- Ella pasa a fundadora: la misma cuenta, y entra en Mi compañía
  if c.profile_id is not null then
    update profiles set role = 'fundadora' where id = c.profile_id and role = 'candidata';
    insert into company_members (company_id, profile_id, member_role)
    values (v_company, c.profile_id, 'fundadora')
    on conflict do nothing;
  end if;

  /*
   * El mentor principal, el que eligió el comité al preseleccionarla
   * (REVISION, 23 nov): entra con la compañía, porque es quien verifica su
   * lista y prepara la hoja de ruta.
   */
  insert into company_members (company_id, profile_id, member_role)
  select v_company, a.mentor_principal_id, 'mentor_principal'
  from comite_actas a
  where a.candidatura_id = p_candidatura and a.decision = 'preseleccionada'
    and a.cerrada_at is not null and a.mentor_principal_id is not null
  order by a.cerrada_at desc
  limit 1
  on conflict do nothing;

  update candidaturas set company_id = v_company, estado = 'entrada' where id = p_candidatura;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    v_company, p_actor, 'companies', v_company, 'alta',
    jsonb_build_object('tramo', 'entrada', 'estadio', coalesce(c.estado_verificado, c.estado_declarado), 'candidatura', p_candidatura)
  );

  insert into candidatura_eventos (candidatura_id, tipo, ocurrido_on, titulo, detalle, created_by)
  values (
    p_candidatura, 'nota', current_date, 'Compañía creada, en entrada',
    'Estadio: ' || coalesce(app.nombre_estadio(coalesce(c.estado_verificado, c.estado_declarado)), 'sin decir') || '.',
    p_actor
  );

  return v_company;
end;
$function$;

-- -----------------------------------------------------------------------------
-- La due diligence en entrada: IWL y ella, no el mentor
-- -----------------------------------------------------------------------------

create or replace function app.ve_diligencia(p_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select app.is_iwl()
      or app.fundadora_de(p_company)
      or not exists (select 1 from companies where id = p_company and tramo = 'entrada')
$$;

drop policy if exists dd_items_select on dd_items;
create policy dd_items_select on dd_items
  for select using (app.can_read_company(company_id) and app.ve_diligencia(company_id));

drop policy if exists dd_items_insert on dd_items;
create policy dd_items_insert on dd_items
  for insert with check (app.coordina_company(company_id) and app.ve_diligencia(company_id));

drop policy if exists dd_items_delete on dd_items;
create policy dd_items_delete on dd_items
  for delete using (app.coordina_company(company_id) and app.ve_diligencia(company_id));

drop policy if exists dd_items_update on dd_items;
create policy dd_items_update on dd_items
  for update using (app.can_write_company(company_id) and app.ve_diligencia(company_id))
  with check (app.can_write_company(company_id) and app.ve_diligencia(company_id));

drop policy if exists documents_select on documents;
create policy documents_select on documents
  for select using (app.can_read_company(company_id) and app.ve_diligencia(company_id));

drop policy if exists documents_write on documents;
create policy documents_write on documents
  for all using (app.can_write_company(company_id) and app.ve_diligencia(company_id))
  with check (app.can_write_company(company_id) and app.ve_diligencia(company_id));
