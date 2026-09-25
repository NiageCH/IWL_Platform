-- =============================================================================
-- Avances y aportación no horaria de las compañías de demostración
--
-- Los dos carriles con contenido, que es lo único que demuestra que la idea
-- funciona: sobre la misma etapa se ve qué hizo la compañía y qué hizo IWL.
-- =============================================================================

/*
 * El carril lo pone un trigger según quién escribe, y aquí no hay sesión.
 * Se desactiva para el bloque, igual que con los hitos.
 */
alter table progress_entries disable trigger progress_entries_lado;

insert into progress_entries (company_id, stage_id, side, entry_date, title, body)
select c.id, s.id, v.side::lado_avance, v.fecha::date, v.titulo, v.cuerpo
from (values
  -- Marea Clínica · Diagnóstico y línea base
  ('marea-clinica', 'Diagnóstico y línea base', 'iwl', '2026-03-12',
   'Primera sesión técnica con el equipo',
   'Revisión de arquitectura y de la gestión de datos de paciente. Sale el hallazgo de cifrado en reposo, que pasa a crítico.'),
  ('marea-clinica', 'Diagnóstico y línea base', 'compania', '2026-03-24',
   'Data room completado',
   'Subidos los documentos societarios y los contratos de los dos centros piloto.'),
  ('marea-clinica', 'Diagnóstico y línea base', 'iwl', '2026-04-02',
   'Línea base acordada',
   'Se cierran los números de partida con el equipo: 180 pacientes en seguimiento, dos centros, sin ingreso recurrente.'),

  -- Marea Clínica · Encaje producto-mercado
  ('marea-clinica', 'Encaje producto-mercado', 'compania', '2026-04-28',
   'Segmentación de la base de usuarios',
   'Separados los centros por tamaño. Los de menos de diez profesionales abandonan a las tres semanas; los grandes se quedan.'),
  ('marea-clinica', 'Encaje producto-mercado', 'iwl', '2026-05-14',
   'Taller de propuesta de valor',
   'Sesión de media jornada con el equipo fundador. Se decide dejar de vender al centro pequeño y centrarse en atención primaria de más de veinte profesionales.'),
  ('marea-clinica', 'Encaje producto-mercado', 'compania', '2026-06-19',
   'Retención medida a tres meses',
   'Cohorte de marzo seguida hasta junio: 71 % de retención en el segmento grande, 22 % en el pequeño. Confirma la decisión de mayo.'),
  ('marea-clinica', 'Encaje producto-mercado', 'iwl', '2026-06-25',
   'Tres casos de uso escritos y autorizados',
   'Redactados con los tres centros de referencia y firmada la autorización para citarlos en materiales de venta.'),

  -- Marea Clínica · Motor comercial repetible (en curso)
  ('marea-clinica', 'Motor comercial repetible', 'iwl', '2026-07-08',
   'Guion de venta y tarifa',
   'Construido el guion con el equipo y fijada la tarifa por profesional. Queda por instrumentar el embudo.'),
  ('marea-clinica', 'Motor comercial repetible', 'compania', '2026-08-20',
   'Embudo instrumentado',
   'Cada etapa del embudo se registra ya en el CRM. Falta un trimestre completo para poder calcular el coste de adquisición.'),
  ('marea-clinica', 'Motor comercial repetible', 'compania', '2026-09-15',
   'Primera venta cerrada por la responsable comercial',
   'Cerrada sin el fundador delante, siguiendo el guion. Falta una segunda para dar el hito por cumplido.'),

  -- Raíz Sensórica
  ('raiz-sensorica', 'Escalado de la operación', 'iwl', '2026-03-05',
   'Plan de deuda técnica priorizado',
   'Ordenados los hallazgos por lo que bloquea el crecimiento. Se ataca primero el aprovisionamiento de dispositivos.'),
  ('raiz-sensorica', 'Escalado de la operación', 'compania', '2026-05-18',
   'Aprovisionamiento automatizado',
   'Un dispositivo nuevo pasa de dos horas de configuración manual a diez minutos desatendidos.'),
  ('raiz-sensorica', 'Crecimiento y unit economics', 'compania', '2026-07-02',
   'Margen por cliente calculado con costes reales',
   'Incluidos soporte y reposición de sensores. Margen positivo en explotaciones de más de cincuenta hectáreas.'),
  ('raiz-sensorica', 'Crecimiento y unit economics', 'iwl', '2026-08-11',
   'Revisión de precios',
   'Sesión con el equipo para subir tarifa en el tramo pequeño, que era el que destruía margen.'),
  ('raiz-sensorica', 'Ronda institucional', 'iwl', '2026-09-08',
   'Dossier revisado y lista de fondos',
   'Dossier cerrado y priorizados once fondos con tesis agrotech en el sur de Europa.'),
  ('raiz-sensorica', 'Ronda institucional', 'compania', '2026-09-19',
   'Primeras cuatro reuniones',
   'Cuatro fondos contactados, tres han pedido materiales.')
) as v(slug, etapa, side, fecha, titulo, cuerpo)
join companies c on c.slug = v.slug
join roadmap_stages s on s.company_id = c.id and s.name = v.etapa;

alter table progress_entries enable trigger progress_entries_lado;

-- -----------------------------------------------------------------------------
-- Aportación que no son horas
-- -----------------------------------------------------------------------------

insert into contribution_items (
  company_id, stage_id, kind, occurred_on, title, description,
  counterpart, amount, market_value, outcome
)
select c.id, s.id, v.kind::tipo_aportacion, v.fecha::date, v.titulo, v.descripcion,
       v.contraparte, v.importe::numeric, v.mercado::numeric, v.resultado
from (values
  ('marea-clinica', 'Encaje producto-mercado', 'compra', '2026-05-06',
   'Licencia anual de la herramienta de analítica de producto',
   'Sin instrumentación no había forma de medir retención. IWL la asume el primer año.',
   'Proveedor de analítica', 2400, 2400,
   'Es lo que permitió medir la retención a tres meses en junio.'),
  ('marea-clinica', 'Encaje producto-mercado', 'evento', '2026-06-04',
   'Feria de salud digital',
   'Espacio compartido en el estand de IWL, con agenda de reuniones preparada.',
   'Organizador de la feria', 1800, 6500,
   'Nueve conversaciones, dos de ellas con centros que hoy son clientes de referencia.'),
  ('marea-clinica', 'Motor comercial repetible', 'reunion_inversor', '2026-07-22',
   'Reunión con fondo especializado en salud',
   'Organizada y acompañada por IWL. No era para levantar todavía, era para calibrar el relato.',
   'Fondo de salud digital', 0, 0,
   'Dijeron que la retención por segmento era el número que querían ver. Orientó el trabajo del trimestre.'),
  ('marea-clinica', 'Motor comercial repetible', 'gestion', '2026-08-03',
   'Solicitud de ayuda pública a la digitalización sanitaria',
   'Preparada y presentada por IWL con los datos del equipo.',
   'Organismo convocante', 0, 3500,
   'Presentada en plazo. Resolución prevista para el primer trimestre.'),

  ('raiz-sensorica', 'Escalado de la operación', 'compra', '2026-04-14',
   'Lote de sensores para banco de pruebas',
   'Treinta unidades para poder probar el aprovisionamiento automático sin tocar instalaciones de clientes.',
   'Fabricante de sensores', 4200, 4200,
   'El banco de pruebas es lo que permitió bajar la configuración de dos horas a diez minutos.'),
  ('raiz-sensorica', 'Crecimiento y unit economics', 'evento', '2026-07-16',
   'Jornada de agricultura de precisión',
   'Ponencia de la fundadora en la mesa técnica, gestionada por IWL.',
   'Cooperativa organizadora', 0, 4000,
   'Dos cooperativas pidieron piloto. Una de ellas es hoy el cliente más grande.'),
  ('raiz-sensorica', 'Ronda institucional', 'reunion_inversor', '2026-09-10',
   'Tres reuniones en una tarde de inversores',
   'Agenda concentrada preparada por IWL con fondos de tesis agrotech.',
   'Tres fondos agrotech', 0, 0,
   'Dos pidieron materiales. Uno ha abierto proceso.'),
  ('raiz-sensorica', 'Ronda institucional', 'gestion', '2026-09-21',
   'Preparación del data room para due diligence de fondo',
   'Revisión documento a documento y corrección de lo que estaba caducado.',
   null, 0, 2800,
   'El data room pasa la primera revisión del fondo sin peticiones adicionales.')
) as v(slug, etapa, kind, fecha, titulo, descripcion, contraparte, importe, mercado, resultado)
join companies c on c.slug = v.slug
join roadmap_stages s on s.company_id = c.id and s.name = v.etapa;

-- -----------------------------------------------------------------------------
-- Horas repartidas por etapa
--
-- Sin esto, la hoja de ruta enseña «0 de 350 horas previstas» y no se puede
-- ver lo interesante: en qué tramos IWL puso más de lo que había dicho y en
-- cuáles va por detrás.
--
-- Cada fila de aquí abajo es una tanda de trabajo, y se reparte en jornadas
-- de ocho horas porque una línea del libro es un día de una persona: la
-- columna no admite más de veinticuatro horas, y hace bien. Las tarifas las
-- completa el trigger desde `rate_cards`.
-- -----------------------------------------------------------------------------

insert into contribution_hours (
  company_id, stage_id, worked_on, person_name, profile_code,
  subject_id, description, hours
)
select
  c.id,
  s.id,
  v.fecha::date + d.n,
  v.persona,
  v.perfil,
  m.id,
  v.descripcion,
  least(8, v.horas - d.n * 8)::numeric
from (values
  -- Marea Clínica · Diagnóstico (50 previstas, 56 puestas)
  ('marea-clinica', 'Diagnóstico y línea base', '2026-03-12', 'Equipo de ingeniería Niage', 'ingenieria',
   'producto_tecnologia', 'Sesión técnica de arranque y revisión de arquitectura.', 12),
  ('marea-clinica', 'Diagnóstico y línea base', '2026-03-17', 'Equipo de ingeniería Niage', 'ingenieria',
   'producto_tecnologia', 'Revisión del tratamiento de datos de paciente y del cifrado.', 16),
  ('marea-clinica', 'Diagnóstico y línea base', '2026-03-24', 'Dirección de programa', 'socio',
   'financiacion_legal', 'Revisión societaria y de los contratos con los centros piloto.', 10),
  ('marea-clinica', 'Diagnóstico y línea base', '2026-03-30', 'Dirección de programa', 'socio',
   'estrategia_comercial', 'Cierre de la línea base con el equipo fundador.', 18),

  -- Marea Clínica · Encaje (100 previstas, 92: IWL se queda por detrás)
  ('marea-clinica', 'Encaje producto-mercado', '2026-04-20', 'Especialista de producto', 'especialista',
   'producto_tecnologia', 'Segmentación de la base y definición de las métricas de retención.', 24),
  ('marea-clinica', 'Encaje producto-mercado', '2026-05-11', 'Dirección de programa', 'socio',
   'estrategia_comercial', 'Taller de propuesta de valor con el equipo fundador.', 20),
  ('marea-clinica', 'Encaje producto-mercado', '2026-06-01', 'Especialista de marketing', 'especialista',
   'estrategia_marketing', 'Reposicionamiento del mensaje hacia atención primaria grande.', 26),
  ('marea-clinica', 'Encaje producto-mercado', '2026-06-22', 'Equipo de operación', 'operacion',
   'espacio_red', 'Preparación de los tres casos de referencia y sus autorizaciones.', 22),

  -- Marea Clínica · Motor comercial (120 previstas, 64 a mitad de etapa)
  ('marea-clinica', 'Motor comercial repetible', '2026-07-06', 'Especialista comercial', 'especialista',
   'estrategia_comercial', 'Construcción del guion de venta y fijación de la tarifa.', 28),
  ('marea-clinica', 'Motor comercial repetible', '2026-08-17', 'Equipo de operación', 'operacion',
   'operacion_servicio', 'Instrumentación del embudo en el CRM y formación al equipo.', 18),
  ('marea-clinica', 'Motor comercial repetible', '2026-09-14', 'Especialista comercial', 'especialista',
   'estrategia_comercial', 'Acompañamiento en las primeras ventas del nuevo proceso.', 18),

  -- Raíz Sensórica · Diagnóstico (50 previstas, 48)
  ('raiz-sensorica', 'Diagnóstico y línea base', '2026-02-02', 'Equipo de ingeniería Niage', 'ingenieria',
   'producto_tecnologia', 'Evaluación técnica del firmware y de la plataforma de riego.', 20),
  ('raiz-sensorica', 'Diagnóstico y línea base', '2026-02-11', 'Dirección de programa', 'socio',
   'operacion_servicio', 'Radiografía de la operación de instalación y soporte.', 16),
  ('raiz-sensorica', 'Diagnóstico y línea base', '2026-02-19', 'Dirección de programa', 'socio',
   'financiacion_legal', 'Cierre de la línea base y revisión de contratos.', 12),

  -- Raíz Sensórica · Escalado (120 previstas, 128: IWL pone de más)
  ('raiz-sensorica', 'Escalado de la operación', '2026-03-02', 'Equipo de ingeniería Niage', 'ingenieria',
   'producto_tecnologia', 'Priorización de deuda técnica por lo que bloquea el crecimiento.', 24),
  ('raiz-sensorica', 'Escalado de la operación', '2026-04-06', 'Equipo de ingeniería Niage', 'ingenieria',
   'producto_tecnologia', 'Diseño del aprovisionamiento automático de dispositivos.', 40),
  ('raiz-sensorica', 'Escalado de la operación', '2026-05-04', 'Equipo de ingeniería Niage', 'ingenieria',
   'operacion_servicio', 'Acompañamiento en la puesta en marcha y pruebas en banco.', 38),
  ('raiz-sensorica', 'Escalado de la operación', '2026-05-25', 'Equipo de operación', 'operacion',
   'operacion_servicio', 'Rediseño del proceso de instalación en campo.', 26),

  -- Raíz Sensórica · Unit economics (100 previstas, 95)
  ('raiz-sensorica', 'Crecimiento y unit economics', '2026-06-08', 'Especialista de materia', 'especialista',
   'estrategia_comercial', 'Modelo de costes de entrega y soporte por explotación.', 32),
  ('raiz-sensorica', 'Crecimiento y unit economics', '2026-07-13', 'Dirección de programa', 'socio',
   'estrategia_comercial', 'Revisión de precios por tramo de tamaño de explotación.', 30),
  ('raiz-sensorica', 'Crecimiento y unit economics', '2026-08-10', 'Especialista de marketing', 'especialista',
   'estrategia_marketing', 'Reformulación de la oferta para el tramo pequeño.', 33),

  -- Raíz Sensórica · Ronda (90 previstas, 32 nada más empezar)
  ('raiz-sensorica', 'Ronda institucional', '2026-09-01', 'Dirección de programa', 'socio',
   'financiacion_legal', 'Cierre del dossier y del modelo financiero.', 20),
  ('raiz-sensorica', 'Ronda institucional', '2026-09-16', 'Dirección de programa', 'socio',
   'espacio_red', 'Preparación de la agenda de fondos y acompañamiento a reuniones.', 12)
) as v(slug, etapa, fecha, persona, perfil, materia, descripcion, horas)
join companies c on c.slug = v.slug
join roadmap_stages s on s.company_id = c.id and s.name = v.etapa
join contribution_subjects m on m.code = v.materia
cross join lateral generate_series(0, ceil(v.horas / 8.0)::int - 1) as d(n);

-- La hora que ya venía del seed de actividad, colocada en la etapa que le toca
update contribution_hours h
set stage_id = s.id
from roadmap_stages s
where h.stage_id is null
  and s.company_id = h.company_id
  and h.worked_on between s.starts_on and s.ends_on;

-- -----------------------------------------------------------------------------
-- Líneas base
--
-- Congeladas al cerrar la etapa de diagnóstico de cada compañía, que es cuando
-- el documento dice que se firman. Sin ellas la pantalla de madurez solo puede
-- enseñar el estado de hoy, y «avance» vuelve a ser una opinión.
--
-- El contenido guarda las entradas del cálculo de madurez, no su resultado:
-- así, si IWL cambia los pesos de los ejes, los dos extremos de la comparación
-- se recalculan con la misma vara.
-- -----------------------------------------------------------------------------

insert into baselines (company_id, kind, taken_on, stage, content, notes)
select c.id, 'inicial', v.fecha::date, c.stage, v.contenido::jsonb, v.notas
from (values
  ('marea-clinica', '2026-04-05',
   '{
      "version": 1,
      "scores": { "tecnico": 47.1, "preparacion": 9.0 },
      "madurez": {
        "scoreTecnico": 47.1,
        "scorePreparacion": 9.0,
        "hitosExigibles": 2,
        "hitosCumplidos": 1,
        "mrr": 0,
        "mrrObjetivo": 15000,
        "runwayMeses": 5,
        "runwayMinimo": 6
      },
      "kpi": { "mrr": 0, "clientes_activos": 2 },
      "horas_iwl": 56
    }',
   'Congelada al cerrar el diagnóstico. Dos centros piloto, sin ingreso recurrente y cinco meses de caja.'),

  ('raiz-sensorica', '2026-02-24',
   '{
      "version": 1,
      "scores": { "tecnico": 40.2, "preparacion": 7.7 },
      "madurez": {
        "scoreTecnico": 40.2,
        "scorePreparacion": 7.7,
        "hitosExigibles": 2,
        "hitosCumplidos": 1,
        "mrr": 3200,
        "mrrObjetivo": 15000,
        "runwayMeses": 4,
        "runwayMinimo": 6
      },
      "kpi": { "mrr": 3200, "clientes_activos": 6 },
      "horas_iwl": 48
    }',
   'Congelada al cerrar el diagnóstico. Facturando poco, con margen negativo en el tramo pequeño y cuatro meses de caja.')
) as v(slug, fecha, contenido, notas)
join companies c on c.slug = v.slug
on conflict (company_id, kind, taken_on) do nothing;
