-- =============================================================================
-- La contraseña que pone otra persona es temporal
--
-- Cuando la dirección da de alta, restablece una contraseña o da acceso a
-- una candidata, la contraseña la conoce quien la puso. Hasta que la
-- persona la cambie, no es suya. La marca `debe_cambiar_password` dice
-- eso, y el proxy no deja pasar de la pantalla de cambio mientras esté.
--
-- Va en `raw_app_meta_data` y no en `raw_user_meta_data`. Los metadatos de
-- usuario los escribe el propio usuario con la clave pública —que va en el
-- navegador—: con la marca ahí, cualquiera se la quitaba con una llamada
-- sin cambiar nada. Los de aplicación solo los escribe la clave de servicio.
--
-- Y quien la quita es la base, no la aplicación. Al cambiar la contraseña
-- desaparece la marca, sea por la pantalla que sea, y así cambiar la propia
-- contraseña sigue yendo con el cliente de sesión, sin clave de servicio.
--
-- Por eso, al poner una contraseña temporal, la marca va **en una llamada
-- aparte y después**: si va en la misma que cambia la contraseña, este
-- disparador la borra en el acto.
-- =============================================================================

create or replace function app.olvidar_contrasena_temporal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
     and new.raw_app_meta_data ? 'debe_cambiar_password' then
    new.raw_app_meta_data := new.raw_app_meta_data - 'debe_cambiar_password';
  end if;
  return new;
end;
$$;

drop trigger if exists olvidar_contrasena_temporal on auth.users;
create trigger olvidar_contrasena_temporal
  before update of encrypted_password on auth.users
  for each row execute function app.olvidar_contrasena_temporal();
