-- Modo pruebas del correo (REVISION, 21 nov).
--
-- Lo que hay en producción son datos de prueba, y nadie de fuera de IWL
-- debe recibir un correo de la plataforma hasta que empiece la carga real.
-- Con el modo pruebas activo, un correo a un dominio que no esté en la
-- lista no sale: queda «retenido», con todo su contenido para verlo.
--
-- Nace activo: la migración es lo que llega a producción. La semilla local
-- lo apaga, porque las pruebas de interfaz leen los correos en la bandeja
-- local y van a @ejemplo.test.

insert into platform_settings (key, value, description) values (
  'correo_modo_pruebas',
  '{"activo": true, "dominios": ["inceptionwlab.es", "niage.es"]}'::jsonb,
  'Modo pruebas del correo: si está activo, solo sale a estos dominios; lo demás queda retenido.'
) on conflict (key) do nothing;

-- Retenido: ni enviado ni fallido. No se reintenta, y al quitar el modo
-- pruebas tampoco sale: era de una prueba.
alter table correos drop constraint if exists correos_estado_check;
alter table correos add constraint correos_estado_check
  check (estado in ('pendiente', 'enviado', 'sin_enviar', 'retenido'));

-- «¿Has olvidado tu contraseña?» pasa por la plataforma, para que respete
-- la lista: antes lo mandaba Supabase Auth directamente.
alter table correos drop constraint if exists correos_evento_check;
alter table correos add constraint correos_evento_check check (evento in (
  'enlace_candidatura', 'reunion_propuesta', 'reunion_confirmada', 'reunion_cambiada',
  'reunion_cancelada', 'reunion_contrapropuesta', 'nda_enviado', 'acceso_dado',
  'respuesta_comentario', 'acuerdo_propuesto', 'descarte', 'recordatorio', 'resumen_avisos',
  'sesion_registrada', 'sesion_de_vuelta', 'sesion_decidida', 'recuperar_contrasena'
));

-- Quien eligió el resumen a mano. En modo pruebas solo le llega a esa
-- persona: el «diario» por defecto no cuenta como haberlo elegido.
alter table profiles add column if not exists resumen_elegido_at timestamptz;

/*
 * Quitar el modo pruebas solo por aquí: lo hace dirección, escribiendo
 * «ACTIVAR CORREOS», y queda quién y cuándo. El guardián de abajo impide
 * hacerlo con un `update` a mano desde una sesión.
 */
create or replace function public.quitar_modo_pruebas(p_confirmacion text)
returns void
language plpgsql
security definer
set search_path = public, app
as $$
begin
  if not app.is_admin() then
    raise exception 'Solo dirección puede quitar el modo pruebas.' using errcode = '42501';
  end if;
  if coalesce(trim(p_confirmacion), '') <> 'ACTIVAR CORREOS' then
    raise exception 'Para quitarlo, escribe ACTIVAR CORREOS tal cual.' using errcode = '22023';
  end if;

  perform set_config('app.quitando_modo_pruebas', 'si', true);
  update platform_settings
     set value = value || jsonb_build_object(
           'activo', false,
           'quitado_por', auth.uid(),
           'quitado_at', now()
         )
   where key = 'correo_modo_pruebas';

  insert into activity_log (actor_id, entity, action, detail)
  values (auth.uid(), 'platform_settings', 'modo_pruebas_quitado', jsonb_build_object('key', 'correo_modo_pruebas'));
end;
$$;

revoke all on function public.quitar_modo_pruebas(text) from public, anon;
grant execute on function public.quitar_modo_pruebas(text) to authenticated;

-- De autorización: sin sesión (clave de servicio, semilla) no aplica
create or replace function app.guard_modo_pruebas()
returns trigger
language plpgsql
as $$
begin
  if new.key = 'correo_modo_pruebas'
     and auth.uid() is not null
     and coalesce((old.value ->> 'activo')::boolean, false)
     and not coalesce((new.value ->> 'activo')::boolean, false)
     and coalesce(current_setting('app.quitando_modo_pruebas', true), '') <> 'si' then
    raise exception 'El modo pruebas se quita con «Quitar el modo pruebas», que pide confirmarlo.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists platform_settings_guard_modo_pruebas on platform_settings;
create trigger platform_settings_guard_modo_pruebas
  before update on platform_settings
  for each row execute function app.guard_modo_pruebas();
