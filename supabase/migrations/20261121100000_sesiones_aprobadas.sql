-- =============================================================================
-- Sesiones: lo que pidió la aprobación (REVISION, 20 nov)
--
--   · El acta deja versión. Mientras la sesión no esté confirmada, cada
--     guardado anota quién, cuándo y qué apartado cambió. Confirmada, el
--     acta queda fija: corregirla pide motivo, queda como versión nueva y,
--     si cambian las horas, la sesión vuelve a «Por confirmar» con aviso a
--     ella.
--   · Correo a ella cuando la sesión vuelve a sus manos o la cierra
--     dirección: dos eventos nuevos.
--   · El día desde el que se le pide el avance del mes, para «Lo que le
--     toca a ella».
-- =============================================================================

alter table session_events drop constraint if exists session_events_kind_check;
alter table session_events add constraint session_events_kind_check check (kind in (
  'registrada', 'confirmada', 'no_cuadra', 'comentario', 'correccion', 'mantenida',
  'a_direccion', 'decision', 'confirmada_plazo', 'anulada', 'migrada', 'acta',
  'version_acta'
));

alter table correos drop constraint if exists correos_evento_check;
alter table correos add constraint correos_evento_check check (evento in (
  'enlace_candidatura', 'reunion_propuesta', 'reunion_confirmada', 'reunion_cambiada',
  'reunion_cancelada', 'reunion_contrapropuesta', 'nda_enviado', 'acceso_dado',
  'respuesta_comentario', 'acuerdo_propuesto', 'descarte', 'recordatorio', 'resumen_avisos',
  'sesion_registrada', 'sesion_de_vuelta', 'sesion_decidida'
));

/*
 * El acta ya no se toca a mano, ni siquiera abierta: todo cambio pasa por
 * `editar_acta_sesion`, que es lo que deja la versión. Desde la redacción
 * del 13 nov, el guardián dejaba editar el contenido mientras estaba por
 * confirmar o en discusión, sin rastro.
 */
create or replace function app.guard_sesion()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    -- Borrar la compañía se lleva sus sesiones; borrar una sesión suelta, no
    if exists (select 1 from companies where id = old.company_id) then
      raise exception 'Una sesión no se borra: se anula con motivo.' using errcode = '42501';
    end if;
    return old;
  end if;

  if app.en_circuito_sesion() then
    return new;
  end if;

  -- Borrar una cuenta deja sus sesiones sin autor (on delete set null): eso sí
  if (to_jsonb(new) - 'registered_by' - 'closed_by' - 'updated_at')
       = (to_jsonb(old) - 'registered_by' - 'closed_by' - 'updated_at')
     and (new.registered_by is null or new.registered_by = old.registered_by)
     and (new.closed_by is null or new.closed_by = old.closed_by) then
    return new;
  end if;

  if (new.status, new.closed_by, new.closed_at, new.pending_since, new.company_id, new.migrated, new.registered_by)
     is distinct from
     (old.status, old.closed_by, old.closed_at, old.pending_since, old.company_id, old.migrated, old.registered_by) then
    raise exception 'El estado de una sesión cambia con sus botones: confirmar, no cuadra, corregir, llevar a dirección o anular.'
      using errcode = '42501';
  end if;

  raise exception 'El acta se cambia con «Editar el acta», que deja versión.' using errcode = '42501';
end;
$$;

/**
 * Editar el acta. Deja una versión con los apartados que cambian, su valor
 * de antes y el de después.
 *
 * Abierta (por confirmar o en discusión): sin motivo; las horas se
 * corrigen aparte, con «Corregir las horas». Confirmada: con motivo, y si
 * cambian las horas, vuelve a «Por confirmar» y ella recibe aviso. En
 * dirección o anulada, no se toca.
 */
create or replace function public.editar_acta_sesion(
  p_sesion uuid,
  p jsonb,
  p_motivo text default null,
  p_horas jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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
  if not (s.registered_by = auth.uid() or app.coordina_company(s.company_id)) then
    raise exception 'El acta la cambia quien registró la sesión, o quien coordina.' using errcode = '42501';
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
$$;

revoke execute on function public.editar_acta_sesion(uuid, jsonb, text, jsonb) from public, anon;
grant execute on function public.editar_acta_sesion(uuid, jsonb, text, jsonb) to authenticated;

-- El día desde el que se le pide el avance del mes. El de vencimiento venía
-- en la semilla de configuración; aquí, por si la base no la cargó
insert into platform_settings (key, value, description) values
  ('avance_mes_dia_aviso', '{"dia": 25}',
   'Día del mes desde el que se le pide a la compañía el avance de ese mes, hasta que lo cargue.'),
  ('update_mensual_dia_limite', '{"dia": 10}',
   'Día del mes en que vence el update del mes anterior.')
on conflict (key) do nothing;
