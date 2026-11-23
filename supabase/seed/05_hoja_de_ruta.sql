-- =============================================================================
-- Hojas de ruta de las compañías de demostración (REVISION, 22 nov)
--
-- Con la «Hoja de ruta IWL», en cuatro tramos. Cada compañía entra en el
-- tramo de su estadio, que es lo que hace falta para ver que el recorrido no
-- es el mismo para todas:
--   · Marea, MVP sin piloto: tramos 2 a 4. De su lista «Lo que ya tenéis»
--     (los hitos del tramo 1) tiene verificados cuatro; el quinto queda
--     pendiente dentro de su tramo 2, marcado como del tramo 1.
--   · Raíz, facturando: solo el tramo 4, con lo que le faltaba de antes.
--
-- Vega se queda sin hoja de ruta a propósito: así se ve en pantalla el
-- estado «sin hoja de ruta» con su invitación a prepararla.
--
-- Sin sesión, la semilla usa la función de dentro (`app.copiar_hoja_iwl`);
-- la pública pide ser quien coordina.
-- =============================================================================

update companies set entry_state = 'mvp_sin_piloto' where slug = 'marea-clinica';
update companies set entry_state = 'facturando'     where slug = 'raiz-sensorica';
update companies set entry_state = 'idea'           where slug = 'vega-predictiva';

-- La lista de Marea: cuatro de cinco verificados
insert into entry_checks (company_id, template_milestone_id, answer, evidence_path, evidence_name, answered_at, verification, verified_at)
select c.id, m.id, 'si',
       c.id::text || '/evidencia/demo/' || m.order_index || '.pdf',
       'Evidencia de demostración ' || m.order_index || '.pdf',
       timestamp '2026-03-02 10:00', 'verificado', timestamp '2026-03-05 12:00'
from companies c
join roadmap_template_milestones m on true
join roadmap_template_stages s on s.id = m.template_stage_id and s.tramo = 1
join roadmap_templates t on t.id = s.template_id and t.code = 'hoja_iwl'
where c.slug = 'marea-clinica' and m.order_index <= 4
on conflict do nothing;

insert into entry_checks (company_id, template_milestone_id, answer, answered_at)
select c.id, m.id, 'no', timestamp '2026-03-02 10:00'
from companies c
join roadmap_template_milestones m on true
join roadmap_template_stages s on s.id = m.template_stage_id and s.tramo = 1
join roadmap_templates t on t.id = s.template_id and t.code = 'hoja_iwl'
where c.slug = 'marea-clinica' and m.order_index = 5
on conflict do nothing;

-- La de Raíz (tramos 1 a 3): casi todo verificado; la empresa en regla, todavía no,
-- y el producto ajustado, «no basta»
insert into entry_checks (company_id, template_milestone_id, answer, evidence_path, evidence_name, answered_at,
                          verification, review_comment, verified_at)
select c.id, m.id,
       case when s.tramo = 3 and m.order_index = 3 then 'no' else 'si' end,
       case when s.tramo = 3 and m.order_index = 3 then null else c.id::text || '/evidencia/demo/' || s.tramo || '-' || m.order_index || '.pdf' end,
       case when s.tramo = 3 and m.order_index = 3 then null else 'Evidencia de demostración ' || s.tramo || '.' || m.order_index || '.pdf' end,
       timestamp '2026-08-20 10:00',
       case when s.tramo = 3 and m.order_index = 3 then null
            when s.tramo = 2 and m.order_index = 3 then 'no_basta' else 'verificado' end,
       case when s.tramo = 2 and m.order_index = 3 then 'Falta ver qué cambió del producto tras el piloto: adjunta el registro de cambios.' end,
       case when s.tramo = 3 and m.order_index = 3 then null else timestamp '2026-08-25 12:00' end
from companies c
join roadmap_template_milestones m on true
join roadmap_template_stages s on s.id = m.template_stage_id and s.tramo <= 3
join roadmap_templates t on t.id = s.template_id and t.code = 'hoja_iwl'
where c.slug = 'raiz-sensorica'
on conflict do nothing;

select app.copiar_hoja_iwl((select id from companies where slug = 'marea-clinica'), date '2026-03-09');
select app.copiar_hoja_iwl((select id from companies where slug = 'raiz-sensorica'), date '2026-09-01');

-- Lo que ya pasó: los tramos cuyo plazo terminó están cerrados y el que
-- contiene el día de hoy, en curso
update roadmap_stages set status = 'completada', closed_at = ends_on::timestamptz where ends_on < current_date;
update roadmap_stages set status = 'en_curso'
  where starts_on <= current_date and ends_on >= current_date;

/*
 * Los hitos de los tramos cerrados se dan por cumplidos.
 *
 * El guardián exige que confirme IWL y aquí no hay sesión, así que se
 * desactiva para este bloque; y el cierre automático de tramos, que no
 * tiene nada que cerrar en la semilla.
 */
alter table milestones disable trigger milestones_guard_cumplido;
alter table milestones disable trigger milestones_cerrar_tramo;

update milestones m
set status = 'cumplido',
    completed_on = least(s.ends_on, current_date)
from roadmap_stages s
where m.stage_id = s.id and s.status = 'completada' and m.status <> 'cumplido';

-- En el tramo en curso, el primer hito pendiente va avanzado
update milestones m
set status = 'en_curso'
from roadmap_stages s
where m.stage_id = s.id and s.status = 'en_curso' and m.status = 'pendiente'
  and m.id = (
    select m2.id from milestones m2
    where m2.stage_id = s.id and m2.status = 'pendiente'
    order by m2.due_date, m2.title limit 1
  );

alter table milestones enable trigger milestones_cerrar_tramo;
alter table milestones enable trigger milestones_guard_cumplido;
