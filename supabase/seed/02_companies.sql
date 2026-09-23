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

-- -----------------------------------------------------------------------------
-- Organizaciones
-- -----------------------------------------------------------------------------

insert into organizations (id, name, slug) values
  ('00000000-0000-0000-0001-000000000001', 'Inception Woman Lab', 'iwl'),
  ('00000000-0000-0000-0001-000000000002', 'Niage Technology', 'niage')
on conflict (id) do nothing;

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
  jsonb_build_object('full_name', v.full_name, 'role', v.app_role),
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

insert into cohorts (id, organization_id, name, start_date, end_date, investable_target) values
  ('00000000-0000-0000-0003-000000000001',
   '00000000-0000-0000-0001-000000000001',
   'Cohorte 2026', '2026-03-01', '2027-03-01', 2)
on conflict (id) do nothing;

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
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000041', 'mentor', null),
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
