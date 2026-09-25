-- =============================================================================
-- Anexos de Programa de las compañías de demostración
--
-- Sin Anexo no hay compromiso contra el que medir, y el extracto de aportación
-- enseña lo entregado sin decir si va por delante o por detrás de lo acordado.
-- Que es exactamente lo que pasaba: las únicas compañías con Anexo eran las de
-- los datos locales y, peor, los que dejaban los tests al pasar.
--
-- Las horas y la caja comprometidas cuadran con lo que reparte cada hoja de
-- ruta por etapa. Si no cuadraran, el contador de compromiso mediría contra un
-- número que el plan nunca pretendió cumplir.
-- =============================================================================

insert into annexes (
  company_id, version, status, signed_on, starts_on, ends_on, duration_months,
  committed_hours, committed_hours_value, committed_cash, committed_seniors,
  equity_pct, other_commitments, notes
)
select
  c.id, 1, 'firmado', v.firma::date, v.inicio::date, v.fin::date, v.meses::smallint,
  v.horas::numeric, v.valor::numeric, v.caja::numeric, v.seniors::smallint,
  v.equity::numeric, v.otros, v.notas
from (values
  ('marea-clinica', '2026-03-06', '2026-03-09', '2026-12-13', 9,
   350, 26250, 8000, 3, 7.00,
   'Espacio de trabajo para tres personas y acceso a la red de centros sanitarios de IWL.',
   'Recorrido «Desde el MVP». El compromiso de horas es la suma de lo previsto por etapa en la hoja de ruta.'),
  ('raiz-sensorica', '2026-01-26', '2026-01-28', '2026-10-27', 9,
   360, 27000, 10000, 3, 6.00,
   'Banco de pruebas de hardware y acompañamiento en la ronda institucional.',
   'Recorrido «Con facturación». Entra facturando, así que el peso está en escalado y unit economics.')
) as v(slug, firma, inicio, fin, meses, horas, valor, caja, seniors, equity, otros, notas)
join companies c on c.slug = v.slug
on conflict (company_id, version) do nothing;

-- Las horas y los items ya registrados se cuelgan de su Anexo
update contribution_hours h
set annex_id = a.id
from annexes a
where a.company_id = h.company_id and h.annex_id is null;

update contribution_items i
set annex_id = a.id
from annexes a
where a.company_id = i.company_id and i.annex_id is null;

update roadmap_stages s
set annex_id = a.id
from annexes a
where a.company_id = s.company_id and s.annex_id is null;

update milestones m
set annex_id = a.id
from annexes a
where a.company_id = m.company_id and m.annex_id is null;

-- -----------------------------------------------------------------------------
-- Pilares activados en cada Anexo
-- -----------------------------------------------------------------------------

insert into annex_pillars (annex_id, company_id, pillar_id, intensity, cadence, planned_hours)
select a.id, c.id, p.id, v.intensidad::smallint, v.cadencia, v.horas::numeric
from (values
  ('marea-clinica', 'acompanamiento_operativo', 3, 'Quincenal', 110),
  ('marea-clinica', 'mentoria_especializada', 2, 'Mensual', 90),
  ('marea-clinica', 'fundraising_readiness', 2, 'Mensual desde el sexto mes', 80),
  ('marea-clinica', 'red_partnerships', 2, 'A demanda', 40),
  ('marea-clinica', 'espacio_recursos', 1, 'Permanente', 30),
  ('raiz-sensorica', 'acompanamiento_operativo', 3, 'Semanal los tres primeros meses', 150),
  ('raiz-sensorica', 'mentoria_especializada', 3, 'Quincenal', 100),
  ('raiz-sensorica', 'fundraising_readiness', 3, 'Semanal en la fase de ronda', 70),
  ('raiz-sensorica', 'red_partnerships', 2, 'A demanda', 40)
) as v(slug, pilar, intensidad, cadencia, horas)
join companies c on c.slug = v.slug
join annexes a on a.company_id = c.id and a.version = 1
join pillars p on p.code = v.pilar
on conflict (annex_id, pillar_id) do nothing;

-- -----------------------------------------------------------------------------
-- Financiación directa: partidas y desembolsos
-- -----------------------------------------------------------------------------

insert into cash_commitments (
  company_id, annex_id, heading, description, amount, tranche, condition, expected_on
)
select c.id, a.id, v.partida, v.descripcion, v.importe::numeric,
       v.tramo::smallint, v.condicion, v.esperado::date
from (values
  ('marea-clinica', 'Certificación de producto sanitario', 
   'Acompañamiento regulatorio y tasas del marcado CE de la clase que corresponda.',
   5000, 1, 'Contra presupuesto aceptado del organismo notificado.', '2026-07-01'),
  ('marea-clinica', 'Generación de demanda',
   'Campaña dirigida a direcciones de centros de atención primaria.',
   3000, 2, 'Con el guion de venta cerrado y el embudo instrumentado.', '2026-09-01'),
  ('raiz-sensorica', 'Banco de pruebas de hardware',
   'Sensores y equipamiento para probar el aprovisionamiento sin tocar instalaciones de clientes.',
   6000, 1, 'A la firma del Anexo.', '2026-03-01'),
  ('raiz-sensorica', 'Preparación de ronda',
   'Asesoría legal y financiera del proceso con inversores institucionales.',
   4000, 2, 'Con el dossier revisado y la lista de fondos priorizada.', '2026-09-01')
) as v(slug, partida, descripcion, importe, tramo, condicion, esperado)
join companies c on c.slug = v.slug
join annexes a on a.company_id = c.id and a.version = 1;

insert into cash_disbursements (
  company_id, commitment_id, amount, disbursed_on, justified_on, notes
)
select c.id, cc.id, v.importe::numeric, v.fecha::date,
       nullif(v.justificado, '')::date, v.notas
from (values
  ('marea-clinica', 'Certificación de producto sanitario', 5000, '2026-07-14', '2026-08-02',
   'Transferido contra el presupuesto del organismo notificado. Factura en la sala de datos.'),
  ('marea-clinica', 'Generación de demanda', 1500, '2026-09-08', '',
   'Primer tramo de la campaña. Pendiente de justificar con las facturas del medio.'),
  ('raiz-sensorica', 'Banco de pruebas de hardware', 6000, '2026-03-10', '2026-04-20',
   'Transferido a la firma. Justificado con las facturas del fabricante de sensores.'),
  ('raiz-sensorica', 'Preparación de ronda', 2500, '2026-09-04', '',
   'Primer tramo de la asesoría de ronda.')
) as v(slug, partida, importe, fecha, justificado, notas)
join companies c on c.slug = v.slug
join cash_commitments cc on cc.company_id = c.id and cc.heading = v.partida;
