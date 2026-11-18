-- =============================================================================
-- Hitos: ella entrega con evidencia, el mentor valida
--
-- (REVISION, 13 y 18 nov) Hasta ahora un hito tenía un texto «Evidencia»
-- —qué se espera— y un estado que cambiaba quien podía escribir. Ella no
-- podía adjuntar nada y el mentor no tenía cómo comprobar que estaba hecho.
--
-- El circuito:
--   1. Ella entrega: al menos una evidencia y una nota opcional. Pasa a
--      «entregado» y avisa a quien revisa. Si el hito no pide validación,
--      pasa directamente a «cumplido».
--   2. Quien revisa valida (→ cumplido) o pide cambios con un comentario
--      obligatorio (→ en curso). Cada ida y vuelta queda en
--      `milestone_reviews`.
--   3. Si en 7 días nadie revisa, aviso a dirección (lo crea el cron).
--
-- Y dos marcas con efecto económico, que solo pone dirección: el equity
-- que devenga el hito y la financiación que libera. Con cualquiera de las
-- dos —y con «condiciona invertible»— la validación es obligatoria. Son
-- parte de lo pactado: quedan fijas en cuanto el Anexo se propone, y
-- cambiarlas pide una versión nueva.
--
-- Todo lo que decide el circuito vive aquí y no en las acciones: el
-- disparador de `milestones` es quien dice qué paso es válido, lo dé quien
-- lo dé.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Lo que se añade al hito
-- -----------------------------------------------------------------------------

alter table milestones
  add column if not exists requires_validation boolean not null default true,
  add column if not exists accrues_equity_pct numeric(5,2),
  add column if not exists releases_funding numeric(12,2),
  add column if not exists reviewer_id uuid references profiles (id) on delete set null,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivered_by uuid references profiles (id) on delete set null;

comment on column milestones.requires_validation is
  'Si al entregarlo lo tiene que validar el mentor. Obligatorio con equity, financiación o condiciona invertible.';
comment on column milestones.accrues_equity_pct is
  'Equity que devenga al validarse (Acuerdo §7.1). Lo pone dirección; fijo con el Anexo propuesto o firmado.';
comment on column milestones.releases_funding is
  'Financiación directa que libera al validarse (Anexo F.8). Lo pone dirección; fijo con el Anexo propuesto o firmado.';
comment on column milestones.reviewer_id is
  'Un mentor secundario o técnico al que quien coordina le encarga validar este hito, por ser de su materia.';

alter table milestones drop constraint if exists milestones_equity_valido;
alter table milestones add constraint milestones_equity_valido
  check (accrues_equity_pct is null or (accrues_equity_pct > 0 and accrues_equity_pct <= 100));

alter table milestones drop constraint if exists milestones_financiacion_valida;
alter table milestones add constraint milestones_financiacion_valida
  check (releases_funding is null or releases_funding > 0);

-- Con efecto económico o condicionando invertible, la validación no se quita
alter table milestones drop constraint if exists milestones_validacion_obligatoria;
alter table milestones add constraint milestones_validacion_obligatoria
  check (
    requires_validation
    or (accrues_equity_pct is null and releases_funding is null and not gates_investable)
  );

create index if not exists milestones_entregados_idx on milestones (delivered_at)
  where status = 'entregado';

-- -----------------------------------------------------------------------------
-- Quién valida un hito
--
-- Quien coordina el proyecto —IWL y el mentor principal— y, si se lo han
-- encargado, el mentor secundario o técnico de esa compañía. La fundadora
-- nunca: nadie valida su propio trabajo.
-- -----------------------------------------------------------------------------

create or replace function app.valida_hito(p_company uuid, p_revisor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.coordina_company(p_company)
    or (
      p_revisor is not null
      and p_revisor = auth.uid()
      and exists (
        select 1 from company_members
        where company_id = p_company
          and profile_id = auth.uid()
          and member_role in ('mentor_secundario', 'revisor_niage', 'mentor')
      )
    )
$$;

grant execute on function app.valida_hito(uuid, uuid) to authenticated;

/*
 * Un número como lo escribe una persona: «2,5», no «2.50». Solo para los
 * mensajes de error; en pantalla manda `equity()` de `lib/utils.ts`.
 */
create or replace function app.cifra_es(p numeric)
returns text
language sql
immutable
as $$ select replace(trim_scale(p)::text, '.', ',') $$;

-- -----------------------------------------------------------------------------
-- El guardián del hito
--
-- Sustituye al de «cumplido» (20261029150000). Lo de autorización se exime
-- sin sesión; lo de integridad —las sumas, el Anexo fijo, la evidencia, lo
-- devengado— vale siempre.
-- -----------------------------------------------------------------------------

create or replace function app.guard_hito_cumplido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesion     boolean := auth.uid() is not null;
  v_anterior   estado_hito := case when tg_op = 'UPDATE' then old.status end;
  v_valida     boolean;
  v_economico  boolean := new.accrues_equity_pct is not null or new.releases_funding is not null;
  v_sin_validacion boolean := false;
  -- Lo ponen las funciones del circuito: entregar, validar y pedir cambios
  v_circuito   boolean := coalesce(current_setting('app.circuito_hito', true), '') = 'on';
  v_anexo      annexes;
  v_suma       numeric;
begin
  /*
   * En una actualización, las marcas de entrega y confirmación no se
   * escriben desde fuera: las pone este disparador al cambiar de estado.
   */
  if tg_op = 'UPDATE' then
    v_valida := app.valida_hito(new.company_id, old.reviewer_id);
    if new.status is not distinct from old.status then
      new.delivered_at := old.delivered_at;
      new.delivered_by := old.delivered_by;
      new.confirmed_at := old.confirmed_at;
      new.confirmed_by := old.confirmed_by;
      new.completed_on := old.completed_on;
    end if;
  else
    v_valida := app.valida_hito(new.company_id, new.reviewer_id);
  end if;

  -- ---- Las marcas con efecto económico ---------------------------------
  if (tg_op = 'INSERT' and v_economico)
     or (tg_op = 'UPDATE' and (
           new.accrues_equity_pct is distinct from old.accrues_equity_pct
           or new.releases_funding is distinct from old.releases_funding)) then

    if v_sesion and not app.is_admin() then
      raise exception 'El equity y la financiación de un hito los pone dirección.'
        using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' and old.status = 'cumplido' then
      raise exception 'Ese hito ya está validado: lo que devengó o liberó no se cambia.'
        using errcode = '42501';
    end if;

    select * into v_anexo from annexes
    where company_id = new.company_id
    order by version desc
    limit 1;

    if v_anexo.id is null then
      raise exception 'Para marcar un hito con equity o financiación, abre antes el Anexo de Programa: la marca reparte lo que el Anexo pacta.'
        using errcode = 'P0001';
    end if;

    if v_anexo.status <> 'borrador' then
      raise exception 'Con el Anexo propuesto o firmado, el equity y la financiación de los hitos quedan fijos. Para cambiarlos, abre una versión nueva del Anexo.'
        using errcode = '42501';
    end if;

    if new.accrues_equity_pct is not null then
      select coalesce(sum(accrues_equity_pct), 0) into v_suma
      from milestones where company_id = new.company_id and id <> new.id;
      if v_suma + new.accrues_equity_pct > coalesce(v_anexo.equity_pct, 0) then
        raise exception 'Con este hito, los marcados devengarían % %% de equity y el Anexo pacta % %%. Quedan % %% por repartir.',
          app.cifra_es(v_suma + new.accrues_equity_pct),
          app.cifra_es(coalesce(v_anexo.equity_pct, 0)),
          app.cifra_es(greatest(coalesce(v_anexo.equity_pct, 0) - v_suma, 0))
          using errcode = 'P0001';
      end if;
    end if;

    if new.releases_funding is not null then
      select coalesce(sum(releases_funding), 0) into v_suma
      from milestones where company_id = new.company_id and id <> new.id;
      if v_suma + new.releases_funding > coalesce(v_anexo.committed_cash, 0) then
        raise exception 'Con este hito, los marcados liberarían % € y el Anexo compromete % € de financiación directa. Quedan % € por repartir.',
          app.cifra_es(v_suma + new.releases_funding),
          app.cifra_es(coalesce(v_anexo.committed_cash, 0)),
          app.cifra_es(greatest(coalesce(v_anexo.committed_cash, 0) - v_suma, 0))
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- ---- Si pide validación y quién revisa: quien coordina ----------------
  if tg_op = 'UPDATE' and v_sesion
     and (new.requires_validation is distinct from old.requires_validation
          or new.reviewer_id is distinct from old.reviewer_id)
     and not app.coordina_company(new.company_id) then
    raise exception 'Si un hito pide validación, y quién lo revisa, lo decide quien coordina el proyecto.'
      using errcode = '42501';
  end if;

  if new.reviewer_id is not null
     and (tg_op = 'INSERT' or new.reviewer_id is distinct from old.reviewer_id)
     and not exists (
       select 1 from company_members
       where company_id = new.company_id
         and profile_id = new.reviewer_id
         and member_role in ('mentor_secundario', 'revisor_niage', 'mentor')
     ) then
    raise exception 'Quien revisa un hito tiene que ser mentor o revisor técnico de esa compañía.'
      using errcode = 'P0001';
  end if;

  -- ---- La fecha de un hito con efecto económico: con motivo -------------
  if tg_op = 'UPDATE'
     and new.due_date is distinct from old.due_date
     and (old.accrues_equity_pct is not null or old.releases_funding is not null) then
    if coalesce(current_setting('app.motivo_hito', true), '') = '' then
      raise exception 'Un hito con equity o financiación no cambia de fecha sin motivo.'
        using errcode = 'P0001';
    end if;
    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (new.company_id, auth.uid(), 'milestone', new.id, 'hito_fecha_cambiada',
            jsonb_build_object('titulo', new.title, 'antes', old.due_date, 'despues', new.due_date,
                               'motivo', current_setting('app.motivo_hito', true)));
  end if;

  -- ---- El estado ---------------------------------------------------------
  if new.status is distinct from v_anterior then

    -- Lo devengado no se reabre
    if v_anterior = 'cumplido' then
      if old.accrues_equity_pct is not null or old.releases_funding is not null then
        raise exception 'Un hito que ya devengó equity o liberó financiación no se reabre: es parte de lo pactado.'
          using errcode = '42501';
      end if;
      if v_sesion and not app.coordina_company(new.company_id) then
        raise exception 'Reabrir un hito cumplido es de IWL o de quien coordina el proyecto.'
          using errcode = '42501';
      end if;
    end if;

    -- Salir de «entregado» sin validarlo es pedir cambios: lo hace quien revisa
    if v_anterior = 'entregado' and new.status <> 'cumplido' and v_sesion
       and (not v_valida or not v_circuito) then
      raise exception 'Un hito entregado lo revisa el mentor: lo valida o pide cambios.'
        using errcode = '42501';
    end if;

    if new.status = 'entregado' then
      -- Por su botón: es el que deja la entrega en el historial y avisa
      if v_sesion and not v_circuito then
        raise exception 'Un hito se entrega con «Entregar», que guarda la entrega y avisa a quien lo revisa.'
          using errcode = 'P0001';
      end if;
      if not exists (
        select 1 from evidence_links
        where entity = 'milestone' and entity_id = new.id
      ) then
        raise exception 'Para entregar un hito, adjunta al menos una evidencia: un archivo, un documento del data room o un enlace.'
          using errcode = 'P0001';
      end if;
      new.delivered_at := now();
      new.delivered_by := auth.uid();
      -- Sin validación, entregarlo es cumplirlo
      if not new.requires_validation then
        new.status := 'cumplido';
        v_sin_validacion := true;
      end if;
    end if;

    if new.status = 'cumplido' then
      if v_economico and v_anterior is distinct from 'entregado' then
        raise exception 'Un hito con equity o financiación se valida sobre una entrega: primero ella lo entrega con su evidencia.'
          using errcode = 'P0001';
      end if;
      -- Y con «Validar», que deja lo devengado en el registro
      if v_economico and v_sesion and not v_circuito then
        raise exception 'Un hito con equity o financiación se valida con «Validar», que deja lo devengado en el registro.'
          using errcode = 'P0001';
      end if;
      if v_sesion and not v_valida and not v_sin_validacion then
        raise exception 'Confirmar un hito como cumplido es de IWL o de quien coordina el proyecto.'
          using errcode = '42501';
      end if;
      new.completed_on := coalesce(new.completed_on, current_date);
      if v_sin_validacion then
        new.confirmed_by := null;
        new.confirmed_at := null;
      elsif tg_op = 'UPDATE' then
        new.confirmed_by := auth.uid();
        new.confirmed_at := now();
      else
        new.confirmed_by := coalesce(new.confirmed_by, auth.uid());
        new.confirmed_at := coalesce(new.confirmed_at, now());
      end if;
    end if;
  end if;

  if new.status <> 'cumplido' then
    new.confirmed_by := null;
    new.confirmed_at := null;
    new.completed_on := null;
  end if;

  if new.status not in ('entregado', 'cumplido') then
    new.delivered_at := null;
    new.delivered_by := null;
  end if;

  return new;
end;
$$;

-- El disparador ya existe (milestones_guard_cumplido) y llama a esta función

-- -----------------------------------------------------------------------------
-- Borrar un hito con efecto económico: con motivo, y queda en el registro
-- -----------------------------------------------------------------------------

create or replace function app.guard_borrar_hito()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Al borrar la compañía entera, el hito se va con ella
  if not exists (select 1 from companies where id = old.company_id) then
    return old;
  end if;
  if old.accrues_equity_pct is null and old.releases_funding is null then
    return old;
  end if;
  if coalesce(current_setting('app.motivo_hito', true), '') = '' then
    raise exception 'Un hito con equity o financiación no se borra sin motivo.'
      using errcode = 'P0001';
  end if;
  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (old.company_id, auth.uid(), 'milestone', old.id, 'hito_borrado',
          jsonb_build_object('titulo', old.title, 'equity_pct', old.accrues_equity_pct,
                             'financiacion', old.releases_funding,
                             'motivo', current_setting('app.motivo_hito', true)));
  return old;
end;
$$;

drop trigger if exists milestones_guard_borrar on milestones;
create trigger milestones_guard_borrar
  before delete on milestones
  for each row execute function app.guard_borrar_hito();

-- -----------------------------------------------------------------------------
-- La evidencia de un hito entregado o cumplido no se cambia
--
-- Es lo que el mentor revisó. Si pide cambios, el hito vuelve a «en curso»
-- y ella puede tocarla otra vez.
-- -----------------------------------------------------------------------------

create or replace function app.guard_evidencia_hito()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entidad text := case when tg_op = 'DELETE' then old.entity else new.entity end;
  v_id      uuid := case when tg_op = 'DELETE' then old.entity_id else new.entity_id end;
  v_company uuid := case when tg_op = 'DELETE' then old.company_id else new.company_id end;
begin
  if v_entidad = 'milestone'
     and exists (select 1 from companies where id = v_company)
     and exists (select 1 from milestones where id = v_id and status in ('entregado', 'cumplido')) then
    raise exception 'La evidencia de un hito entregado no se cambia: es lo que se está revisando. Si hay que cambiarla, el mentor pide cambios.'
      using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists evidence_links_guard_hito on evidence_links;
create trigger evidence_links_guard_hito
  before insert or update or delete on evidence_links
  for each row execute function app.guard_evidencia_hito();

-- -----------------------------------------------------------------------------
-- El historial de cada hito: entregas, validaciones, cambios pedidos, notas
-- -----------------------------------------------------------------------------

create table if not exists milestone_reviews (
  id           uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones (id) on delete cascade,
  company_id   uuid not null references companies (id) on delete cascade,
  kind         text not null check (kind in ('entrega', 'validacion', 'cambios', 'nota')),
  comment      text,
  -- Lo que estaba adjunto al entregar: si después cambia, aquí queda lo revisado
  evidence     jsonb not null default '[]'::jsonb,
  author_id    uuid references profiles (id) on delete set null,
  -- El nombre se copia: no cambia si la persona cambia el suyo
  author_name  text,
  created_at   timestamptz not null default now(),
  constraint milestone_reviews_con_comentario
    check (kind not in ('cambios', 'nota') or length(trim(coalesce(comment, ''))) > 0)
);

create index if not exists milestone_reviews_hito on milestone_reviews (milestone_id, created_at);

comment on table milestone_reviews is
  'Cada ida y vuelta de un hito: entrega, validación, cambios pedidos y notas. Lo escriben las funciones del circuito.';

alter table milestone_reviews enable row level security;

drop policy if exists milestone_reviews_leer on milestone_reviews;
create policy milestone_reviews_leer on milestone_reviews
  for select to authenticated using (app.can_read_company(company_id));

-- Sin política de escritura: solo las funciones del circuito. Y no se edita
create or replace function app.guard_milestone_review()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'El historial de un hito no se edita.' using errcode = '42501';
  end if;
  -- En cascada, desde el hito o desde la compañía, alguno de los dos ya no está
  if exists (select 1 from milestones where id = old.milestone_id)
     and exists (select 1 from companies where id = old.company_id) then
    raise exception 'El historial de un hito no se borra: se va con su hito.' using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists milestone_reviews_guard on milestone_reviews;
create trigger milestone_reviews_guard
  before update or delete on milestone_reviews
  for each row execute function app.guard_milestone_review();

-- -----------------------------------------------------------------------------
-- Avisos de hitos
-- -----------------------------------------------------------------------------

alter table avisos add column if not exists milestone_id uuid references milestones (id) on delete cascade;

alter table avisos drop constraint if exists avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check
  check (tipo in ('primer_acceso', 'nda_firmado', 'nda_comentario', 'situacion_dicha',
                  'anexo_comentario', 'cambio_via',
                  'reunion_elegida', 'reunion_contrapropuesta', 'reunion_caducada',
                  'hito_entregado', 'hito_sin_revisar'));

-- -----------------------------------------------------------------------------
-- El circuito, en funciones
-- -----------------------------------------------------------------------------

create or replace function app.nombre_de(p_persona uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(concat_ws(' ', full_name, last_name)), '') from profiles where id = p_persona
$$;

create or replace function app.evidencia_de_hito(p_hito uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('label', label, 'url', url, 'document_id', target_id) order by created_at),
    '[]'::jsonb)
  from evidence_links
  where entity = 'milestone' and entity_id = p_hito
$$;

/*
 * Entregar. Devuelve el estado en que queda: «entregado», o «cumplido» si
 * el hito no pide validación.
 */
create or replace function app.entregar_hito(p_hito uuid, p_nota text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  m        milestones;
  v_estado estado_hito;
begin
  select * into m from milestones where id = p_hito;
  if m.id is null or not app.can_write_company(m.company_id) then
    raise exception 'Ese hito no existe o no está a tu alcance.' using errcode = '42501';
  end if;
  if m.status in ('entregado', 'cumplido') then
    raise exception 'Ese hito ya está entregado. Vuelve a cargar la página.' using errcode = 'P0001';
  end if;

  perform set_config('app.circuito_hito', 'on', true);
  update milestones set status = 'entregado' where id = p_hito
  returning status into v_estado;

  insert into milestone_reviews (milestone_id, company_id, kind, comment, evidence, author_id, author_name)
  values (p_hito, m.company_id, 'entrega', nullif(trim(coalesce(p_nota, '')), ''),
          app.evidencia_de_hito(p_hito), auth.uid(), app.nombre_de(auth.uid()));

  if v_estado = 'entregado' then
    -- A quien revisa: el encargado, si lo hay, y los mentores principales
    insert into avisos (tipo, profile_id, company_id, milestone_id, para)
    select distinct 'hito_entregado', auth.uid(), m.company_id, p_hito, x.para
    from (
      select m.reviewer_id as para where m.reviewer_id is not null
      union
      select profile_id from company_members
      where company_id = m.company_id and member_role = 'mentor_principal'
    ) x;
    -- Sin mentor principal ni encargado, revisa dirección
    if not found then
      insert into avisos (tipo, profile_id, company_id, milestone_id, para)
      values ('hito_entregado', auth.uid(), m.company_id, p_hito, null);
    end if;
  end if;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (m.company_id, auth.uid(), 'milestone', p_hito, 'hito_entregado',
          jsonb_build_object('titulo', m.title, 'estado', v_estado));

  return v_estado::text;
end;
$$;

create or replace function app.validar_hito(p_hito uuid, p_nota text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m        milestones;
  v_quien  text := app.nombre_de(auth.uid());
begin
  select * into m from milestones where id = p_hito;
  if m.id is null or not app.valida_hito(m.company_id, m.reviewer_id) then
    raise exception 'Validar un hito es del mentor principal o de dirección.' using errcode = '42501';
  end if;
  if m.status <> 'entregado' then
    raise exception 'Solo se valida un hito entregado. Vuelve a cargar la página.' using errcode = 'P0001';
  end if;

  perform set_config('app.circuito_hito', 'on', true);
  update milestones set status = 'cumplido' where id = p_hito;

  insert into milestone_reviews (milestone_id, company_id, kind, comment, evidence, author_id, author_name)
  values (p_hito, m.company_id, 'validacion', nullif(trim(coalesce(p_nota, '')), ''),
          app.evidencia_de_hito(p_hito), auth.uid(), v_quien);

  update avisos set cerrado_at = now(), cerrado_por = auth.uid()
  where milestone_id = p_hito and cerrado_at is null;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (m.company_id, auth.uid(), 'milestone', p_hito, 'hito_validado',
          jsonb_build_object('titulo', m.title, 'validado_por', v_quien));

  -- Lo que tiene efecto económico, en su propia línea del registro
  if m.accrues_equity_pct is not null then
    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (m.company_id, auth.uid(), 'milestone', p_hito, 'equity_devengado',
            jsonb_build_object('titulo', m.title, 'pct', m.accrues_equity_pct,
                               'fecha', current_date, 'validado_por', v_quien));
  end if;
  if m.releases_funding is not null then
    insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
    values (m.company_id, auth.uid(), 'milestone', p_hito, 'financiacion_liberada',
            jsonb_build_object('titulo', m.title, 'importe', m.releases_funding,
                               'fecha', current_date, 'validado_por', v_quien));
  end if;
end;
$$;

create or replace function app.pedir_cambios_hito(p_hito uuid, p_comentario text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m milestones;
begin
  select * into m from milestones where id = p_hito;
  if m.id is null or not app.valida_hito(m.company_id, m.reviewer_id) then
    raise exception 'Pedir cambios en un hito es del mentor principal o de dirección.' using errcode = '42501';
  end if;
  if m.status <> 'entregado' then
    raise exception 'Solo se piden cambios sobre un hito entregado. Vuelve a cargar la página.' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_comentario, ''))) = 0 then
    raise exception 'Di qué hay que cambiar: ella lo lee en el hito.' using errcode = 'P0001';
  end if;

  insert into milestone_reviews (milestone_id, company_id, kind, comment, evidence, author_id, author_name)
  values (p_hito, m.company_id, 'cambios', trim(p_comentario),
          app.evidencia_de_hito(p_hito), auth.uid(), app.nombre_de(auth.uid()));

  perform set_config('app.circuito_hito', 'on', true);
  update milestones set status = 'en_curso' where id = p_hito;

  update avisos set cerrado_at = now(), cerrado_por = auth.uid()
  where milestone_id = p_hito and cerrado_at is null;

  insert into activity_log (company_id, actor_id, entity, entity_id, action, detail)
  values (m.company_id, auth.uid(), 'milestone', p_hito, 'hito_cambios_pedidos',
          jsonb_build_object('titulo', m.title, 'comentario', trim(p_comentario)));
end;
$$;

/*
 * Una nota sobre el hito. La deja quien acompaña sin validar: el mentor
 * secundario, el revisor técnico, IWL. La fundadora escribe la suya al
 * entregar.
 */
create or replace function app.comentar_hito(p_hito uuid, p_nota text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m milestones;
begin
  select * into m from milestones where id = p_hito;
  if m.id is null or not (
    app.coordina_company(m.company_id)
    or exists (
      select 1 from company_members
      where company_id = m.company_id and profile_id = auth.uid()
        and member_role in ('mentor_secundario', 'revisor_niage', 'mentor', 'responsable_iwl')
    )
  ) then
    raise exception 'Una nota sobre el hito la deja quien lo acompaña desde IWL.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_nota, ''))) = 0 then
    raise exception 'Escribe la nota.' using errcode = 'P0001';
  end if;
  insert into milestone_reviews (milestone_id, company_id, kind, comment, author_id, author_name)
  values (p_hito, m.company_id, 'nota', trim(p_nota), auth.uid(), app.nombre_de(auth.uid()));
end;
$$;

-- Las de PostgREST, con la sesión de quien llama
create or replace function public.entregar_hito(p_hito uuid, p_nota text default null)
returns text language sql set search_path = public
as $$ select app.entregar_hito(p_hito, p_nota) $$;

create or replace function public.validar_hito(p_hito uuid, p_nota text default null)
returns void language sql set search_path = public
as $$ select app.validar_hito(p_hito, p_nota) $$;

create or replace function public.pedir_cambios_hito(p_hito uuid, p_comentario text)
returns void language sql set search_path = public
as $$ select app.pedir_cambios_hito(p_hito, p_comentario) $$;

create or replace function public.comentar_hito(p_hito uuid, p_nota text)
returns void language sql set search_path = public
as $$ select app.comentar_hito(p_hito, p_nota) $$;

revoke all on function public.entregar_hito(uuid, text) from public, anon;
revoke all on function public.validar_hito(uuid, text) from public, anon;
revoke all on function public.pedir_cambios_hito(uuid, text) from public, anon;
revoke all on function public.comentar_hito(uuid, text) from public, anon;
grant execute on function public.entregar_hito(uuid, text) to authenticated;
grant execute on function public.validar_hito(uuid, text) to authenticated;
grant execute on function public.pedir_cambios_hito(uuid, text) to authenticated;
grant execute on function public.comentar_hito(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Siete días sin revisar: aviso a dirección. Lo llama el cron diario
-- -----------------------------------------------------------------------------

create or replace function app.avisar_hitos_sin_revisar()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuantos integer;
begin
  insert into avisos (tipo, profile_id, company_id, milestone_id, para)
  select 'hito_sin_revisar', m.delivered_by, m.company_id, m.id, null
  from milestones m
  where m.status = 'entregado'
    and m.delivered_at < now() - interval '7 days'
    and not exists (
      select 1 from avisos a
      where a.milestone_id = m.id and a.tipo = 'hito_sin_revisar' and a.cerrado_at is null
    );
  get diagnostics v_cuantos = row_count;
  return v_cuantos;
end;
$$;

create or replace function public.avisar_hitos_sin_revisar()
returns integer language sql security definer set search_path = public
as $$ select app.avisar_hitos_sin_revisar() $$;

revoke all on function app.avisar_hitos_sin_revisar() from public, anon, authenticated;
revoke all on function public.avisar_hitos_sin_revisar() from public, anon, authenticated;
grant execute on function public.avisar_hitos_sin_revisar() to service_role;

-- -----------------------------------------------------------------------------
-- El Anexo: las marcas caben en lo que pacta, y van en su historial
-- -----------------------------------------------------------------------------

/*
 * Al proponer una versión nueva, lo que los hitos devengan y liberan tiene
 * que caber en ella. Una versión que baja el equity por debajo de lo ya
 * repartido no se propone hasta que se quiten marcas.
 */
create or replace function app.marcas_caben_en_anexo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equity numeric;
  v_caja   numeric;
begin
  if new.status = 'propuesto' and old.status is distinct from 'propuesto' then
    select coalesce(sum(accrues_equity_pct), 0), coalesce(sum(releases_funding), 0)
      into v_equity, v_caja
    from milestones where company_id = new.company_id;
    if v_equity > coalesce(new.equity_pct, 0) then
      raise exception 'Los hitos marcados devengan % %% de equity y este Anexo pacta % %%. Ajusta las marcas o el equity antes de proponerlo.',
        app.cifra_es(v_equity), app.cifra_es(coalesce(new.equity_pct, 0))
        using errcode = 'P0001';
    end if;
    if v_caja > coalesce(new.committed_cash, 0) then
      raise exception 'Los hitos marcados liberan % € y este Anexo compromete % €. Ajusta las marcas o la financiación antes de proponerlo.',
        app.cifra_es(v_caja), app.cifra_es(coalesce(new.committed_cash, 0))
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists annexes_marcas_caben on annexes;
create trigger annexes_marcas_caben
  before update of status on annexes
  for each row execute function app.marcas_caben_en_anexo();

-- La copia de cada versión lleva también los hitos con efecto económico
create or replace function app.contenido_anexo(a annexes)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'version', a.version,
    'equity_pct', a.equity_pct,
    'committed_hours', a.committed_hours,
    'committed_hours_value', a.committed_hours_value,
    'committed_hours_value_motivo', a.committed_hours_value_motivo,
    'committed_cash', a.committed_cash,
    'duration_months', a.duration_months,
    'starts_on', a.starts_on,
    'ends_on', a.ends_on,
    'other_commitments', a.other_commitments,
    'firmantes', a.firmantes,
    'signed_on', a.signed_on,
    'hitos_economicos', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'titulo', m.title,
               'fecha', m.due_date,
               'equity_pct', m.accrues_equity_pct,
               'financiacion', m.releases_funding) order by m.due_date nulls last, m.title), '[]'::jsonb)
      from milestones m
      where m.company_id = a.company_id
        and (m.accrues_equity_pct is not null or m.releases_funding is not null)
    )
  );
$$;
