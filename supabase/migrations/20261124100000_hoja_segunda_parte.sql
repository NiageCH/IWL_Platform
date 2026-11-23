-- =============================================================================
-- Bloque 5, segunda parte (REVISION, 23 nov · «aprobada, cuatro retoques»)
--
-- · Las fechas de los hitos, repartidas a lo largo de su tramo.
-- · La sección I del Anexo en su copia: lo firmado queda congelado.
-- · Tras la firma, un hito fundamental lo cambia solo dirección, con
--   motivo; uno propio, quien coordina. Todo queda en el registro.
-- · Lo que el mentor ve de la candidatura en entrada.
-- · Cambiar el mentor principal desde la decisión de incorporación.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Generar: desde su última definición (20261123100000), con el reparto
-- -----------------------------------------------------------------------------

create or replace function app.copiar_hoja_iwl(p_company uuid, p_inicio date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  co companies%rowtype;
  v_entrada smallint;
  v_anexo uuid;
  v_etapa record;
  v_id uuid;
  v_primera uuid;
  v_cursor date := coalesce(p_inicio, current_date);
  v_fin date;
  v_creadas integer := 0;
  h record;
begin
  select * into co from companies where id = p_company;
  if co.entry_state is null then
    raise exception 'Falta el estadio de la compañía.' using errcode = 'P0001';
  end if;
  if exists (select 1 from roadmap_stages where company_id = p_company) then
    raise exception 'Ya tiene hoja de ruta. Para rehacerla, bórrala antes.' using errcode = '23505';
  end if;
  v_entrada := app.tramo_de_entrada(co.entry_state);
  select id into v_anexo from annexes where company_id = p_company order by version desc limit 1;

  for v_etapa in
    select * from roadmap_template_stages
    where template_id = app.plantilla_hoja_iwl() and tramo >= v_entrada
    order by tramo
  loop
    v_fin := (v_cursor + make_interval(months => coalesce(v_etapa.planned_months, 3)))::date - 1;
    insert into roadmap_stages (company_id, annex_id, template_stage_id, name, objective, order_index,
                                starts_on, ends_on, tramo, created_by)
    values (p_company, v_anexo, v_etapa.id, v_etapa.name, v_etapa.objective, v_etapa.tramo,
            v_cursor, v_fin, v_etapa.tramo, auth.uid())
    returning id into v_id;
    if v_primera is null then v_primera := v_id; end if;

    -- Sus hitos fundamentales. En idea, los del tramo 1 salen de su lista
    for h in
      select m.*, ec.verification, ec.verified_at, ec.evidence_name
      from roadmap_template_milestones m
      left join entry_checks ec on ec.template_milestone_id = m.id and ec.company_id = p_company
      where m.template_stage_id = v_etapa.id
      order by m.order_index
    loop
      insert into milestones (company_id, annex_id, stage_id, title, success_criteria, evidence, due_date,
                              origin, gates_investable, fundamental, template_milestone_id, status,
                              completed_on, met_on_entry, created_by)
      values (p_company, v_anexo, v_id, h.title, h.success_criteria, h.expected_evidence, v_fin,
              'anexo', h.gates_investable, true, h.id,
              case when h.verification = 'verificado' then 'cumplido'::estado_hito else 'pendiente'::estado_hito end,
              case when h.verification = 'verificado' then h.verified_at::date end,
              coalesce(h.verification = 'verificado', false),
              auth.uid());
    end loop;

    v_cursor := v_fin + 1;
    v_creadas := v_creadas + 1;
  end loop;

  -- Los de tramos anteriores, dentro del tramo de entrada, con su tramo de origen
  for h in
    select m.*, s.tramo as de_tramo, ec.verification, ec.verified_at
    from roadmap_template_milestones m
    join roadmap_template_stages s on s.id = m.template_stage_id
    left join entry_checks ec on ec.template_milestone_id = m.id and ec.company_id = p_company
    where s.template_id = app.plantilla_hoja_iwl() and m.fundamental and s.tramo < v_entrada
    order by s.tramo, m.order_index
  loop
    insert into milestones (company_id, annex_id, stage_id, title, success_criteria, evidence, due_date,
                            origin, gates_investable, fundamental, template_milestone_id, from_tramo, status,
                            completed_on, met_on_entry, created_by)
    select p_company, v_anexo, v_primera, h.title, h.success_criteria, h.expected_evidence, st.ends_on,
           'anexo', h.gates_investable, true, h.id, h.de_tramo,
           case when h.verification = 'verificado' then 'cumplido'::estado_hito else 'pendiente'::estado_hito end,
           case when h.verification = 'verificado' then h.verified_at::date end,
           coalesce(h.verification = 'verificado', false),
           auth.uid()
    from roadmap_stages st where st.id = v_primera;
  end loop;

  -- Las fechas, repartidas a lo largo de cada tramo en el orden de la
  -- lista (REVISION, 23 nov): primero lo pendiente de tramos anteriores,
  -- después lo del tramo. Con todas al último día no había ritmo. Lo
  -- cumplido al entrar no lleva fecha que cumplir.
  with orden as (
    select m.id, s.starts_on, s.ends_on,
           row_number() over (partition by m.stage_id
                              order by m.from_tramo nulls last, ts.tramo, tm.order_index, m.title) as n,
           count(*) over (partition by m.stage_id) as total
    from milestones m
    join roadmap_stages s on s.id = m.stage_id
    left join roadmap_template_milestones tm on tm.id = m.template_milestone_id
    left join roadmap_template_stages ts on ts.id = tm.template_stage_id
    where m.company_id = p_company and not m.met_on_entry
  )
  update milestones m
  set due_date = o.starts_on + ((o.ends_on - o.starts_on + 1) * o.n / o.total)::integer - 1
  from orden o
  where o.id = m.id;

  update milestones set due_date = null
  where company_id = p_company and met_on_entry;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (p_company, auth.uid(), 'roadmap_stages', p_company, 'hoja_de_ruta_generada',
          jsonb_build_object('tramo_de_entrada', v_entrada, 'tramos', v_creadas, 'inicio', p_inicio));
  return v_creadas;
end;
$$;

-- -----------------------------------------------------------------------------
-- La sección I en la copia del Anexo. Al firmar, el disparador que corre
-- las fechas (annexes_abrir_tramo) va antes que el que copia
-- (annexes_copiar_version): la copia lleva ya las fechas de la firma.
-- Desde su última definición (20261118110100), con la hoja de ruta.
-- -----------------------------------------------------------------------------

create or replace function app.contenido_anexo(a annexes)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'version', a.version,
    'equity_pct', a.equity_pct,
    'committed_hours', a.committed_hours,
    'committed_hours_value', a.committed_hours_value,
    'committed_hours_value_motivo', a.committed_hours_value_motivo,
    'committed_cash', a.committed_cash,
    'duration_months', a.duration_months,
    'starts_on', a.starts_on,
    'ends_on', a.ends_on,
    'other_commitments', a.other_commitments,
    'firmantes', a.firmantes,
    'signed_on', a.signed_on,
    'hitos_economicos', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'titulo', m.title,
               'fecha', m.due_date,
               'equity_pct', m.accrues_equity_pct,
               'financiacion', m.releases_funding) order by m.due_date nulls last, m.title), '[]'::jsonb)
      from milestones m
      where m.company_id = a.company_id
        and (m.accrues_equity_pct is not null or m.releases_funding is not null)
    ),
    'plazo_meses', (select app.plazo_maximo_meses(c.entry_state) from companies c where c.id = a.company_id and c.entry_state is not null),
    'hoja_de_ruta', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'tramo', s.tramo,
               'nombre', s.name,
               'inicio', s.starts_on,
               'fin', s.ends_on,
               'hitos', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'titulo', m.title,
                          'criterio', m.success_criteria,
                          'fecha', m.due_date,
                          'fundamental', m.fundamental,
                          'de_tramo', m.from_tramo,
                          'al_entrar', m.met_on_entry)
                        order by m.met_on_entry desc, m.from_tramo nulls last, m.due_date nulls last, m.title), '[]'::jsonb)
                 from milestones m where m.stage_id = s.id
               )) order by s.order_index), '[]'::jsonb)
      from roadmap_stages s
      where s.company_id = a.company_id and s.tramo is not null
    )
  );
$$;

-- -----------------------------------------------------------------------------
-- Tras la firma: un hito fundamental, solo dirección y con motivo; uno
-- propio, quien coordina. Lo que se cambia queda en el registro, con el
-- antes y el después. Es autorización: sin sesión (semilla, cron) no se
-- aplica, ni cuando corre la propia firma.
-- -----------------------------------------------------------------------------

create or replace function app.hoja_firmada(p_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from annexes where company_id = p_company and status in ('firmado', 'cerrado'))
$$;

create or replace function app.guard_hito_tras_firma()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text := trim(coalesce(current_setting('app.motivo_hito', true), ''));
  v_cambia boolean;
begin
  if auth.uid() is null then return new; end if;
  if coalesce(current_setting('app.correr_por_firma', true), '') = 'si' then return new; end if;
  if new.stage_id is null and (tg_op = 'INSERT' or old.stage_id is null) then return new; end if;
  if not app.hoja_firmada(new.company_id) then return new; end if;

  if tg_op = 'INSERT' then
    if not app.coordina_company(new.company_id) then
      raise exception 'Con el Acuerdo firmado, un hito nuevo lo añade quien coordina el proyecto.' using errcode = '42501';
    end if;
    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (new.company_id, auth.uid(), 'milestone', new.id, 'hito_propio_anadido',
            jsonb_build_object('titulo', new.title, 'fecha', new.due_date));
    return new;
  end if;

  v_cambia := new.title is distinct from old.title
           or new.success_criteria is distinct from old.success_criteria
           or new.due_date is distinct from old.due_date
           or new.stage_id is distinct from old.stage_id;
  if not v_cambia then return new; end if;

  if old.fundamental then
    if not app.is_admin() then
      raise exception 'Con el Acuerdo firmado, un hito fundamental lo cambia solo dirección, con motivo.' using errcode = '42501';
    end if;
    if length(v_motivo) < 10 then
      raise exception 'Escribe por qué cambia: queda en el registro.' using errcode = 'P0001';
    end if;
  elsif not app.coordina_company(new.company_id) then
    raise exception 'Con el Acuerdo firmado, un hito propio lo cambia quien coordina el proyecto.' using errcode = '42501';
  end if;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (new.company_id, auth.uid(), 'milestone', new.id,
          case when old.fundamental then 'hito_fundamental_cambiado' else 'hito_propio_cambiado' end,
          jsonb_strip_nulls(jsonb_build_object(
            'titulo', old.title,
            'titulo_nuevo', case when new.title is distinct from old.title then new.title end,
            'fecha_antes', case when new.due_date is distinct from old.due_date then old.due_date end,
            'fecha_despues', case when new.due_date is distinct from old.due_date then new.due_date end,
            'criterio_cambiado', case when new.success_criteria is distinct from old.success_criteria then true end,
            'tramo_cambiado', case when new.stage_id is distinct from old.stage_id then true end,
            'motivo', nullif(v_motivo, ''))));
  return new;
end;
$$;

drop trigger if exists milestones_guard_tras_firma on milestones;
create trigger milestones_guard_tras_firma
  before insert or update of title, success_criteria, due_date, stage_id on milestones
  for each row execute function app.guard_hito_tras_firma();

-- Cambiar la fecha de un hito, con su motivo si hace falta. Con los
-- permisos de quien llama: la fila la autoriza la política de milestones,
-- y el motivo lo piden los guardianes
create or replace function public.fechar_hito(p_hito uuid, p_fecha date, p_motivo text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_filas integer;
begin
  perform set_config('app.motivo_hito', coalesce(trim(p_motivo), ''), true);
  update milestones set due_date = p_fecha where id = p_hito;
  get diagnostics v_filas = row_count;
  if v_filas = 0 then
    raise exception 'No puedes cambiar la fecha de este hito.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.fechar_hito(uuid, date, text) from public, anon;
grant execute on function public.fechar_hito(uuid, date, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Lo que el mentor ve de la candidatura en entrada (REVISION, 23 nov): lo
-- que presentó ella y el resultado del comité con su estadio. Ni las
-- notas de las reuniones, ni la deliberación, ni el due diligence. Una
-- función y no una política: la candidatura entera sigue siendo de IWL.
-- -----------------------------------------------------------------------------

create or replace function public.ficha_entrada(p_company uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  v_acta record;
  v_prueba text;
begin
  if not app.coordina_company(p_company) then
    raise exception 'La ficha de entrada la ve quien coordina el proyecto.' using errcode = '42501';
  end if;
  select * into c from candidaturas where company_id = p_company order by created_at desc limit 1;
  if not found then return null; end if;

  select a.fecha, a.decision, a.estadio, a.estadio_propuesto into v_acta
  from comite_actas a
  where a.candidatura_id = c.id and a.cerrada_at is not null
  order by a.fecha desc, a.created_at desc limit 1;

  select d.nombre into v_prueba from candidatura_documentos d where d.id = c.prueba_documento_id;

  return jsonb_build_object(
    'nombre', c.nombre,
    'sector', c.sector,
    'sector_otro', c.sector_otro,
    'one_liner', c.one_liner,
    'web', c.website,
    'pais', c.pais,
    'estadio_declarado', c.estado_declarado,
    'socios', coalesce(c.socios, '[]'::jsonb),
    'equipo_personas', c.equipo_personas,
    'prueba', v_prueba,
    'comite', case when v_acta.fecha is null then null else jsonb_build_object(
      'fecha', v_acta.fecha,
      'decision', v_acta.decision,
      'estadio', v_acta.estadio,
      'estadio_propuesto', v_acta.estadio_propuesto) end
  );
end;
$$;

revoke all on function public.ficha_entrada(uuid) from public, anon;
grant execute on function public.ficha_entrada(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- El mentor principal, desde la decisión de incorporación: la decisión
-- enseña el actual con un «Cambiar». Es de dirección. Lo hecho cuelga de
-- la compañía, así que el nuevo lo hereda sin más.
-- -----------------------------------------------------------------------------

create or replace function public.cambiar_mentor_principal(p_company uuid, p_mentor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes uuid;
begin
  if not app.is_admin() then
    raise exception 'El mentor principal lo cambia dirección.' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = p_mentor and role = 'mentor' and archived_at is null) then
    raise exception 'Esa persona no es mentora de IWL.' using errcode = 'P0001';
  end if;
  select profile_id into v_antes from company_members
  where company_id = p_company and member_role = 'mentor_principal' limit 1;
  if v_antes = p_mentor then return; end if;

  delete from company_members where company_id = p_company and member_role = 'mentor_principal';
  insert into company_members (company_id, profile_id, member_role)
  values (p_company, p_mentor, 'mentor_principal');

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (p_company, auth.uid(), 'company_members', p_company, 'mentor_principal_cambiado',
          jsonb_build_object('antes', v_antes, 'despues', p_mentor));
end;
$$;

revoke all on function public.cambiar_mentor_principal(uuid, uuid) from public, anon;
grant execute on function public.cambiar_mentor_principal(uuid, uuid) to authenticated;
