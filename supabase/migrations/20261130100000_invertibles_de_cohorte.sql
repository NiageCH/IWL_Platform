-- =============================================================================
-- Cuántas compañías de una cohorte son invertibles (REVISION, 24 nov)
--
-- Invertible es, desde el 23 nov, la compañía graduada. Graduada está
-- cerrada, y una cerrada solo la lee dirección: la cartera del equipo o de un
-- mentor no la ve, y su contador «Invertibles» saldría siempre a cero. Esta
-- función da el número, y nada más, a quien es de IWL.
-- =============================================================================

create or replace function public.invertibles_de_cohorte(p_cohort uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when app.is_iwl() then (
    select count(*)::integer from companies where cohort_id = p_cohort and cierre = 'graduada'
  ) end
$$;

revoke all on function public.invertibles_de_cohorte(uuid) from public, anon;
grant execute on function public.invertibles_de_cohorte(uuid) to authenticated;
