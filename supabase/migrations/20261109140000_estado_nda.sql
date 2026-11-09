-- =============================================================================
-- En qué punto está el NDA de una candidatura
--
-- Una sola respuesta para las dos pantallas: la de la candidata, que no ve
-- nada más hasta firmar, y la de IWL. Es la base la que decide la puerta.
--
--   no_aplica      firmada, descartada, o con NDA puesto a mano antes de esto
--   sin_plantilla  le toca firmar, pero IWL todavía no ha cargado el texto
--   por_firmar     le toca firmar
--   esperando_iwl  ella ha firmado; falta IWL
--   firmado        las dos partes
-- =============================================================================

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

  if not exists (select 1 from nda_plantillas) then
    return 'sin_plantilla';
  end if;
  return 'por_firmar';
end;
$$;

create or replace function public.estado_nda(p_candidatura uuid)
returns text language sql stable security definer set search_path = public
as $$ select app.estado_nda(p_candidatura) $$;

revoke all on function public.estado_nda(uuid) from public, anon;
grant execute on function public.estado_nda(uuid) to authenticated;
