-- =============================================================================
-- 002 · Configuración del programa y de la evaluación
--
-- Áreas de due diligence, dimensiones técnicas con criterios, niveles objetivo
-- por etapa, pesos y biblioteca de KPI. Todo esto son datos, no código (§3).
-- Solo admin_iwl escribe aquí; el resto de la plataforma lo lee.
-- =============================================================================

-- Cuándo se activa una dimensión técnica según el perfil de la compañía (§4.4)
create type tech_applicability as enum ('siempre', 'ia', 'hardware');

-- Categoría de un KPI en la biblioteca (§4.6)
create type kpi_category as enum ('nucleo', 'sector', 'tecnico', 'propio');

-- Hacia dónde es bueno que se mueva un KPI
create type kpi_direction as enum ('sube_mejor', 'baja_mejor', 'neutro');

create type kpi_unit as enum (
  'moneda', 'porcentaje', 'numero', 'meses', 'dias', 'ratio'
);

-- -----------------------------------------------------------------------------
-- Due diligence general · áreas y plantilla de puntos (§4.3)
-- -----------------------------------------------------------------------------

create table dd_areas (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  description  text,
  -- Peso del área en el score de preparación. Configurable.
  weight       numeric(5,2) not null default 1 check (weight >= 0),
  order_index  smallint not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger dd_areas_touch
  before update on dd_areas
  for each row execute function app.touch_updated_at();

-- Plantilla del checklist. Al incorporar una compañía se instancia en dd_items.
create table dd_item_templates (
  id                uuid primary key default gen_random_uuid(),
  area_id           uuid not null references dd_areas (id) on delete cascade,
  code              text not null unique,
  title             text not null,
  description       text,
  -- Un punto obligatorio sin entregar mantiene el área incompleta
  is_required       boolean not null default true,
  -- Documentos que caducan: meses de validez. Nulo, no caduca (§4.3)
  validity_months   smallint check (validity_months > 0),
  order_index       smallint not null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index dd_item_templates_area_idx on dd_item_templates (area_id, order_index);

create trigger dd_item_templates_touch
  before update on dd_item_templates
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Due diligence tecnológico · dimensiones, criterios, objetivos y pesos (§4.4)
-- -----------------------------------------------------------------------------

create table tech_dimensions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  description   text,
  applicability tech_applicability not null default 'siempre',
  order_index   smallint not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger tech_dimensions_touch
  before update on tech_dimensions
  for each row execute function app.touch_updated_at();

create table tech_criteria (
  id            uuid primary key default gen_random_uuid(),
  dimension_id  uuid not null references tech_dimensions (id) on delete cascade,
  code          text not null unique,
  title         text not null,
  description   text,
  -- Qué evidencia se espera para dar el criterio por cubierto
  expected_evidence text,
  -- Si el análisis automático puede proponer respuesta para este criterio
  automatable   boolean not null default false,
  order_index   smallint not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tech_criteria_dimension_idx on tech_criteria (dimension_id, order_index);

create trigger tech_criteria_touch
  before update on tech_criteria
  for each row execute function app.touch_updated_at();

-- Nivel objetivo por dimensión y etapa. El score técnico mide la distancia a
-- este número, no a 4. Criterio de aceptación §11.
create table tech_stage_targets (
  id            uuid primary key default gen_random_uuid(),
  dimension_id  uuid not null references tech_dimensions (id) on delete cascade,
  stage         company_stage not null,
  target_level  smallint not null check (target_level between 0 and 4),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (dimension_id, stage)
);

create trigger tech_stage_targets_touch
  before update on tech_stage_targets
  for each row execute function app.touch_updated_at();

-- Peso de cada dimensión, distinto para software y para hardware (§4.4)
create table tech_dimension_weights (
  id            uuid primary key default gen_random_uuid(),
  dimension_id  uuid not null references tech_dimensions (id) on delete cascade,
  tech_profile  company_tech_profile not null,
  weight        numeric(5,2) not null default 1 check (weight >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (dimension_id, tech_profile)
);

create trigger tech_dimension_weights_touch
  before update on tech_dimension_weights
  for each row execute function app.touch_updated_at();

-- Texto de cada nivel de la escala de madurez 0 a 4 (§4.4)
create table tech_maturity_levels (
  level        smallint primary key check (level between 0 and 4),
  name         text not null,
  description  text not null
);

-- -----------------------------------------------------------------------------
-- Business plan · plantilla de secciones (§4.2)
-- -----------------------------------------------------------------------------

create table bp_section_templates (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  -- Preguntas guía que ve la fundadora al redactar
  guidance     text,
  order_index  smallint not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger bp_section_templates_touch
  before update on bp_section_templates
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Biblioteca de KPI (§4.6)
-- -----------------------------------------------------------------------------

create table kpi_definitions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  description   text,
  category      kpi_category not null,
  unit          kpi_unit not null,
  direction     kpi_direction not null default 'sube_mejor',
  -- Solo para KPI de categoría 'sector'
  sector        text,
  -- Un KPI derivado no se introduce: lo calcula la plataforma a partir de otros
  is_derived    boolean not null default false,
  -- Códigos de los KPI que alimentan el cálculo, para los derivados
  derived_from  text[] not null default '{}',
  -- Los KPI técnicos llegan del análisis automático, no los teclea nadie
  order_index   smallint not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint kpi_sector_solo_en_categoria_sector
    check (sector is null or category = 'sector'),
  constraint kpi_derivado_declara_origen
    check (not is_derived or cardinality(derived_from) > 0)
);

create index kpi_definitions_category_idx on kpi_definitions (category, order_index);

create trigger kpi_definitions_touch
  before update on kpi_definitions
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Ajustes de plataforma
--
-- Pesos globales y umbrales que no encajan en ninguna tabla concreta. En
-- particular el peso con el que el score técnico entra en el score total de
-- preparación: la tecnología tiene módulo propio pero su resultado cuenta (§4.3).
-- -----------------------------------------------------------------------------

create table platform_settings (
  key          text primary key,
  value        jsonb not null,
  description  text,
  updated_at   timestamptz not null default now()
);

create trigger platform_settings_touch
  before update on platform_settings
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Umbrales de alerta configurables (§4.7)
-- -----------------------------------------------------------------------------

create table alert_rules (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  description   text,
  -- Parámetros de la regla: umbral, días de gracia, severidad
  config        jsonb not null default '{}'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger alert_rules_touch
  before update on alert_rules
  for each row execute function app.touch_updated_at();

-- =============================================================================
-- RLS · configuración: la lee cualquier persona autenticada, la escribe admin
-- =============================================================================

alter table dd_areas               enable row level security;
alter table dd_item_templates      enable row level security;
alter table tech_dimensions        enable row level security;
alter table tech_criteria          enable row level security;
alter table tech_stage_targets     enable row level security;
alter table tech_dimension_weights enable row level security;
alter table tech_maturity_levels   enable row level security;
alter table bp_section_templates   enable row level security;
alter table kpi_definitions        enable row level security;
alter table alert_rules            enable row level security;
alter table platform_settings      enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'dd_areas', 'dd_item_templates', 'tech_dimensions', 'tech_criteria',
    'tech_stage_targets', 'tech_dimension_weights', 'tech_maturity_levels',
    'bp_section_templates', 'kpi_definitions', 'alert_rules',
    'platform_settings'
  ]
  loop
    execute format(
      'create policy %I on %I for select to authenticated using (true)',
      t || '_select', t
    );
    execute format(
      'create policy %I on %I for all to authenticated using (app.is_admin()) with check (app.is_admin())',
      t || '_write', t
    );
  end loop;
end;
$$;
