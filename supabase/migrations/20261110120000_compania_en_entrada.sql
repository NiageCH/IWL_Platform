-- =============================================================================
-- La compañía nace al contrafirmar el NDA, en «entrada»
--
-- Modelo aprobado: `docs/IWL_Doc_ModeloFlujoEntrada_ES_v2_20261109.md`,
-- puntos 3, 4 y 9.
--
--   · Con las dos firmas del NDA se crea la compañía en `tramo = 'entrada'`,
--     con la vía del acta, y la candidata pasa a fundadora. Es la misma
--     cuenta de principio a fin.
--   · En Construcción, el checklist y el business plan nacen «por construir».
--   · La situación societaria la dice la fundadora una vez, si no se dijo
--     antes, y la confirma IWL.
--   · La decisión de incorporación: solo dirección, con su base y su motivo.
--     «No» archiva la compañía como «No incorporada».
-- =============================================================================

-- -----------------------------------------------------------------------------
-- La situación, confirmada por IWL
-- -----------------------------------------------------------------------------

alter table companies
  add column if not exists situacion_confirmada_at timestamptz,
  add column if not exists situacion_confirmada_por uuid references profiles(id) on delete set null;

comment on column companies.situacion_confirmada_at is
  'Cuándo confirmó IWL la situación societaria que dijo la fundadora. Hasta entonces se ve «Por confirmar».';

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha'));

/*
 * Redefinición de `20261109120000_situacion_societaria.sql`.
 *
 * Una fundadora dice la situación una vez: mientras la compañía está en
 * entrada y nadie la ha dicho. Después solo la cambia IWL. Y lo que es de
 * gobierno —el tramo, el archivo, la confirmación— no lo toca nunca.
 */
create or replace function app.guard_company_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or app.is_iwl() then
    return new;
  end if;

  if new.stage is distinct from old.stage
     or new.phase_id is distinct from old.phase_id
     or new.cohort_id is distinct from old.cohort_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'La etapa, la fase y la cohorte las fija el equipo de IWL'
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
$$;

-- Dicha por ella, avisa a IWL para confirmarla; confirmada, el aviso se cierra
create or replace function app.al_decir_situacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.situacion_societaria is null and new.situacion_societaria is not null
     and new.tramo = 'entrada' and new.situacion_confirmada_at is null
     and not coalesce(app.is_iwl(), false) and auth.uid() is not null then
    insert into avisos (tipo, company_id, profile_id) values ('situacion_dicha', new.id, auth.uid());
  end if;

  if new.situacion_confirmada_at is not null and old.situacion_confirmada_at is null then
    update avisos set cerrado_at = now(), cerrado_por = new.situacion_confirmada_por
    where company_id = new.id and tipo = 'situacion_dicha' and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_decir_situacion on companies;
create trigger companies_decir_situacion
  after update of situacion_societaria, situacion_confirmada_at on companies
  for each row execute function app.al_decir_situacion();

-- -----------------------------------------------------------------------------
-- En Construcción, lo que nace en entrada nace «por construir»
--
-- En un disparador y no en quien crea la compañía: los puntos societarios
-- se crean también después, al decir la situación, y tienen que nacer igual.
-- Solo en el alta: pasar algo a «por entregar» a mano sigue siendo posible.
-- -----------------------------------------------------------------------------

create or replace function app.nace_por_construir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from companies
    where id = new.company_id and tramo = 'entrada' and via = 'construccion'
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
$$;

drop trigger if exists dd_items_nace_por_construir on dd_items;
create trigger dd_items_nace_por_construir
  before insert on dd_items
  for each row execute function app.nace_por_construir();

drop trigger if exists bp_sections_nace_por_construir on bp_sections;
create trigger bp_sections_nace_por_construir
  before insert on bp_sections
  for each row execute function app.nace_por_construir();

/*
 * Redefinición de `20261109120000_situacion_societaria.sql`: lo que está
 * por construir también deja de aplicar sin sociedad, y al constituirse
 * vuelve a lo que le toca por su vía, no siempre a «por entregar».
 */
create or replace function app.ajustar_societario(p_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_situacion situacion_societaria;
  v_prevista date;
  v_vuelve estado_punto_dd;
  v_motivo constant text := 'No aplica: el proyecto todavía no tiene sociedad constituida.';
begin
  select situacion_societaria, constitucion_prevista,
         case when tramo = 'entrada' and via = 'construccion'
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
$$;

-- -----------------------------------------------------------------------------
-- Crear la compañía en entrada
-- -----------------------------------------------------------------------------

-- El identificador sale del nombre, con el primer número libre
create or replace function app.slug_libre(p_nombre text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  n int := 1;
begin
  v_base := lower(translate(coalesce(p_nombre, ''),
    'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇáàäâéèëêíìïîóòöôúùüûñç',
    'AAAAEEEEIIIIOOOOUUUUNCaaaaeeeeiiiioooouuuunc'));
  v_base := trim(both '-' from regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'compania'; end if;

  v_slug := v_base;
  while exists (select 1 from companies where slug = v_slug) loop
    n := n + 1;
    v_slug := v_base || '-' || n;
  end loop;
  return v_slug;
end;
$$;

/*
 * Lo llama `nda_completo`, en la misma transacción que la firma que
 * completa el NDA: si algo falla al crearla, la firma tampoco queda.
 *
 * Inserta la compañía directamente, no por `crear_compania`: esa pide sesión
 * de IWL y aquí se llega con la clave de servicio, que es quien registra la
 * IP de la firma. La autorización ya la hizo la firma de dirección.
 */
create or replace function app.crear_compania_en_entrada(p_candidatura uuid, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  v_company uuid;
  v_org uuid;
  v_via via_entrada;
begin
  select * into c from candidaturas where id = p_candidatura for update;
  if not found or c.company_id is not null then
    return c.company_id;
  end if;

  select id into v_org from organizations where slug = 'iwl';

  -- Una de antes del acta en la plataforma: la vía que le tocaría por su estado
  v_via := coalesce(c.via, case
    when coalesce(c.estado_verificado, c.estado_declarado) in ('primeros_clientes', 'facturacion')
      then 'aceleracion'::via_entrada
    else 'construccion'::via_entrada
  end);

  insert into companies (
    organization_id, cohort_id, name, slug, sector, one_liner, website,
    entry_state, female_leadership_pct, tramo, via, created_by, is_demo,
    stage, tech_profile
  ) values (
    v_org, c.cohort_id, c.nombre, app.slug_libre(c.nombre), c.sector, c.one_liner, c.website,
    coalesce(c.estado_verificado, c.estado_declarado), c.liderazgo_femenino_pct,
    'entrada', v_via, p_actor, c.is_demo,
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
    jsonb_build_object('tramo', 'entrada', 'via', v_via, 'candidatura', p_candidatura)
  );

  insert into candidatura_eventos (candidatura_id, tipo, ocurrido_on, titulo, detalle, created_by)
  values (
    p_candidatura, 'nota', current_date, 'Compañía creada, en entrada',
    'Con el NDA firmado por las dos partes. Vía: '
      || case v_via when 'aceleracion' then 'Aceleración' else 'Construcción' end || '.',
    p_actor
  );

  return v_company;
end;
$$;

revoke all on function app.crear_compania_en_entrada(uuid, uuid) from public, anon, authenticated;
revoke all on function app.slug_libre(text) from public, anon;

/*
 * Redefinición de `20261109130000_nda.sql`. Con las dos firmas, además de
 * cerrar el aviso y apuntar la fecha, nace la compañía.
 */
create or replace function app.nda_completo(p_candidatura uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update avisos
  set cerrado_at = now(), cerrado_por = p_profile
  where candidatura_id = p_candidatura and tipo = 'nda_firmado' and cerrado_at is null;

  update candidaturas
  set estado = 'nda',
      nda_firmado_on = coalesce(nda_firmado_on, current_date)
  where id = p_candidatura
    and estado in ('presentada', 'en_revision', 'reunion', 'comite', 'preseleccionada');

  update candidaturas
  set nda_firmado_on = coalesce(nda_firmado_on, current_date)
  where id = p_candidatura;

  -- Una que ya iba por delante sin compañía —firmada antes de esto— se queda así
  if exists (
    select 1 from candidaturas
    where id = p_candidatura and company_id is null and estado in ('nda', 'entrada')
  ) then
    perform app.crear_compania_en_entrada(p_candidatura, p_profile);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- La decisión de incorporación
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'decision_incorporacion') then
    create type decision_incorporacion as enum ('si', 'no');
  end if;
  if not exists (select 1 from pg_type where typname = 'base_incorporacion') then
    create type base_incorporacion as enum ('due_diligence', 'estrategica');
  end if;
end $$;

create table if not exists decisiones_incorporacion (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies(id) on delete cascade,
  decision decision_incorporacion not null,
  base base_incorporacion not null,
  motivo text not null check (length(trim(motivo)) > 0),
  mensaje text,
  decidido_on date not null default current_date,
  decidido_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint no_con_mensaje check (decision = 'si' or length(trim(coalesce(mensaje, ''))) > 0)
);

comment on table decisiones_incorporacion is
  'Si una compañía en entrada se incorpora al programa. Una por compañía y no se cambia. «No» la archiva como «No incorporada».';

alter table decisiones_incorporacion enable row level security;

drop policy if exists decisiones_leer on decisiones_incorporacion;
create policy decisiones_leer on decisiones_incorporacion
  for select using (app.is_iwl());

drop policy if exists decisiones_decidir on decisiones_incorporacion;
create policy decisiones_decidir on decisiones_incorporacion
  for insert with check (app.is_admin());

create or replace function app.al_decidir_incorporacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tramo tramo_compania;
  v_archivada timestamptz;
begin
  select tramo, archived_at into v_tramo, v_archivada from companies where id = new.company_id;
  if v_tramo is distinct from 'entrada' or v_archivada is not null then
    raise exception 'La incorporación se decide con la compañía en entrada.' using errcode = 'P0001';
  end if;
  new.decidido_por := coalesce(auth.uid(), new.decidido_por);
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists decisiones_al_decidir on decisiones_incorporacion;
create trigger decisiones_al_decidir
  before insert on decisiones_incorporacion
  for each row execute function app.al_decidir_incorporacion();

create or replace function app.tras_decidir_incorporacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.decision = 'no' then
    update companies
    set archived_at = now(), archived_by = new.decidido_por,
        archive_reason = 'No incorporada: ' || new.motivo
    where id = new.company_id;

    update candidaturas
    set estado = 'descartada', descartada_desde = 'entrada',
        descartada_motivo = 'No incorporada: ' || new.motivo,
        descartada_at = now(), descartada_por = new.decidido_por
    where company_id = new.company_id and estado <> 'descartada';
  end if;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (
    new.company_id, new.decidido_por, 'decisiones_incorporacion', new.id,
    case new.decision when 'si' then 'incorporada' else 'no_incorporada' end,
    jsonb_build_object('base', new.base, 'motivo', new.motivo)
  );
  return new;
end;
$$;

drop trigger if exists decisiones_tras_decidir on decisiones_incorporacion;
create trigger decisiones_tras_decidir
  after insert on decisiones_incorporacion
  for each row execute function app.tras_decidir_incorporacion();

-- Una decisión no se cambia, tampoco con la clave de servicio. Se va con su compañía.
create or replace function app.guard_decision_incorporacion()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'Una decisión de incorporación no se cambia ni se borra.' using errcode = '42501';
end;
$$;

drop trigger if exists decisiones_no_se_cambian on decisiones_incorporacion;
create trigger decisiones_no_se_cambian
  before update or delete on decisiones_incorporacion
  for each row execute function app.guard_decision_incorporacion();
