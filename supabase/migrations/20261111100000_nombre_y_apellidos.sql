/*
 * Nombre y apellidos de quien firma.
 *
 * En una prueba, la Contraparte del NDA salió solo como «Alba»:
 * `{{contraparte_nombre}}` tomaba el nombre de contacto, que era un solo
 * campo y casi siempre llevaba solo el nombre. Un documento legal necesita
 * el nombre completo, como en el documento de identidad (REVISION, 10 nov).
 *
 *   · candidaturas.contacto_apellidos, obligatorio al presentarse y en el
 *     alta. Las que ya existen se quedan con lo que tienen y apellidos vacíos.
 *   · Al firmar, ella confirma o corrige su nombre completo. Eso entra en
 *     el texto y en la firma. Si lo corrige, la candidatura se actualiza y
 *     queda en el historial.
 *   · profiles.last_name: para firmar por IWL hacen falta los apellidos.
 */

alter table candidaturas add column if not exists contacto_apellidos text;
alter table profiles add column if not exists last_name text;

comment on column candidaturas.contacto_apellidos is
  'Apellidos de la persona de contacto. Con contacto_nombre, el nombre completo que entra en el NDA.';
comment on column profiles.last_name is
  'Apellidos. full_name es el nombre; los dos juntos firman documentos por IWL.';

/** Nombre y apellidos juntos, sin espacios de más */
create or replace function app.nombre_completo(p_nombre text, p_apellidos text)
returns text
language sql
immutable
as $$ select nullif(trim(concat_ws(' ', nullif(trim(p_nombre), ''), nullif(trim(p_apellidos), ''))), '') $$;

-- -----------------------------------------------------------------------------
-- Presentarse: con apellidos
-- Redefinición de `20261001100000_candidaturas.sql`. Cambia la firma, así que
-- se borra la anterior: con las dos, una llamada sin apellidos sería ambigua.
-- -----------------------------------------------------------------------------

drop function if exists public.presentar_candidatura(text, text, text, text, text, text, text, text, text, estado_entrada, int, numeric, text, jsonb);
drop function if exists app.presentar_candidatura(text, text, text, text, text, text, text, text, text, estado_entrada, int, numeric, text, jsonb);

create or replace function app.presentar_candidatura(
  p_nombre text,
  p_contacto_nombre text,
  p_contacto_apellidos text,
  p_contacto_email text,
  p_sector text default null,
  p_one_liner text default null,
  p_website text default null,
  p_pais text default null,
  p_contacto_telefono text default null,
  p_contacto_cargo text default null,
  p_estado_declarado estado_entrada default null,
  p_equipo_personas int default null,
  p_liderazgo_femenino_pct numeric default null,
  p_origen text default null,
  p_enlaces jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohorte uuid;
  v_id uuid;
  v_enlace jsonb;
begin
  -- Solo se admite si hay convocatoria abierta. La elige la base, no quien
  -- rellena: si no, se podría presentar a una cohorte cerrada.
  select id into v_cohorte
  from cohorts
  where convocatoria_abierta
    and (convocatoria_cierra is null or convocatoria_cierra >= current_date)
  order by start_date desc
  limit 1;

  if v_cohorte is null then
    raise exception 'No hay ninguna convocatoria abierta ahora mismo.'
      using errcode = 'P0001';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Hace falta el nombre de la startup.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_contacto_nombre), '') = '' or coalesce(trim(p_contacto_apellidos), '') = '' then
    raise exception 'Hacen falta tu nombre y tus apellidos.' using errcode = 'P0001';
  end if;

  if coalesce(trim(p_contacto_email), '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no parece un correo.' using errcode = 'P0001';
  end if;

  insert into candidaturas (
    cohort_id, nombre, sector, one_liner, website, pais,
    contacto_nombre, contacto_apellidos, contacto_email, contacto_telefono, contacto_cargo,
    estado_declarado, equipo_personas, liderazgo_femenino_pct, origen
  ) values (
    v_cohorte,
    trim(p_nombre),
    nullif(trim(coalesce(p_sector, '')), ''),
    nullif(trim(coalesce(p_one_liner, '')), ''),
    nullif(trim(coalesce(p_website, '')), ''),
    nullif(trim(coalesce(p_pais, '')), ''),
    trim(p_contacto_nombre),
    trim(p_contacto_apellidos),
    lower(trim(p_contacto_email)),
    nullif(trim(coalesce(p_contacto_telefono, '')), ''),
    nullif(trim(coalesce(p_contacto_cargo, '')), ''),
    p_estado_declarado,
    p_equipo_personas,
    p_liderazgo_femenino_pct,
    nullif(trim(coalesce(p_origen, '')), '')
  )
  returning id into v_id;

  -- Los enlaces que haya dejado, hasta diez: más que eso no es una
  -- candidatura, es un volcado
  for v_enlace in
    select * from jsonb_array_elements(coalesce(p_enlaces, '[]'::jsonb)) limit 10
  loop
    if coalesce(trim(v_enlace ->> 'url'), '') <> '' then
      insert into candidatura_enlaces (candidatura_id, titulo, url, tipo)
      values (
        v_id,
        coalesce(nullif(trim(v_enlace ->> 'titulo'), ''), 'Documento'),
        trim(v_enlace ->> 'url'),
        nullif(trim(v_enlace ->> 'tipo'), '')
      );
    end if;
  end loop;

  return v_id;
end;
$$;

create or replace function public.presentar_candidatura(
  p_nombre text,
  p_contacto_nombre text,
  p_contacto_apellidos text,
  p_contacto_email text,
  p_sector text default null,
  p_one_liner text default null,
  p_website text default null,
  p_pais text default null,
  p_contacto_telefono text default null,
  p_contacto_cargo text default null,
  p_estado_declarado estado_entrada default null,
  p_equipo_personas int default null,
  p_liderazgo_femenino_pct numeric default null,
  p_origen text default null,
  p_enlaces jsonb default '[]'::jsonb
)
returns uuid language sql security definer set search_path = public
as $$
  select app.presentar_candidatura(
    p_nombre, p_contacto_nombre, p_contacto_apellidos, p_contacto_email, p_sector, p_one_liner,
    p_website, p_pais, p_contacto_telefono, p_contacto_cargo,
    p_estado_declarado, p_equipo_personas, p_liderazgo_femenino_pct,
    p_origen, p_enlaces
  )
$$;

revoke all on function app.presentar_candidatura from public, anon, authenticated;
revoke all on function public.presentar_candidatura from public;
grant execute on function public.presentar_candidatura to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Lo que completa el texto: el nombre completo
-- Redefinición de `20261110170000_nda_personalizado.sql`
-- -----------------------------------------------------------------------------

create or replace function public.datos_nda(p_candidatura uuid)
returns table (startup text, contraparte_nombre text, situacion_societaria situacion_societaria, lugar text)
language sql
stable
security definer
set search_path = public
as $$
  select c.nombre, coalesce(app.nombre_completo(c.contacto_nombre, c.contacto_apellidos), ''), c.situacion_societaria,
         coalesce((select value #>> '{}' from platform_settings where key = 'nda_lugar'), 'Málaga')
  from candidaturas c
  where c.id = p_candidatura
    and (app.is_iwl() or c.id = app.mi_candidatura_id())
$$;

-- -----------------------------------------------------------------------------
-- La firma de ella: nombre y apellidos, y si los corrige, la candidatura
-- Redefinición de `20261110170000_nda_personalizado.sql`
-- -----------------------------------------------------------------------------

create or replace function app.firmar_nda(
  p_candidatura uuid,
  p_profile uuid,
  p_nombre text,
  p_plantilla uuid,
  p_texto text,
  p_datos jsonb,
  p_ip text,
  p_ua text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  v_correo text;
  v_problema text;
  v_hueco text;
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_antes text;
  v_pila text;
  v_apellidos text;
begin
  select * into c from candidaturas where id = p_candidatura for update;
  if not found or c.profile_id is distinct from p_profile then
    raise exception 'Ese NDA no es tuyo.' using errcode = '42501';
  end if;
  if exists (select 1 from nda_firmas where candidatura_id = p_candidatura) then
    raise exception 'Este NDA ya está firmado.' using errcode = 'P0001';
  end if;
  -- Un documento legal lleva el nombre completo: al menos nombre y un apellido
  if v_nombre !~ '\S+\s+\S+' then
    raise exception 'Escribe tu nombre y tus apellidos, como en tu documento de identidad.' using errcode = 'P0001';
  end if;
  if p_plantilla is distinct from app.plantilla_nda_de(p_candidatura) then
    raise exception 'El NDA ha cambiado mientras lo leías. Vuelve a cargar la página y lee la versión nueva.'
      using errcode = 'P0001';
  end if;

  v_problema := app.nda_no_enviable(p_candidatura);
  if v_problema is not null then
    raise exception 'El NDA todavía no está preparado.' using errcode = 'P0001';
  end if;

  v_hueco := app.huecos_nda(p_texto);
  if length(trim(coalesce(p_texto, ''))) = 0 then
    raise exception 'Falta el texto del NDA.' using errcode = 'P0001';
  end if;
  if v_hueco is not null then
    raise exception 'Al NDA le falta un dato: %. Rellénalo antes de firmar.', v_hueco using errcode = 'P0001';
  end if;

  select email into v_correo from profiles where id = p_profile;

  insert into nda_firmas (
    candidatura_id, plantilla_id, texto_version, texto_hash, texto_firmado, datos,
    firmante_id, firmante_nombre, firmante_correo, firmado_at, firmado_ip, firmado_ua
  )
  select p_candidatura, p_plantilla, version::text,
         encode(sha256(convert_to(p_texto, 'UTF8')), 'hex'), p_texto, p_datos,
         p_profile, v_nombre, v_correo, now(), p_ip, p_ua
  from nda_plantillas where id = p_plantilla;

  /*
   * Si lo ha corregido, la candidatura se queda con lo firmado. Lo que
   * empezaba igual que el nombre de antes conserva esa partición —un
   * nombre compuesto sigue siendo nombre—; si no, la primera palabra es el
   * nombre y el resto, los apellidos.
   */
  v_antes := app.nombre_completo(c.contacto_nombre, c.contacto_apellidos);
  if v_antes is distinct from v_nombre then
    if coalesce(trim(c.contacto_nombre), '') <> ''
       and lower(left(v_nombre, length(trim(c.contacto_nombre)) + 1)) = lower(trim(c.contacto_nombre) || ' ') then
      v_pila := trim(c.contacto_nombre);
      v_apellidos := trim(substr(v_nombre, length(trim(c.contacto_nombre)) + 2));
    else
      v_pila := split_part(v_nombre, ' ', 1);
      v_apellidos := trim(substr(v_nombre, length(v_pila) + 2));
    end if;
    update candidaturas set contacto_nombre = v_pila, contacto_apellidos = v_apellidos
    where id = p_candidatura;
    insert into candidatura_eventos (candidatura_id, tipo, titulo, detalle, created_by)
    values (
      p_candidatura, 'nota', 'Nombre corregido al firmar el NDA',
      format('Constaba «%s». Firmó como «%s», como en su documento.', coalesce(v_antes, '—'), v_nombre),
      p_profile
    );
  end if;

  insert into avisos (tipo, profile_id, candidatura_id)
  values ('nda_firmado', p_profile, p_candidatura);
end;
$$;

-- -----------------------------------------------------------------------------
-- La contrafirma: con apellidos
-- Redefinición de `20261110190000_nda_un_solo_texto.sql`
-- -----------------------------------------------------------------------------

create or replace function app.contrafirmar_nda(p_candidatura uuid, p_profile uuid, p_ip text, p_ua text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_apellidos text;
  v_correo text;
  v_rol text;
begin
  select full_name, last_name, email, role into v_nombre, v_apellidos, v_correo, v_rol from profiles where id = p_profile;
  if v_rol is distinct from 'admin_iwl' then
    raise exception 'El NDA lo contrafirma una persona de dirección.' using errcode = '42501';
  end if;
  if coalesce(trim(v_nombre), '') = '' or coalesce(trim(v_apellidos), '') = '' then
    raise exception 'Para firmar por IWL, tu perfil necesita tu nombre y tus apellidos. Añádelos en Mi cuenta.'
      using errcode = 'P0001';
  end if;

  update nda_firmas
  set contrafirmante_id = p_profile,
      contrafirmante_nombre = app.nombre_completo(v_nombre, v_apellidos),
      contrafirmante_correo = v_correo,
      contrafirmado_at = now(),
      contrafirmado_ip = p_ip,
      contrafirmado_ua = p_ua
  where candidatura_id = p_candidatura and firmado_at is not null and contrafirmado_at is null;

  if not found then
    raise exception 'No hay un NDA firmado por ella pendiente de la firma de IWL.' using errcode = 'P0001';
  end if;

  perform app.nda_completo(p_candidatura, p_profile);
end;
$$;

-- -----------------------------------------------------------------------------
-- La vista del embudo, desde su última definición
-- (`20261109160000_reuniones.sql`), para que lleve los apellidos: se creó
-- con `c.*` y congela su lista al crearse.
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

-- -----------------------------------------------------------------------------
-- El perfil nace con apellidos si la cuenta los trae
-- Redefinición de `20260929120000_el_rol_no_lo_pone_el_cliente.sql`, la
-- última: el rol sigue sin leerse de los metadatos.
-- -----------------------------------------------------------------------------

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, last_name, role)
  values (
    new.id,
    new.email,
    /*
     * El nombre y los apellidos sí salen de los metadatos. Son datos de
     * presentación: quien se inventa los suyos solo consigue salir con un
     * nombre falso en una pantalla a la que todavía no llega.
     */
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    'fundadora'::app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
