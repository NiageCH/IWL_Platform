-- =============================================================================
-- 016 · Horas asignadas y tareas
--
-- Un mentor no entra en un proyecto «a echar una mano»: entra con un número
-- de horas acordado y con cosas concretas que hacer. Sin las dos, la
-- aportación de IWL se mide a posteriori sumando lo que cada uno apuntó, y no
-- hay forma de saber si alguien va corto o si un proyecto se está comiendo el
-- presupuesto de mentoría de otro.
--
-- `tasks` ya existía desde el business plan, con lo mínimo y sin usarse en
-- ninguna pantalla. Se amplía en vez de crear otra tabla al lado: dos listas
-- de pendientes en la misma plataforma es lo peor de los dos mundos.
-- =============================================================================

alter table company_members
  -- Lo acordado para esta persona en este proyecto
  add column assigned_hours numeric(8,1) check (assigned_hours >= 0),
  add column rate_profile   text,
  add column starts_on      date,
  add column ends_on        date,
  add column notes          text;

comment on column company_members.assigned_hours is
  'Horas acordadas para esta persona en este proyecto. Se comparan con las que imputa de verdad en contribution_hours.';
comment on column company_members.rate_profile is
  'Perfil de tarifa con el que se valoran sus horas aquí. La misma persona puede entrar como especialista en un proyecto y como sénior en otro.';

-- -----------------------------------------------------------------------------
-- Tareas
-- -----------------------------------------------------------------------------

create type estado_tarea as enum (
  'pendiente', 'en_curso', 'hecha', 'bloqueada', 'descartada'
);

create type prioridad_tarea as enum ('alta', 'media', 'baja');

/*
 * El estado pasa de texto con check a enum.
 *
 * Faltaba «bloqueada», que es el estado que de verdad hace falta seguir: una
 * tarea parada porque espera a otra persona no es lo mismo que una pendiente,
 * y mezclarlas esconde exactamente lo que una coordinación necesita ver.
 */
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks
  alter column status drop default,
  alter column status type estado_tarea using status::estado_tarea,
  alter column status set default 'pendiente';

alter table tasks
  -- Contra qué parte del plan va
  add column stage_id     uuid references roadmap_stages (id) on delete set null,
  add column milestone_id uuid references milestones (id) on delete set null,
  add column pillar_id    uuid references pillars (id) on delete set null,

  /*
   * De qué lado sale el trabajo.
   *
   * Una tarea de la compañía y una de IWL se leen distinto: la primera es
   * algo que el equipo fundador tiene que hacer, la segunda es aportación del
   * programa. Sin distinguirlo, la lista de pendientes mezcla dos cosas que
   * no se gestionan igual.
   */
  add column side         lado_avance not null default 'iwl',
  add column priority     prioridad_tarea not null default 'media',
  add column estimated_hours numeric(6,2) check (estimated_hours >= 0),
  add column completed_on date,
  add column completed_by uuid references profiles (id) on delete set null;

comment on column tasks.owner_id is
  'Quién responde de la tarea. Es una persona de la plataforma y no un nombre escrito: esto contesta a «qué me toca a mí esta semana».';

create index tasks_owner_idx on tasks (owner_id, status)
  where status in ('pendiente', 'en_curso', 'bloqueada');
create index tasks_milestone_idx on tasks (milestone_id);
create index tasks_vencidas_idx on tasks (company_id, due_date)
  where status in ('pendiente', 'en_curso', 'bloqueada');

/** Al cerrar una tarea se guarda quién y cuándo, sin depender del formulario */
create or replace function app.sellar_tarea()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'hecha'
     and (tg_op = 'INSERT' or old.status is distinct from 'hecha') then
    new.completed_on := coalesce(new.completed_on, current_date);
    new.completed_by := coalesce(new.completed_by, auth.uid());
  elsif new.status <> 'hecha' then
    new.completed_on := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;

create trigger tasks_sellar
  before insert or update on tasks
  for each row execute function app.sellar_tarea();

/*
 * Quién puede asignar trabajo a quién.
 *
 * Sin esto, una fundadora podría crear tareas a nombre de un mentor y la
 * lista de pendientes de la mentoría la llenaría la compañía. Pedir es otra
 * cosa y ya tiene su sitio: el apartado «qué pide a IWL» del update mensual.
 */
create or replace function app.guard_asignacion_tarea()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null
     and new.owner_id <> auth.uid()
     and not app.coordina_company(new.company_id) then
    raise exception 'Asignar una tarea a otra persona es de IWL o de quien coordina el proyecto. Para pedirle algo al programa, usa el apartado de peticiones del update mensual.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tasks_guard_asignacion
  before insert or update on tasks
  for each row execute function app.guard_asignacion_tarea();

-- Las horas pueden colgar de la tarea que las generó
alter table contribution_hours
  add column task_id uuid references tasks (id) on delete set null;

create index contribution_hours_task_idx on contribution_hours (task_id);

-- -----------------------------------------------------------------------------
-- RLS de tareas, revisada
-- -----------------------------------------------------------------------------

/*
 * Quien la tiene asignada puede moverla aunque no pueda escribir en el resto
 * del proyecto: es el caso de un mentor secundario, que entra a su reto y no
 * tiene por qué poder tocar el business plan.
 */
drop policy if exists tasks_write on tasks;

create policy tasks_insert on tasks
  for insert to authenticated with check (app.can_write_company(company_id));

create policy tasks_update on tasks
  for update to authenticated
  using (app.can_write_company(company_id) or owner_id = auth.uid())
  with check (app.can_write_company(company_id) or owner_id = auth.uid());

create policy tasks_delete on tasks
  for delete to authenticated using (app.coordina_company(company_id));

/**
 * Horas asignadas frente a imputadas, por persona y proyecto.
 *
 * Contesta a «¿va alguien corto de horas?» y a «¿qué proyecto se está
 * comiendo el presupuesto de mentoría?», que son las dos preguntas que una
 * incubadora con mentores externos se hace cada mes.
 */
create or replace view mentoria_dedicacion as
select
  m.company_id,
  c.name                    as company_name,
  c.slug                    as company_slug,
  m.profile_id,
  p.full_name,
  p.email,
  m.member_role,
  m.rate_profile,
  m.assigned_hours,
  m.starts_on,
  m.ends_on,
  coalesce(h.horas, 0)      as imputadas,
  coalesce(h.valor, 0)      as valor_imputado,
  case
    when m.assigned_hours is null or m.assigned_hours = 0 then null
    else round((coalesce(h.horas, 0) / m.assigned_hours) * 100, 1)
  end                       as pct,
  coalesce(t.abiertas, 0)   as tareas_abiertas,
  coalesce(t.vencidas, 0)   as tareas_vencidas
from company_members m
join companies c on c.id = m.company_id
join profiles p on p.id = m.profile_id
left join lateral (
  select sum(ch.hours) as horas, sum(ch.hours * ch.applied_rate) as valor
  from contribution_hours ch
  where ch.company_id = m.company_id and ch.profile_id = m.profile_id
) h on true
left join lateral (
  select
    count(*) filter (
      where tk.status in ('pendiente', 'en_curso', 'bloqueada')
    ) as abiertas,
    count(*) filter (
      where tk.status in ('pendiente', 'en_curso', 'bloqueada')
        and tk.due_date < current_date
    ) as vencidas
  from tasks tk
  where tk.company_id = m.company_id and tk.owner_id = m.profile_id
) t on true
where m.member_role in (
  'mentor_principal', 'mentor_secundario', 'responsable_iwl', 'revisor_niage'
);

alter view mentoria_dedicacion set (security_invoker = true);
grant select on mentoria_dedicacion to authenticated;
