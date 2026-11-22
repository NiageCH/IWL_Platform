-- =============================================================================
-- Actas: solo el mentor (REVISION, 22 nov · bloque 7)
--
-- El acta de una sesión la levanta siempre el mentor de la compañía, y es él
-- quien la edita y corrige las horas antes de cerrarla. El equipo de IWL ya
-- no levanta actas: dirección sigue decidiendo las que le llegan, y anular
-- se queda como estaba. Las fundadoras comentan y confirman, como hasta
-- ahora; los 7 días, las versiones y llevarla a dirección no cambian.
--
-- Un «trabajo» fuera de sesión no es un acta: lo sigue apuntando quien lo
-- hizo y acompaña a la compañía (Niage, por ejemplo), y lo corrige él.
-- =============================================================================

-- Mentor de la compañía: principal o secundario
create or replace function app.es_mentor_de(p_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from company_members
    where company_id = p_company and profile_id = auth.uid()
      and member_role in ('mentor_principal', 'mentor_secundario')
  )
$$;

-- Quién lleva un registro: el acta, un mentor; un trabajo, quien lo apuntó
create or replace function app.lleva_el_acta(p_company uuid, p_kind text, p_registrado_por uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_kind = 'sesion' then app.es_mentor_de(p_company)
    else p_registrado_por = auth.uid() and app.acompana_company(p_company)
  end
$$;

drop policy if exists sessions_insert on work_sessions;
create policy sessions_insert on work_sessions
  for insert to authenticated
  with check (
    registered_by = auth.uid()
    and case when kind = 'sesion' then app.es_mentor_de(company_id) else app.acompana_company(company_id) end
  );

CREATE OR REPLACE FUNCTION public.editar_acta_sesion(p_sesion uuid, p jsonb, p_motivo text DEFAULT NULL::text, p_horas jsonb DEFAULT '[]'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array[
    'por_confirmar', 'en_discusion', 'confirmada', 'confirmada_plazo',
    'confirmada_direccion', 'confirmada_previa']::estado_sesion[]);
  v_confirmada boolean := s.status not in ('por_confirmar', 'en_discusion');
  n work_sessions%rowtype;
  v_campos text[] := array['held_on', 'duration_minutes', 'modality', 'attendees_company', 'title',
                           'subject_id', 'pillar_id', 'worked', 'deliverable_url'];
  v_antes jsonb := '{}'::jsonb;
  v_despues jsonb := '{}'::jsonb;
  c text;
  l jsonb;
  v_horas_antes numeric;
  cambios jsonb := '[]'::jsonb;
  v_etapa uuid;
begin
  if not app.lleva_el_acta(s.company_id, s.kind, s.registered_by) then
    raise exception 'El acta la lleva el mentor de la compañía.' using errcode = '42501';
  end if;
  if v_confirmada and length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Está confirmada: di por qué cambia el acta.' using errcode = '23514';
  end if;

  update work_sessions set
    held_on           = case when p ? 'held_on' then (p ->> 'held_on')::date else held_on end,
    duration_minutes  = case when p ? 'duration_minutes' then nullif(p ->> 'duration_minutes', '')::int else duration_minutes end,
    modality          = case when p ? 'modality' then nullif(p ->> 'modality', '') else modality end,
    attendees_company = case when p ? 'attendees_company' then nullif(trim(coalesce(p ->> 'attendees_company', '')), '') else attendees_company end,
    title             = case when p ? 'title' then trim(coalesce(p ->> 'title', '')) else title end,
    subject_id        = case when p ? 'subject_id' then nullif(p ->> 'subject_id', '')::uuid else subject_id end,
    pillar_id         = case when p ? 'pillar_id' then nullif(p ->> 'pillar_id', '')::uuid else pillar_id end,
    worked            = case when p ? 'worked' then nullif(trim(coalesce(p ->> 'worked', '')), '') else worked end,
    deliverable_url   = case when p ? 'deliverable_url' then nullif(trim(coalesce(p ->> 'deliverable_url', '')), '') else deliverable_url end
  where id = s.id
  returning * into n;

  foreach c in array v_campos loop
    if (to_jsonb(s) -> c) is distinct from (to_jsonb(n) -> c) then
      v_antes := v_antes || jsonb_build_object(c, to_jsonb(s) -> c);
      v_despues := v_despues || jsonb_build_object(c, to_jsonb(n) -> c);
    end if;
  end loop;

  -- La materia y el pilar se guardan por su nombre: la historia se lee sin cruzar tablas
  if v_despues ? 'subject_id' then
    v_antes := v_antes || jsonb_build_object('subject_id', (select name from contribution_subjects where id = s.subject_id));
    v_despues := v_despues || jsonb_build_object('subject_id', (select name from contribution_subjects where id = n.subject_id));
  end if;
  if v_despues ? 'pillar_id' then
    v_antes := v_antes || jsonb_build_object('pillar_id', (select name from pillars where id = s.pillar_id));
    v_despues := v_despues || jsonb_build_object('pillar_id', (select name from pillars where id = n.pillar_id));
  end if;

  -- Las líneas de horas repiten la fecha, el título y la materia
  if n.held_on is distinct from s.held_on then
    select id into v_etapa from roadmap_stages
    where company_id = s.company_id and n.held_on between starts_on and ends_on
    order by order_index limit 1;
    update contribution_hours set worked_on = n.held_on, stage_id = v_etapa where work_session_id = s.id;
  end if;
  if n.title is distinct from s.title then
    update contribution_hours set description = n.title where work_session_id = s.id;
  end if;
  if n.subject_id is distinct from s.subject_id then
    update contribution_hours set subject_id = n.subject_id where work_session_id = s.id;
  end if;

  for l in select * from jsonb_array_elements(coalesce(p_horas, '[]'::jsonb)) loop
    select hours into v_horas_antes from contribution_hours where id = (l ->> 'linea')::uuid and work_session_id = s.id;
    if not found then
      raise exception 'Esa línea no es de esta sesión.' using errcode = 'P0001';
    end if;
    if (l ->> 'horas')::numeric <= 0 or (l ->> 'horas')::numeric > 24 then
      raise exception 'Las horas tienen que ser un número entre 0 y 24.' using errcode = '23514';
    end if;
    if v_horas_antes is distinct from (l ->> 'horas')::numeric then
      if not v_confirmada then
        raise exception 'Mientras está abierta, las horas se corrigen con «Corregir las horas».' using errcode = 'P0001';
      end if;
      update contribution_hours set hours = (l ->> 'horas')::numeric where id = (l ->> 'linea')::uuid;
      cambios := cambios || jsonb_build_object(
        'linea', l ->> 'linea',
        'persona', (select person_name from contribution_hours where id = (l ->> 'linea')::uuid),
        'antes', v_horas_antes, 'despues', (l ->> 'horas')::numeric);
    end if;
  end loop;

  if v_antes = '{}'::jsonb and jsonb_array_length(cambios) = 0 then
    return false;
  end if;

  -- Confirmada y con horas distintas: vuelve a ella, con el plazo desde ahora
  if v_confirmada and jsonb_array_length(cambios) > 0 then
    update work_sessions set status = 'por_confirmar', pending_since = now(), closed_by = null, closed_at = null
    where id = s.id;
  end if;

  perform app.anotar_sesion(s.id, 'version_acta', p_motivo, jsonb_build_object(
    'campos', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(v_despues) k),
    'antes', v_antes,
    'despues', v_despues,
    'horas', cambios,
    'confirmada', v_confirmada,
    'reabierta', v_confirmada and jsonb_array_length(cambios) > 0));
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.corregir_horas_sesion(p_sesion uuid, p_linea uuid, p_horas numeric, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['por_confirmar', 'en_discusion']::estado_sesion[]);
  v_antes numeric;
  v_persona text;
begin
  if not app.lleva_el_acta(s.company_id, s.kind, s.registered_by) then
    raise exception 'Las horas las corrige el mentor de la compañía.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Di por qué cambian las horas.' using errcode = '23514';
  end if;
  select hours, person_name into v_antes, v_persona from contribution_hours where id = p_linea and work_session_id = s.id;
  if not found then
    raise exception 'Esa línea no es de esta sesión.' using errcode = 'P0001';
  end if;
  update contribution_hours set hours = p_horas where id = p_linea;
  update work_sessions set status = 'por_confirmar', pending_since = now() where id = s.id;
  perform app.anotar_sesion(s.id, 'correccion', p_motivo,
    jsonb_build_object('linea', p_linea, 'persona', v_persona, 'antes', v_antes, 'despues', p_horas));
end;
$function$;

CREATE OR REPLACE FUNCTION public.mantener_horas_sesion(p_sesion uuid, p_motivo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['en_discusion']::estado_sesion[]);
begin
  if not app.lleva_el_acta(s.company_id, s.kind, s.registered_by) then
    raise exception 'Mantener las horas es del mentor de la compañía.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Explícale por qué se mantienen.' using errcode = '23514';
  end if;
  update work_sessions set status = 'por_confirmar', pending_since = now() where id = s.id;
  perform app.anotar_sesion(s.id, 'mantenida', p_motivo);
end;
$function$;
