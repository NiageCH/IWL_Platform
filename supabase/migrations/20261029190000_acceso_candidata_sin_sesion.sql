-- =============================================================================
-- Dar acceso a una candidata, también desde un script
--
-- Misma regla que ya se aplicó a los disparadores: un guardián de
-- autorización no se aplica sin sesión. «Esto es del equipo de IWL» no
-- significa nada cuando no hay nadie, y la clave de servicio ya se salta el
-- RLS entero por diseño: bloquearla no protege y sí impide lo legítimo.
--
-- Aquí lo legítimo es `npm run cuentas:revision`, que monta las cuentas con
-- las que se recorre la plataforma por rol. Una de ellas es la de candidata,
-- y sin esto se quedaba a medias: cuenta creada y sin candidatura que ver.
--
-- La regla entera está en CLAUDE.md. El resumen: los guardianes de
-- autorización se eximen sin sesión; los de integridad —«un Anexo firmado
-- no se edita»— no, porque valen las escriba quien las escriba.
-- =============================================================================

create or replace function app.dar_acceso_candidatura(p_candidatura uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not app.is_iwl() then
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
