-- =============================================================================
-- La fecha de efecto, fuera del texto firmado
--
-- REVISION, 10 nov: ella e IWL firman exactamente el mismo texto, con un
-- solo hash. La fecha de efecto vive en el registro de firmas de la última
-- página del PDF: la plantilla lo dice con su propia redacción, la de
-- Luciana. Dos textos con dos hashes, aunque solo cambie la fecha, es justo
-- lo que una parte puede discutir después.
--
-- Deshace el «texto final» de `20261110170000_nda_personalizado.sql`:
-- `{{fecha_efecto}}` deja de ser un marcador —una plantilla que lo lleve no
-- se guarda, con el motivo— y la contrafirma ya no guarda un segundo texto.
-- =============================================================================

/* Redefinición: la lista, sin `fecha_efecto` */
create or replace function app.marcadores_nda_desconocidos(p_texto text)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(distinct m[1] || m[2]), '{}')
  from regexp_matches(coalesce(p_texto, ''), '\{\{\s*([#/]?)\s*([^{}]*?)\s*\}\}', 'g') as m
  where (m[1] = '' and m[2] not in (
          'startup', 'contraparte_nombre', 'lugar',
          'documento', 'domicilio', 'denominacion', 'nif', 'cargo'))
     or (m[1] in ('#', '/') and m[2] not in ('si_sociedad', 'si_persona'))
$$;

/* Redefinición: con `fecha_efecto`, el motivo de por qué no */
create or replace function app.guard_marcadores_nda()
returns trigger
language plpgsql
as $$
declare
  v text[] := app.marcadores_nda_desconocidos(new.texto);
begin
  if 'fecha_efecto' = any(v) then
    raise exception 'La fecha de efecto no va en el texto: las dos partes firman el mismo texto, y la fecha es la de la última firma del registro de firmas. Quita {{fecha_efecto}} y dilo con palabras.'
      using errcode = 'P0001';
  end if;
  if cardinality(v) > 0 then
    raise exception 'La plantilla tiene marcadores que la plataforma no conoce: %. Los que valen están en la pantalla de la plantilla.',
      array_to_string(v, ', ') using errcode = 'P0001';
  end if;
  return new;
end;
$$;

/*
 * Redefinición: la contrafirma, sin texto final. IWL firma el mismo texto
 * que ella, el de `texto_firmado`, con el mismo hash.
 */
drop function if exists public.contrafirmar_nda(uuid, uuid, text, text, text);
drop function if exists app.contrafirmar_nda(uuid, uuid, text, text, text);

create or replace function app.contrafirmar_nda(p_candidatura uuid, p_profile uuid, p_ip text, p_ua text)
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

create or replace function public.contrafirmar_nda(p_candidatura uuid, p_profile uuid, p_ip text, p_ua text)
returns void
language sql
security definer
set search_path = public
as $$ select app.contrafirmar_nda(p_candidatura, p_profile, p_ip, p_ua) $$;

revoke all on function app.contrafirmar_nda(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.contrafirmar_nda(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.contrafirmar_nda(uuid, uuid, text, text) to service_role;

alter table nda_firmas
  drop column if exists texto_final,
  drop column if exists texto_final_hash;

comment on column nda_firmas.texto_firmado is
  'El texto que firman las dos partes, completado con los datos de ella. texto_hash es su SHA-256. La fecha de efecto es la de la última firma del registro.';
