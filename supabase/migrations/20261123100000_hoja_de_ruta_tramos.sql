-- =============================================================================
-- La hoja de ruta en cuatro tramos (REVISION, 22 y 23 nov · bloque 5)
--
-- Una sola hoja de ruta, «Hoja de ruta IWL», en cuatro tramos con pocos
-- hitos fundamentales. Cada proyecto entra en el tramo de su estadio y
-- recorre ese y los siguientes:
--   idea → tramos 1 a 4 · MVP sin piloto → 2 a 4 · MVP con piloto → 3 y 4 ·
--   facturando → 4.
-- Plazo máximo, desde la firma del Acuerdo, la suma de lo que le queda:
-- 18, 12, 8 o 5 meses.
--
-- Antes de generarla, ella contesta la lista de los hitos fundamentales que
-- vienen antes de su entrada («Lo que ya tenéis»; en idea, los del tramo 1,
-- y se llama «Diagnóstico»). Cada «ya lo tenemos» lleva su archivo y lo
-- verifica el mentor. Lo verificado entra en la hoja de ruta como cumplido;
-- lo demás, pendiente. Los pendientes de tramos anteriores van dentro del
-- tramo de entrada, marcados con el tramo de donde vienen.
--
-- Un tramo se cierra solo al validarse su último hito, y se abre el
-- siguiente. Las ocho etapas y los tres recorridos de antes quedan fuera.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- El tramo, en las plantillas y en cada hoja de ruta
-- -----------------------------------------------------------------------------

alter table roadmap_template_stages
  add column if not exists tramo smallint check (tramo between 1 and 4),
  add column if not exists planned_months smallint check (planned_months between 1 and 24);

alter table roadmap_template_milestones
  add column if not exists fundamental boolean not null default false,
  add column if not exists expected_evidence text;

comment on column roadmap_template_milestones.fundamental is
  'Hito fundamental del tramo: va en todas las hojas de ruta que pasan por él, y solo dirección lo quita, con motivo.';

alter table roadmap_stages
  add column if not exists tramo smallint check (tramo between 1 and 4),
  add column if not exists closed_at timestamptz;

alter table milestones
  add column if not exists fundamental boolean not null default false,
  add column if not exists template_milestone_id uuid references roadmap_template_milestones (id) on delete set null,
  add column if not exists from_tramo smallint check (from_tramo between 1 and 4);

comment on column milestones.from_tramo is
  'Si es un hito fundamental de un tramo anterior a la entrada que quedó pendiente: de qué tramo viene. Va dentro del tramo de entrada.';

-- -----------------------------------------------------------------------------
-- El recorrido: los cuatro tramos y sus hitos fundamentales
-- -----------------------------------------------------------------------------

update roadmap_templates set is_active = false where code <> 'hoja_iwl';

insert into roadmap_templates (code, name, entry_state, description, duration_months)
values (
  'hoja_iwl', 'Hoja de ruta IWL', 'idea',
  'Una sola hoja de ruta, de la idea a un proyecto invertible, en cuatro tramos. Cada proyecto entra en el tramo de su estadio.',
  18
)
on conflict (code) do update set is_active = true, name = excluded.name, description = excluded.description;

insert into roadmap_template_stages (template_id, code, name, objective, order_index, planned_weeks, planned_months, tramo)
select t.id, v.code, v.name, v.objective, v.tramo, v.semanas, v.meses, v.tramo
from roadmap_templates t
cross join (values
  ('tramo_1', 'De idea a MVP', 'Pasar de la idea a un producto mínimo que alguien ajeno al equipo ha probado, con el problema validado y la sociedad constituida.', 1, 26, 6),
  ('tramo_2', 'De MVP a piloto', 'Tener usuarios externos usando el MVP y un piloto acordado por escrito con un cliente.', 2, 17, 4),
  ('tramo_3', 'De piloto a facturación', 'Cerrar el piloto con resultados medidos, validar el precio y emitir la primera factura.', 3, 13, 3),
  ('tramo_4', 'De facturación a invertible', 'Llegar a ser invertible: clientes que repiten, margen conocido, data room completo y plan de inversión.', 4, 22, 5)
) as v(code, name, objective, tramo, semanas, meses)
where t.code = 'hoja_iwl'
on conflict (template_id, code) do nothing;

insert into roadmap_template_milestones (template_stage_id, title, success_criteria, order_index, fundamental, gates_investable)
select s.id, v.titulo, v.titulo, v.orden, true, v.invertible
from roadmap_template_stages s
join roadmap_templates t on t.id = s.template_id and t.code = 'hoja_iwl'
join (values
  (1, 1, 'Problema validado con entrevistas a clientes potenciales', false),
  (1, 2, 'Cliente y propuesta de valor definidos', false),
  (1, 3, 'Modelo de negocio y business plan inicial', false),
  (1, 4, 'Sociedad constituida y pacto de socias', false),
  (1, 5, 'MVP construido y probado por alguien ajeno al equipo', false),
  (2, 1, 'Usuarios externos usando el MVP, con métricas', false),
  (2, 2, 'Piloto acordado por escrito con un cliente: alcance, duración y criterio de éxito', false),
  (2, 3, 'Producto ajustado con lo aprendido', false),
  (3, 1, 'Piloto cerrado con resultados medidos', false),
  (3, 2, 'Precio validado y primera factura', false),
  (3, 3, 'Empresa en regla para facturar: contratos, protección de datos y contabilidad', false),
  (4, 1, 'Clientes que repiten', true),
  (4, 2, 'Margen por cliente conocido', true),
  (4, 3, 'Data room completo', true),
  (4, 4, 'Plan de inversión: cuánto, para qué y con quién', true)
) as v(tramo, orden, titulo, invertible) on v.tramo = s.tramo
where not exists (
  select 1 from roadmap_template_milestones m where m.template_stage_id = s.id and m.order_index = v.orden
);

-- -----------------------------------------------------------------------------
-- Lo que sale del estadio: el tramo de entrada y el plazo máximo
-- -----------------------------------------------------------------------------

create or replace function app.tramo_de_entrada(e estado_entrada)
returns smallint language sql immutable as $$
  select case e
    when 'idea' then 1 when 'mvp_sin_piloto' then 2 when 'mvp_con_piloto' then 3 when 'facturando' then 4
  end::smallint
$$;

create or replace function app.plantilla_hoja_iwl()
returns uuid language sql stable as $$
  select id from roadmap_templates where code = 'hoja_iwl'
$$;

-- Los meses que le quedan desde un tramo: la suma de ese y los siguientes
create or replace function app.plazo_maximo_meses(e estado_entrada)
returns integer language sql stable as $$
  select coalesce(sum(s.planned_months), 0)::int
  from roadmap_template_stages s
  where s.template_id = app.plantilla_hoja_iwl() and s.tramo >= app.tramo_de_entrada(e)
$$;

-- -----------------------------------------------------------------------------
-- «Lo que ya tenéis» (en idea, «Diagnóstico»): sus respuestas y la
-- verificación del mentor
-- -----------------------------------------------------------------------------

create table if not exists entry_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  template_milestone_id uuid not null references roadmap_template_milestones (id) on delete cascade,
  answer text not null check (answer in ('si', 'no')),
  evidence_path text,
  evidence_name text,
  answered_by uuid references profiles (id) on delete set null,
  answered_at timestamptz not null default now(),
  verification text check (verification in ('verificado', 'no_basta')),
  review_comment text,
  verified_by uuid references profiles (id) on delete set null,
  verified_at timestamptz,
  unique (company_id, template_milestone_id),
  -- «Ya lo tenemos» va siempre con su archivo
  constraint entry_checks_si_con_archivo check (answer = 'no' or evidence_path is not null),
  -- «No basta», con su comentario
  constraint entry_checks_no_basta_con_comentario check (
    verification is distinct from 'no_basta' or length(trim(coalesce(review_comment, ''))) > 0
  ),
  constraint entry_checks_verifica_un_si check (verification is null or answer = 'si')
);

comment on table entry_checks is
  'La lista de entrada: para cada hito fundamental anterior a su tramo de entrada (en idea, los del tramo 1), si ya lo tiene (con archivo) y lo que dice el mentor.';

alter table entry_checks enable row level security;

drop policy if exists entry_checks_select on entry_checks;
create policy entry_checks_select on entry_checks
  for select to authenticated using (app.can_read_company(company_id));
-- Se escribe solo por las dos funciones de abajo

-- Los hitos que le toca contestar, por su estadio
create or replace function app.hitos_de_la_lista(p_company uuid)
returns setof roadmap_template_milestones language sql stable security definer set search_path = public as $$
  select m.*
  from roadmap_template_milestones m
  join roadmap_template_stages s on s.id = m.template_stage_id
  join companies c on c.id = p_company
  where s.template_id = app.plantilla_hoja_iwl()
    and m.fundamental
    and (s.tramo < app.tramo_de_entrada(c.entry_state)
         or (c.entry_state = 'idea' and s.tramo = 1))
  order by s.tramo, m.order_index
$$;

create or replace function public.responder_lista_entrada(
  p_company uuid,
  p_hito uuid,
  p_respuesta text,
  p_ruta text default null,
  p_nombre text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.fundadora_de(p_company) then
    raise exception 'La lista la contesta el equipo fundador.' using errcode = '42501';
  end if;
  if not exists (select 1 from app.hitos_de_la_lista(p_company) h where h.id = p_hito) then
    raise exception 'Ese hito no es de tu lista.' using errcode = 'P0001';
  end if;
  if exists (select 1 from roadmap_stages where company_id = p_company) then
    raise exception 'Tu hoja de ruta ya está hecha: lo que falte se trabaja desde ella.' using errcode = 'P0001';
  end if;
  if p_respuesta not in ('si', 'no') then
    raise exception 'Di si ya lo tenéis o todavía no.' using errcode = 'P0001';
  end if;
  if p_respuesta = 'si' and coalesce(trim(p_ruta), '') = '' then
    raise exception 'Si ya lo tenéis, adjunta el archivo que lo demuestra.' using errcode = 'P0001';
  end if;
  if p_ruta is not null and p_ruta not like p_company::text || '/%' then
    raise exception 'Ese archivo no es de tu compañía.' using errcode = '42501';
  end if;

  insert into entry_checks (company_id, template_milestone_id, answer, evidence_path, evidence_name, answered_by, answered_at)
  values (p_company, p_hito, p_respuesta,
          case when p_respuesta = 'si' then p_ruta end,
          case when p_respuesta = 'si' then nullif(trim(coalesce(p_nombre, '')), '') end,
          auth.uid(), now())
  on conflict (company_id, template_milestone_id) do update set
    answer = excluded.answer,
    evidence_path = excluded.evidence_path,
    evidence_name = excluded.evidence_name,
    answered_by = excluded.answered_by,
    answered_at = excluded.answered_at,
    -- Lo que cambia ella vuelve a estar por verificar
    verification = null, review_comment = null, verified_by = null, verified_at = null;
end;
$$;

create or replace function public.verificar_lista_entrada(p_check uuid, p_verificado boolean, p_comentario text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c entry_checks%rowtype;
begin
  select * into c from entry_checks where id = p_check for update;
  if not found then
    raise exception 'Esa respuesta ya no está.' using errcode = 'P0001';
  end if;
  -- El mentor principal o IWL: quien coordina el proyecto
  if not app.coordina_company(c.company_id) then
    raise exception 'La lista la verifica el mentor de la compañía, o dirección.' using errcode = '42501';
  end if;
  if c.answer <> 'si' then
    raise exception 'Solo se verifica un «ya lo tenemos».' using errcode = 'P0001';
  end if;
  if not p_verificado and length(trim(coalesce(p_comentario, ''))) < 5 then
    raise exception 'Dile por qué no basta: es lo que ella va a completar.' using errcode = 'P0001';
  end if;
  update entry_checks set
    verification = case when p_verificado then 'verificado' else 'no_basta' end,
    review_comment = nullif(trim(coalesce(p_comentario, '')), ''),
    verified_by = auth.uid(),
    verified_at = now()
  where id = p_check;
end;
$$;

revoke all on function public.responder_lista_entrada(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.verificar_lista_entrada(uuid, boolean, text) from public, anon;
grant execute on function public.responder_lista_entrada(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.verificar_lista_entrada(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Generar la hoja de ruta (paso 2 del asistente)
--
-- Desde su tramo de entrada hasta el 4, con sus hitos fundamentales y las
-- fechas repartidas por la duración de cada tramo. Los de la lista: lo
-- verificado, cumplido; lo demás, pendiente. Los de tramos anteriores van
-- dentro del tramo de entrada, con el tramo de donde vienen. Se genera en
-- borrador con el Anexo, y hasta firmar se puede rehacer.
-- -----------------------------------------------------------------------------

create or replace function app.copiar_hoja_iwl(p_company uuid, p_inicio date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  co companies%rowtype;
  v_entrada smallint;
  v_anexo uuid;
  v_etapa record;
  v_id uuid;
  v_primera uuid;
  v_cursor date := coalesce(p_inicio, current_date);
  v_fin date;
  v_creadas integer := 0;
  h record;
begin
  select * into co from companies where id = p_company;
  if co.entry_state is null then
    raise exception 'Falta el estadio de la compañía.' using errcode = 'P0001';
  end if;
  if exists (select 1 from roadmap_stages where company_id = p_company) then
    raise exception 'Ya tiene hoja de ruta. Para rehacerla, bórrala antes.' using errcode = '23505';
  end if;
  v_entrada := app.tramo_de_entrada(co.entry_state);
  select id into v_anexo from annexes where company_id = p_company order by version desc limit 1;

  for v_etapa in
    select * from roadmap_template_stages
    where template_id = app.plantilla_hoja_iwl() and tramo >= v_entrada
    order by tramo
  loop
    v_fin := (v_cursor + make_interval(months => coalesce(v_etapa.planned_months, 3)))::date - 1;
    insert into roadmap_stages (company_id, annex_id, template_stage_id, name, objective, order_index,
                                starts_on, ends_on, tramo, created_by)
    values (p_company, v_anexo, v_etapa.id, v_etapa.name, v_etapa.objective, v_etapa.tramo,
            v_cursor, v_fin, v_etapa.tramo, auth.uid())
    returning id into v_id;
    if v_primera is null then v_primera := v_id; end if;

    -- Sus hitos fundamentales. En idea, los del tramo 1 salen de su lista
    for h in
      select m.*, ec.verification, ec.verified_at, ec.evidence_name
      from roadmap_template_milestones m
      left join entry_checks ec on ec.template_milestone_id = m.id and ec.company_id = p_company
      where m.template_stage_id = v_etapa.id
      order by m.order_index
    loop
      insert into milestones (company_id, annex_id, stage_id, title, success_criteria, evidence, due_date,
                              origin, gates_investable, fundamental, template_milestone_id, status,
                              completed_on, created_by)
      values (p_company, v_anexo, v_id, h.title, h.success_criteria, h.expected_evidence, v_fin,
              'anexo', h.gates_investable, true, h.id,
              case when h.verification = 'verificado' then 'cumplido'::estado_hito else 'pendiente'::estado_hito end,
              case when h.verification = 'verificado' then h.verified_at::date end,
              auth.uid());
    end loop;

    v_cursor := v_fin + 1;
    v_creadas := v_creadas + 1;
  end loop;

  -- Los de tramos anteriores, dentro del tramo de entrada, con su tramo de origen
  for h in
    select m.*, s.tramo as de_tramo, ec.verification, ec.verified_at
    from roadmap_template_milestones m
    join roadmap_template_stages s on s.id = m.template_stage_id
    left join entry_checks ec on ec.template_milestone_id = m.id and ec.company_id = p_company
    where s.template_id = app.plantilla_hoja_iwl() and m.fundamental and s.tramo < v_entrada
    order by s.tramo, m.order_index
  loop
    insert into milestones (company_id, annex_id, stage_id, title, success_criteria, evidence, due_date,
                            origin, gates_investable, fundamental, template_milestone_id, from_tramo, status,
                            completed_on, created_by)
    select p_company, v_anexo, v_primera, h.title, h.success_criteria, h.expected_evidence, st.ends_on,
           'anexo', h.gates_investable, true, h.id, h.de_tramo,
           case when h.verification = 'verificado' then 'cumplido'::estado_hito else 'pendiente'::estado_hito end,
           case when h.verification = 'verificado' then h.verified_at::date end,
           auth.uid()
    from roadmap_stages st where st.id = v_primera;
  end loop;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (p_company, auth.uid(), 'roadmap_stages', p_company, 'hoja_de_ruta_generada',
          jsonb_build_object('tramo_de_entrada', v_entrada, 'tramos', v_creadas, 'inicio', p_inicio));
  return v_creadas;
end;
$$;

-- La puerta: quien coordina. Sin sesión (la semilla) se llama directamente a la de dentro
create or replace function public.generar_hoja_de_ruta(p_company uuid, p_inicio date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.coordina_company(p_company) then
    raise exception 'La hoja de ruta la prepara dirección o el mentor principal.' using errcode = '42501';
  end if;
  return app.copiar_hoja_iwl(p_company, p_inicio);
end;
$$;

revoke all on function app.copiar_hoja_iwl(uuid, date) from public, anon, authenticated;
revoke all on function public.generar_hoja_de_ruta(uuid, date) from public, anon;
grant execute on function public.generar_hoja_de_ruta(uuid, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Un hito fundamental lo quita solo dirección, con motivo. Uno propio, quien
-- coordina, como siempre.
-- -----------------------------------------------------------------------------

create or replace function app.guard_quitar_fundamental()
returns trigger
language plpgsql
as $$
begin
  if not old.fundamental then return old; end if;
  if not exists (select 1 from companies where id = old.company_id) then return old; end if;
  -- El borrador se rehace entero
  if coalesce(current_setting('app.rehacer_hoja', true), '') = 'si' then return old; end if;
  if auth.uid() is null then return old; end if;
  if not app.is_admin() or coalesce(current_setting('app.motivo_hito', true), '') = '' then
    raise exception 'Un hito fundamental lo quita solo dirección, con motivo.' using errcode = '42501';
  end if;
  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (old.company_id, auth.uid(), 'milestone', old.id, 'hito_fundamental_quitado',
          jsonb_build_object('titulo', old.title, 'motivo', current_setting('app.motivo_hito', true)));
  return old;
end;
$$;

drop trigger if exists milestones_guard_fundamental on milestones;
create trigger milestones_guard_fundamental
  before delete on milestones
  for each row execute function app.guard_quitar_fundamental();

-- Rehacerla, mientras no se ha firmado. Puede quitar los fundamentales: es
-- la misma hoja de ruta otra vez
create or replace function public.borrar_borrador_hoja_de_ruta(p_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.coordina_company(p_company) then
    raise exception 'La hoja de ruta la prepara dirección o el mentor principal.' using errcode = '42501';
  end if;
  if exists (select 1 from annexes where company_id = p_company and status in ('firmado', 'cerrado')) then
    raise exception 'Con el Acuerdo firmado la hoja de ruta ya no se rehace: se cambia hito a hito.' using errcode = 'P0001';
  end if;
  if exists (select 1 from annexes where company_id = p_company and status in ('propuesto', 'comentado', 'aceptado')) then
    raise exception 'Está en la propuesta de Acuerdo. Devuelve el Anexo a borrador para rehacerla.' using errcode = 'P0001';
  end if;
  perform set_config('app.rehacer_hoja', 'si', true);
  delete from milestones where company_id = p_company and stage_id is not null;
  delete from roadmap_stages where company_id = p_company;
end;
$$;

create or replace function public.quitar_hito(p_hito uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m milestones%rowtype;
begin
  select * into m from milestones where id = p_hito;
  if not found then
    raise exception 'Ese hito ya no está.' using errcode = 'P0001';
  end if;
  if not app.coordina_company(m.company_id) then
    raise exception 'Un hito lo quita quien coordina el proyecto.' using errcode = '42501';
  end if;
  if m.fundamental then
    if not app.is_admin() then
      raise exception 'Un hito fundamental lo quita solo dirección, con motivo.' using errcode = '42501';
    end if;
    if length(trim(coalesce(p_motivo, ''))) < 10 then
      raise exception 'Escribe por qué se quita: queda en el registro.' using errcode = 'P0001';
    end if;
  end if;
  perform set_config('app.motivo_hito', coalesce(trim(p_motivo), ''), true);
  delete from milestones where id = p_hito;
end;
$$;

revoke all on function public.borrar_borrador_hoja_de_ruta(uuid) from public, anon;
grant execute on function public.borrar_borrador_hoja_de_ruta(uuid) to authenticated;
revoke all on function public.quitar_hito(uuid, text) from public, anon;
grant execute on function public.quitar_hito(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Cerrar un tramo: al validarse su último hito, se cierra solo y se abre el
-- siguiente. Avisa a ella y a dirección; al cerrar el tramo 4, a dirección:
-- listo para valorar si es invertible (bloque 8).
-- -----------------------------------------------------------------------------

create or replace function app.al_cumplir_hito_tramo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  st roadmap_stages%rowtype;
  v_siguiente uuid;
begin
  if new.status <> 'cumplido' or old.status = 'cumplido' or new.stage_id is null then
    return new;
  end if;
  select * into st from roadmap_stages where id = new.stage_id;
  if st.tramo is null or st.closed_at is not null then return new; end if;
  -- Solo con el Acuerdo firmado: antes es un borrador
  if not exists (select 1 from annexes where company_id = new.company_id and status in ('firmado', 'cerrado')) then
    return new;
  end if;
  if exists (select 1 from milestones where stage_id = st.id and id <> new.id and status <> 'cumplido') then
    return new;
  end if;

  update roadmap_stages set status = 'completada', closed_at = now() where id = st.id;
  select id into v_siguiente from roadmap_stages
  where company_id = st.company_id and order_index > st.order_index order by order_index limit 1;
  if v_siguiente is not null then
    update roadmap_stages set status = 'en_curso' where id = v_siguiente;
  end if;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (st.company_id, auth.uid(), 'roadmap_stages', st.id, 'tramo_cerrado',
          jsonb_build_object('tramo', st.tramo, 'nombre', st.name));

  -- A ella, y a dirección
  insert into avisos (tipo, company_id, para)
  select 'tramo_cerrado_ella', st.company_id, m.profile_id
  from company_members m where m.company_id = st.company_id and m.member_role = 'fundadora';
  insert into avisos (tipo, company_id, para)
  values (case when st.tramo = 4 then 'listo_para_invertible' else 'tramo_cerrado' end, st.company_id, null);
  return new;
end;
$$;

drop trigger if exists milestones_cerrar_tramo on milestones;
create trigger milestones_cerrar_tramo
  after update of status on milestones
  for each row execute function app.al_cumplir_hito_tramo();

-- Firmado el Acuerdo, el primer tramo abierto pasa a en curso
create or replace function app.al_firmar_abrir_tramo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'firmado' and old.status is distinct from 'firmado' then
    update roadmap_stages set status = 'en_curso'
    where id = (
      select id from roadmap_stages
      where company_id = new.company_id and closed_at is null and status <> 'completada'
      order by order_index limit 1
    ) and status = 'planificada';
  end if;
  return new;
end;
$$;

drop trigger if exists annexes_abrir_tramo on annexes;
create trigger annexes_abrir_tramo
  after update of status on annexes
  for each row execute function app.al_firmar_abrir_tramo();

-- -----------------------------------------------------------------------------
-- El plazo: si vence, no se cierra nada solo; se avisa a dirección (bloque 8)
-- -----------------------------------------------------------------------------

create or replace function public.avisar_plazos_vencidos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creados integer;
begin
  if auth.uid() is not null then
    raise exception 'Esto lo llama el cron.' using errcode = '42501';
  end if;
  insert into avisos (tipo, company_id, para)
  select 'plazo_vencido', c.id, null
  from companies c
  join lateral (
    select min(a.signed_on) as firma from annexes a where a.company_id = c.id and a.status in ('firmado', 'cerrado')
  ) f on f.firma is not null
  where c.archived_at is null
    and c.tramo = 'incubacion'
    and c.entry_state is not null
    and (f.firma + make_interval(months => app.plazo_maximo_meses(c.entry_state)))::date < current_date
    and not exists (select 1 from avisos v where v.company_id = c.id and v.tipo = 'plazo_vencido');
  get diagnostics v_creados = row_count;
  return v_creados;
end;
$$;

revoke all on function public.avisar_plazos_vencidos() from public, anon, authenticated;
grant execute on function public.avisar_plazos_vencidos() to service_role;

-- -----------------------------------------------------------------------------
-- Los avisos nuevos
-- -----------------------------------------------------------------------------

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check check (tipo = any (array[
  'primer_acceso', 'nda_firmado', 'situacion_dicha', 'anexo_comentario', 'cambio_estadio',
  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada', 'reunion_anotar', 'hito_entregado',
  'hito_sin_revisar', 'candidatura_nueva', 'acta_por_firmar', 'anexo_aceptado', 'documento_entregado',
  'correos_sin_enviar', 'sesion_por_confirmar', 'sesion_no_cuadra', 'sesion_en_direccion',
  'recomendacion_pendiente', 'tramo_cerrado', 'tramo_cerrado_ella', 'listo_para_invertible', 'plazo_vencido'
]));
