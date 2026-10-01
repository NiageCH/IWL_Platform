-- =============================================================================
-- Semilla 02 · Organizaciones, personas y compañías ficticias
--
-- Tres compañías de sectores distintos (§10): una solo software, una con
-- componente de IA y una con hardware. Fases y etapas distintas.
-- Nombres inventados. Nunca compañías reales.
--
-- Las contraseñas son de desarrollo local. En producción se entra con enlace
-- mágico y no hay contraseñas.
-- =============================================================================

-- Las organizaciones y la cohorte están en 01_config.sql: son estructura del
-- programa y hacen falta también cuando este fichero no se carga, que es lo
-- que pasa en una instalación con proyectos reales.

-- -----------------------------------------------------------------------------
-- Personas. El trigger on_auth_user_created crea el perfil con su rol
-- -----------------------------------------------------------------------------

-- Las columnas de token se rellenan con cadena vacía, no con NULL: el servicio
-- de auth las lee como texto y un NULL le hace fallar al consultar el esquema.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  email_change_token_current, email_change, phone_change, phone_change_token,
  reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000',
  v.id::uuid,
  'authenticated',
  'authenticated',
  v.email,
  crypt('iwl-local-2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.full_name),
  now(),
  now(),
  '', '', '', '', '', '', '', ''
from (values
  ('00000000-0000-0000-0002-000000000001', 'admin@iwl.test',        'Dirección IWL',      'admin_iwl'),
  ('00000000-0000-0000-0002-000000000002', 'programa@iwl.test',     'Programa IWL',       'equipo_iwl'),
  ('00000000-0000-0000-0002-000000000003', 'revisor@niage.test',    'Ingeniería Niage',   'revisor_niage'),
  ('00000000-0000-0000-0002-000000000004', 'revisor2@niage.test',   'Ingeniería Niage 2', 'revisor_niage'),
  ('00000000-0000-0000-0002-000000000011', 'fundadora@marea.test',  'Fundadora Marea',    'fundadora'),
  ('00000000-0000-0000-0002-000000000012', 'cto@marea.test',        'CTO Marea',          'fundadora'),
  ('00000000-0000-0000-0002-000000000021', 'fundadora@vega.test',   'Fundadora Vega',     'fundadora'),
  ('00000000-0000-0000-0002-000000000031', 'fundadora@raiz.test',   'Fundadora Raíz',     'fundadora'),
  ('00000000-0000-0000-0002-000000000041', 'mentor@iwl.test',       'Mentoría producto',  'mentor')
) as v(id, email, full_name, app_role)
on conflict (id) do nothing;

/*
 * Y su rol, que el trigger ya no saca de los metadatos: ahí escribe el
 * cliente, y una cuenta nueva nace siempre con el de menos alcance. Ver
 * 20260929120000_el_rol_no_lo_pone_el_cliente.sql.
 */
update profiles p set role = v.app_role::app_role
from (values
  ('admin@iwl.test',      'admin_iwl'),
  ('programa@iwl.test',   'equipo_iwl'),
  ('revisor@niage.test',  'revisor_niage'),
  ('revisor2@niage.test', 'revisor_niage'),
  ('mentor@iwl.test',     'mentor')
) as v(email, app_role)
where p.email = v.email;

-- Identidad de correo, necesaria para el inicio de sesión local
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like '%.test'
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- Las personas de IWL y de Niage pertenecen a su organización
update profiles set organization_id = '00000000-0000-0000-0001-000000000001'
where email in ('admin@iwl.test', 'programa@iwl.test', 'mentor@iwl.test');

update profiles set organization_id = '00000000-0000-0000-0001-000000000002'
where email in ('revisor@niage.test', 'revisor2@niage.test');

-- -----------------------------------------------------------------------------
-- Cohorte
-- -----------------------------------------------------------------------------

-- La cohorte también está en 01_config.sql, por lo mismo.

-- -----------------------------------------------------------------------------
-- Compañías
-- -----------------------------------------------------------------------------

insert into companies (
  id, organization_id, cohort_id, name, slug, sector, one_liner,
  phase_id, stage, tech_profile, female_leadership_pct, founded_on, website
)
select
  v.id::uuid,
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0003-000000000001',
  v.name, v.slug, v.sector, v.one_liner,
  p.id, v.stage::company_stage, v.tech_profile::company_tech_profile,
  v.female_pct, v.founded_on::date, v.website
from (values
  ('00000000-0000-0000-0004-000000000001',
   'Marea Clínica', 'marea-clinica', 'Salud digital',
   'Plataforma de seguimiento de pacientes crónicos para centros de atención primaria.',
   'fase_2', 'semilla', 'software', 75.00, '2024-05-10', 'https://marea-clinica.test'),
  ('00000000-0000-0000-0004-000000000002',
   'Vega Predictiva', 'vega-predictiva', 'Logística',
   'Predicción de demanda para distribuidoras de alimentación con modelos propios.',
   'fase_1', 'pre_semilla', 'software_ia', 100.00, '2025-09-01', 'https://vega-predictiva.test'),
  ('00000000-0000-0000-0004-000000000003',
   'Raíz Sensórica', 'raiz-sensorica', 'Agrotecnología',
   'Sensores de suelo y plataforma de riego de precisión para cultivo extensivo.',
   'fase_2', 'semilla', 'hardware', 60.00, '2023-11-20', 'https://raiz-sensorica.test')
) as v(id, name, slug, sector, one_liner, phase_code, stage, tech_profile, female_pct, founded_on, website)
join phases p on p.code = v.phase_code
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Pertenencia y asignaciones
--
-- Marea y Raíz comparten revisor de Niage. Vega tiene otro: así los tests
-- pueden comprobar que un revisor no ve las compañías que no lleva.
-- -----------------------------------------------------------------------------

insert into company_members (company_id, profile_id, member_role, title)
select v.company_id::uuid, v.profile_id::uuid, v.member_role::company_member_role, v.title
from (values
  -- Marea Clínica
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000011', 'fundadora', 'CEO'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000012', 'fundadora', 'CTO'),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000002', 'responsable_iwl', null),
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000003', 'revisor_niage', null),
  -- Las asignaciones de mentoría van en 08_mentoria.sql, con su papel y sus
  -- horas: aquí no se sabe todavía quién coordina qué
  -- Vega Predictiva
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000021', 'fundadora', 'CEO'),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000002', 'responsable_iwl', null),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000004', 'revisor_niage', null),
  -- Raíz Sensórica
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0002-000000000031', 'fundadora', 'CEO'),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0002-000000000002', 'responsable_iwl', null),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0002-000000000003', 'revisor_niage', null)
) as v(company_id, profile_id, member_role, title)
on conflict (company_id, profile_id, member_role) do nothing;

-- -----------------------------------------------------------------------------
-- Pilares activos por compañía, con intensidad distinta (§3)
-- -----------------------------------------------------------------------------

insert into company_pillars (company_id, pillar_id, intensity, cadence, is_active)
select v.company_id::uuid, p.id, v.intensity, v.cadence, true
from (values
  ('00000000-0000-0000-0004-000000000001', 'acompanamiento_operativo', 3, 'Quincenal'),
  ('00000000-0000-0000-0004-000000000001', 'fundraising_readiness',    3, 'Mensual'),
  ('00000000-0000-0000-0004-000000000001', 'mentoria_especializada',   2, 'Mensual'),
  ('00000000-0000-0000-0004-000000000001', 'red_partnerships',         1, 'Trimestral'),
  ('00000000-0000-0000-0004-000000000002', 'acompanamiento_operativo', 3, 'Semanal'),
  ('00000000-0000-0000-0004-000000000002', 'mentoria_especializada',   3, 'Quincenal'),
  ('00000000-0000-0000-0004-000000000002', 'espacio_recursos',         2, 'Continuo'),
  ('00000000-0000-0000-0004-000000000003', 'acompanamiento_operativo', 2, 'Mensual'),
  ('00000000-0000-0000-0004-000000000003', 'red_partnerships',         3, 'Mensual'),
  ('00000000-0000-0000-0004-000000000003', 'comunicacion_visibilidad', 2, 'Trimestral')
) as v(company_id, pillar_code, intensity, cadence)
join pillars p on p.code = v.pillar_code
on conflict (company_id, pillar_id) do nothing;

-- -----------------------------------------------------------------------------
-- Cap table simplificada
-- -----------------------------------------------------------------------------

insert into cap_table_entries (company_id, holder_name, holder_type, percentage, notes)
values
  ('00000000-0000-0000-0004-000000000001', 'Equipo fundador', 'fundadora', 68.000, 'Dos fundadoras con vesting a cuatro años'),
  ('00000000-0000-0000-0004-000000000001', 'Inversión semilla', 'inversor', 22.000, 'Ronda de 2025'),
  ('00000000-0000-0000-0004-000000000001', 'Plan de opciones', 'empleada', 10.000, 'Reservado, sin asignar'),
  ('00000000-0000-0000-0004-000000000002', 'Fundadora', 'fundadora', 90.000, null),
  ('00000000-0000-0000-0004-000000000002', 'Plan de opciones', 'empleada', 10.000, 'Reservado'),
  ('00000000-0000-0000-0004-000000000003', 'Equipo fundador', 'fundadora', 55.000, 'Tres personas'),
  ('00000000-0000-0000-0004-000000000003', 'Inversión semilla', 'inversor', 30.000, 'Ronda de 2025'),
  ('00000000-0000-0000-0004-000000000003', 'Programa público', 'inversor', 15.000, 'Préstamo participativo convertido')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Candidaturas de demostración
--
-- El embudo con algo dentro: una en cada punto del recorrido, una firmada y
-- una descartada. Hacen falta para que la pantalla se pueda mirar y para que
-- las pruebas tengan sobre qué trabajar.
-- -----------------------------------------------------------------------------

insert into candidaturas (
  id, cohort_id, nombre, sector, one_liner, website,
  contacto_nombre, contacto_email, estado, estado_declarado, origen
)
select
  v.id::uuid,
  '00000000-0000-0000-0003-000000000001',
  v.nombre, v.sector, v.one_liner, v.website,
  v.contacto, v.email, v.estado::estado_candidatura,
  v.declarado::estado_entrada, v.origen
from (values
  ('00000000-0000-0000-0005-000000000001', 'Brota Analítica', 'Agrotecnología',
   'Predicción de cosecha con sensores de suelo.', 'https://brota.test',
   'Fundadora Brota', 'hola@brota.test', 'presentada', 'prototipo', 'Formulario'),
  ('00000000-0000-0000-0005-000000000002', 'Cauce Salud', 'Salud digital',
   'Seguimiento de pacientes crónicos desde casa.', 'https://cauce.test',
   'Fundadora Cauce', 'hola@cauce.test', 'en_revision', 'mvp', 'Recomendación'),
  ('00000000-0000-0000-0005-000000000003', 'Duna Logística', 'Logística',
   'Reparto de última milla en zonas rurales.', null,
   'Fundadora Duna', 'hola@duna.test', 'reunion', 'idea', 'Evento'),
  ('00000000-0000-0000-0005-000000000004', 'Ámbar Educación', 'Educación',
   'Formación profesional con realidad aumentada.', null,
   'Fundadora Ámbar', 'hola@ambar.test', 'comite', 'mvp', 'Formulario'),
  ('00000000-0000-0000-0005-000000000005', 'Risco Energía', 'Energía',
   'Autoconsumo compartido para comunidades de vecinos.', null,
   'Fundadora Risco', 'hola@risco.test', 'nda', 'primeros_clientes', 'Formulario')
) as v(id, nombre, sector, one_liner, website, contacto, email, estado, declarado, origen)
on conflict (id) do nothing;

-- Una descartada, con su motivo y desde dónde se cayó
insert into candidaturas (
  id, cohort_id, nombre, sector, contacto_nombre, contacto_email,
  estado, descartada_desde, descartada_motivo, descartada_at, origen
) values (
  '00000000-0000-0000-0005-000000000006',
  '00000000-0000-0000-0003-000000000001',
  'Vela Fintech', 'Finanzas', 'Fundadora Vela', 'hola@vela.test',
  'descartada', 'comite',
  'El comité ve el mercado bien atendido y el equipo sin perfil técnico. Se le sugiere volver con un socio de producto.',
  now() - interval '20 days', 'Formulario'
) on conflict (id) do nothing;

insert into candidatura_enlaces (candidatura_id, titulo, url, tipo)
select v.cid::uuid, v.titulo, v.url, v.tipo
from (values
  ('00000000-0000-0000-0005-000000000001', 'Pitch deck', 'https://drive.test/brota-pitch', 'Presentación'),
  ('00000000-0000-0000-0005-000000000002', 'Caso de negocio', 'https://drive.test/cauce-caso', 'Documento'),
  ('00000000-0000-0000-0005-000000000002', 'Pitch deck', 'https://drive.test/cauce-pitch', 'Presentación'),
  ('00000000-0000-0000-0005-000000000004', 'Pitch deck', 'https://drive.test/ambar-pitch', 'Presentación')
) as v(cid, titulo, url, tipo)
on conflict do nothing;

insert into candidatura_eventos (candidatura_id, tipo, ocurrido_on, titulo, detalle)
values
  ('00000000-0000-0000-0005-000000000003', 'reunion', current_date - 10,
   'Primera conversación',
   'Equipo de dos, las dos técnicas. La idea está clara pero no han hablado con ningún cliente todavía. Se les pide volver con cinco entrevistas.'),
  ('00000000-0000-0000-0005-000000000004', 'comite', current_date - 4,
   'Pasa a preselección con condiciones',
   'El comité ve recorrido en formación industrial. Condición: enseñar una carta de intención antes del NDA.'),
  ('00000000-0000-0000-0005-000000000006', 'comite', current_date - 20,
   'No pasa',
   'Mercado bien atendido por tres actores con financiación. El equipo no tiene perfil técnico y la ventaja que plantean es comercial.')
on conflict do nothing;
