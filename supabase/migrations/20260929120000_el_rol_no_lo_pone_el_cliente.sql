-- =============================================================================
-- El rol de un perfil no lo elige quien se registra
--
-- `app.handle_new_user()` leía el rol de `raw_user_meta_data`, que es el sitio
-- donde gotrue guarda el objeto `data` que manda el cliente en la petición de
-- registro. O sea: quien se daba de alta decía de qué rol quería ser.
--
-- Con el registro cerrado no había puerta por la que entrar, pero un proyecto
-- de Supabase nace con el registro abierto y basta un descuido —o una prueba
-- que lo abra y no lo cierre— para que esto valga:
--
--   POST /auth/v1/signup
--   {"email":"…","password":"…","data":{"role":"admin_iwl"}}
--
-- Comprobado contra la instancia local: devuelve 200 y el perfil queda con
-- rol `admin_iwl`, que ve la cartera entera y el due diligence de todas las
-- compañías.
--
-- Dos cierres, y el de la base es el que manda:
--
--   1. El registro se cierra en la configuración de auth. Es la puerta.
--   2. Este: el trigger deja de leer nada del cliente. Aunque la puerta se
--      quede abierta, una cuenta nueva nace con el rol de menos alcance.
--
-- Quien tenga que dar otro rol lo hace después y con la clave de servicio, que
-- es lo que ya hacían `scripts/alta.mjs` y la acción de administración: ambos
-- actualizan `profiles.role` justo después de crear la cuenta. El rol que
-- ponían también en los metadatos era redundante.
--
-- `fundadora` es el rol de menos alcance, no uno inofensivo: no da acceso a
-- nada por sí mismo. Lo que deja ver una compañía es estar en
-- `company_members`, y eso solo lo escribe quien ya está autorizado.
-- =============================================================================

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    /*
     * El nombre sí sale de los metadatos. Es un dato de presentación: quien
     * se inventa el suyo solo consigue salir con un nombre falso en una
     * pantalla a la que todavía no llega.
     */
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    'fundadora'::app_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function app.handle_new_user() is
  'Crea el perfil de una cuenta nueva con el rol de menos alcance. El rol no '
  'se lee de los metadatos: ahí escribe el cliente. Quien deba tener otro lo '
  'recibe después, con la clave de servicio.';
