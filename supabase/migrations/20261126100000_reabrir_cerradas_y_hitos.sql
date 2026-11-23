-- =============================================================================
-- Bloques 5, 8 y 9 aprobados: las cuatro respuestas (REVISION, 23 nov)
--
-- · Reabrir una compañía cerrada: dirección, con motivo. Vuelve como
--   estaba al cerrarse; sus avisos cerrados no se reabren.
-- · Cerrada, solo la lee dirección, venga la consulta de donde venga: una
--   política restrictiva en cada tabla que cuelga de una compañía o de su
--   candidatura, y en el almacén de candidaturas.
-- · Hitos fundamentales: añadir, retirar y ordenar desde Administración.
--   Retirar no borra: deja de salir en las hojas de ruta nuevas.
-- · El mentor abre la prueba del estadio: la ficha da su ruta.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reabrir
-- -----------------------------------------------------------------------------

-- El guardián de la fila deja pasar una sola cosa: que `reabrir_compania`
-- la reabra. Sigue siendo integridad (vale con la clave de servicio): la
-- marca de sesión solo la pone esa función, y solo para quitar el cierre.
create or replace function app.guard_compania_cerrada_fila()
returns trigger
language plpgsql
as $$
begin
  if old.cierre is not null
     and not (coalesce(current_setting('app.reabriendo', true), '') = 'on' and new.cierre is null) then
    raise exception 'La compañía está cerrada: solo se lee.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.reabrir_compania(p_company uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  co companies%rowtype;
begin
  if not app.is_admin() then
    raise exception 'Reabrir una compañía es de dirección.' using errcode = '42501';
  end if;
  select * into co from companies where id = p_company;
  if not found then
    raise exception 'Esa compañía ya no está.' using errcode = 'P0001';
  end if;
  if co.cierre is null then
    raise exception 'No está cerrada.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Escribe por qué se reabre: queda en el registro.' using errcode = 'P0001';
  end if;

  perform set_config('app.reabriendo', 'on', true);
  -- Vuelve como estaba. El cierre la archivó solo si no lo estaba ya: en
  -- ese caso el archivo lleva el mismo instante que el cierre
  update companies
  set cierre = null,
      cerrada_on = null,
      cierre_motivo = null,
      cerrada_por = null,
      cerrada_at = null,
      archived_at = case when archived_at = co.cerrada_at then null else archived_at end,
      archived_by = case when archived_at = co.cerrada_at then null else archived_by end,
      archive_reason = case when archived_at = co.cerrada_at then null else archive_reason end
  where id = p_company;
  perform set_config('app.reabriendo', 'off', true);

  -- Lo que fue el cierre queda en el registro, con el porqué de reabrirla.
  -- Los avisos que se cerraron al cerrarla siguen cerrados
  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (p_company, auth.uid(), 'companies', p_company, 'compania_reabierta',
          jsonb_build_object('motivo', trim(p_motivo),
                             'cierre', co.cierre, 'cerrada_on', co.cerrada_on,
                             'cierre_motivo', co.cierre_motivo, 'cerrada_por', co.cerrada_por));
end;
$$;

revoke all on function public.reabrir_compania(uuid, text) from public, anon;
grant execute on function public.reabrir_compania(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Cerrada, solo dirección. Las políticas de antes siguen como estaban; la
-- restrictiva se suma a todas («y además»). Así no hay que acordarse en
-- cada política nueva: basta con que la tabla tenga company_id.
-- -----------------------------------------------------------------------------

create or replace function app.abierta_o_direccion(p_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_company is null or not app.compania_cerrada(p_company) or app.is_admin()
$$;

create or replace function app.candidatura_abierta_o_direccion(p_candidatura uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_candidatura is null or app.is_admin() or not exists (
    select 1 from candidaturas k join companies c on c.id = k.company_id
    where k.id = p_candidatura and c.cierre is not null
  )
$$;

create or replace function app.acta_abierta_o_direccion(p_acta uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select app.candidatura_abierta_o_direccion((select candidatura_id from comite_actas where id = p_acta))
$$;

do $$
declare
  t text;
begin
  -- Todas las tablas que cuelgan de una compañía
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'company_id' and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('drop policy if exists %I on %I', t || '_cerrada', t);
    execute format(
      'create policy %I on %I as restrictive for all using (app.abierta_o_direccion(company_id)) with check (app.abierta_o_direccion(company_id))',
      t || '_cerrada', t);
  end loop;

  -- Las que cuelgan de su candidatura
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'candidatura_id' and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('drop policy if exists %I on %I', t || '_cerrada_candidatura', t);
    execute format(
      'create policy %I on %I as restrictive for all using (app.candidatura_abierta_o_direccion(candidatura_id)) with check (app.candidatura_abierta_o_direccion(candidatura_id))',
      t || '_cerrada_candidatura', t);
  end loop;
end;
$$;

drop policy if exists companies_cerrada on companies;
create policy companies_cerrada on companies as restrictive for all
  using (app.abierta_o_direccion(id)) with check (app.abierta_o_direccion(id));

drop policy if exists candidaturas_cerrada_propia on candidaturas;
create policy candidaturas_cerrada_propia on candidaturas as restrictive for all
  using (app.candidatura_abierta_o_direccion(id)) with check (app.candidatura_abierta_o_direccion(id));

drop policy if exists comite_firmas_cerrada on comite_firmas;
create policy comite_firmas_cerrada on comite_firmas as restrictive for all
  using (app.acta_abierta_o_direccion(acta_id)) with check (app.acta_abierta_o_direccion(acta_id));

-- El almacén de la candidatura: la carpeta es la candidatura. Su NDA lo
-- sigue bajando ella (es_mi_nda_tras_cierre), como se decidió en el cierre
create or replace function app.objeto_candidatura_abierto(p_ruta text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_carpeta uuid;
begin
  begin
    v_carpeta := (storage.foldername(p_ruta))[1]::uuid;
  exception when others then
    return true;
  end;
  return app.candidatura_abierta_o_direccion(v_carpeta) or app.es_mi_nda_tras_cierre(p_ruta);
end;
$$;

drop policy if exists candidaturas_cerrada on storage.objects;
create policy candidaturas_cerrada on storage.objects as restrictive for all
  using (bucket_id <> 'candidaturas' or app.objeto_candidatura_abierto(name))
  with check (bucket_id <> 'candidaturas' or app.objeto_candidatura_abierto(name));

-- -----------------------------------------------------------------------------
-- Hitos fundamentales: retirar sin borrar
-- -----------------------------------------------------------------------------

alter table roadmap_template_milestones
  add column if not exists retired_at timestamptz,
  add column if not exists retired_by uuid references profiles (id) on delete set null;

comment on column roadmap_template_milestones.retired_at is
  'Retirado por dirección: deja de salir en las listas de entrada y en las hojas de ruta nuevas. Las ya generadas y las firmadas llevan su copia.';

-- La lista de entrada: desde su última definición (20261123100000), sin los retirados
create or replace function app.hitos_de_la_lista(p_company uuid)
returns setof roadmap_template_milestones language sql stable security definer set search_path = public as $$
  select m.*
  from roadmap_template_milestones m
  join roadmap_template_stages s on s.id = m.template_stage_id
  join companies c on c.id = p_company
  where s.template_id = app.plantilla_hoja_iwl()
    and m.fundamental
    and m.retired_at is null
    and (s.tramo < app.tramo_de_entrada(c.entry_state)
         or (c.entry_state = 'idea' and s.tramo = 1))
  order by s.tramo, m.order_index
$$;

-- Ordenar: cambia el sitio con el de al lado. Lo hace la base porque el
-- orden es único por tramo y el cambio pasa por un hueco
create or replace function public.mover_hito_fundamental(p_hito uuid, p_sentido integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h roadmap_template_milestones%rowtype;
  v_otro roadmap_template_milestones%rowtype;
begin
  if not app.is_admin() then
    raise exception 'La hoja de ruta del programa la cambia dirección.' using errcode = '42501';
  end if;
  select * into h from roadmap_template_milestones where id = p_hito;
  if not found then
    raise exception 'Ese hito ya no está.' using errcode = 'P0001';
  end if;
  select * into v_otro from roadmap_template_milestones
  where template_stage_id = h.template_stage_id and retired_at is null
    and case when p_sentido < 0 then order_index < h.order_index else order_index > h.order_index end
  order by case when p_sentido < 0 then -order_index else order_index end
  limit 1;
  if not found then return; end if;

  update roadmap_template_milestones set order_index = -1 where id = h.id;
  update roadmap_template_milestones set order_index = h.order_index where id = v_otro.id;
  update roadmap_template_milestones set order_index = v_otro.order_index where id = h.id;
end;
$$;

revoke all on function public.mover_hito_fundamental(uuid, integer) from public, anon;
grant execute on function public.mover_hito_fundamental(uuid, integer) to authenticated;

-- Generar: desde su última definición (20261124100000), sin los retirados
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
      where m.template_stage_id = v_etapa.id and m.retired_at is null
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
    where s.template_id = app.plantilla_hoja_iwl() and m.fundamental and m.retired_at is null and s.tramo < v_entrada
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
-- La ficha de entrada: desde su última definición (20261124100000), con la
-- ruta de la prueba. El mentor la abre con la política de siempre del
-- almacén (puede_ver_expediente): es miembro de la compañía.
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
  v_ruta text;
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

  select d.nombre, d.storage_path into v_prueba, v_ruta from candidatura_documentos d where d.id = c.prueba_documento_id;

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
    'prueba_ruta', v_ruta,
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
