-- =============================================================================
-- Sesiones con acta, y horas confirmadas por ella
--
-- (REVISION, 13 nov) Cambia una decisión anterior: las horas de IWL se
-- imputaban sin confirmación y la compañía solo podía objetar. Ahora:
--
--   · Toda hora cuelga de una sesión (con acta) o de un trabajo fuera de
--     sesión (con su entregable). Sin entregable no se imputa.
--   · Registrada, queda «por confirmar» y le llega a ella un aviso.
--   · Ella confirma, con un comentario si quiere, o dice «No cuadra», con
--     comentario obligatorio. Se abre un hilo en la sesión: quien la
--     registró responde, corrige las horas (queda la cifra de antes y el
--     motivo) o las mantiene. Si no se ponen de acuerdo, cualquiera de los
--     dos la lleva a dirección, que decide y cierra.
--   · Sin respuesta en 7 días se confirma sola: «Confirmada por plazo».
--   · El cumplimiento del Anexo se mide con las confirmadas.
--   · Nada se borra: una sesión se anula con motivo, y cada paso queda en
--     su historia.
--
-- Lo de antes pasa a «Confirmada (antes del 13 nov)», sin acta, y las
-- objeciones a horas pasan al hilo de su sesión.
-- =============================================================================

create type estado_sesion as enum (
  'por_confirmar',
  'en_discusion',
  'en_direccion',
  'confirmada',
  'confirmada_plazo',
  'confirmada_direccion',
  'confirmada_previa',
  'anulada'
);

comment on type estado_sesion is
  'Las cuatro «confirmada…» cuentan para el Anexo. «Previa» es lo imputado antes del 13 nov 2026, cuando no se confirmaba.';

create table work_sessions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references companies (id) on delete cascade,
  annex_id         uuid references annexes (id) on delete set null,
  -- Una sesión con ella, o trabajo de IWL fuera de sesión
  kind             text not null check (kind in ('sesion', 'trabajo')),
  held_on          date not null,
  duration_minutes int check (duration_minutes between 5 and 24 * 60),
  modality         text check (modality in ('presencial', 'videollamada', 'telefono')),
  -- Quién estuvo de su lado. De IWL, las personas con horas en la sesión
  attendees_company text,
  title            text not null check (length(trim(title)) > 0),
  subject_id       uuid references contribution_subjects (id) on delete restrict,
  pillar_id        uuid references pillars (id) on delete set null,
  -- El acta: qué se trabajó. Los acuerdos van en `session_agreements`
  worked           text,
  deliverable_url  text,
  status           estado_sesion not null default 'por_confirmar',
  -- Desde cuándo espera su confirmación: el plazo de 7 días cuenta desde aquí
  pending_since    timestamptz not null default now(),
  registered_by    uuid references profiles (id) on delete set null,
  closed_by        uuid references profiles (id) on delete set null,
  closed_at        timestamptz,
  -- Lo de antes del 13 nov: sin acta, sin sesión de verdad detrás
  migrated         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint sesion_con_acta check (
    migrated or kind <> 'sesion'
    or (duration_minutes is not null and modality is not null and length(trim(coalesce(worked, ''))) > 0)
  ),
  constraint trabajo_con_descripcion check (
    migrated or kind <> 'trabajo' or length(trim(coalesce(worked, ''))) > 0
  )
);

create index sessions_company_idx on work_sessions (company_id, held_on desc);
create index sessions_pendientes_idx on work_sessions (pending_since) where status = 'por_confirmar';

create trigger sessions_touch
  before update on work_sessions
  for each row execute function app.touch_updated_at();

comment on table work_sessions is
  'Sesiones con la compañía y trabajo fuera de sesión. Toda hora de IWL cuelga de una. Ella las confirma; nada se borra, se anula con motivo.';

create table session_agreements (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references work_sessions (id) on delete cascade,
  company_id   uuid not null references companies (id) on delete cascade,
  body         text not null check (length(trim(body)) > 0),
  -- Responsable: una persona de la plataforma o un nombre
  owner_id     uuid references profiles (id) on delete set null,
  owner_name   text,
  due_on       date,
  task_id      uuid references tasks (id) on delete set null,
  milestone_id uuid references milestones (id) on delete set null,
  created_by   uuid references profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index session_agreements_session_idx on session_agreements (session_id);

/*
 * La historia de cada sesión: quién la registró, cada comentario, cada
 * cambio de horas con su motivo, quién confirmó o cerró y cuándo. Es el
 * hilo de una discusión y el registro a la vez. Solo se añade.
 */
create table session_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references work_sessions (id) on delete cascade,
  company_id  uuid not null references companies (id) on delete cascade,
  kind        text not null check (kind in (
    'registrada', 'confirmada', 'no_cuadra', 'comentario', 'correccion', 'mantenida',
    'a_direccion', 'decision', 'confirmada_plazo', 'anulada', 'migrada', 'acta'
  )),
  author_id   uuid references profiles (id) on delete set null,
  -- El nombre, copiado: la historia no cambia si la persona cambia de nombre
  author_name text,
  body        text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index session_events_session_idx on session_events (session_id, created_at);

-- Las horas, a su sesión
alter table contribution_hours
  add column if not exists work_session_id uuid references work_sessions (id),
  add column if not exists session_status estado_sesion;

create index if not exists contribution_hours_work_session_idx on contribution_hours (work_session_id);

comment on column contribution_hours.session_status is
  'El estado de su sesión, copiado para sumar sin cruzar tablas. Lo mantiene la base; no se escribe a mano.';

-- La historia y la evidencia de una sesión cuelgan de ella
alter table avisos add column if not exists work_session_id uuid references work_sessions (id) on delete cascade;

-- El correo a ella al registrar una sesión
alter table correos drop constraint if exists correos_evento_check;
alter table correos add constraint correos_evento_check check (evento in (
  'enlace_candidatura', 'reunion_propuesta', 'reunion_confirmada', 'reunion_cambiada',
  'reunion_cancelada', 'reunion_contrapropuesta', 'nda_enviado', 'acceso_dado',
  'respuesta_comentario', 'acuerdo_propuesto', 'descarte', 'recordatorio', 'resumen_avisos',
  'sesion_registrada'
));

-- -----------------------------------------------------------------------------
-- Quién es quién en una compañía
-- -----------------------------------------------------------------------------

create or replace function app.fundadora_de(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from company_members
    where company_id = p_company and profile_id = auth.uid() and member_role = 'fundadora'
  )
$$;

-- Quien acompaña: IWL, quien coordina y los mentores y revisores asignados
create or replace function app.acompana_company(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.coordina_company(p_company) or exists (
    select 1 from company_members
    where company_id = p_company and profile_id = auth.uid()
      and member_role in ('mentor_secundario', 'mentor', 'revisor_niage', 'responsable_iwl')
  )
$$;

grant execute on function app.fundadora_de(uuid) to authenticated;
grant execute on function app.acompana_company(uuid) to authenticated;

create or replace function app.nombre_o_correo(p_profile uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(concat_ws(' ', full_name, last_name)), ''), email, 'Alguien')
  from profiles where id = p_profile
$$;

create or replace function app.en_circuito_sesion()
returns boolean
language sql
stable
as $$ select coalesce(current_setting('app.circuito_sesion', true), '') = 'on' $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table work_sessions enable row level security;
alter table session_agreements enable row level security;
alter table session_events enable row level security;

create policy sessions_select on work_sessions
  for select to authenticated using (app.can_read_company(company_id));

create policy sessions_insert on work_sessions
  for insert to authenticated
  with check (app.acompana_company(company_id) and registered_by = auth.uid());

-- Lo que se puede cambiar, y cuándo, lo dice el guardián
create policy sessions_update on work_sessions
  for update to authenticated
  using (registered_by = auth.uid() or app.coordina_company(company_id))
  with check (registered_by = auth.uid() or app.coordina_company(company_id));

create policy session_agreements_select on session_agreements
  for select to authenticated using (app.can_read_company(company_id));

create policy session_agreements_write on session_agreements
  for insert to authenticated with check (app.acompana_company(company_id));

create policy session_agreements_update on session_agreements
  for update to authenticated
  using (app.acompana_company(company_id)) with check (app.acompana_company(company_id));

create policy session_events_select on session_events
  for select to authenticated using (app.can_read_company(company_id));

-- La historia la escriben las funciones del circuito, no nadie a mano
revoke insert, update, delete on session_events from authenticated, anon;

-- -----------------------------------------------------------------------------
-- Guardianes de integridad: valen también con la clave de servicio
-- -----------------------------------------------------------------------------

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

  if old.status not in ('por_confirmar', 'en_discusion') then
    raise exception 'Una sesión confirmada o anulada no se edita.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sessions_guard
  before update or delete on work_sessions
  for each row execute function app.guard_sesion();

-- Un trabajo fuera de sesión sin entregable no se imputa
create or replace function app.trabajo_con_entregable()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'trabajo' and not new.migrated
     and length(trim(coalesce(new.deliverable_url, ''))) = 0
     and not exists (select 1 from evidence_links e where e.entity = 'session' and e.entity_id = new.id) then
    raise exception 'Un trabajo fuera de sesión necesita su entregable: enlázalo.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger sessions_trabajo_con_entregable
  before insert on work_sessions
  for each row execute function app.trabajo_con_entregable();

create or replace function app.guard_historia_sesion()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from work_sessions where id = old.session_id) then
    return old;
  end if;
  raise exception 'La historia de una sesión no se toca.' using errcode = '42501';
end;
$$;

create trigger session_events_inmutable
  before update or delete on session_events
  for each row execute function app.guard_historia_sesion();

/*
 * Las horas de una sesión.
 *
 * Toda hora nueva cuelga de una sesión por confirmar. Sin sesión, solo la
 * semilla y los scripts (que corren sin nadie detrás): esas se envuelven en
 * una sesión «Confirmada (antes del 13 nov)», que es lo que eran. Desde la
 * aplicación, sin sesión no se imputa.
 *
 * Las horas de una línea no se cambian a mano: se corrigen con motivo,
 * desde la sesión. Y una línea no se borra.
 */
create or replace function app.guard_horas_de_sesion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype;
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from companies where id = old.company_id)
       and exists (select 1 from work_sessions where id = old.work_session_id) then
      raise exception 'Unas horas no se borran: se anula su sesión, con motivo.' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.work_session_id is null then
      if auth.uid() is not null then
        raise exception 'Las horas se registran con su sesión o su trabajo, en la pestaña Sesiones.' using errcode = '23514';
      end if;
      insert into work_sessions (company_id, annex_id, kind, held_on, title, subject_id, status, migrated, registered_by, closed_at)
      values (new.company_id, new.annex_id, 'sesion', new.worked_on, new.description, new.subject_id,
              'confirmada_previa', true, new.created_by, now())
      returning * into s;
      new.work_session_id := s.id;
    else
      select * into s from work_sessions where id = new.work_session_id;
      if s.company_id is distinct from new.company_id then
        raise exception 'Esas horas no son de la compañía de su sesión.' using errcode = '23514';
      end if;
      if s.status <> 'por_confirmar' and not app.en_circuito_sesion() then
        raise exception 'A una sesión que ya no está por confirmar no se le añaden horas.' using errcode = '42501';
      end if;
    end if;
    new.session_status := s.status;
    return new;
  end if;

  if not app.en_circuito_sesion()
     and (new.hours, new.work_session_id, new.company_id, new.session_status)
         is distinct from (old.hours, old.work_session_id, old.company_id, old.session_status) then
    raise exception 'Las horas de una sesión se corrigen desde la sesión, con motivo.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger contribution_hours_de_sesion
  before insert or update or delete on contribution_hours
  for each row execute function app.guard_horas_de_sesion();

-- El estado de la sesión, a sus horas
create or replace function app.estado_a_las_horas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform set_config('app.circuito_sesion', 'on', true);
    update contribution_hours set session_status = new.status where work_session_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sessions_estado_a_las_horas
  after update of status on work_sessions
  for each row execute function app.estado_a_las_horas();

-- -----------------------------------------------------------------------------
-- Avisos del circuito
-- -----------------------------------------------------------------------------

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha',
                  'anexo_comentario', 'cambio_via',
                  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada', 'reunion_anotar',
                  'hito_entregado', 'hito_sin_revisar',
                  'candidatura_nueva', 'acta_por_firmar', 'anexo_aceptado',
                  'documento_entregado', 'correos_sin_enviar',
                  'sesion_por_confirmar', 'sesion_no_cuadra', 'sesion_en_direccion'));

/*
 * Por confirmar: a cada fundadora con cuenta. No cuadra: a quien la
 * registró. En dirección: a dirección. Cada uno se cierra cuando la sesión
 * sale de ese estado, lo haga quien lo haga.
 */
create or replace function app.avisos_de_sesion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status
     and new.pending_since is not distinct from old.pending_since then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where work_session_id = new.id and cerrado_at is null
      and tipo in ('sesion_por_confirmar', 'sesion_no_cuadra', 'sesion_en_direccion');
  end if;

  if new.status = 'por_confirmar' then
    insert into avisos (tipo, company_id, work_session_id, profile_id, para)
    select 'sesion_por_confirmar', new.company_id, new.id, coalesce(auth.uid(), new.registered_by), m.profile_id
    from company_members m
    where m.company_id = new.company_id and m.member_role = 'fundadora';
  elsif new.status = 'en_discusion' and new.registered_by is not null then
    insert into avisos (tipo, company_id, work_session_id, profile_id, para)
    values ('sesion_no_cuadra', new.company_id, new.id, auth.uid(), new.registered_by);
  elsif new.status = 'en_direccion' then
    insert into avisos (tipo, company_id, work_session_id, profile_id)
    values ('sesion_en_direccion', new.company_id, new.id, auth.uid());
  end if;
  return new;
end;
$$;

create trigger sessions_avisos
  after insert or update of status, pending_since on work_sessions
  for each row execute function app.avisos_de_sesion();

-- -----------------------------------------------------------------------------
-- El circuito
-- -----------------------------------------------------------------------------

create or replace function app.anotar_sesion(p_sesion uuid, p_kind text, p_body text, p_detail jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into session_events (session_id, company_id, kind, author_id, author_name, body, detail)
  select s.id, s.company_id, p_kind, auth.uid(), app.nombre_o_correo(auth.uid()), nullif(trim(coalesce(p_body, '')), ''), p_detail
  from work_sessions s where s.id = p_sesion
$$;

/** Bloquea la sesión y comprueba su estado */
create or replace function app.sesion_en(p_sesion uuid, p_estados estado_sesion[])
returns work_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype;
begin
  select * into s from work_sessions where id = p_sesion for update;
  if not found or not app.can_read_company(s.company_id) then
    raise exception 'Esa sesión no está, o no es de una compañía tuya.' using errcode = '42501';
  end if;
  if not (s.status = any (p_estados)) then
    raise exception 'Esa sesión ya no está en ese punto. Vuelve a cargar la página.' using errcode = 'P0001';
  end if;
  perform set_config('app.circuito_sesion', 'on', true);
  return s;
end;
$$;

/**
 * Registrar una sesión o un trabajo, con su acta, sus acuerdos y sus
 * horas, de una vez: o queda todo o no queda nada. Corre con los permisos
 * de quien la registra, así que las políticas de cada tabla mandan.
 */
create or replace function public.registrar_sesion(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := coalesce((p ->> 'id')::uuid, gen_random_uuid());
  v_company uuid := (p ->> 'company_id')::uuid;
  v_fecha date := (p ->> 'held_on')::date;
  v_anexo uuid;
  v_etapa uuid;
  v_titulo text := trim(coalesce(p ->> 'title', ''));
  a jsonb;
  h jsonb;
begin
  if jsonb_array_length(coalesce(p -> 'horas', '[]'::jsonb)) = 0 then
    raise exception 'Pon las horas de al menos una persona de IWL.' using errcode = '23514';
  end if;

  select id into v_anexo from annexes
  where company_id = v_company and status in ('firmado', 'cerrado')
  order by version desc limit 1;
  select id into v_etapa from roadmap_stages
  where company_id = v_company and v_fecha between starts_on and ends_on
  order by order_index limit 1;

  insert into work_sessions (id, company_id, annex_id, kind, held_on, duration_minutes, modality, attendees_company,
                        title, subject_id, pillar_id, worked, deliverable_url, registered_by)
  values (v_id, v_company, v_anexo, p ->> 'kind', v_fecha, nullif(p ->> 'duration_minutes', '')::int,
          nullif(p ->> 'modality', ''), nullif(trim(coalesce(p ->> 'attendees_company', '')), ''),
          v_titulo, (p ->> 'subject_id')::uuid, nullif(p ->> 'pillar_id', '')::uuid,
          nullif(trim(coalesce(p ->> 'worked', '')), ''), nullif(trim(coalesce(p ->> 'deliverable_url', '')), ''),
          auth.uid());

  for a in select * from jsonb_array_elements(coalesce(p -> 'acuerdos', '[]'::jsonb)) loop
    insert into session_agreements (session_id, company_id, body, owner_name, due_on, created_by)
    values (v_id, v_company, a ->> 'body', nullif(trim(coalesce(a ->> 'owner_name', '')), ''),
            nullif(a ->> 'due_on', '')::date, auth.uid());
  end loop;

  for h in select * from jsonb_array_elements(p -> 'horas') loop
    insert into contribution_hours (company_id, annex_id, stage_id, worked_on, profile_id, person_name, profile_code,
                                    subject_id, description, hours, work_session_id, created_by)
    values (v_company, v_anexo, v_etapa, v_fecha, (h ->> 'profile_id')::uuid,
            app.nombre_o_correo((h ->> 'profile_id')::uuid), h ->> 'profile_code',
            (p ->> 'subject_id')::uuid, v_titulo, (h ->> 'hours')::numeric, v_id, auth.uid());
  end loop;

  perform app.anotar_sesion(v_id, 'registrada', null,
    jsonb_build_object('horas', (select sum(hours) from contribution_hours where work_session_id = v_id)));
  return v_id;
end;
$$;

grant execute on function public.registrar_sesion(jsonb) to authenticated;

/** Ella confirma, con un comentario si quiere */
create or replace function public.confirmar_sesion(p_sesion uuid, p_comentario text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['por_confirmar']::estado_sesion[]);
begin
  if not app.fundadora_de(s.company_id) then
    raise exception 'Las horas las confirma la compañía.' using errcode = '42501';
  end if;
  update work_sessions set status = 'confirmada', closed_by = auth.uid(), closed_at = now() where id = s.id;
  perform app.anotar_sesion(s.id, 'confirmada', p_comentario);
end;
$$;

/** «No cuadra»: abre el hilo. El comentario es obligatorio */
create or replace function public.sesion_no_cuadra(p_sesion uuid, p_comentario text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['por_confirmar']::estado_sesion[]);
begin
  if not app.fundadora_de(s.company_id) then
    raise exception 'Decir que no cuadra es de la compañía.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_comentario, ''))) < 5 then
    raise exception 'Di qué no cuadra: por ejemplo, «fue 1 h, no 2».' using errcode = '23514';
  end if;
  update work_sessions set status = 'en_discusion' where id = s.id;
  perform app.anotar_sesion(s.id, 'no_cuadra', p_comentario);
end;
$$;

/** Un mensaje en el hilo, de cualquiera de las dos partes */
create or replace function public.comentar_sesion(p_sesion uuid, p_comentario text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['por_confirmar', 'en_discusion', 'en_direccion']::estado_sesion[]);
begin
  if not (app.fundadora_de(s.company_id) or app.acompana_company(s.company_id)) then
    raise exception 'El hilo es de la compañía y de quien la acompaña.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_comentario, ''))) = 0 then
    raise exception 'Escribe el comentario.' using errcode = '23514';
  end if;
  perform app.anotar_sesion(s.id, 'comentario', p_comentario);
end;
$$;

/**
 * Corregir las horas de una línea: queda la cifra de antes y el motivo, y
 * la sesión vuelve a esperar su confirmación, con el plazo desde ahora.
 */
create or replace function public.corregir_horas_sesion(p_sesion uuid, p_linea uuid, p_horas numeric, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['por_confirmar', 'en_discusion']::estado_sesion[]);
  v_antes numeric;
  v_persona text;
begin
  if not (s.registered_by = auth.uid() or app.coordina_company(s.company_id)) then
    raise exception 'Las horas las corrige quien registró la sesión, o quien coordina.' using errcode = '42501';
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
$$;

/** Mantenerlas: se explica, y vuelve a ella para que confirme */
create or replace function public.mantener_horas_sesion(p_sesion uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['en_discusion']::estado_sesion[]);
begin
  if not (s.registered_by = auth.uid() or app.coordina_company(s.company_id)) then
    raise exception 'Mantener las horas es de quien registró la sesión, o de quien coordina.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Explícale por qué se mantienen.' using errcode = '23514';
  end if;
  update work_sessions set status = 'por_confirmar', pending_since = now() where id = s.id;
  perform app.anotar_sesion(s.id, 'mantenida', p_motivo);
end;
$$;

/** Si no se ponen de acuerdo, cualquiera de los dos la lleva a dirección */
create or replace function public.llevar_sesion_a_direccion(p_sesion uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['en_discusion']::estado_sesion[]);
begin
  if not (app.fundadora_de(s.company_id) or s.registered_by = auth.uid() or app.coordina_company(s.company_id)) then
    raise exception 'La lleva a dirección la compañía o quien registró la sesión.' using errcode = '42501';
  end if;
  update work_sessions set status = 'en_direccion' where id = s.id;
  perform app.anotar_sesion(s.id, 'a_direccion', p_motivo);
end;
$$;

/**
 * Dirección decide y cierra. Si cambia horas, cada cambio queda con la
 * cifra de antes, como cualquier corrección.
 */
create or replace function public.decidir_sesion(p_sesion uuid, p_motivo text, p_horas jsonb default '[]'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array['en_direccion']::estado_sesion[]);
  l jsonb;
  v_antes numeric;
  cambios jsonb := '[]'::jsonb;
begin
  if not app.is_admin() then
    raise exception 'Lo decide dirección.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Deja escrito qué se decide y por qué.' using errcode = '23514';
  end if;
  for l in select * from jsonb_array_elements(coalesce(p_horas, '[]'::jsonb)) loop
    select hours into v_antes from contribution_hours where id = (l ->> 'linea')::uuid and work_session_id = s.id;
    if found and v_antes is distinct from (l ->> 'horas')::numeric then
      update contribution_hours set hours = (l ->> 'horas')::numeric where id = (l ->> 'linea')::uuid;
      cambios := cambios || jsonb_build_object('linea', l ->> 'linea', 'antes', v_antes, 'despues', (l ->> 'horas')::numeric);
    end if;
  end loop;
  update work_sessions set status = 'confirmada_direccion', closed_by = auth.uid(), closed_at = now() where id = s.id;
  perform app.anotar_sesion(s.id, 'decision', p_motivo, jsonb_build_object('cambios', cambios));
end;
$$;

/**
 * Anular, con motivo. Lo pendiente lo anula quien la registró o quien
 * coordina; lo ya confirmado, solo dirección.
 */
create or replace function public.anular_sesion(p_sesion uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s work_sessions%rowtype := app.sesion_en(p_sesion, array[
    'por_confirmar', 'en_discusion', 'en_direccion', 'confirmada', 'confirmada_plazo',
    'confirmada_direccion', 'confirmada_previa']::estado_sesion[]);
begin
  if s.status in ('por_confirmar', 'en_discusion') then
    if not (s.registered_by = auth.uid() or app.coordina_company(s.company_id)) then
      raise exception 'La anula quien la registró, o quien coordina.' using errcode = '42501';
    end if;
  elsif not app.is_admin() then
    raise exception 'Una sesión confirmada o en dirección solo la anula dirección.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Di por qué se anula.' using errcode = '23514';
  end if;
  update work_sessions set status = 'anulada', closed_by = auth.uid(), closed_at = now() where id = s.id;
  perform app.anotar_sesion(s.id, 'anulada', p_motivo);
end;
$$;

/** Sin respuesta en 7 días, se confirma sola. Lo corre el cron */
create or replace function public.confirmar_sesiones_por_plazo()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  s record;
begin
  perform set_config('app.circuito_sesion', 'on', true);
  for s in
    select id, company_id from work_sessions
    where status = 'por_confirmar' and pending_since < now() - interval '7 days'
    for update
  loop
    update work_sessions set status = 'confirmada_plazo', closed_at = now() where id = s.id;
    insert into session_events (session_id, company_id, kind, author_name, body)
    values (s.id, s.company_id, 'confirmada_plazo', 'La plataforma', 'Sin respuesta en 7 días: confirmada por plazo.');
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function public.confirmar_sesiones_por_plazo() from public, anon, authenticated;
grant execute on function public.confirmar_sesiones_por_plazo() to service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'public.confirmar_sesion(uuid, text)', 'public.sesion_no_cuadra(uuid, text)',
    'public.comentar_sesion(uuid, text)', 'public.corregir_horas_sesion(uuid, uuid, numeric, text)',
    'public.mantener_horas_sesion(uuid, text)', 'public.llevar_sesion_a_direccion(uuid, text)',
    'public.decidir_sesion(uuid, text, jsonb)', 'public.anular_sesion(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Al pasar un acuerdo a tarea o enlazarlo a un hito, queda en la historia
create or replace function app.acuerdo_en_la_historia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.task_id is distinct from old.task_id and new.task_id is not null then
    perform app.anotar_sesion(new.session_id, 'acta', 'Acuerdo pasado a tarea: ' || new.body,
      jsonb_build_object('acuerdo', new.id, 'tarea', new.task_id));
  end if;
  if new.milestone_id is distinct from old.milestone_id and new.milestone_id is not null then
    perform app.anotar_sesion(new.session_id, 'acta', 'Acuerdo enlazado a un hito: ' || new.body,
      jsonb_build_object('acuerdo', new.id, 'hito', new.milestone_id));
  end if;
  return new;
end;
$$;

create trigger session_agreements_historia
  after update of task_id, milestone_id on session_agreements
  for each row execute function app.acuerdo_en_la_historia();

-- -----------------------------------------------------------------------------
-- Lo que cuenta: confirmadas, por confirmar, en discusión. Lo anulado, nada
-- -----------------------------------------------------------------------------

create or replace function app.horas_confirmadas(p estado_sesion)
returns boolean
language sql
immutable
as $$ select p in ('confirmada', 'confirmada_plazo', 'confirmada_direccion', 'confirmada_previa') $$;

-- `contribution_hours_valued`, desde su única definición
-- (`20260924150000_aportacion_linea_base.sql`): sin las anuladas, con el
-- estado al final, y «objetada» pasa a querer decir «en discusión»
create or replace view contribution_hours_valued as
select
  h.id,
  h.company_id,
  h.worked_on,
  h.person_name,
  h.profile_code,
  h.description,
  h.hours,
  h.applied_rate,
  h.market_rate,
  s.code                              as subject_code,
  s.name                              as subject_name,
  round(h.hours * h.applied_rate, 2)  as applied_value,
  round(h.hours * h.market_rate, 2)   as market_value,
  round(h.hours * (h.market_rate - h.applied_rate), 2) as discount_value,
  h.session_status in ('en_discusion', 'en_direccion') as objected,
  h.work_session_id,
  h.session_status
from contribution_hours h
join contribution_subjects s on s.id = h.subject_id
where h.session_status is distinct from 'anulada';

alter view contribution_hours_valued set (security_invoker = true);

-- `commitment_counter`, desde su única definición: lo entregado es lo
-- confirmado; lo por confirmar y lo discutido, al final, aparte
create or replace view commitment_counter as
select
  c.id                                            as company_id,
  a.id                                            as annex_id,
  a.committed_hours,
  a.committed_cash,
  a.equity_pct,
  coalesce(h.delivered_hours, 0)                  as delivered_hours,
  coalesce(h.applied_value, 0)                    as delivered_hours_value,
  coalesce(h.market_value, 0)                     as delivered_market_value,
  coalesce(d.disbursed, 0)                        as disbursed_cash,
  coalesce(d.justified, 0)                        as justified_cash,
  coalesce(i.total, 0)                            as introductions_made,
  coalesce(i.closed, 0)                           as introductions_closed,
  coalesce(e.total, 0)                            as deliverables_count,
  case
    when a.committed_hours is null or a.committed_hours = 0 then null
    else round(coalesce(h.delivered_hours, 0) / a.committed_hours * 100, 1)
  end                                             as hours_pct,
  case
    when a.committed_cash is null or a.committed_cash = 0 then null
    else round(coalesce(d.disbursed, 0) / a.committed_cash * 100, 1)
  end                                             as cash_pct,
  coalesce(h.pending_hours, 0)                    as pending_hours,
  coalesce(h.disputed_hours, 0)                   as disputed_hours
from companies c
left join lateral (
  select * from annexes a2
  where a2.company_id = c.id and a2.status in ('firmado', 'cerrado')
  order by a2.version desc limit 1
) a on true
left join lateral (
  select
    sum(hours) filter (where app.horas_confirmadas(session_status))                as delivered_hours,
    sum(hours * applied_rate) filter (where app.horas_confirmadas(session_status)) as applied_value,
    sum(hours * market_rate) filter (where app.horas_confirmadas(session_status))  as market_value,
    sum(hours) filter (where session_status = 'por_confirmar')                     as pending_hours,
    sum(hours) filter (where session_status in ('en_discusion', 'en_direccion'))    as disputed_hours
  from contribution_hours where company_id = c.id
) h on true
left join lateral (
  select
    sum(amount)                                          as disbursed,
    sum(amount) filter (where justified_on is not null)  as justified
  from cash_disbursements where company_id = c.id
) d on true
left join lateral (
  select
    count(*)                                   as total,
    count(*) filter (where status = 'cerrada') as closed
  from introductions where company_id = c.id
) i on true
left join lateral (
  select count(*) as total from deliverables where company_id = c.id
) e on true;

alter view commitment_counter set (security_invoker = true);

-- `mentoria_dedicacion`, desde su única definición
-- (`20260928120000_tareas.sql`): lo imputado no cuenta lo anulado
create or replace view mentoria_dedicacion as
select
  m.company_id,
  c.name                    as company_name,
  c.slug                    as company_slug,
  m.profile_id,
  p.full_name,
  p.email,
  m.member_role,
  m.rate_profile,
  m.assigned_hours,
  m.starts_on,
  m.ends_on,
  coalesce(h.horas, 0)      as imputadas,
  coalesce(h.valor, 0)      as valor_imputado,
  case
    when m.assigned_hours is null or m.assigned_hours = 0 then null
    else round((coalesce(h.horas, 0) / m.assigned_hours) * 100, 1)
  end                       as pct,
  coalesce(t.abiertas, 0)   as tareas_abiertas,
  coalesce(t.vencidas, 0)   as tareas_vencidas
from company_members m
join companies c on c.id = m.company_id
join profiles p on p.id = m.profile_id
left join lateral (
  select sum(ch.hours) as horas, sum(ch.hours * ch.applied_rate) as valor
  from contribution_hours ch
  where ch.company_id = m.company_id and ch.profile_id = m.profile_id
    and ch.session_status is distinct from 'anulada'
) h on true
left join lateral (
  select
    count(*) filter (
      where tk.status in ('pendiente', 'en_curso', 'bloqueada')
    ) as abiertas,
    count(*) filter (
      where tk.status in ('pendiente', 'en_curso', 'bloqueada')
        and tk.due_date < current_date
    ) as vencidas
  from tasks tk
  where tk.company_id = m.company_id and tk.owner_id = m.profile_id
) t on true
where m.member_role in (
  'mentor_principal', 'mentor_secundario', 'responsable_iwl', 'revisor_niage'
);

-- `create or replace view` no conserva las opciones: se vuelven a poner
alter view mentoria_dedicacion set (security_invoker = true);

-- `admin_personas` y `admin_companias`, desde su última definición
-- (`20261113100000_foto_y_linkedin.sql`): mismas columnas; lo imputado no
-- cuenta lo anulado
create or replace view admin_personas as
select
  p.id,
  p.email,
  p.full_name,
  p.last_name,
  p.job_title,
  p.expertise,
  p.bio,
  p.cv_path,
  p.role,
  p.is_active,
  p.archived_at,
  p.created_at,
  o.name as organization_name,
  app.persona_tiene_actividad(p.id) as tiene_actividad,
  app.puede_cambiar_correo(p.id)    as correo_editable,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'company_id',   c.id,
          'company_name', c.name,
          'company_slug', c.slug,
          'archivada',    c.archived_at is not null,
          'member_role',  m.member_role,
          'title',        m.title,
          'assigned_hours', m.assigned_hours,
          'rate_profile', m.rate_profile,
          'starts_on',    m.starts_on,
          'ends_on',      m.ends_on,
          'imputadas',    coalesce(h.horas, 0),
          'tareas_abiertas', coalesce(t.abiertas, 0)
        )
        order by c.name
      )
      from company_members m
      join companies c on c.id = m.company_id
      left join lateral (
        select sum(ch.hours) as horas
        from contribution_hours ch
        where ch.company_id = m.company_id and ch.profile_id = m.profile_id
          and ch.session_status is distinct from 'anulada'
      ) h on true
      left join lateral (
        select count(*) as abiertas
        from tasks tk
        where tk.company_id = m.company_id
          and tk.owner_id = m.profile_id
          and tk.status in ('pendiente', 'en_curso', 'bloqueada')
      ) t on true
      where m.profile_id = p.id
    ),
    '[]'::jsonb
  ) as asignaciones,
  p.photo_path,
  p.linkedin_url
from profiles p
left join organizations o on o.id = p.organization_id;

alter view admin_personas set (security_invoker = true);

create or replace view admin_companias as
select
  c.id,
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
  f.name as phase_name,
  co.name as cohort_name,
  app.compania_tiene_actividad(c.id) as tiene_actividad,
  (select count(*) from roadmap_stages s where s.company_id = c.id) as etapas,
  (
    select jsonb_agg(
      jsonb_build_object(
        'profile_id',     pr.id,
        'full_name',      pr.full_name,
        'last_name',      pr.last_name,
        'job_title',      pr.job_title,
        'member_role',    m.member_role,
        'title',          m.title,
        'assigned_hours', m.assigned_hours,
        'imputadas',      coalesce(h.horas, 0),
        'photo_path',     pr.photo_path,
        'linkedin_url',   pr.linkedin_url
      ) order by m.member_role, pr.full_name
    )
    from company_members m
    join profiles pr on pr.id = m.profile_id
    left join lateral (
      select sum(ch.hours) as horas
      from contribution_hours ch
      where ch.company_id = m.company_id and ch.profile_id = m.profile_id
        and ch.session_status is distinct from 'anulada'
    ) h on true
    where m.company_id = c.id
  ) as equipo
from companies c
left join phases f on f.id = c.phase_id
left join cohorts co on co.id = c.cohort_id;

alter view admin_companias set (security_invoker = true);

-- Las objeciones a horas ya no se abren: es «No cuadra», en la sesión
alter table objections add constraint objections_horas_en_sesion
  check (entity <> 'contribution_hours') not valid;

-- -----------------------------------------------------------------------------
-- Lo que había: cada línea de horas, a su sesión «Confirmada (antes del
-- 13 nov)», sin acta; sus objeciones, al hilo
-- -----------------------------------------------------------------------------

do $$
declare
  h record;
  v_sesion uuid;
  o record;
  n_horas int := 0;
  n_objeciones int := 0;
begin
  perform set_config('app.circuito_sesion', 'on', true);
  for h in select * from contribution_hours where work_session_id is null loop
    insert into work_sessions (company_id, annex_id, kind, held_on, title, subject_id, status, migrated,
                          registered_by, closed_at, created_at)
    values (h.company_id, h.annex_id, 'sesion', h.worked_on, h.description, h.subject_id,
            'confirmada_previa', true, h.created_by, h.created_at, h.created_at)
    returning id into v_sesion;
    update contribution_hours set work_session_id = v_sesion, session_status = 'confirmada_previa' where id = h.id;
    insert into session_events (session_id, company_id, kind, author_name, body, created_at)
    values (v_sesion, h.company_id, 'migrada', 'La plataforma',
            'Confirmada (antes del 13 nov): se imputó cuando las horas no se confirmaban. Sin acta.', now());
    n_horas := n_horas + 1;

    for o in select * from objections where entity = 'contribution_hours' and entity_id = h.id order by created_at loop
      insert into session_events (session_id, company_id, kind, author_id, author_name, body, created_at)
      values (v_sesion, h.company_id, 'no_cuadra', o.raised_by, app.nombre_o_correo(o.raised_by), o.reason, o.created_at);
      if o.resolution is not null then
        insert into session_events (session_id, company_id, kind, author_id, author_name, body, created_at)
        values (v_sesion, h.company_id, 'comentario', o.resolved_by, app.nombre_o_correo(o.resolved_by),
                o.resolution, coalesce(o.resolved_at, o.updated_at));
      end if;
      if o.status = 'abierta' then
        update work_sessions set status = 'en_discusion' where id = v_sesion;
      end if;
      n_objeciones := n_objeciones + 1;
    end loop;
  end loop;

  if n_horas > 0 then
    insert into activity_log (entity, action, detail)
    values ('sessions', 'horas_a_sesiones', jsonb_build_object(
      'motivo', 'REVISION 13 nov: toda hora cuelga de una sesión; lo de antes, confirmado sin acta',
      'lineas', n_horas, 'objeciones_al_hilo', n_objeciones));
  end if;
end $$;
