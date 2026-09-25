-- =============================================================================
-- Hojas de ruta de las compañías de demostración
--
-- Cada una entra en un estado distinto y con una plantilla distinta, que es lo
-- que hace falta para ver que el recorrido no es el mismo para todas.
--
-- Vega se queda sin hoja de ruta a propósito: está en fase 1, todavía en
-- diagnóstico, y así se ve en pantalla el estado «sin hoja de ruta» con su
-- invitación a diseñarla. Un proyecto recién entrado no tiene plan todavía.
-- =============================================================================

update companies set entry_state = 'mvp'               where slug = 'marea-clinica';
update companies set entry_state = 'facturacion'       where slug = 'raiz-sensorica';
update companies set entry_state = 'idea'              where slug = 'vega-predictiva';

select app.copiar_hoja_de_ruta(
  (select id from companies where slug = 'marea-clinica'),
  (select id from roadmap_templates where code = 'desde_mvp'),
  date '2026-03-09'
);

select app.copiar_hoja_de_ruta(
  (select id from companies where slug = 'raiz-sensorica'),
  (select id from roadmap_templates where code = 'con_facturacion'),
  date '2026-01-28'
);

-- Lo que ya pasó: las etapas cuyo plazo terminó están cerradas y la que
-- contiene el día de hoy está en curso
update roadmap_stages set status = 'completada' where ends_on < current_date;
update roadmap_stages set status = 'en_curso'
  where starts_on <= current_date and ends_on >= current_date;

/*
 * Los hitos de las etapas cerradas se dan por cumplidos.
 *
 * El trigger exige que confirme IWL y aquí no hay sesión, así que se
 * desactiva para este bloque. Es la misma razón por la que el seed no puede
 * usar `instanciar_hoja_de_ruta` y usa `copiar_hoja_de_ruta`.
 */
alter table milestones disable trigger milestones_guard_cumplido;

update milestones m
set status = 'cumplido',
    completed_on = least(s.ends_on, current_date),
    evidence = 'Evidencia de demostración: revisado y aceptado en sesión de seguimiento.'
from roadmap_stages s
where m.stage_id = s.id and s.status = 'completada';

-- En la etapa en curso, el primer hito va avanzado y el segundo aún no
update milestones m
set status = 'en_curso'
from roadmap_stages s
where m.stage_id = s.id and s.status = 'en_curso'
  and m.due_date = (
    select min(m2.due_date) from milestones m2 where m2.stage_id = s.id
  );

-- Y uno que se ha pasado de fecha sin cerrarse, que es lo que enciende el ámbar
update milestones
set status = 'retrasado'
where stage_id in (select id from roadmap_stages where status = 'en_curso')
  and due_date < current_date
  and status <> 'cumplido';

alter table milestones enable trigger milestones_guard_cumplido;
