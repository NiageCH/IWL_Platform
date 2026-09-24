-- =============================================================================
-- 003 · Due diligence tecnológico Niage
--
-- El módulo principal (§4.4). Tres capas: análisis automático, revisión
-- experta y plan de trabajo. Esta migración cubre la revisión experta y el
-- plan; la capa automática (repositorios, ejecuciones, SBOM) llega en fase 2.
--
-- Regla de escritura: la fundadora responde el cuestionario y aporta evidencia.
-- Puntuar y registrar hallazgos es de IWL y del revisor de Niage asignado.
-- =============================================================================

create type severidad_hallazgo as enum ('critico', 'alto', 'medio', 'bajo');

create type estado_hallazgo as enum (
  'abierto',
  'en_curso',
  'resuelto',
  'aceptado'   -- riesgo asumido de forma consciente, con motivo escrito
);

create type estado_evaluacion as enum ('borrador', 'publicada');

-- De dónde sale una puntuación: del análisis automático o del revisor (§4.4)
create type origen_puntuacion as enum ('automatico', 'manual');

create type responsable_plan as enum ('compania', 'niage');

create type estado_plan as enum ('pendiente', 'en_curso', 'hecho', 'descartado');

-- -----------------------------------------------------------------------------
-- tech_assessments · una fila por evaluación técnica
--
-- Se guarda la etapa en el momento de evaluar: si la compañía sube de etapa
-- después, la evaluación histórica sigue significando lo que significaba.
-- -----------------------------------------------------------------------------

create table tech_assessments (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  reviewer_id   uuid references profiles (id) on delete set null,
  assessed_on   date not null default current_date,
  stage         company_stage not null,
  tech_profile  company_tech_profile not null,
  status        estado_evaluacion not null default 'borrador',
  summary       text,
  strengths     text,
  published_at  timestamptz,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tech_assessments_company_idx
  on tech_assessments (company_id, assessed_on desc);

create trigger tech_assessments_touch
  before update on tech_assessments
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- tech_scores · nivel por dimensión, siempre con evidencia
-- -----------------------------------------------------------------------------

create table tech_scores (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references tech_assessments (id) on delete cascade,
  company_id     uuid not null references companies (id) on delete cascade,
  dimension_id   uuid not null references tech_dimensions (id) on delete restrict,
  level          smallint not null check (level between 0 and 4),
  -- La evidencia no es opcional: un nivel sin evidencia no es una evaluación
  evidence       text not null,
  source         origen_puntuacion not null default 'manual',
  -- Si el análisis propuso un nivel y el revisor lo cambió, queda el motivo
  proposed_level smallint check (proposed_level between 0 and 4),
  rationale      text,
  scored_by      uuid references profiles (id) on delete set null,
  scored_at      timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (assessment_id, dimension_id),
  constraint ajuste_manual_lleva_motivo
    check (proposed_level is null or proposed_level = level or rationale is not null)
);

create index tech_scores_company_idx on tech_scores (company_id);

create trigger tech_scores_touch
  before update on tech_scores
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- tech_questionnaire_answers · lo que responde la fundadora o su CTO (§4.4)
-- -----------------------------------------------------------------------------

create table tech_questionnaire_answers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  criterion_id  uuid not null references tech_criteria (id) on delete cascade,
  answer        text,
  -- Rutas en Storage de los adjuntos: diagrama, documentación, contratos,
  -- certificados, lista de materiales
  attachments   text[] not null default '{}',
  answered_by   uuid references profiles (id) on delete set null,
  answered_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, criterion_id)
);

create index tech_questionnaire_company_idx
  on tech_questionnaire_answers (company_id);

create trigger tech_questionnaire_touch
  before update on tech_questionnaire_answers
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- tech_findings · hallazgos técnicos con severidad (§4.4)
--
-- Un hallazgo crítico abierto bloquea el estado invertible (§11).
-- -----------------------------------------------------------------------------

create table tech_findings (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id) on delete cascade,
  assessment_id   uuid references tech_assessments (id) on delete set null,
  dimension_id    uuid not null references tech_dimensions (id) on delete restrict,
  severity        severidad_hallazgo not null,
  title           text not null,
  description     text not null,
  evidence        text,
  recommendation  text not null,
  status          estado_hallazgo not null default 'abierto',
  -- Motivo obligatorio para aceptar un riesgo sin resolverlo
  acceptance_note text,
  resolved_at     timestamptz,
  created_by      uuid references profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint aceptar_riesgo_lleva_motivo
    check (status <> 'aceptado' or acceptance_note is not null)
);

create index tech_findings_company_idx on tech_findings (company_id, status);
create index tech_findings_severity_idx on tech_findings (company_id, severity)
  where status in ('abierto', 'en_curso');

create trigger tech_findings_touch
  before update on tech_findings
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- tech_plan_items · plan de trabajo técnico (§4.4 capa 3)
--
-- Cada hallazgo genera un punto del plan. Los puntos acordados entran como
-- hitos del Anexo; el enlace se crea en la migración del Anexo.
-- -----------------------------------------------------------------------------

create table tech_plan_items (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references companies (id) on delete cascade,
  finding_id     uuid references tech_findings (id) on delete set null,
  title          text not null,
  description    text,
  owner          responsable_plan not null,
  effort_days    numeric(5,1) check (effort_days >= 0),
  -- Coste estimado de remediación. Alimenta la necesidad de capital (§4.4)
  estimated_cost numeric(12,2) check (estimated_cost >= 0),
  -- Trimestre del roadmap técnico, en formato AAAA-T1
  quarter        text check (quarter ~ '^\d{4}-T[1-4]$'),
  due_date       date,
  status         estado_plan not null default 'pendiente',
  created_by     uuid references profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index tech_plan_items_company_idx on tech_plan_items (company_id, status);

create trigger tech_plan_items_touch
  before update on tech_plan_items
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- tech_review_sessions · sesiones de revisión registradas (§4.4 capa 2)
--
-- Las horas cuentan como dedicación de Niage al pilar de acompañamiento
-- operativo. La agregación por pilar se añade con el módulo de dedicación.
-- -----------------------------------------------------------------------------

create table tech_review_sessions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  assessment_id uuid references tech_assessments (id) on delete set null,
  held_on       date not null,
  duration_min  smallint not null check (duration_min > 0),
  attendees     text not null,
  conclusions   text,
  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tech_review_sessions_company_idx
  on tech_review_sessions (company_id, held_on desc);

create trigger tech_review_sessions_touch
  before update on tech_review_sessions
  for each row execute function app.touch_updated_at();

-- =============================================================================
-- RLS
--
-- Los resultados técnicos son la información más sensible de la plataforma:
-- solo los ven la propia compañía, equipo_iwl y el revisor asignado (§5).
-- Eso es exactamente lo que devuelve `app.can_read_company`.
-- =============================================================================

alter table tech_assessments           enable row level security;
alter table tech_scores                enable row level security;
alter table tech_questionnaire_answers enable row level security;
alter table tech_findings              enable row level security;
alter table tech_plan_items            enable row level security;
alter table tech_review_sessions       enable row level security;

-- Evaluaciones: la compañía ve las publicadas; quien evalúa ve también los
-- borradores, para no enseñar una puntuación a medio hacer.
create policy tech_assessments_select on tech_assessments
  for select to authenticated using (
    app.can_read_company(company_id)
    and (status = 'publicada' or app.can_validate_company(company_id))
  );
create policy tech_assessments_write on tech_assessments
  for all to authenticated
  using (app.can_validate_company(company_id))
  with check (app.can_validate_company(company_id));

-- Puntuaciones: las escribe quien puede validar. Nunca la fundadora (§11)
create policy tech_scores_select on tech_scores
  for select to authenticated using (
    app.can_read_company(company_id)
    and exists (
      select 1 from tech_assessments a
      where a.id = tech_scores.assessment_id
        and (a.status = 'publicada' or app.can_validate_company(a.company_id))
    )
  );
create policy tech_scores_write on tech_scores
  for all to authenticated
  using (app.can_validate_company(company_id))
  with check (app.can_validate_company(company_id));

-- Cuestionario: lo responde la compañía, lo lee quien revisa
create policy tech_questionnaire_select on tech_questionnaire_answers
  for select to authenticated using (app.can_read_company(company_id));
create policy tech_questionnaire_write on tech_questionnaire_answers
  for all to authenticated
  using (app.can_write_company(company_id))
  with check (app.can_write_company(company_id));

-- Hallazgos: los registra quien revisa. La compañía los lee y trabaja sobre
-- ellos desde el plan, no editando el hallazgo.
create policy tech_findings_select on tech_findings
  for select to authenticated using (app.can_read_company(company_id));
create policy tech_findings_write on tech_findings
  for all to authenticated
  using (app.can_validate_company(company_id))
  with check (app.can_validate_company(company_id));

-- Plan de trabajo: lo acuerdan las dos partes, así que la compañía puede
-- mover el estado de sus propios puntos. Crear y borrar es de quien revisa.
create policy tech_plan_items_select on tech_plan_items
  for select to authenticated using (app.can_read_company(company_id));
create policy tech_plan_items_insert on tech_plan_items
  for insert to authenticated with check (app.can_validate_company(company_id));
create policy tech_plan_items_update on tech_plan_items
  for update to authenticated
  using (app.can_read_company(company_id) and app.can_write_company(company_id))
  with check (app.can_read_company(company_id) and app.can_write_company(company_id));
create policy tech_plan_items_delete on tech_plan_items
  for delete to authenticated using (app.can_validate_company(company_id));

create policy tech_review_sessions_select on tech_review_sessions
  for select to authenticated using (app.can_read_company(company_id));
create policy tech_review_sessions_write on tech_review_sessions
  for all to authenticated
  using (app.can_validate_company(company_id))
  with check (app.can_validate_company(company_id));

-- =============================================================================
-- Vista de cálculo
--
-- Reúne, para la evaluación publicada más reciente de cada compañía, la
-- dimensión con su peso según el perfil, su nivel objetivo según la etapa
-- actual y el nivel puntuado. Es la entrada exacta de `calcularScoreTecnico`.
--
-- Usa la etapa de hoy, no la de la evaluación: cambiar la etapa cambia el
-- score sin volver a puntuar (§11).
-- =============================================================================

create or replace view tech_score_input as
select
  c.id                        as company_id,
  c.stage                     as stage,
  c.tech_profile              as tech_profile,
  a.id                        as assessment_id,
  a.assessed_on               as assessed_on,
  d.code                      as dimension_code,
  d.name                      as dimension_name,
  d.order_index               as dimension_order,
  coalesce(w.weight, 0)       as weight,
  coalesce(t.target_level, 0) as target_level,
  s.level                     as level,
  s.evidence                  as evidence,
  s.source                    as source
from companies c
cross join tech_dimensions d
left join tech_dimension_weights w
  on w.dimension_id = d.id and w.tech_profile = c.tech_profile
left join tech_stage_targets t
  on t.dimension_id = d.id and t.stage = c.stage
left join lateral (
  select a2.*
  from tech_assessments a2
  where a2.company_id = c.id and a2.status = 'publicada'
  order by a2.assessed_on desc, a2.created_at desc
  limit 1
) a on true
left join tech_scores s
  on s.assessment_id = a.id and s.dimension_id = d.id
where d.is_active;

-- La vista hereda las políticas de las tablas de origen
alter view tech_score_input set (security_invoker = true);

grant select on tech_score_input to authenticated;
