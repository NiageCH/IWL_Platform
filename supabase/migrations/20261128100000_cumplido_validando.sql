-- =============================================================================
-- Un hito se cumple validando su entrega (REVISION, 23 nov · pestaña Hoja de
-- ruta de la compañía, arreglo 4)
--
-- El desplegable de estado dejaba a quien coordina marcar un hito como
-- cumplido sin evidencia y sin validación. Se quita de la pantalla, y la base
-- deja de aceptarlo: con sesión, «cumplido» solo llega por el circuito
-- (entregar → validar). Recreada desde su última definición
-- (20261118110100_hitos_con_evidencia.sql), con esa condición añadida.
-- =============================================================================

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
      /*
       * Cumplido, solo por el circuito (REVISION, 23 nov): validando una
       * entrega, o entregando uno que no pide validación. Ni un desplegable
       * ni una escritura a mano dejan un hito cumplido sin evidencia y sin
       * que lo valide quien revisa. Quedan fuera lo cumplido al entrar, que
       * se verificó en la lista de entrada, y el hito societario cuando la
       * compañía ya consta constituida, que lo cierra la propia base. Sin
       * sesión no aplica: la semilla y las pruebas preparan su estado.
       */
      if v_sesion
         and not v_sin_validacion
         and not (v_circuito and v_anterior = 'entregado')
         and not (tg_op = 'INSERT' and new.met_on_entry)
         and not (new.origin = 'societario' and exists (
               select 1 from companies where id = new.company_id and situacion_societaria = 'constituida')) then
        raise exception 'Un hito se da por cumplido validando su entrega: ella lo entrega con su evidencia y quien revisa lo valida o pide cambios.'
          using errcode = 'P0001';
      end if;
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
