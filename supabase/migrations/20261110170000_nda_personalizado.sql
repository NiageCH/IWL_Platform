-- =============================================================================
-- El NDA personalizado: marcadores, datos de la firmante y texto completado
--
-- REVISION, 10 nov: la plantilla cargada en producción tiene huecos que
-- dependen de cada candidata, y hoy se firmaría con los corchetes dentro.
-- No se envía ningún NDA hasta que esto esté.
--
--   · La plantilla lleva marcadores `{{nombre}}` de una lista cerrada, y
--     bloques `{{#si_sociedad}}…{{/si_sociedad}}` y `{{#si_persona}}…`.
--     Uno desconocido no deja guardarla.
--   · Lo firmado es el texto completado con sus datos: el hash se calcula
--     sobre él, y se guardan también los datos que rellenó.
--   · Con un hueco —corchetes o un marcador sin dato— no se envía ni se
--     firma.
--
-- El completado se hace en el servidor (`lib/nda-texto.ts`), que es el
-- mismo código que enseña la vista previa. La firma solo la llama el
-- servidor, con la clave de servicio; la base comprueba que lo que llega
-- no tiene huecos y calcula el hash ella misma.
-- =============================================================================

insert into platform_settings (key, value, description)
values ('nda_lugar', '"Málaga"'::jsonb, 'Lugar de firma del NDA: el marcador {{lugar}} de la plantilla')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Qué vale de una plantilla
-- -----------------------------------------------------------------------------

/*
 * Los marcadores que no conoce la plataforma. La lista es la de
 * `lib/nda-texto.ts`: si se añade uno allí, se añade aquí.
 */
create or replace function app.marcadores_nda_desconocidos(p_texto text)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(distinct m[1] || m[2]), '{}')
  from regexp_matches(coalesce(p_texto, ''), '\{\{\s*([#/]?)\s*([^{}]*?)\s*\}\}', 'g') as m
  where (m[1] = '' and m[2] not in (
          'startup', 'contraparte_nombre', 'fecha_efecto', 'lugar',
          'documento', 'domicilio', 'denominacion', 'nif', 'cargo'))
     or (m[1] in ('#', '/') and m[2] not in ('si_sociedad', 'si_persona'))
$$;

/*
 * Lo que impide enviar una plantilla: marcadores desconocidos, o huecos
 * entre corchetes que no son marcadores y que nadie va a rellenar. Nulo si
 * se puede enviar.
 */
create or replace function app.problema_plantilla_nda(p_texto text)
returns text
language plpgsql
immutable
as $$
declare
  v_desconocidos text[] := app.marcadores_nda_desconocidos(p_texto);
  v_hueco text;
begin
  if cardinality(v_desconocidos) > 0 then
    return 'La plantilla del NDA tiene marcadores que la plataforma no conoce: ' || array_to_string(v_desconocidos, ', ');
  end if;
  v_hueco := substring(regexp_replace(p_texto, '\{\{[^{}]*\}\}', '', 'g') from '\[[^\]\n]{0,80}\]');
  if v_hueco is not null then
    return 'La plantilla del NDA tiene huecos sin rellenar, como ' || v_hueco || '. Cámbialos por un marcador o por el texto.';
  end if;
  return null;
end;
$$;

-- Un marcador desconocido no deja guardar la plantilla
create or replace function app.guard_marcadores_nda()
returns trigger
language plpgsql
as $$
declare
  v text[] := app.marcadores_nda_desconocidos(new.texto);
begin
  if cardinality(v) > 0 then
    raise exception 'La plantilla tiene marcadores que la plataforma no conoce: %. Los que valen están en la pantalla de la plantilla.',
      array_to_string(v, ', ') using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists nda_plantillas_marcadores on nda_plantillas;
create trigger nda_plantillas_marcadores
  before insert on nda_plantillas
  for each row execute function app.guard_marcadores_nda();

-- -----------------------------------------------------------------------------
-- No se envía un NDA que no se pueda firmar
-- -----------------------------------------------------------------------------

/*
 * Por qué no se puede enviar el NDA a esta candidatura, o nulo. Sustituye a
 * `falta_texto_nda`: además de que no haya plantilla, que la que hay tenga
 * huecos. Con el NDA ya firmado, nada que enviar.
 */
create or replace function app.nda_no_enviable(p_candidatura uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plantilla uuid;
begin
  if exists (select 1 from nda_firmas where candidatura_id = p_candidatura) then
    return null;
  end if;
  v_plantilla := app.plantilla_nda_de(p_candidatura);
  if v_plantilla is null then
    return 'Falta cargar la plantilla del NDA. Cárgala en Administración → Programa.';
  end if;
  return app.problema_plantilla_nda((select texto from nda_plantillas where id = v_plantilla));
end;
$$;

revoke all on function app.nda_no_enviable(uuid) from public, anon;

/* Redefinición de `20261110160000_nda_sin_plantilla_no_se_envia.sql` */
create or replace function app.dar_acceso_candidatura(p_candidatura uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado estado_candidatura;
  v_problema text;
begin
  if auth.uid() is not null and not app.is_iwl() then
    raise exception 'Dar acceso a una candidata es del equipo de IWL.'
      using errcode = '42501';
  end if;

  select estado into v_estado from candidaturas where id = p_candidatura;
  if v_estado in ('preseleccionada', 'nda') then
    v_problema := app.nda_no_enviable(p_candidatura);
    if v_problema is not null then
      raise exception '%', v_problema using errcode = 'P0001';
    end if;
  end if;

  update candidaturas
  set profile_id = p_profile,
      token_anulado_at = now()
  where id = p_candidatura;

  update profiles set role = 'candidata' where id = p_profile;
end;
$$;

create or replace function app.guard_nda_sin_plantilla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_problema text;
begin
  if new.estado = 'nda' and old.estado is distinct from 'nda' then
    v_problema := app.nda_no_enviable(new.id);
    if v_problema is not null then
      raise exception '%', v_problema using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop function if exists app.falta_texto_nda(uuid);

/*
 * Redefinición de `20261110100000_nda_comentarios.sql`: una plantilla con
 * huecos cuenta como «sin plantilla». Ella ve que está en preparación, no
 * un texto con corchetes para firmar.
 */
create or replace function app.estado_nda(p_candidatura uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c candidaturas%rowtype;
  f nda_firmas%rowtype;
  v_plantilla uuid;
begin
  select * into c from candidaturas where id = p_candidatura;
  if not found then return null; end if;

  -- Solo IWL y la propia candidata
  if auth.uid() is not null and not app.is_iwl() and c.profile_id is distinct from auth.uid() then
    return null;
  end if;

  select * into f from nda_firmas where candidatura_id = p_candidatura;
  if found then
    return case when f.contrafirmado_at is not null then 'firmado' else 'esperando_iwl' end;
  end if;

  if c.estado in ('firmada', 'descartada') or c.nda_firmado_on is not null then
    return 'no_aplica';
  end if;

  v_plantilla := app.plantilla_nda_de(p_candidatura);
  if v_plantilla is null
     or app.problema_plantilla_nda((select texto from nda_plantillas where id = v_plantilla)) is not null then
    return 'sin_plantilla';
  end if;
  return 'por_firmar';
end;
$$;

-- -----------------------------------------------------------------------------
-- Lo firmado es el texto completado
-- -----------------------------------------------------------------------------

alter table nda_firmas
  add column if not exists datos jsonb,
  add column if not exists texto_firmado text,
  add column if not exists texto_final text,
  add column if not exists texto_final_hash text;

comment on column nda_firmas.texto_firmado is
  'El texto que firmó ella, completado con sus datos. texto_hash es su SHA-256. La fecha de efecto dice «la fecha de la última firma».';
comment on column nda_firmas.texto_final is
  'El mismo texto con la fecha de efecto ya escrita, al contrafirmar IWL: es el del PDF. texto_final_hash es su SHA-256.';

-- ¿Le queda algún hueco a un texto? Marcadores sin dato o corchetes
create or replace function app.huecos_nda(p_texto text)
returns text
language sql
immutable
as $$
  select coalesce(
    substring(coalesce(p_texto, '') from '\{\{[^{}]*\}\}'),
    substring(coalesce(p_texto, '') from '\[[^\]\n]{0,80}\]')
  )
$$;

drop function if exists public.firmar_nda(uuid, uuid, text, uuid, text, text);
drop function if exists app.firmar_nda(uuid, uuid, text, uuid, text, text);

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
         p_profile, trim(p_nombre), v_correo, now(), p_ip, p_ua
  from nda_plantillas where id = p_plantilla;

  insert into avisos (tipo, profile_id, candidatura_id)
  values ('nda_firmado', p_profile, p_candidatura);
end;
$$;

create or replace function public.firmar_nda(
  p_candidatura uuid, p_profile uuid, p_nombre text, p_plantilla uuid,
  p_texto text, p_datos jsonb, p_ip text, p_ua text
)
returns void
language sql
security definer
set search_path = public
as $$ select app.firmar_nda(p_candidatura, p_profile, p_nombre, p_plantilla, p_texto, p_datos, p_ip, p_ua) $$;

revoke all on function app.firmar_nda(uuid, uuid, text, uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.firmar_nda(uuid, uuid, text, uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.firmar_nda(uuid, uuid, text, uuid, text, jsonb, text, text) to service_role;

/*
 * Contrafirmar, con el texto final: el mismo que firmó ella con la fecha de
 * efecto ya escrita. Sin él —un NDA firmado antes de esto—, como antes.
 */
drop function if exists public.contrafirmar_nda(uuid, uuid, text, text);
drop function if exists app.contrafirmar_nda(uuid, uuid, text, text);

create or replace function app.contrafirmar_nda(
  p_candidatura uuid,
  p_profile uuid,
  p_ip text,
  p_ua text,
  p_texto_final text default null
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
  v_hueco text;
begin
  select full_name, email, role into v_nombre, v_correo, v_rol from profiles where id = p_profile;
  if v_rol is distinct from 'admin_iwl' then
    raise exception 'El NDA lo contrafirma una persona de dirección.' using errcode = '42501';
  end if;

  if p_texto_final is not null then
    v_hueco := app.huecos_nda(p_texto_final);
    if v_hueco is not null then
      raise exception 'Al texto final del NDA le falta un dato: %.', v_hueco using errcode = 'P0001';
    end if;
  end if;

  update nda_firmas
  set contrafirmante_id = p_profile,
      contrafirmante_nombre = coalesce(v_nombre, v_correo),
      contrafirmante_correo = v_correo,
      contrafirmado_at = now(),
      contrafirmado_ip = p_ip,
      contrafirmado_ua = p_ua,
      texto_final = p_texto_final,
      texto_final_hash = case when p_texto_final is null then null
                              else encode(sha256(convert_to(p_texto_final, 'UTF8')), 'hex') end
  where candidatura_id = p_candidatura and firmado_at is not null and contrafirmado_at is null;

  if not found then
    raise exception 'No hay un NDA firmado por ella pendiente de la firma de IWL.' using errcode = 'P0001';
  end if;

  perform app.nda_completo(p_candidatura, p_profile);
end;
$$;

create or replace function public.contrafirmar_nda(
  p_candidatura uuid, p_profile uuid, p_ip text, p_ua text, p_texto_final text default null
)
returns void
language sql
security definer
set search_path = public
as $$ select app.contrafirmar_nda(p_candidatura, p_profile, p_ip, p_ua, p_texto_final) $$;

revoke all on function app.contrafirmar_nda(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.contrafirmar_nda(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.contrafirmar_nda(uuid, uuid, text, text, text) to service_role;

/*
 * Lo que necesita la vista previa del NDA que no rellena ella: la startup,
 * la persona de contacto, su situación societaria y el lugar. Solo a IWL o
 * a la propia candidata: ella no lee la tabla de candidaturas.
 */
create or replace function public.datos_nda(p_candidatura uuid)
returns table (startup text, contraparte_nombre text, situacion_societaria situacion_societaria, lugar text)
language sql
stable
security definer
set search_path = public
as $$
  select c.nombre, c.contacto_nombre, c.situacion_societaria,
         coalesce((select value #>> '{}' from platform_settings where key = 'nda_lugar'), 'Málaga')
  from candidaturas c
  where c.id = p_candidatura
    and (app.is_iwl() or c.id = app.mi_candidatura_id())
$$;

revoke all on function public.datos_nda(uuid) from public, anon;
grant execute on function public.datos_nda(uuid) to authenticated;
