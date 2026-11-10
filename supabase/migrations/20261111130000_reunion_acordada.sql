/*
 * La reunión se acuerda en la plataforma, no por correo.
 *
 * IWL propone dos o tres franjas, con quién va de IWL y el formato. Ella lo
 * ve en su página —la del enlace privado mientras no tenga cuenta, y «Tu
 * candidatura» si ya la tiene— y elige una, que la deja confirmada, o
 * propone otras. El ida y vuelta se repite hasta que una queda confirmada,
 * y todo queda en el historial de la candidatura.
 *
 *   propuesta → contrapropuesta → confirmada → celebrada / cancelada
 *
 * Una franja pasada no se puede elegir. Si pasan todas sin elegir, la
 * reunión ha caducado: se ve en la ficha y el cron deja un aviso a IWL.
 *
 * Lo que hace ella va por funciones `security definer` que reciben su
 * testigo o miran su sesión, como el resto de lo que hace desde su enlace:
 * no hay política para `anon`.
 */

alter table candidatura_reuniones
  add column if not exists estado text not null default 'propuesta'
    check (estado in ('propuesta', 'contrapropuesta', 'confirmada', 'celebrada', 'cancelada')),
  add column if not exists propuesta_de text not null default 'iwl' check (propuesta_de in ('iwl', 'candidata')),
  add column if not exists formato text check (formato in ('videollamada', 'presencial')),
  add column if not exists enlace text,
  add column if not exists direccion text,
  add column if not exists nota text,
  add column if not exists nota_candidata text,
  add column if not exists personas_iwl uuid[] not null default '{}',
  add column if not exists elegida jsonb,
  add column if not exists confirmada_at timestamptz,
  add column if not exists cancelada_at timestamptz,
  add column if not exists cancelada_motivo text,
  add column if not exists caducada_avisada_at timestamptz;

comment on column candidatura_reuniones.franjas is
  'Las franjas en juego: las de IWL o, en una contrapropuesta, las de ella (propuesta_de).';
comment on column candidatura_reuniones.elegida is 'La franja confirmada: {inicio, fin}.';

-- Las que ya había: anotadas, celebradas; propuestas sin anotar, propuestas
update candidatura_reuniones set estado = 'celebrada' where celebrada_on is not null;

-- -----------------------------------------------------------------------------
-- Lo que tiene que cumplir cada estado, lo escriba quien lo escriba
-- -----------------------------------------------------------------------------

create or replace function app.guard_reunion()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'confirmada' then
    if new.elegida is null then
      raise exception 'Una reunión confirmada tiene su franja elegida.' using errcode = 'P0001';
    end if;
    if not exists (select 1 from jsonb_array_elements(new.franjas) f where f ->> 'inicio' = new.elegida ->> 'inicio') then
      raise exception 'La franja elegida no es una de las propuestas.' using errcode = 'P0001';
    end if;
  end if;
  if new.estado = 'cancelada' and length(trim(coalesce(new.cancelada_motivo, ''))) = 0 then
    raise exception 'Cancelar una reunión lleva su motivo.' using errcode = 'P0001';
  end if;
  if new.formato = 'videollamada' and length(trim(coalesce(new.enlace, ''))) = 0 then
    raise exception 'Una videollamada lleva su enlace.' using errcode = 'P0001';
  end if;
  if new.formato = 'presencial' and length(trim(coalesce(new.direccion, ''))) = 0 then
    raise exception 'Una reunión presencial lleva su dirección.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists candidatura_reuniones_guard on candidatura_reuniones;
create trigger candidatura_reuniones_guard
  before insert or update on candidatura_reuniones
  for each row execute function app.guard_reunion();

-- -----------------------------------------------------------------------------
-- Los avisos de la reunión
-- Redefinición de `20261110141000_anexo_propuesta_y_acuerdo.sql`
-- -----------------------------------------------------------------------------

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha',
                  'anexo_comentario', 'cambio_via',
                  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada'));

-- -----------------------------------------------------------------------------
-- Quién es ella: por su testigo o por su sesión
-- -----------------------------------------------------------------------------

create or replace function app.candidatura_que_responde(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_token is not null then
      (select id from candidaturas where token = p_token and token_anulado_at is null)
    else app.mi_candidatura_id()
  end
$$;

revoke all on function app.candidatura_que_responde(text) from public, anon, authenticated;

/*
 * Unas franjas bien formadas: de dos a tres, cada una con su inicio y su
 * fin, en el futuro, de entre 15 minutos y 4 horas.
 */
create or replace function app.franjas_validas(p_franjas jsonb)
returns boolean
language sql
stable
as $$
  select jsonb_typeof(p_franjas) = 'array'
    and jsonb_array_length(p_franjas) between 2 and 3
    and not exists (
      select 1 from jsonb_array_elements(p_franjas) f
      where (f ->> 'inicio') is null or (f ->> 'fin') is null
         or (f ->> 'inicio')::timestamptz <= now()
         or (f ->> 'fin')::timestamptz - (f ->> 'inicio')::timestamptz not between interval '15 minutes' and interval '4 hours'
    )
$$;

-- -----------------------------------------------------------------------------
-- Lo que ve ella: su reunión en juego, o la última
-- -----------------------------------------------------------------------------

create or replace function public.reunion_vigente(p_token text default null)
returns table (
  id uuid,
  estado text,
  propuesta_de text,
  franjas jsonb,
  formato text,
  enlace text,
  direccion text,
  nota text,
  nota_candidata text,
  elegida jsonb,
  personas_iwl text[],
  cancelada_motivo text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.estado, r.propuesta_de, r.franjas, r.formato, r.enlace, r.direccion, r.nota,
         r.nota_candidata, r.elegida,
         array(
           select coalesce(nullif(trim(concat_ws(' ', p.full_name, p.last_name)), ''), p.email)
           from profiles p where p.id = any (r.personas_iwl) order by p.full_name
         ),
         r.cancelada_motivo
  from candidatura_reuniones r
  where r.candidatura_id = app.candidatura_que_responde(p_token)
    and r.propuesta_at is not null
    and r.estado <> 'celebrada'
  order by r.created_at desc
  limit 1
$$;

revoke all on function public.reunion_vigente(text) from public;
grant execute on function public.reunion_vigente(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Lo que hace ella: elegir una franja, o proponer otras
-- -----------------------------------------------------------------------------

create or replace function public.reunion_elegir(p_reunion uuid, p_inicio timestamptz, p_token text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r candidatura_reuniones%rowtype;
  v_franja jsonb;
begin
  select * into r from candidatura_reuniones
  where id = p_reunion and candidatura_id = app.candidatura_que_responde(p_token)
  for update;
  if not found then
    raise exception 'Esa reunión no es tuya, o tu enlace ya no vale.' using errcode = '42501';
  end if;
  if r.estado <> 'propuesta' or r.propuesta_de <> 'iwl' then
    raise exception 'Esta reunión ya no espera tu respuesta. Vuelve a cargar la página.' using errcode = 'P0001';
  end if;

  select f into v_franja from jsonb_array_elements(r.franjas) f
  where (f ->> 'inicio')::timestamptz = p_inicio;
  if v_franja is null then
    raise exception 'Esa no es una de las fechas propuestas.' using errcode = 'P0001';
  end if;
  if p_inicio <= now() then
    raise exception 'Esa fecha ya ha pasado. Elige otra, o propón las tuyas.' using errcode = 'P0001';
  end if;

  update candidatura_reuniones
  set estado = 'confirmada', elegida = v_franja, confirmada_at = now()
  where id = r.id;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle)
  values (r.candidatura_id, 'reunion', 'Reunión confirmada: la ha elegido ella',
          to_char(p_inicio at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' (Madrid)');

  insert into avisos (tipo, candidatura_id, profile_id)
  select 'reunion_elegida', r.candidatura_id, c.profile_id from candidaturas c where c.id = r.candidatura_id;
end;
$$;

create or replace function public.reunion_contraproponer(p_reunion uuid, p_franjas jsonb, p_nota text default null, p_token text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r candidatura_reuniones%rowtype;
begin
  select * into r from candidatura_reuniones
  where id = p_reunion and candidatura_id = app.candidatura_que_responde(p_token)
  for update;
  if not found then
    raise exception 'Esa reunión no es tuya, o tu enlace ya no vale.' using errcode = '42501';
  end if;
  if r.estado <> 'propuesta' or r.propuesta_de <> 'iwl' then
    raise exception 'Esta reunión ya no espera tu respuesta. Vuelve a cargar la página.' using errcode = 'P0001';
  end if;
  if not app.franjas_validas(p_franjas) then
    raise exception 'Propón dos o tres fechas, todas por venir, de entre 15 minutos y 4 horas.' using errcode = 'P0001';
  end if;

  update candidatura_reuniones
  set estado = 'contrapropuesta', propuesta_de = 'candidata', franjas = p_franjas,
      nota_candidata = nullif(trim(coalesce(p_nota, '')), ''), caducada_avisada_at = null
  where id = r.id;

  insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle)
  values (r.candidatura_id, 'reunion', 'Ella propone otras fechas para la reunión',
          jsonb_array_length(p_franjas) || ' franjas' || coalesce('. ' || nullif(trim(coalesce(p_nota, '')), ''), ''));

  insert into avisos (tipo, candidatura_id, profile_id)
  select 'reunion_contrapropuesta', r.candidatura_id, c.profile_id from candidaturas c where c.id = r.candidatura_id;
end;
$$;

revoke all on function public.reunion_elegir(uuid, timestamptz, text) from public;
revoke all on function public.reunion_contraproponer(uuid, jsonb, text, text) from public;
grant execute on function public.reunion_elegir(uuid, timestamptz, text) to anon, authenticated;
grant execute on function public.reunion_contraproponer(uuid, jsonb, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Las caducadas: un aviso a IWL, una vez. Lo llama el cron diario
-- -----------------------------------------------------------------------------

create or replace function public.avisar_reuniones_caducadas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  with caducadas as (
    update candidatura_reuniones r
    set caducada_avisada_at = now()
    where r.estado in ('propuesta', 'contrapropuesta')
      and r.caducada_avisada_at is null
      and not exists (
        select 1 from jsonb_array_elements(r.franjas) f where (f ->> 'inicio')::timestamptz > now()
      )
    returning r.candidatura_id
  )
  insert into avisos (tipo, candidatura_id, profile_id)
  select 'reunion_caducada', c.candidatura_id, k.profile_id
  from caducadas c join candidaturas k on k.id = c.candidatura_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.avisar_reuniones_caducadas() from public, anon, authenticated;
grant execute on function public.avisar_reuniones_caducadas() to service_role;

-- -----------------------------------------------------------------------------
-- «Reunión propuesta», en lo que ve ella: mientras haya una en juego
-- Redefinición de `20261109160000_reuniones.sql`
-- -----------------------------------------------------------------------------

create or replace function app.momento_de(p_candidatura uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.estado = 'reunion' and exists (
      select 1 from candidatura_reuniones r
      where r.candidatura_id = c.id and r.propuesta_at is not null
        and r.estado in ('propuesta', 'contrapropuesta', 'confirmada')
    ) then 'reunion_propuesta'
    else app.momento_candidata(c.estado)
  end
  from candidaturas c where c.id = p_candidatura
$$;
