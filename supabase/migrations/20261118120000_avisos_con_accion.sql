-- =============================================================================
-- Avisos: cada uno pide una acción, y se cierra cuando deja de tocar
--
-- (REVISION, 18 nov) El inventario y las reglas están en `docs/AVISOS.md`.
-- Aquí, lo que es de la base:
--
--   · «Primer acceso» y «ha elegido fecha» dejan de ser avisos: no piden
--     nada. Quedan en el recorrido de la candidata y en «Qué ha pasado».
--   · «Anota la reunión», nuevo: al día siguiente de una reunión confirmada,
--     a quien la propuso y a quien fue de IWL. Lo crea el cron.
--   · Cierres solos: al descartar la candidatura, al archivar la compañía,
--     al anotar o cancelar la reunión, al responder a una contrapropuesta,
--     y al caducar sus fechas.
--   · Los abiertos que ya no tocan se cierran aquí, con constancia en el
--     registro.
-- =============================================================================

alter table avisos
  add column if not exists reunion_id uuid references candidatura_reuniones (id) on delete cascade;

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha',
                  'anexo_comentario', 'cambio_via',
                  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada', 'reunion_anotar',
                  'hito_entregado', 'hito_sin_revisar'));

comment on column avisos.reunion_id is
  'La reunión de la que habla el aviso, para cerrarlo al anotarla o cancelarla.';

-- -----------------------------------------------------------------------------
-- El primer acceso: se apunta, sin aviso
-- Redefinición de `20261109100000_onboarding.sql`
-- -----------------------------------------------------------------------------

create or replace function app.registrar_primer_acceso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Se ve en «Altas en curso» y en su recorrido: no pide nada a nadie
  if old.last_sign_in_at is null and new.last_sign_in_at is not null then
    update public.profiles
      set primer_acceso_at = new.last_sign_in_at
      where id = new.id and primer_acceso_at is null;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Elegir fecha: queda confirmada y en «Qué ha pasado», sin aviso
-- Redefinición de `20261111130000_reunion_acordada.sql`
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
end;
$$;

-- -----------------------------------------------------------------------------
-- Otras fechas: el aviso lleva su reunión
-- Redefinición de `20261111130000_reunion_acordada.sql`
-- -----------------------------------------------------------------------------

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

  insert into avisos (tipo, candidatura_id, reunion_id, profile_id)
  select 'reunion_contrapropuesta', r.candidatura_id, r.id, c.profile_id from candidaturas c where c.id = r.candidatura_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Las caducadas: el aviso de sus otras fechas se cierra, porque ya no se
-- pueden aceptar, y sale el de «sin fecha»
-- Redefinición de `20261111130000_reunion_acordada.sql`
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
      and not exists (select 1 from candidaturas k where k.id = r.candidatura_id and k.estado = 'descartada')
    returning r.id, r.candidatura_id
  ),
  cerradas as (
    update avisos a set cerrado_at = now()
    from caducadas c
    where a.candidatura_id = c.candidatura_id
      and a.tipo = 'reunion_contrapropuesta'
      and a.cerrado_at is null
    returning a.id
  )
  insert into avisos (tipo, candidatura_id, reunion_id, profile_id)
  select 'reunion_caducada', c.candidatura_id, c.id, k.profile_id
  from caducadas c join candidaturas k on k.id = c.candidatura_id;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- «Anota la reunión»: al día siguiente de una confirmada sin anotar
-- -----------------------------------------------------------------------------

create or replace function public.avisar_reuniones_por_anotar()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  with pendientes as (
    select r.id, r.candidatura_id, k.profile_id,
           -- Quien la propuso y quien fue de IWL; si no consta nadie, dirección
           coalesce(
             nullif(array_remove(array(select distinct x from unnest(array[r.propuesta_por] || r.personas_iwl) x), null), '{}'),
             array[null::uuid]
           ) as para
    from candidatura_reuniones r
    join candidaturas k on k.id = r.candidatura_id
    where r.estado = 'confirmada'
      and r.elegida is not null
      and ((r.elegida ->> 'inicio')::timestamptz at time zone 'Europe/Madrid')::date
          < (now() at time zone 'Europe/Madrid')::date
      and k.estado <> 'descartada'
      and not exists (select 1 from avisos a where a.reunion_id = r.id and a.tipo = 'reunion_anotar')
  )
  insert into avisos (tipo, candidatura_id, reunion_id, profile_id, para)
  select 'reunion_anotar', p.candidatura_id, p.id, p.profile_id, destino
  from pendientes p cross join lateral unnest(p.para) destino;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.avisar_reuniones_por_anotar() from public, anon, authenticated;
grant execute on function public.avisar_reuniones_por_anotar() to service_role;

-- -----------------------------------------------------------------------------
-- Cierres solos
-- -----------------------------------------------------------------------------

-- Una reunión que cambia de estado cierra lo que esperaba de la anterior
create or replace function app.cerrar_avisos_de_reunion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- IWL respondió: aceptó una fecha, propuso otras o canceló
  if new.estado in ('propuesta', 'confirmada', 'cancelada', 'celebrada')
     and (tg_op = 'INSERT' or new.estado is distinct from old.estado) then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where candidatura_id = new.candidatura_id
      and tipo in ('reunion_contrapropuesta', 'reunion_caducada')
      and cerrado_at is null;
  end if;
  -- Anotada o cancelada: ya no hay nada que anotar
  if new.estado in ('celebrada', 'cancelada') and tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where reunion_id = new.id and tipo = 'reunion_anotar' and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists candidatura_reuniones_cerrar_avisos on candidatura_reuniones;
create trigger candidatura_reuniones_cerrar_avisos
  after insert or update of estado on candidatura_reuniones
  for each row execute function app.cerrar_avisos_de_reunion();

-- Descartada: nada de lo suyo pide ya nada
create or replace function app.cerrar_avisos_de_descartada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = 'descartada' and old.estado is distinct from 'descartada' then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where candidatura_id = new.id and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists candidaturas_cerrar_avisos on candidaturas;
create trigger candidaturas_cerrar_avisos
  after update of estado on candidaturas
  for each row execute function app.cerrar_avisos_de_descartada();

-- Archivada: igual
create or replace function app.cerrar_avisos_de_archivada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    update avisos set cerrado_at = now(), cerrado_por = auth.uid()
    where company_id = new.id and cerrado_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists companies_cerrar_avisos on companies;
create trigger companies_cerrar_avisos
  after update of archived_at on companies
  for each row execute function app.cerrar_avisos_de_archivada();

-- -----------------------------------------------------------------------------
-- Los abiertos que ya no tocan, cerrados con constancia
-- -----------------------------------------------------------------------------

with cerrados as (
  update avisos a set cerrado_at = now()
  where a.cerrado_at is null
    and (
      -- Ya no son avisos
      a.tipo in ('primer_acceso', 'reunion_elegida')
      -- De una candidatura descartada o una compañía archivada
      or exists (select 1 from candidaturas k where k.id = a.candidatura_id and k.estado = 'descartada')
      or exists (select 1 from companies c where c.id = a.company_id and c.archived_at is not null)
      -- Reuniones a las que IWL ya respondió: no queda ninguna esperando a IWL
      or (a.tipo in ('reunion_contrapropuesta', 'reunion_caducada')
          and not exists (
            select 1 from candidatura_reuniones r
            where r.candidatura_id = a.candidatura_id and r.estado in ('propuesta', 'contrapropuesta')
          ))
    )
  returning a.tipo
)
insert into activity_log (entity, action, detail)
select 'avisos', 'avisos_cerrados_por_revision',
       jsonb_build_object(
         'motivo', 'REVISION 18 nov: un aviso es una acción pendiente; los que no piden nada o ya no tocan se cierran',
         'por_tipo', jsonb_object_agg(tipo, n),
         'total', sum(n))
from (select tipo, count(*) as n from cerrados group by tipo) t
having count(*) > 0;
