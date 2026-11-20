-- =============================================================================
-- La guía de cada rol se abre sola la primera vez (REVISION, 13 nov)
--
-- Se apunta cuándo la vio cada persona. Lo que ya hay queda sin ver: la
-- gente que ya tiene cuenta también la verá una vez, que es para quien se
-- escribió.
-- =============================================================================

alter table profiles add column if not exists guia_vista_at timestamptz;

comment on column profiles.guia_vista_at is
  'Cuándo vio la guía de su rol por primera vez. Sin fecha, al entrar se le abre sola.';

/*
 * Solo marca: la de quien llama, y solo si no estaba. Va por función y no
 * por una política de `update` sobre su perfil para no abrir el resto de
 * columnas.
 */
create or replace function public.marcar_guia_vista()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set guia_vista_at = now() where id = auth.uid() and guia_vista_at is null
$$;

revoke execute on function public.marcar_guia_vista() from public, anon;
grant execute on function public.marcar_guia_vista() to authenticated;
