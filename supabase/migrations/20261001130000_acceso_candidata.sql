-- =============================================================================
-- Qué ve la candidata
--
-- Hasta ahora el embudo daba control a IWL y dejaba al candidato a oscuras:
-- rellenaba el formulario, leía «recibida» y no volvía a saber nada hasta
-- que alguien le escribía.
--
-- Dos accesos, y cada uno llega cuando hace falta:
--
--   1. **Un enlace privado, desde que se presenta.** Una dirección larga e
--      imposible de adivinar. Sin cuenta ni contraseña: pedirle que se
--      registre para ver si le han leído el pitch es pedirle demasiado. Ahí
--      ve en qué punto está y puede añadir lo que se le olvidó mandar.
--
--   2. **Una cuenta, al firmar el NDA.** Es cuando empieza a entregar
--      material sensible, y es cuando deja de valer un enlace: una dirección
--      se reenvía y no se puede retirar. Al dar la cuenta, el enlace se
--      anula.
--
-- Lo que la candidata NO ve, nunca: el informe del comité, las notas
-- internas, el equity que se le va a pedir, ni el motivo del descarte. El
-- motivo está escrito para decidir, no para comunicar; decírselo es una
-- conversación, no un campo de una pantalla.
-- =============================================================================

alter table candidaturas
  add column if not exists token text unique,
  add column if not exists profile_id uuid unique references profiles(id) on delete set null,
  add column if not exists token_anulado_at timestamptz;

comment on column candidaturas.token is
  'La llave del enlace privado. Se anula al dar cuenta: a partir de ahí el '
  'acceso es con sesión, que sí se puede retirar.';

/*
 * La llave.
 *
 * 24 bytes de aleatorio del generador criptográfico, en base64 apto para
 * una dirección. Son 192 bits: no se adivina ni probando.
 */
create or replace function app.generar_token_candidatura()
returns text
language sql
volatile
-- `gen_random_bytes` es de pgcrypto, y en Supabase pgcrypto vive en
-- `extensions`, no en `public`. Sin esto, la función existe pero falla al
-- llamarla desde el disparador, y el error que ve quien se presenta es un
-- «la función no existe» que no señala a ninguna parte.
set search_path = extensions, public
as $$
  select translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_')
$$;

-- Las que ya existen también necesitan la suya
update candidaturas
set token = app.generar_token_candidatura()
where token is null and estado <> 'descartada';

create or replace function app.poner_token_candidatura()
returns trigger
language plpgsql
as $$
begin
  if new.token is null then
    new.token := app.generar_token_candidatura();
  end if;
  return new;
end;
$$;

create trigger candidatura_token
  before insert on candidaturas
  for each row execute function app.poner_token_candidatura();

-- =============================================================================
-- Lo que se le enseña, por el enlace
-- =============================================================================

/*
 * Los pasos, dichos para quien se presentó.
 *
 * No son los mismos nombres que usa IWL. «Comité» o «due diligence» son
 * jerga de dentro; y sobre todo, el detalle de en qué punto exacto del
 * proceso interno está una candidatura no le aporta nada y sí invita a
 * interpretar silencios. Se agrupa en cuatro momentos honestos.
 */
create or replace function app.momento_candidata(e estado_candidatura)
returns text
language sql
immutable
as $$
  select case e
    when 'presentada'      then 'recibida'
    when 'en_revision'     then 'en_estudio'
    when 'reunion'         then 'en_estudio'
    when 'comite'          then 'en_estudio'
    when 'preseleccionada' then 'avanzando'
    when 'nda'             then 'avanzando'
    when 'diligencia'      then 'avanzando'
    when 'acuerdo'         then 'avanzando'
    when 'firmada'         then 'dentro'
    when 'descartada'      then 'cerrada'
  end
$$;

create or replace function app.ver_candidatura(p_token text)
returns table (
  id uuid,
  nombre text,
  momento text,
  presentada_on date,
  convocatoria text,
  puede_subir boolean,
  enlaces jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.nombre,
    app.momento_candidata(c.estado),
    c.created_at::date,
    co.name,
    -- Deja de admitir material cuando el proceso se cierra, en un sentido
    -- o en otro
    c.estado not in ('firmada', 'descartada'),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('titulo', e.titulo, 'url', e.url)
          order by e.created_at
        )
        from candidatura_enlaces e
        where e.candidatura_id = c.id
      ),
      '[]'::jsonb
    )
  from candidaturas c
  join cohorts co on co.id = c.cohort_id
  where c.token = p_token
    and c.token_anulado_at is null
$$;

revoke all on function app.ver_candidatura from public;
grant execute on function app.ver_candidatura to anon, authenticated;

create or replace function app.anadir_enlace_con_token(
  p_token text,
  p_titulo text,
  p_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cuantos int;
begin
  select c.id into v_id
  from candidaturas c
  where c.token = p_token
    and c.token_anulado_at is null
    and c.estado not in ('firmada', 'descartada');

  if v_id is null then
    raise exception 'Ese enlace ya no está activo.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_url), '') !~ '^https?://' then
    raise exception 'Eso no parece una dirección web.' using errcode = 'P0001';
  end if;

  -- Un tope, para que el enlace no se convierta en un sitio donde volcar
  select count(*) into v_cuantos
  from candidatura_enlaces where candidatura_id = v_id;

  if v_cuantos >= 20 then
    raise exception 'Ya has añadido muchos documentos. Escríbenos y lo vemos.'
      using errcode = 'P0001';
  end if;

  insert into candidatura_enlaces (candidatura_id, titulo, url)
  values (
    v_id,
    coalesce(nullif(trim(p_titulo), ''), 'Documento'),
    trim(p_url)
  );
end;
$$;

revoke all on function app.anadir_enlace_con_token from public;
grant execute on function app.anadir_enlace_con_token to anon, authenticated;

-- =============================================================================
-- La cuenta, al firmar el NDA
-- =============================================================================

/*
 * Qué ve una candidata con sesión.
 *
 * Lo mismo que por el enlace, pero resuelto por quién ha entrado. Una
 * candidata solo se ve a sí misma, y eso lo decide la base: no hay
 * parámetro que manipular.
 */
create or replace function app.mi_candidatura()
returns table (
  id uuid,
  nombre text,
  momento text,
  presentada_on date,
  convocatoria text,
  puede_subir boolean,
  enlaces jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.nombre,
    app.momento_candidata(c.estado),
    c.created_at::date,
    co.name,
    c.estado not in ('firmada', 'descartada'),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('titulo', e.titulo, 'url', e.url)
          order by e.created_at
        )
        from candidatura_enlaces e
        where e.candidatura_id = c.id
      ),
      '[]'::jsonb
    )
  from candidaturas c
  join cohorts co on co.id = c.cohort_id
  where c.profile_id = auth.uid()
$$;

revoke all on function app.mi_candidatura from public;
grant execute on function app.mi_candidatura to authenticated;

/*
 * Enlazar una cuenta con su candidatura, y retirar el enlace privado.
 *
 * Las dos cosas van juntas a propósito. Mientras la candidata entregaba
 * cosas públicas, un enlace bastaba; cuando empieza a entregar material del
 * due diligence, hace falta un acceso que se pueda retirar. Dejar los dos
 * abiertos sería tener la puerta buena y la mala al mismo tiempo.
 */
create or replace function app.dar_acceso_candidatura(
  p_candidatura uuid,
  p_profile uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.is_iwl() then
    raise exception 'Dar acceso a una candidata es del equipo de IWL.'
      using errcode = '42501';
  end if;

  update candidaturas
  set profile_id = p_profile,
      token_anulado_at = now()
  where id = p_candidatura;

  update profiles set role = 'candidata' where id = p_profile;
end;
$$;

-- =============================================================================
-- La sala de datos de una candidata
--
-- Separada de la de las compañías: una candidatura no es una compañía, y el
-- día que se descarta su material tiene que poder borrarse entero sin tocar
-- nada del data room de la cartera.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('candidaturas', 'candidaturas', false, 52428800)
on conflict (id) do nothing;

/** La candidatura a la que pertenece quien ha entrado, si es candidata */
create or replace function app.mi_candidatura_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from candidaturas where profile_id = auth.uid()
$$;

-- La primera carpeta de la ruta es el id de la candidatura
create policy candidaturas_doc_select on storage.objects
  for select to authenticated using (
    bucket_id = 'candidaturas'
    and (
      app.is_iwl()
      or (storage.foldername(name))[1]::uuid = app.mi_candidatura_id()
    )
  );

create policy candidaturas_doc_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'candidaturas'
    and (
      app.is_iwl()
      or (storage.foldername(name))[1]::uuid = app.mi_candidatura_id()
    )
  );

-- Borrar solo IWL: lo que una candidata entrega queda entregado
create policy candidaturas_doc_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'candidaturas' and app.is_iwl()
  );

-- =============================================================================
-- Las puertas públicas
-- =============================================================================

create or replace function public.ver_candidatura(p_token text)
returns table (
  id uuid, nombre text, momento text, presentada_on date,
  convocatoria text, puede_subir boolean, enlaces jsonb
)
language sql stable security definer set search_path = public
as $$ select * from app.ver_candidatura(p_token) $$;

revoke all on function public.ver_candidatura from public;
grant execute on function public.ver_candidatura to anon, authenticated;

create or replace function public.anadir_enlace_con_token(
  p_token text, p_titulo text, p_url text
)
returns void language sql security definer set search_path = public
as $$ select app.anadir_enlace_con_token(p_token, p_titulo, p_url) $$;

revoke all on function public.anadir_enlace_con_token from public;
grant execute on function public.anadir_enlace_con_token to anon, authenticated;

create or replace function public.mi_candidatura()
returns table (
  id uuid, nombre text, momento text, presentada_on date,
  convocatoria text, puede_subir boolean, enlaces jsonb
)
language sql stable security invoker set search_path = public
as $$ select * from app.mi_candidatura() $$;

create or replace function public.dar_acceso_candidatura(
  p_candidatura uuid, p_profile uuid
)
returns void language sql security invoker set search_path = public
as $$ select app.dar_acceso_candidatura(p_candidatura, p_profile) $$;

create or replace function public.mi_candidatura_id()
returns uuid language sql stable security invoker set search_path = public
as $$ select app.mi_candidatura_id() $$;

-- -----------------------------------------------------------------------------
-- La vista del embudo, otra vez
--
-- `embudo_candidaturas` se creó con `c.*`, y una vista congela su lista de
-- columnas en el momento de crearse: las que añade esta migración no
-- aparecerían. Hay que recrearla.
--
-- Es la segunda vez que pasa en este proyecto. La primera —`admin_companias`—
-- además se recreó desde una definición vieja y se perdieron columnas. Aquí
-- se recrea desde la última, que es esta misma.
-- -----------------------------------------------------------------------------

drop view if exists embudo_candidaturas;

create view embudo_candidaturas as
select
  c.*,
  co.name as cohorte,
  comp.slug as company_slug,
  (
    select count(*) from candidatura_enlaces e where e.candidatura_id = c.id
  ) as enlaces,
  (
    select max(ev.ocurrido_on)
    from candidatura_eventos ev
    where ev.candidatura_id = c.id
  ) as ultimo_movimiento
from candidaturas c
join cohorts co on co.id = c.cohort_id
left join companies comp on comp.id = c.company_id;

alter view embudo_candidaturas set (security_invoker = true);
grant select on embudo_candidaturas to authenticated;
