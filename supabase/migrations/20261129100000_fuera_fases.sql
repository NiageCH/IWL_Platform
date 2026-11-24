-- =============================================================================
-- Fuera las fases antiguas del programa (REVISION, 24 nov)
--
-- Acuerdo Marco, Due diligence conjunto, Incubación y Fin del programa no
-- conviven con los cuatro tramos de la hoja de ruta: el tramo sale de la
-- hoja de ruta y el estadio, de la candidatura. Nada calculaba con ellas
-- (ni scores, ni filtros de la cartera, ni la comparativa): se elegían al
-- firmar o dar de alta y se enseñaban. Se retiran la tabla `phases` y las
-- columnas `companies.phase_id` y `milestones.phase_id`, y se recrean,
-- desde su definición actual, lo que las nombraba: la vista de
-- Administración → Compañías, el alta, las dos firmas del Acuerdo y el
-- guardián de lo que fija IWL.
-- =============================================================================

-- Las firmas cambian de argumentos: se quitan las de antes para no dejar dos
drop function if exists public.crear_compania(text, text, company_stage, company_tech_profile, text, estado_entrada, uuid, date, text, text, uuid, numeric, date, text);
drop function if exists app.crear_compania(text, text, company_stage, company_tech_profile, text, estado_entrada, uuid, date, text, text, uuid, numeric, date, text);
drop function if exists public.firmar_acuerdo(uuid, company_stage, company_tech_profile, text, uuid, date, date);
drop function if exists app.firmar_acuerdo(uuid, company_stage, company_tech_profile, text, uuid, date, date);
drop function if exists public.firmar_candidatura(uuid, text, company_stage, company_tech_profile, text, uuid, date, date);
drop function if exists app.firmar_candidatura(uuid, text, company_stage, company_tech_profile, text, uuid, date, date);

CREATE OR REPLACE FUNCTION app.crear_compania(p_name text, p_slug text, p_stage company_stage, p_tech_profile company_tech_profile, p_entry_state estado_entrada DEFAULT NULL::estado_entrada, p_roadmap_template uuid DEFAULT NULL::uuid, p_roadmap_start date DEFAULT NULL::date, p_sector text DEFAULT NULL::text, p_one_liner text DEFAULT NULL::text, p_cohort_id uuid DEFAULT NULL::uuid, p_female_leadership_pct numeric DEFAULT NULL::numeric, p_founded_on date DEFAULT NULL::date, p_website text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  nueva_id uuid;
  org_id uuid;
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

  insert into companies (
    organization_id, cohort_id, name, slug, sector, one_liner,
    stage, tech_profile, entry_state, female_leadership_pct,
    founded_on, website, created_by
  ) values (
    org_id, p_cohort_id, p_name, p_slug, p_sector, p_one_liner,
    p_stage, p_tech_profile, p_entry_state, p_female_leadership_pct,
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
$function$;

CREATE OR REPLACE FUNCTION app.firmar_acuerdo(p_company uuid, p_stage company_stage, p_tech_profile company_tech_profile, p_roadmap_template uuid DEFAULT NULL::uuid, p_roadmap_start date DEFAULT NULL::date, p_firmado_on date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  co companies%rowtype;
  a annexes%rowtype;
  v_faltan int;
begin
  if not app.is_iwl() then
    raise exception 'Firmar el Acuerdo es del equipo de IWL.' using errcode = '42501';
  end if;

  select * into co from companies where id = p_company for update;
  if not found or co.tramo is distinct from 'entrada' or co.archived_at is not null then
    raise exception 'El Acuerdo se firma con la compañía en entrada.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from decisiones_incorporacion where company_id = p_company and decision = 'si') then
    raise exception 'Falta la decisión de incorporación en «sí».' using errcode = 'P0001';
  end if;

  select * into a from annexes where company_id = p_company order by version desc limit 1 for update;
  if a.id is null or a.status <> 'aceptado' then
    raise exception 'Falta que ella acepte la propuesta de Acuerdo.' using errcode = 'P0001';
  end if;

  if co.situacion_societaria is null then
    raise exception 'Falta la situación societaria.' using errcode = 'P0001';
  end if;
  if co.situacion_societaria = 'constituida'
     and (co.forma_juridica is null or coalesce(co.denominacion_social, '') = '' or coalesce(co.cif, '') = '') then
    raise exception 'Con sociedad constituida hacen falta la forma jurídica, la denominación social y el CIF.'
      using errcode = 'P0001';
  end if;

  -- La puerta del due diligence: en todos los estadios menos idea, que va con diagnóstico
  if co.entry_state is distinct from 'idea' then
    select count(*) into v_faltan
    from dd_items
    where company_id = p_company and is_required and status not in ('validado', 'no_aplica');
    if v_faltan > 0 then
      raise exception 'El Acuerdo pide validado lo obligatorio del due diligence. Faltan %.', v_faltan
        using errcode = 'P0001';
    end if;
  end if;

  update companies
  set stage = p_stage,
      tech_profile = p_tech_profile,
      tramo = 'incubacion'
  where id = p_company;

  update annexes set status = 'firmado', signed_on = coalesce(p_firmado_on, current_date) where id = a.id;

  perform app.instanciar_kpis(p_company);
  if p_roadmap_template is not null then
    perform app.instanciar_hoja_de_ruta(p_company, p_roadmap_template, coalesce(p_roadmap_start, current_date), a.id);
  end if;

  update candidaturas
  set estado = 'firmada',
      acuerdo_firmado_on = coalesce(p_firmado_on, current_date),
      equity_pct = a.equity_pct,
      acuerdo_firmantes = a.firmantes
  where company_id = p_company;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    p_company, auth.uid(), 'companies', p_company, 'acuerdo_firmado',
    jsonb_build_object('anexo', a.id, 'estadio', co.entry_state, 'etapa', p_stage, 'firmantes', a.firmantes)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION app.firmar_candidatura(p_candidatura uuid, p_slug text, p_stage company_stage, p_tech_profile company_tech_profile, p_roadmap_template uuid DEFAULT NULL::uuid, p_roadmap_start date DEFAULT NULL::date, p_firmado_on date DEFAULT CURRENT_DATE)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c candidaturas%rowtype;
  v_company uuid;
begin
  if not app.is_iwl() then
    raise exception 'Firmar un acuerdo es del equipo de IWL.'
      using errcode = '42501';
  end if;

  select * into c from candidaturas where id = p_candidatura for update;

  if not found then
    raise exception 'Esa candidatura no existe.' using errcode = 'P0001';
  end if;

  if c.company_id is not null then
    raise exception 'Esa candidatura ya tiene compañía.' using errcode = 'P0001';
  end if;

  if c.estado = 'descartada' then
    raise exception 'Esa candidatura está descartada. Reábrela antes de firmar.'
      using errcode = 'P0001';
  end if;

  if c.situacion_societaria is null then
    raise exception 'Falta la situación societaria: di si hay sociedad, si está en constitución o si no la hay.'
      using errcode = 'P0001';
  end if;

  if c.situacion_societaria = 'constituida'
     and (c.forma_juridica is null or coalesce(c.denominacion_social, '') = '' or coalesce(c.cif, '') = '') then
    raise exception 'Con sociedad constituida hacen falta la forma jurídica, la denominación social y el CIF.'
      using errcode = 'P0001';
  end if;

  if jsonb_array_length(coalesce(c.acuerdo_firmantes, '[]')) = 0 then
    raise exception 'Falta decir quién firma el Acuerdo.' using errcode = 'P0001';
  end if;

  v_company := app.crear_compania(
    p_name              => c.nombre,
    p_slug              => p_slug,
    p_stage             => p_stage,
    p_tech_profile      => p_tech_profile,
    p_entry_state       => coalesce(c.estado_verificado, c.estado_declarado),
    p_roadmap_template  => p_roadmap_template,
    p_roadmap_start     => p_roadmap_start,
    p_sector            => c.sector,
    p_one_liner         => c.one_liner,
    p_cohort_id         => c.cohort_id,
    p_female_leadership_pct => c.liderazgo_femenino_pct,
    p_founded_on        => null,
    p_website           => c.website
  );

  -- La situación pasa a la compañía; el disparador ajusta lo que depende de ella
  update companies
  set situacion_societaria = c.situacion_societaria,
      constitucion_prevista = c.constitucion_prevista,
      forma_juridica = c.forma_juridica,
      denominacion_social = c.denominacion_social,
      cif = c.cif
  where id = v_company;

  update candidaturas
  set company_id = v_company,
      estado = 'firmada',
      acuerdo_firmado_on = coalesce(p_firmado_on, current_date)
  where id = p_candidatura;

  return v_company;
end;
$function$;

CREATE OR REPLACE FUNCTION public.crear_compania(p_name text, p_slug text, p_stage company_stage, p_tech_profile company_tech_profile, p_entry_state estado_entrada DEFAULT NULL::estado_entrada, p_roadmap_template uuid DEFAULT NULL::uuid, p_roadmap_start date DEFAULT NULL::date, p_sector text DEFAULT NULL::text, p_one_liner text DEFAULT NULL::text, p_cohort_id uuid DEFAULT NULL::uuid, p_female_leadership_pct numeric DEFAULT NULL::numeric, p_founded_on date DEFAULT NULL::date, p_website text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select app.crear_compania(
    p_name, p_slug, p_stage, p_tech_profile,
    p_entry_state, p_roadmap_template, p_roadmap_start,
    p_sector, p_one_liner, p_cohort_id, p_female_leadership_pct,
    p_founded_on, p_website
  )
$function$;

CREATE OR REPLACE FUNCTION public.firmar_candidatura(p_candidatura uuid, p_slug text, p_stage company_stage, p_tech_profile company_tech_profile, p_roadmap_template uuid DEFAULT NULL::uuid, p_roadmap_start date DEFAULT NULL::date, p_firmado_on date DEFAULT CURRENT_DATE)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select app.firmar_candidatura(
    p_candidatura, p_slug, p_stage, p_tech_profile,
    p_roadmap_template, p_roadmap_start, p_firmado_on
  )
$function$;

CREATE OR REPLACE FUNCTION public.firmar_acuerdo(p_company uuid, p_stage company_stage, p_tech_profile company_tech_profile, p_roadmap_template uuid DEFAULT NULL::uuid, p_roadmap_start date DEFAULT NULL::date, p_firmado_on date DEFAULT CURRENT_DATE)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ select app.firmar_acuerdo(p_company, p_stage, p_tech_profile, p_roadmap_template, p_roadmap_start, p_firmado_on) $function$;

-- Como estaban: el alta y las firmas, solo con sesión
revoke all on function public.crear_compania(text, text, company_stage, company_tech_profile, estado_entrada, uuid, date, text, text, uuid, numeric, date, text) from public, anon;
grant execute on function public.crear_compania(text, text, company_stage, company_tech_profile, estado_entrada, uuid, date, text, text, uuid, numeric, date, text) to authenticated, service_role;
revoke all on function app.crear_compania(text, text, company_stage, company_tech_profile, estado_entrada, uuid, date, text, text, uuid, numeric, date, text) from public, anon;
grant execute on function app.crear_compania(text, text, company_stage, company_tech_profile, estado_entrada, uuid, date, text, text, uuid, numeric, date, text) to authenticated;
revoke all on function public.firmar_acuerdo(uuid, company_stage, company_tech_profile, uuid, date, date) from public, anon;
grant execute on function public.firmar_acuerdo(uuid, company_stage, company_tech_profile, uuid, date, date) to authenticated, service_role;
revoke all on function public.firmar_candidatura(uuid, text, company_stage, company_tech_profile, uuid, date, date) from public, anon;
grant execute on function public.firmar_candidatura(uuid, text, company_stage, company_tech_profile, uuid, date, date) to authenticated, service_role;

CREATE OR REPLACE FUNCTION app.guard_company_governance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or app.is_iwl() then
    return new;
  end if;

  if new.stage is distinct from old.stage
     or new.cohort_id is distinct from old.cohort_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'La etapa y la cohorte las fija el equipo de IWL'
      using errcode = '42501';
  end if;

  if new.tramo is distinct from old.tramo
     or new.archived_at is distinct from old.archived_at
     or new.archive_reason is distinct from old.archive_reason
     or new.situacion_confirmada_at is distinct from old.situacion_confirmada_at
     or new.situacion_confirmada_por is distinct from old.situacion_confirmada_por then
    raise exception 'Eso lo decide el equipo de IWL'
      using errcode = '42501';
  end if;

  if pg_trigger_depth() <= 1 and (
       new.situacion_societaria is distinct from old.situacion_societaria
       or new.constitucion_prevista is distinct from old.constitucion_prevista
       or new.forma_juridica is distinct from old.forma_juridica
       or new.denominacion_social is distinct from old.denominacion_social
       or new.cif is distinct from old.cif) then
    -- La primera vez, en entrada, la dice ella
    if not (old.tramo = 'entrada' and old.situacion_societaria is null
            and new.situacion_societaria is not null) then
      raise exception 'La situación societaria, una vez dicha, la fija el equipo de IWL. Si ha cambiado, díselo y la cambian ellos.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- La vista de Administración → Compañías, sin la fase
drop view if exists public.admin_companias;
create view public.admin_companias as
SELECT c.id,
    c.name,
    c.slug,
    c.sector,
    c.stage,
    c.tech_profile,
    c.entry_state,
    c.one_liner,
    c.website,
    c.founded_on,
    c.female_leadership_pct,
    c.cohort_id,
    c.created_at,
    c.archived_at,
    c.archive_reason,
    c.logo_path,
    c.situacion_societaria,
    c.constitucion_prevista,
    c.forma_juridica,
    c.denominacion_social,
    c.cif,
    co.name AS cohort_name,
    app.compania_tiene_actividad(c.id) AS tiene_actividad,
    ( SELECT count(*) AS count
           FROM roadmap_stages s
          WHERE s.company_id = c.id) AS etapas,
    ( SELECT jsonb_agg(jsonb_build_object('profile_id', pr.id, 'full_name', pr.full_name, 'last_name', pr.last_name, 'job_title', pr.job_title, 'member_role', m.member_role, 'title', m.title, 'assigned_hours', m.assigned_hours, 'imputadas', COALESCE(h.horas, 0::numeric), 'photo_path', pr.photo_path, 'linkedin_url', pr.linkedin_url) ORDER BY m.member_role, pr.full_name) AS jsonb_agg
           FROM company_members m
             JOIN profiles pr ON pr.id = m.profile_id
             LEFT JOIN LATERAL ( SELECT sum(ch.hours) AS horas
                   FROM contribution_hours ch
                  WHERE ch.company_id = m.company_id AND ch.profile_id = m.profile_id AND ch.session_status IS DISTINCT FROM 'anulada'::estado_sesion) h ON true
          WHERE m.company_id = c.id) AS equipo
   FROM companies c
     LEFT JOIN cohorts co ON co.id = c.cohort_id;
alter view public.admin_companias set (security_invoker = true);

alter table milestones drop column if exists phase_id;
alter table companies drop column if exists phase_id;
drop table if exists phases;
