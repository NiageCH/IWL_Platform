-- =============================================================================
-- Mentoría de las compañías de demostración
--
-- Lo que hay que poder ver aquí es que la misma persona coordina un proyecto
-- y entra de apoyo en otro. Si todos los mentores fueran principales en todo,
-- la distinción no se probaría nunca.
-- =============================================================================

/*
 * Un mentor más, para que la coordinación se reparta.
 *
 * El perfil lo crea el trigger `on_auth_user_created` a partir de los
 * metadatos, así que aquí solo se crea la cuenta: insertar el perfil a mano
 * antes que el usuario viola la clave ajena contra `auth.users`.
 */
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change_token_current, email_change, phone_change, phone_change_token,
  reauthentication_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0002-000000000042',
  'authenticated', 'authenticated', 'mentor2@iwl.test',
  crypt('iwl-local-2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Mentoría comercial","role":"mentor"}'::jsonb,
  now(), now(),
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, created_at, updated_at
)
values (
  '00000000-0000-0000-0002-000000000042',
  '00000000-0000-0000-0002-000000000042',
  jsonb_build_object(
    'sub', '00000000-0000-0000-0002-000000000042',
    'email', 'mentor2@iwl.test'
  ),
  'email', now(), now()
)
on conflict do nothing;

update profiles set organization_id = '00000000-0000-0000-0001-000000000001'
where email = 'mentor2@iwl.test';

/*
 * Las asignaciones.
 *
 * «Mentoría producto» coordina Marea y apoya en Raíz; «Mentoría comercial»
 * al revés. Esa es la situación que el modelo tiene que soportar y la que
 * prueban los tests.
 */
insert into company_members (
  company_id, profile_id, member_role, title,
  assigned_hours, rate_profile, starts_on, ends_on
)
select c.id, p.id, v.papel::company_member_role, v.titulo,
       v.horas::numeric, v.perfil, v.desde::date, v.hasta::date
from (values
  ('marea-clinica', 'mentor@iwl.test', 'mentor_principal',
   'Coordinación del proyecto', 120, 'especialista', '2026-03-09', '2026-12-13'),
  ('marea-clinica', 'mentor2@iwl.test', 'mentor_secundario',
   'Estrategia comercial', 40, 'especialista', '2026-06-29', '2026-12-13'),
  ('raiz-sensorica', 'mentor2@iwl.test', 'mentor_principal',
   'Coordinación del proyecto', 140, 'socio', '2026-01-28', '2026-10-27'),
  ('raiz-sensorica', 'mentor@iwl.test', 'mentor_secundario',
   'Producto y hardware', 60, 'ingenieria', '2026-02-25', '2026-06-02')
) as v(slug, correo, papel, titulo, horas, perfil, desde, hasta)
join companies c on c.slug = v.slug
join profiles p on p.email = v.correo
on conflict (company_id, profile_id, member_role) do nothing;

-- Parte de las horas ya imputadas pasan a llevar el nombre de quien las hizo,
-- para que la dedicación de cada mentor tenga contra qué medirse
update contribution_hours h
set profile_id = p.id
from profiles p, companies c
where p.email = 'mentor@iwl.test'
  and c.slug = 'marea-clinica'
  and h.company_id = c.id
  and h.person_name in ('Especialista de producto', 'Especialista comercial');

update contribution_hours h
set profile_id = p.id
from profiles p, companies c
where p.email = 'mentor2@iwl.test'
  and c.slug = 'raiz-sensorica'
  and h.company_id = c.id
  and h.person_name = 'Especialista de materia';

-- -----------------------------------------------------------------------------
-- Tareas
-- -----------------------------------------------------------------------------

insert into tasks (
  company_id, stage_id, owner_id, side, title, description,
  priority, status, due_date, estimated_hours, source_entity
)
select c.id, s.id, p.id, v.lado::lado_avance, v.titulo, v.descripcion,
       v.prioridad::prioridad_tarea, v.estado::estado_tarea,
       v.fecha::date, v.horas::numeric, 'seed'
from (values
  ('marea-clinica', 'Motor comercial repetible', 'mentor@iwl.test', 'iwl',
   'Revisar el guion de venta con la responsable comercial',
   'Segunda pasada tras las dos primeras ventas, para ajustar objeciones.',
   'alta', 'en_curso', '2026-09-30', 6),
  ('marea-clinica', 'Motor comercial repetible', 'mentor2@iwl.test', 'iwl',
   'Calcular el coste de adquisición del trimestre',
   'Con el embudo ya instrumentado, cerrar el número para el hito.',
   'alta', 'bloqueada', '2026-09-20', 8),
  ('marea-clinica', 'Motor comercial repetible', 'fundadora@marea.test', 'compania',
   'Cerrar la segunda venta sin el fundador',
   'Falta una para dar por cumplido el hito de venta repetible.',
   'alta', 'en_curso', '2026-10-04', null),
  ('marea-clinica', 'Preparación de ronda', 'mentor@iwl.test', 'iwl',
   'Preparar el guion de la reunión con fondos de salud',
   null, 'media', 'pendiente', '2026-10-20', 4),
  ('raiz-sensorica', 'Ronda institucional', 'mentor2@iwl.test', 'iwl',
   'Acompañar las reuniones con los tres fondos priorizados',
   'Preparación previa y seguimiento posterior de cada una.',
   'alta', 'en_curso', '2026-10-10', 12),
  ('raiz-sensorica', 'Ronda institucional', 'fundadora@raiz.test', 'compania',
   'Actualizar el modelo financiero con el cierre de septiembre',
   null, 'media', 'pendiente', '2026-10-05', null),
  ('raiz-sensorica', 'Crecimiento y unit economics', 'mentor2@iwl.test', 'iwl',
   'Revisar la nueva tarifa del tramo pequeño a los dos meses',
   'Comprobar que la subida no se ha llevado por delante la conversión.',
   'media', 'pendiente', '2026-10-15', 3)
) as v(slug, etapa, correo, lado, titulo, descripcion, prioridad, estado, fecha, horas)
join companies c on c.slug = v.slug
join roadmap_stages s on s.company_id = c.id and s.name = v.etapa
join profiles p on p.email = v.correo;
