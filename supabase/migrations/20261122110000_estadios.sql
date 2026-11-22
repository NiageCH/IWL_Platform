-- =============================================================================
-- Estadios en lugar de vías (REVISION, 22 nov · bloque 1)
--
-- Desaparecen las vías Construcción y Aceleración. Cada proyecto está en uno
-- de cuatro estadios: idea, MVP sin piloto, MVP con piloto y facturando. De
-- él sale todo lo que antes decidía la vía:
--   · el programa de la Fase 3: Incubación (idea, MVP sin piloto) o
--     Aceleración (MVP con piloto, facturando);
--   · la revisión de entrada: diagnóstico en idea, due diligence en el resto.
--
-- Se aprovecha el tipo que ya había, `estado_entrada`, con sus columnas: el
-- estado declarado de la candidatura, el verificado y el de la compañía. Se
-- cambian sus valores (Postgres no deja quitar valores de un enum: se crea
-- otro con el mismo nombre). La vía se quita de compañías, candidaturas y
-- actas; el acta pasa a confirmar o cambiar el estadio.
--
-- Todo lo de producción son datos de prueba. Lo que tenía vía, la manda:
-- Construcción → MVP sin piloto, Aceleración → facturando. Lo que solo tenía
-- estado: idea y prototipo → idea, MVP → MVP sin piloto, primeros clientes →
-- MVP con piloto, facturación → facturando.
-- =============================================================================

-- Fuera lo que depende del tipo viejo: vistas y la vía en sus guardianes
drop view if exists public.admin_companias;
drop view if exists public.embudo_candidaturas;
drop trigger if exists companies_guard_via on companies;
drop trigger if exists companies_pasa_a_aceleracion on companies;

create or replace function pg_temp.estadio_de(v text) returns text language sql immutable as $$
  select case v
    when 'idea' then 'idea' when 'prototipo' then 'idea'
    when 'mvp' then 'mvp_sin_piloto' when 'primeros_clientes' then 'mvp_con_piloto'
    when 'facturacion' then 'facturando' end
$$;
create or replace function pg_temp.estadio_de_via(v text) returns text language sql immutable as $$
  select case v when 'construccion' then 'mvp_sin_piloto' when 'aceleracion' then 'facturando' end
$$;

-- -----------------------------------------------------------------------------
-- El tipo, con sus cuatro valores
-- -----------------------------------------------------------------------------

alter type estado_entrada rename to estado_entrada_viejo;
create type estado_entrada as enum ('idea', 'mvp_sin_piloto', 'mvp_con_piloto', 'facturando');
comment on type estado_entrada is
  'Estadio del proyecto: idea, MVP sin piloto, MVP con piloto o facturando (empresa o autónoma). Decide el programa, la revisión de entrada y la hoja de ruta.';

alter table companies
  alter column entry_state type estado_entrada using pg_temp.estadio_de(entry_state::text)::estado_entrada;
alter table roadmap_templates
  alter column entry_state type estado_entrada using pg_temp.estadio_de(entry_state::text)::estado_entrada;
alter table candidaturas
  alter column estado_declarado type estado_entrada using pg_temp.estadio_de(estado_declarado::text)::estado_entrada,
  alter column estado_verificado type estado_entrada using pg_temp.estadio_de(estado_verificado::text)::estado_entrada;

comment on column companies.entry_state is
  'Estadio con el que entra: lo declara ella y lo confirma o lo cambia el comité. Decide programa, revisión de entrada y hoja de ruta.';

-- Lo que tenía vía, la manda
update companies set entry_state = pg_temp.estadio_de_via(via::text)::estado_entrada where via is not null;
update candidaturas set estado_verificado = pg_temp.estadio_de_via(via::text)::estado_entrada where via is not null;

-- -----------------------------------------------------------------------------
-- El acta confirma o cambia el estadio
-- -----------------------------------------------------------------------------

alter table comite_actas
  add column if not exists estadio estado_entrada,
  add column if not exists estadio_propuesto estado_entrada,
  add column if not exists estadio_motivo text;

-- Con el guardián viejo: no compara estas columnas, así que deja rellenarlas
update comite_actas
set estadio = pg_temp.estadio_de_via(via::text)::estado_entrada,
    estadio_propuesto = pg_temp.estadio_de_via(via_propuesta::text)::estado_entrada,
    estadio_motivo = via_motivo;

-- Las mismas reglas que tenía la vía: preseleccionar dice el estadio, y
-- cambiar el que declaró ella pide motivo
alter table comite_actas
  add constraint preseleccionada_con_estadio check (decision <> 'preseleccionada' or estadio is not null),
  add constraint estadio_cambiado_con_motivo check (
    estadio is null or estadio_propuesto is null or estadio = estadio_propuesto
    or length(trim(coalesce(estadio_motivo, ''))) > 0
  );

comment on column comite_actas.estadio is 'El estadio que confirma o fija el comité. Pasa a la candidatura al cerrarse el acta.';
comment on column comite_actas.estadio_propuesto is 'El que declaró ella; si el comité lo cambia, va con su motivo.';

-- -----------------------------------------------------------------------------
-- El nombre de cada estadio, y lo que se deriva de él
-- -----------------------------------------------------------------------------

create or replace function app.nombre_estadio(e estado_entrada)
returns text language sql immutable as $$
  select case e
    when 'idea' then 'Idea'
    when 'mvp_sin_piloto' then 'MVP sin piloto'
    when 'mvp_con_piloto' then 'MVP con piloto'
    when 'facturando' then 'Facturando'
  end
$$;

-- -----------------------------------------------------------------------------
-- Las funciones con el tipo en su firma: se recrean igual, con el nuevo
-- -----------------------------------------------------------------------------

create temp table funciones_estadio on commit drop as
select p.oid::regprocedure::text as firma,
       n.nspname as esquema,
       replace(pg_get_functiondef(p.oid), 'estado_entrada_viejo', 'estado_entrada') as definicion,
       p.proacl
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'app')
  and (pg_get_function_arguments(p.oid) like '%estado_entrada_viejo%'
       or pg_get_function_result(p.oid) like '%estado_entrada_viejo%');

do $$
declare r record; a record;
begin
  for r in select * from funciones_estadio order by esquema = 'app' desc loop
    execute 'drop function ' || r.firma;
  end loop;
  -- Primero las de app: las de public las llaman
  for r in select * from funciones_estadio order by esquema = 'app' desc loop
    execute r.definicion;
  end loop;
  -- Y sus permisos, los que tenían
  for r in select * from funciones_estadio loop
    -- Fuera también lo que añaden los privilegios por defecto (anon), y solo lo que tenía
    execute 'revoke all on function ' || replace(r.firma, 'estado_entrada_viejo', 'estado_entrada')
      || ' from public, anon, authenticated, service_role';
    for a in select (aclexplode(r.proacl)).* loop
      if a.privilege_type = 'EXECUTE' then
        execute format('grant execute on function %s to %s',
          replace(r.firma, 'estado_entrada_viejo', 'estado_entrada'),
          case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end);
      end if;
    end loop;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Las que decidían por la vía, desde su definición vigente
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.ajustar_societario(p_company uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_situacion situacion_societaria;
  v_prevista date;
  v_vuelve estado_punto_dd;
  v_motivo constant text := 'No aplica: el proyecto todavía no tiene sociedad constituida.';
begin
  select situacion_societaria, constitucion_prevista,
         case when tramo = 'entrada' and entry_state = 'idea'
              then 'por_construir'::estado_punto_dd else 'pendiente'::estado_punto_dd end
    into v_situacion, v_prevista, v_vuelve
  from companies where id = p_company;

  -- Sin decir, se deja como está: no se adivina
  if v_situacion is null then return; end if;

  if v_situacion <> 'constituida' then
    update dd_items i
    set status = 'no_aplica', notes = v_motivo
    from dd_item_templates t
    where i.template_id = t.id and i.company_id = p_company
      and t.requiere_sociedad and i.status in ('pendiente', 'por_construir');

    insert into dd_items (company_id, area_id, template_id, title, description, is_required, validity_months)
    select p_company, t.area_id, t.id, t.title, t.description, t.is_required, t.validity_months
    from dd_item_templates t
    where t.solo_sin_sociedad and t.is_active
    on conflict (company_id, template_id) do nothing;

    if exists (select 1 from milestones where company_id = p_company and origin = 'societario') then
      update milestones set due_date = v_prevista
      where company_id = p_company and origin = 'societario' and status <> 'cumplido';
    else
      insert into milestones (company_id, title, success_criteria, description, due_date, origin, status)
      values (
        p_company,
        'Constituir la sociedad',
        'Escritura de constitución firmada y CIF asignado.',
        'Lo pone la plataforma porque el proyecto todavía no tiene sociedad. Al darlo por cumplido, la compañía pasa a constituida y se le piden los datos y los documentos societarios.',
        v_prevista,
        'societario',
        'pendiente'
      );
    end if;
  else
    -- Constituida: lo societario se vuelve a pedir
    update dd_items i
    set status = v_vuelve, notes = null
    from dd_item_templates t
    where i.template_id = t.id and i.company_id = p_company
      and t.requiere_sociedad and i.status = 'no_aplica' and i.notes = v_motivo;

    update milestones set status = 'cumplido'
    where company_id = p_company and origin = 'societario' and status <> 'cumplido';
  end if;
end;
$function$;

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

CREATE OR REPLACE FUNCTION app.firmar_acta(p_acta uuid, p_profile uuid, p_ip text, p_ua text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a comite_actas%rowtype;
begin
  update comite_firmas
  set firmado_at = now(), firmado_ip = p_ip, firmado_ua = p_ua
  where acta_id = p_acta and profile_id = p_profile and firmado_at is null;
  if not found then
    raise exception 'No estás en este comité, o ya has firmado el acta.' using errcode = '42501';
  end if;

  -- ¿Falta alguien?
  if exists (select 1 from comite_firmas where acta_id = p_acta and firmado_at is null) then
    return false;
  end if;

  update comite_actas set cerrada_at = now() where id = p_acta returning * into a;

  -- La decisión, aplicada
  if a.decision = 'preseleccionada' then
    update candidaturas
    set estado = 'preseleccionada'
    where id = a.candidatura_id
      and estado in ('presentada', 'en_revision', 'reunion', 'comite');
    -- El estadio que confirma o cambia el comité
    update candidaturas set estado_verificado = coalesce(a.estadio, estado_verificado) where id = a.candidatura_id;
  elsif a.decision = 'descartada' then
    update candidaturas
    set estado = 'descartada', descartada_desde = estado,
        descartada_at = now(), descartada_motivo = a.motivo
    where id = a.candidatura_id and estado not in ('firmada', 'descartada');
  else
    -- Aplazada: se queda en Comité, con su fecha de revisión
    update candidaturas set estado = 'comite'
    where id = a.candidatura_id and estado in ('presentada', 'en_revision', 'reunion');
  end if;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle, created_by)
  values (a.candidatura_id, 'comite', 'Acta de comité firmada · ' || a.decision, a.resumen, p_profile);

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION app.firmar_acuerdo(p_company uuid, p_stage company_stage, p_tech_profile company_tech_profile, p_phase_code text DEFAULT NULL::text, p_roadmap_template uuid DEFAULT NULL::uuid, p_roadmap_start date DEFAULT NULL::date, p_firmado_on date DEFAULT CURRENT_DATE)
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
      phase_id = (select id from phases where code = p_phase_code),
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
    if (new.fecha, new.resumen, new.decision, new.estadio, new.estadio_propuesto, new.estadio_motivo,
        new.motivo, new.revision_on, new.puede_volver, new.mensaje)
       is distinct from
       (old.fecha, old.resumen, old.decision, old.estadio, old.estadio_propuesto, old.estadio_motivo,
        old.motivo, old.revision_on, old.puede_volver, old.mensaje) then
      raise exception 'Un acta que alguien ha firmado no se edita. Redacta otra.' using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

CREATE OR REPLACE FUNCTION app.guard_estado_anexo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  co companies%rowtype;
  v_horquilla jsonb;
  v_min numeric;
  v_max numeric;
begin
  if new.status is not distinct from old.status then return new; end if;
  select * into co from companies where id = new.company_id;

  if new.status = 'propuesto' and old.status = 'borrador' then
    if co.tramo = 'entrada' and not exists (
      select 1 from decisiones_incorporacion where company_id = new.company_id and decision = 'si'
    ) then
      raise exception 'Antes de proponer el Acuerdo, dirección tiene que decidir la incorporación.' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from company_members where company_id = new.company_id and member_role = 'fundadora'
    ) then
      raise exception 'Para proponérselo, ella tiene que tener cuenta en la plataforma: es donde lo lee y lo acepta. Dale acceso primero.'
        using errcode = 'P0001';
    end if;
    if new.duration_months is null or new.committed_hours is null then
      raise exception 'Antes de proponerlo, pon al menos la duración y las horas comprometidas.' using errcode = 'P0001';
    end if;
    if jsonb_array_length(new.firmantes) = 0 then
      raise exception 'Falta decir quién firma el Acuerdo.' using errcode = 'P0001';
    end if;

    -- La horquilla de su estadio, si Luciana la ha fijado
    if co.entry_state is not null and new.equity_pct is not null then
      select value -> co.entry_state::text into v_horquilla from platform_settings where key = 'equity_horquilla';
      v_min := nullif(v_horquilla ->> 'min', '')::numeric;
      v_max := nullif(v_horquilla ->> 'max', '')::numeric;
      if ((v_min is not null and new.equity_pct < v_min) or (v_max is not null and new.equity_pct > v_max))
         and length(trim(coalesce(new.equity_fuera_motivo, ''))) = 0 then
        raise exception 'El equity se sale de la horquilla de %: escribe por qué. Queda en el registro.',
          app.nombre_estadio(co.entry_state)
          using errcode = 'P0001';
      end if;
    end if;

    -- Sin sociedad, el equity se materializa al constituir: el hito, con fecha
    if co.situacion_societaria in ('sin_constituir', 'en_constitucion') then
      if not exists (
        select 1 from milestones
        where company_id = new.company_id and origin = 'societario' and due_date is not null
      ) then
        raise exception 'Sin sociedad, el equity queda comprometido hasta constituirla: pon la fecha prevista del hito «Constituir la sociedad».'
          using errcode = 'P0001';
      end if;
      update milestones set annex_id = new.id
      where company_id = new.company_id and origin = 'societario' and annex_id is null;
    end if;

    new.propuesto_at := now();
    new.propuesto_por := coalesce(auth.uid(), new.propuesto_por);
    new.aceptado_at := null;
    new.aceptado_por := null;
    return new;
  end if;

  if new.status = 'comentado' and old.status in ('propuesto', 'comentado') then
    return new;
  end if;

  if new.status = 'aceptado' and old.status in ('propuesto', 'comentado') then
    if auth.uid() is not null and not exists (
      select 1 from company_members
      where company_id = new.company_id and profile_id = auth.uid() and member_role = 'fundadora'
    ) then
      raise exception 'La propuesta la acepta la fundadora.' using errcode = '42501';
    end if;
    new.aceptado_at := now();
    new.aceptado_por := coalesce(auth.uid(), new.aceptado_por);
    return new;
  end if;

  if new.status = 'borrador' and old.status in ('propuesto', 'comentado', 'aceptado') then
    new.propuesto_at := null;
    new.propuesto_por := null;
    new.aceptado_at := null;
    new.aceptado_por := null;
    return new;
  end if;

  if new.status = 'firmado' and old.status = 'aceptado' then
    return new;
  end if;

  if new.status = 'cerrado' and old.status = 'firmado' then
    return new;
  end if;

  if new.status = 'firmado' then
    raise exception 'Un Anexo se firma cuando ella lo ha aceptado: propónselo primero.' using errcode = 'P0001';
  end if;
  raise exception 'Un Anexo no pasa de «%» a «%».', old.status, new.status using errcode = 'P0001';
end;
$function$;

CREATE OR REPLACE FUNCTION app.nace_por_construir()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (
    select 1 from companies
    where id = new.company_id and tramo = 'entrada' and entry_state = 'idea'
  ) then
    if tg_table_name = 'dd_items' then
      if new.status = 'pendiente' and new.milestone_id is null then
        new.status := 'por_construir';
      end if;
    elsif new.status = 'borrador' and coalesce(new.content, '') = '' then
      new.status := 'por_construir';
    end if;
  end if;
  return new;
end;
$function$;

-- -----------------------------------------------------------------------------
-- Cambiar el estadio: dirección, con motivo, y solo hacia arriba
--
-- Sustituye a «Pasar a Aceleración». El acta fija el primero; después solo
-- se cambia por aquí, queda en el registro y le llega al mentor principal.
-- Al salir de idea, lo que estaba por construir pasa a por entregar: ahora
-- tiene due diligence.
-- -----------------------------------------------------------------------------

drop function if exists public.pasar_a_aceleracion(uuid, text);
drop function if exists app.pasar_a_aceleracion(uuid, text);
drop function if exists app.guard_cambio_via();
drop function if exists app.al_pasar_a_aceleracion();

create or replace function app.guard_cambio_estadio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entry_state is not distinct from old.entry_state then return new; end if;
  if auth.uid() is null or pg_trigger_depth() > 1 then return new; end if;

  if not app.is_admin() then
    raise exception 'El estadio lo cambia la dirección de IWL' using errcode = '42501';
  end if;
  if old.entry_state is not null and new.entry_state < old.entry_state then
    raise exception 'El estadio no baja: un proyecto no vuelve atrás.' using errcode = 'P0001';
  end if;
  if old.entry_state is not null and coalesce(current_setting('app.motivo_estadio', true), '') = '' then
    raise exception 'El estadio se cambia con «Cambiar el estadio», que pide el motivo.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger companies_guard_estadio
  before update on companies
  for each row execute function app.guard_cambio_estadio();

create or replace function app.al_cambiar_estadio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.entry_state = 'idea' and new.entry_state <> 'idea' then
    update dd_items set status = 'pendiente'
    where company_id = new.id and status = 'por_construir';
  end if;
  return new;
end;
$$;

create trigger companies_al_cambiar_estadio
  after update of entry_state on companies
  for each row execute function app.al_cambiar_estadio();

create or replace function app.cambiar_estadio(p_company uuid, p_estadio estado_entrada, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes estado_entrada;
begin
  if not app.is_admin() then
    raise exception 'El estadio lo cambia la dirección de IWL' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escribe el motivo: queda en el registro y le llega al mentor principal.' using errcode = 'P0001';
  end if;

  select entry_state into v_antes from companies where id = p_company for update;
  if not found then
    raise exception 'Esa compañía no existe.' using errcode = 'P0001';
  end if;
  if v_antes is not null and p_estadio <= v_antes then
    raise exception 'El estadio solo cambia hacia arriba.' using errcode = 'P0001';
  end if;

  perform set_config('app.motivo_estadio', trim(p_motivo), true);
  update companies set entry_state = p_estadio where id = p_company;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (p_company, auth.uid(), 'companies', p_company, 'cambio_estadio',
          jsonb_build_object('de', v_antes, 'a', p_estadio, 'motivo', trim(p_motivo)));

  insert into avisos (tipo, company_id, profile_id, para)
  select 'cambio_estadio', p_company, auth.uid(), m.profile_id
  from company_members m
  where m.company_id = p_company and m.member_role = 'mentor_principal';
end;
$$;

create or replace function public.cambiar_estadio(p_company uuid, p_estadio estado_entrada, p_motivo text)
returns void language sql security invoker set search_path = public
as $$ select app.cambiar_estadio(p_company, p_estadio, p_motivo) $$;

revoke all on function app.cambiar_estadio(uuid, estado_entrada, text) from public, anon, service_role;
revoke all on function public.cambiar_estadio(uuid, estado_entrada, text) from public, anon;
grant execute on function app.cambiar_estadio(uuid, estado_entrada, text) to authenticated;
grant execute on function public.cambiar_estadio(uuid, estado_entrada, text) to authenticated;

-- El aviso del cambio, con su nombre nuevo
alter table avisos drop constraint if exists avisos_tipo_check;
update avisos set tipo = 'cambio_estadio' where tipo = 'cambio_via';
alter table avisos add constraint avisos_tipo_check check (tipo = any (array[
  'primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha', 'anexo_comentario', 'cambio_estadio',
  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada', 'reunion_anotar', 'hito_entregado',
  'hito_sin_revisar', 'candidatura_nueva', 'acta_por_firmar', 'anexo_aceptado', 'documento_entregado',
  'correos_sin_enviar', 'sesion_por_confirmar', 'sesion_no_cuadra', 'sesion_en_direccion'
]));

-- -----------------------------------------------------------------------------
-- Fuera la vía
-- -----------------------------------------------------------------------------

alter table comite_actas drop column if exists via, drop column if exists via_propuesta, drop column if exists via_motivo;
alter table companies drop column if exists via;
alter table candidaturas drop column if exists via;
drop type if exists via_entrada;
drop type if exists estado_entrada_viejo;

-- Lo que era de Construcción y ahora tiene due diligence: lo por construir, por entregar
update dd_items i set status = 'pendiente'
from companies c
where i.company_id = c.id and c.tramo = 'entrada' and c.entry_state <> 'idea' and i.status = 'por_construir';

-- La horquilla de equity, por estadio (estaba vacía); el tope de entrada, del diagnóstico
update platform_settings set value = '{}'::jsonb where key = 'equity_horquilla';
update platform_settings set key = 'entrada_tope_diagnostico_dias',
  description = 'Días que puede estar en entrada un proyecto en idea (diagnóstico) antes de salir en atención.'
where key = 'entrada_tope_construccion_dias';

-- -----------------------------------------------------------------------------
-- Las vistas, desde su última definición, sin la vía
-- -----------------------------------------------------------------------------

create or replace view public.admin_companias as  SELECT c.id,
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
    c.phase_id,
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
    f.name AS phase_name,
    co.name AS cohort_name,
    app.compania_tiene_actividad(c.id) AS tiene_actividad,
    ( SELECT count(*) AS count
           FROM roadmap_stages s
          WHERE (s.company_id = c.id)) AS etapas,
    ( SELECT jsonb_agg(jsonb_build_object('profile_id', pr.id, 'full_name', pr.full_name, 'last_name', pr.last_name, 'job_title', pr.job_title, 'member_role', m.member_role, 'title', m.title, 'assigned_hours', m.assigned_hours, 'imputadas', COALESCE(h.horas, (0)::numeric), 'photo_path', pr.photo_path, 'linkedin_url', pr.linkedin_url) ORDER BY m.member_role, pr.full_name) AS jsonb_agg
           FROM ((company_members m
             JOIN profiles pr ON ((pr.id = m.profile_id)))
             LEFT JOIN LATERAL ( SELECT sum(ch.hours) AS horas
                   FROM contribution_hours ch
                  WHERE ((ch.company_id = m.company_id) AND (ch.profile_id = m.profile_id) AND (ch.session_status IS DISTINCT FROM 'anulada'::estado_sesion))) h ON (true))
          WHERE (m.company_id = c.id)) AS equipo
   FROM ((companies c
     LEFT JOIN phases f ON ((f.id = c.phase_id)))
     LEFT JOIN cohorts co ON ((co.id = c.cohort_id)));
alter view public.admin_companias set (security_invoker = true);

create or replace view public.embudo_candidaturas as  SELECT c.id,
    c.cohort_id,
    c.nombre,
    c.sector,
    c.one_liner,
    c.website,
    c.pais,
    c.contacto_nombre,
    c.contacto_email,
    c.contacto_telefono,
    c.contacto_cargo,
    c.estado_declarado,
    c.estado_verificado,
    c.equipo_personas,
    c.liderazgo_femenino_pct,
    c.estado,
    c.descartada_desde,
    c.descartada_motivo,
    c.descartada_at,
    c.descartada_por,
    c.nda_firmado_on,
    c.acuerdo_propuesto_on,
    c.acuerdo_firmado_on,
    c.equity_pct,
    c.aportacion_propuesta,
    c.company_id,
    c.notas,
    c.origen,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.token,
    c.profile_id,
    c.token_anulado_at,
    c.is_demo,
    c.situacion_societaria,
    c.constitucion_prevista,
    c.forma_juridica,
    c.denominacion_social,
    c.cif,
    c.acuerdo_firmantes,
    c.enlace_abierto_at,
    c.enlace_visto_at,
    c.contacto_apellidos,
    co.name AS cohorte,
    comp.slug AS company_slug,
    ( SELECT count(*) AS count
           FROM candidatura_enlaces e
          WHERE (e.candidatura_id = c.id)) AS enlaces,
    ( SELECT max(ev.ocurrido_on) AS max
           FROM candidatura_eventos ev
          WHERE (ev.candidatura_id = c.id)) AS ultimo_movimiento
   FROM ((candidaturas c
     JOIN cohorts co ON ((co.id = c.cohort_id)))
     LEFT JOIN companies comp ON ((comp.id = c.company_id)));
alter view public.embudo_candidaturas set (security_invoker = true);

