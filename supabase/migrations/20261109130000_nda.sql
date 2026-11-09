-- =============================================================================
-- El NDA, firmado dentro de la plataforma por las dos partes
--
-- Hasta ahora «NDA» era un paso que IWL ponía a mano. Ahora es una firma:
-- la candidata lo lee y lo firma al entrar, dirección lo contrafirma, y
-- queda un PDF con las dos firmas y su rastro en su data room.
--
-- Es firma electrónica simple. Luciana valida que sirve para el NDA antes
-- de usarlo con fundadoras reales; la pantalla de la plantilla lo dice.
--
-- Cuatro decisiones de Rodrigo (revisión del 9 nov):
--   · El texto no lo escribe la plataforma. La plantilla empieza vacía, y
--     mientras lo esté nadie firma nada.
--   · La plantilla tiene versiones que no se editan. Cada firma guarda la
--     versión y el hash SHA-256 del texto exacto que vio.
--   · El rastro guarda IP y navegador de cada firmante.
--   · Un NDA firmado fuera —en papel, por otro sistema— se puede subir y
--     cuenta igual.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- La plantilla, por versiones
-- -----------------------------------------------------------------------------

create table if not exists nda_plantillas (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  texto text not null check (length(trim(texto)) > 0),
  hash text not null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null
);

comment on table nda_plantillas is
  'Versiones del texto del NDA. Ninguna se edita ni se borra: una firma apunta a la que vio.';

/*
 * La versión y el hash los pone la base, no quien escribe: el hash es la
 * prueba de qué se firmó, y no puede venir de fuera.
 */
create or replace function app.numerar_plantilla_nda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.version := coalesce((select max(version) from nda_plantillas), 0) + 1;
  new.hash := encode(sha256(convert_to(new.texto, 'UTF8')), 'hex');
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists nda_plantillas_numerar on nda_plantillas;
create trigger nda_plantillas_numerar
  before insert on nda_plantillas
  for each row execute function app.numerar_plantilla_nda();

-- Lo congelado no se edita, lo escriba quien lo escriba
create or replace function app.guard_plantilla_nda()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Una versión del NDA no se edita ni se borra. Guarda una nueva.'
    using errcode = '42501';
end;
$$;

drop trigger if exists nda_plantillas_inmutable on nda_plantillas;
create trigger nda_plantillas_inmutable
  before update or delete on nda_plantillas
  for each row execute function app.guard_plantilla_nda();

alter table nda_plantillas enable row level security;

-- La lee quien la va a firmar y quien la gestiona; no es secreta
drop policy if exists nda_plantillas_leer on nda_plantillas;
create policy nda_plantillas_leer on nda_plantillas
  for select to authenticated using (true);

drop policy if exists nda_plantillas_nueva on nda_plantillas;
create policy nda_plantillas_nueva on nda_plantillas
  for insert with check (app.is_admin());

-- -----------------------------------------------------------------------------
-- El rastro de cada firma
-- -----------------------------------------------------------------------------

alter table nda_firmas
  add column if not exists plantilla_id uuid references nda_plantillas(id) on delete restrict,
  add column if not exists texto_hash text,
  add column if not exists firmante_correo text,
  add column if not exists firmado_ua text,
  add column if not exists contrafirmante_correo text,
  add column if not exists contrafirmado_ip text,
  add column if not exists contrafirmado_ua text,
  -- Firmado fuera de la plataforma: el documento o el enlace son la prueba
  add column if not exists externo boolean not null default false,
  add column if not exists evidencia_url text;

-- -----------------------------------------------------------------------------
-- Firmar, contrafirmar y registrar un NDA de fuera
--
-- Las tres van con la clave de servicio, y solo con ella. La IP y el
-- navegador de quien firma solo los conoce el servidor de la aplicación: si
-- la función se pudiera llamar con la sesión, cada cual podría escribirse
-- la IP que quisiera, y el rastro dejaría de probar nada. La acción de
-- servidor comprueba la sesión antes de llamarlas; las funciones vuelven a
-- comprobar todo lo que pueden comprobar sin ella.
-- -----------------------------------------------------------------------------

create or replace function app.firmar_nda(
  p_candidatura uuid,
  p_profile uuid,
  p_nombre text,
  p_plantilla uuid,
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
  v_hash text;
  v_correo text;
begin
  select * into c from candidaturas where id = p_candidatura for update;
  if not found or c.profile_id is distinct from p_profile then
    raise exception 'Ese NDA no es tuyo.' using errcode = '42501';
  end if;
  if exists (select 1 from nda_firmas where candidatura_id = p_candidatura) then
    raise exception 'Este NDA ya está firmado.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_nombre, ''))) < 3 then
    raise exception 'Escribe tu nombre completo para firmar.' using errcode = 'P0001';
  end if;

  select hash into v_hash from nda_plantillas where id = p_plantilla;
  if v_hash is null then
    raise exception 'El NDA todavía no está preparado.' using errcode = 'P0001';
  end if;

  select email into v_correo from profiles where id = p_profile;

  insert into nda_firmas (
    candidatura_id, plantilla_id, texto_version, texto_hash,
    firmante_id, firmante_nombre, firmante_correo, firmado_at, firmado_ip, firmado_ua
  )
  select p_candidatura, p_plantilla, version::text, v_hash,
         p_profile, trim(p_nombre), v_correo, now(), p_ip, p_ua
  from nda_plantillas where id = p_plantilla;

  insert into avisos (tipo, profile_id, candidatura_id)
  values ('nda_firmado', p_profile, p_candidatura);
end;
$$;

create or replace function app.contrafirmar_nda(
  p_candidatura uuid,
  p_profile uuid,
  p_ip text,
  p_ua text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_correo text;
  v_rol text;
begin
  select full_name, email, role into v_nombre, v_correo, v_rol from profiles where id = p_profile;
  if v_rol is distinct from 'admin_iwl' then
    raise exception 'El NDA lo contrafirma una persona de dirección.' using errcode = '42501';
  end if;

  update nda_firmas
  set contrafirmante_id = p_profile,
      contrafirmante_nombre = coalesce(v_nombre, v_correo),
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

/*
 * Un NDA firmado fuera: en papel o por otro sistema. Cuenta igual, y la
 * prueba es el documento subido o el enlace. Lo registra dirección.
 */
create or replace function app.registrar_nda_externo(
  p_candidatura uuid,
  p_profile uuid,
  p_firmado_on date,
  p_documento uuid,
  p_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_correo text;
  v_rol text;
  c candidaturas%rowtype;
begin
  select full_name, email, role into v_nombre, v_correo, v_rol from profiles where id = p_profile;
  if v_rol is distinct from 'admin_iwl' then
    raise exception 'Un NDA de fuera lo registra una persona de dirección.' using errcode = '42501';
  end if;
  if p_documento is null and coalesce(trim(p_url), '') = '' then
    raise exception 'Hace falta el documento firmado o el enlace donde está.' using errcode = 'P0001';
  end if;

  select * into c from candidaturas where id = p_candidatura for update;
  if not found then
    raise exception 'Esa candidatura no existe.' using errcode = 'P0001';
  end if;
  if exists (select 1 from nda_firmas where candidatura_id = p_candidatura and contrafirmado_at is not null) then
    raise exception 'Este NDA ya está firmado por las dos partes.' using errcode = 'P0001';
  end if;

  delete from nda_firmas where candidatura_id = p_candidatura;

  insert into nda_firmas (
    candidatura_id, externo, documento_id, evidencia_url,
    firmante_nombre, firmante_correo, firmado_at,
    contrafirmante_id, contrafirmante_nombre, contrafirmante_correo, contrafirmado_at
  )
  values (
    p_candidatura, true, p_documento, nullif(trim(p_url), ''),
    c.contacto_nombre, c.contacto_email, p_firmado_on::timestamptz,
    p_profile, coalesce(v_nombre, v_correo), v_correo, now()
  );

  perform app.nda_completo(p_candidatura, p_profile);
end;
$$;

/*
 * Con las dos firmas: se cierra el aviso y la candidatura pasa a «NDA
 * firmado», que es lo que pide el due diligence (`pedir_dd_al_firmar_nda`).
 * Si ya iba por delante —una de antes, que se movió a mano—, no retrocede.
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
end;
$$;

/*
 * Solo con la clave de servicio. Las públicas de envoltorio no existen a
 * propósito: PostgREST no las expone, y nadie con sesión las alcanza.
 */
revoke all on function app.firmar_nda(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function app.contrafirmar_nda(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function app.registrar_nda_externo(uuid, uuid, date, uuid, text) from public, anon, authenticated;
revoke all on function app.nda_completo(uuid, uuid) from public, anon, authenticated;

create or replace function public.firmar_nda(
  p_candidatura uuid, p_profile uuid, p_nombre text, p_plantilla uuid, p_ip text, p_ua text
) returns void language sql security definer set search_path = public
as $$ select app.firmar_nda(p_candidatura, p_profile, p_nombre, p_plantilla, p_ip, p_ua) $$;

create or replace function public.contrafirmar_nda(
  p_candidatura uuid, p_profile uuid, p_ip text, p_ua text
) returns void language sql security definer set search_path = public
as $$ select app.contrafirmar_nda(p_candidatura, p_profile, p_ip, p_ua) $$;

create or replace function public.registrar_nda_externo(
  p_candidatura uuid, p_profile uuid, p_firmado_on date, p_documento uuid, p_url text
) returns void language sql security definer set search_path = public
as $$ select app.registrar_nda_externo(p_candidatura, p_profile, p_firmado_on, p_documento, p_url) $$;

revoke all on function public.firmar_nda(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.contrafirmar_nda(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.registrar_nda_externo(uuid, uuid, date, uuid, text) from public, anon, authenticated;
grant execute on function public.firmar_nda(uuid, uuid, text, uuid, text, text) to service_role;
grant execute on function public.contrafirmar_nda(uuid, uuid, text, text) to service_role;
grant execute on function public.registrar_nda_externo(uuid, uuid, date, uuid, text) to service_role;

-- El PDF se genera después de contrafirmar: se apunta aquí cuál es
create or replace function public.apuntar_documento_nda(p_candidatura uuid, p_documento uuid)
returns void language sql security definer set search_path = public
as $$ update nda_firmas set documento_id = p_documento where candidatura_id = p_candidatura $$;

revoke all on function public.apuntar_documento_nda(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apuntar_documento_nda(uuid, uuid) to service_role;
