-- =============================================================================
-- Sin texto de NDA, no se envía el NDA
--
-- Fallo en producción (REVISION, 10 nov): en la nube no había plantilla,
-- «Enviar el NDA» creó la cuenta y anuló el enlace igualmente, y la
-- candidata se quedó sin su enlace y sin nada que firmar.
--
-- Lo impide la base, en los dos sitios por donde se llega:
--   · darle cuenta a una candidata que va al NDA, y
--   · pasar una candidatura a «NDA enviado».
-- Un NDA firmado fuera no necesita texto: con su firma registrada pasa.
-- =============================================================================

-- ¿Le falta el texto del NDA? Si ya está firmado, no: no hay nada que enviar
create or replace function app.falta_texto_nda(p_candidatura uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.plantilla_nda_de(p_candidatura) is null
     and not exists (select 1 from nda_firmas where candidatura_id = p_candidatura)
$$;

revoke all on function app.falta_texto_nda(uuid) from public, anon;

/*
 * Redefinición de la última versión de `dar_acceso_candidatura`: además
 * de lo que hacía, no da cuenta para el NDA si no hay NDA que enseñarle.
 * Lo comprueba antes de anular el enlace, que es lo que no tiene vuelta.
 */
create or replace function app.dar_acceso_candidatura(p_candidatura uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado estado_candidatura;
begin
  if auth.uid() is not null and not app.is_iwl() then
    raise exception 'Dar acceso a una candidata es del equipo de IWL.'
      using errcode = '42501';
  end if;

  select estado into v_estado from candidaturas where id = p_candidatura;
  if v_estado in ('preseleccionada', 'nda') and app.falta_texto_nda(p_candidatura) then
    raise exception 'Falta cargar la plantilla del NDA: sin ella no tiene nada que firmar. Cárgala en Administración → Programa.'
      using errcode = 'P0001';
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
begin
  if new.estado = 'nda' and old.estado is distinct from 'nda' and app.falta_texto_nda(new.id) then
    raise exception 'Falta cargar la plantilla del NDA: sin ella no se puede enviar. Cárgala en Administración → Programa.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists candidaturas_nda_sin_plantilla on candidaturas;
create trigger candidaturas_nda_sin_plantilla
  before update of estado on candidaturas
  for each row execute function app.guard_nda_sin_plantilla();
