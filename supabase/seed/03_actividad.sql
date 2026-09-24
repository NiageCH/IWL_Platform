-- =============================================================================
-- Semilla 03 · Actividad de las tres compañías
--
-- Checklist de due diligence instanciado, business plan redactado, evaluación
-- técnica con puntuaciones y hallazgos, plan de trabajo y seis meses de KPI.
--
-- Las tres están en momentos distintos a propósito:
--   Marea Clínica  · semilla, fase 2. Casi invertible
--   Vega Predictiva· pre-semilla, fase 1. Empezando, con un hallazgo crítico
--   Raíz Sensórica · semilla, fase 2. Hardware, con un punto bloqueante
-- =============================================================================

-- Los triggers de validación comprueban quién escribe. En la semilla no hay
-- sesión, así que se declara una: la dirección de IWL.
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '00000000-0000-0000-0002-000000000001',
    'role', 'authenticated'
  )::text,
  false
);

-- -----------------------------------------------------------------------------
-- Instanciar checklist, business plan y KPI para las tres compañías
-- -----------------------------------------------------------------------------

select
  app.instanciar_checklist_dd(c.id),
  app.instanciar_business_plan(c.id),
  app.instanciar_kpis(c.id)
from companies c;

-- -----------------------------------------------------------------------------
-- Due diligence general · avance por compañía
-- -----------------------------------------------------------------------------

-- Marea Clínica: casi todo validado
update dd_items set status = 'validado'
where company_id = '00000000-0000-0000-0004-000000000001'
  and template_id in (
    select id from dd_item_templates
    where code not in ('reg_certificaciones', 'imp_medicion', 'fin_extracto_caja')
  );

update dd_items set status = 'entregado'
where company_id = '00000000-0000-0000-0004-000000000001'
  and template_id = (select id from dd_item_templates where code = 'fin_extracto_caja');

-- Vega Predictiva: en fase 1, el due diligence está empezando
update dd_items set status = 'entregado'
where company_id = '00000000-0000-0000-0004-000000000002'
  and template_id in (
    select id from dd_item_templates
    where code in ('sl_escritura', 'sl_cap_table', 'fin_extracto_caja', 'eq_contratos')
  );

update dd_items set status = 'validado'
where company_id = '00000000-0000-0000-0004-000000000002'
  and template_id in (
    select id from dd_item_templates where code in ('sl_escritura', 'imp_liderazgo_femenino')
  );

-- Raíz Sensórica: avanzada, con un bloqueo societario
update dd_items set status = 'validado'
where company_id = '00000000-0000-0000-0004-000000000003'
  and template_id in (
    select id from dd_item_templates
    where code not in ('sl_pacto_socios', 'reg_certificaciones', 'imp_medicion', 'pi_patentes')
  );

update dd_items
set status = 'bloqueante',
    notes = 'El pacto vigente no recoge el vesting de la tercera fundadora, que entró en 2025.'
where company_id = '00000000-0000-0000-0004-000000000003'
  and template_id = (select id from dd_item_templates where code = 'sl_pacto_socios');

-- Un documento de Marea ya caducado, para ver el efecto en el score
update dd_items set expires_on = current_date - 15
where company_id = '00000000-0000-0000-0004-000000000001'
  and template_id = (select id from dd_item_templates where code = 'ct_embudo');

-- -----------------------------------------------------------------------------
-- Hallazgo del due diligence general
-- -----------------------------------------------------------------------------

insert into findings (company_id, area_id, severity, title, description, impact, resolution_plan, due_date)
select
  '00000000-0000-0000-0004-000000000003', a.id, 'alto',
  'Vesting de la tercera fundadora sin formalizar',
  'El pacto de socios firmado en 2024 no se actualizó cuando entró la tercera fundadora en marzo de 2025.',
  'Un inversor institucional no entra sin vesting firmado por todo el equipo fundador.',
  'Adenda al pacto de socios con calendario de consolidación a cuatro años desde la fecha de entrada.',
  current_date + 45
from dd_areas a where a.code = 'societario_legal';

-- -----------------------------------------------------------------------------
-- Business plan · contenido y estado por sección
-- -----------------------------------------------------------------------------

update bp_sections s
set content = v.content, status = v.status::estado_seccion_bp
from (values
  ('00000000-0000-0000-0004-000000000001', 'problema',
   'Los centros de atención primaria siguen a sus pacientes crónicos con hojas de cálculo y llamadas. El seguimiento se pierde entre visitas y las descompensaciones se detectan cuando el paciente ya está en urgencias. Un centro medio pierde el rastro del 30 por ciento de sus pacientes crónicos entre revisiones.',
   'validada'),
  ('00000000-0000-0000-0004-000000000001', 'solucion_producto',
   'Plataforma que recoge las mediciones del paciente en casa, las contrasta con su historial y avisa al equipo clínico cuando algo se sale de rango. Hoy está construido el registro de mediciones, el panel del equipo clínico y las alertas por umbral. Falta la integración con historia clínica electrónica, prevista para el primer trimestre de 2027.',
   'validada'),
  ('00000000-0000-0000-0004-000000000001', 'mercado',
   'Centros de atención primaria privados y mutuas en España: 1.400 centros con programa de crónicos. Con el producto de hoy el mercado alcanzable son los 320 centros que ya digitalizan el seguimiento. Competencia directa: dos plataformas hospitalarias que bajan a primaria sin adaptar el flujo.',
   'validada'),
  ('00000000-0000-0000-0004-000000000001', 'modelo_negocio',
   'Suscripción anual por centro, escalada por número de pacientes en seguimiento. Tarifa de entrada de 8.400 euros al año hasta 500 pacientes. Margen bruto del 82 por ciento una vez descontada la infraestructura.',
   'validada'),
  ('00000000-0000-0000-0004-000000000001', 'go_to_market',
   'Venta directa a dirección médica, con piloto de tres meses como puerta de entrada. El piloto convierte en contrato anual en el 60 por ciento de los casos. Coste de adquisición de 3.100 euros y ciclo de venta de cuatro meses.',
   'en_revision'),
  ('00000000-0000-0000-0004-000000000001', 'roadmap',
   'T4 2026: integración con la historia clínica de dos proveedores. T1 2027: módulo de adherencia al tratamiento. T2 2027: informes para mutuas. El roadmap técnico de remediación va en paralelo y está en el plan de trabajo de Niage.',
   'en_revision'),
  ('00000000-0000-0000-0004-000000000001', 'equipo',
   'Dos fundadoras a jornada completa: dirección clínica y dirección técnica. Tres personas en desarrollo y una en operaciones. Falta perfil comercial con experiencia en venta a sanidad privada.',
   'validada'),
  ('00000000-0000-0000-0004-000000000001', 'plan_financiero',
   'Previsión a veinticuatro meses con crecimiento del 8 por ciento mensual en MRR y contratación de dos perfiles comerciales en el primer semestre de 2027. Los reales los toma la plataforma del update mensual.',
   'en_revision'),
  ('00000000-0000-0000-0004-000000000001', 'necesidad_capital',
   'Ronda de 900.000 euros para dieciocho meses: dos perfiles comerciales, integración con historia clínica y certificación de producto sanitario. Lleva hasta 40 centros contratados y break-even operativo.',
   'borrador'),

  ('00000000-0000-0000-0004-000000000002', 'problema',
   'Las distribuidoras de alimentación compran contra previsiones hechas a mano. El exceso se tira y la rotura de stock se pierde en ventas. En producto fresco, el desperdicio medio por rotura de previsión está entre el 6 y el 11 por ciento del volumen comprado.',
   'en_revision'),
  ('00000000-0000-0000-0004-000000000002', 'solucion_producto',
   'Modelo de predicción de demanda por referencia y punto de venta, entrenado con el histórico del cliente y con variables externas. Hoy hay un prototipo funcionando sobre los datos de dos distribuidoras. No hay producto autoservicio todavía.',
   'borrador'),
  ('00000000-0000-0000-0004-000000000002', 'mercado',
   'Distribuidoras de alimentación de tamaño medio en España y Portugal. Segmento inicial: las 180 que mueven entre 20 y 100 millones al año y ya tienen ERP con histórico explotable.',
   'borrador'),
  ('00000000-0000-0000-0004-000000000002', 'equipo',
   'Fundadora única, con seis años en cadena de suministro. Un científico de datos a media jornada. El desarrollo de plataforma está sin cubrir.',
   'en_revision'),

  ('00000000-0000-0000-0004-000000000003', 'problema',
   'El riego en cultivo extensivo se decide por calendario y por experiencia, no por lo que pide el suelo. En una campaña, eso son entre un 20 y un 35 por ciento de agua de más y una pérdida de rendimiento que nadie mide.',
   'validada'),
  ('00000000-0000-0000-0004-000000000003', 'solucion_producto',
   'Sonda de humedad y conductividad a tres profundidades, con transmisión por red de largo alcance, y plataforma que traduce la lectura en una pauta de riego. Sonda en versión industrializable desde marzo de 2026; plataforma en producción con nueve explotaciones.',
   'validada'),
  ('00000000-0000-0000-0004-000000000003', 'modelo_negocio',
   'Venta de la sonda más suscripción anual por hectárea monitorizada. 340 euros por sonda y 45 euros por hectárea y año. El margen de hardware es del 38 por ciento y el de suscripción del 88.',
   'en_revision'),
  ('00000000-0000-0000-0004-000000000003', 'roadmap',
   'T4 2026: certificación radio y cierre del proveedor de fabricación. T1 2027: versión con batería de campaña completa. T2 2027: integración con los sistemas de riego de dos fabricantes.',
   'en_revision'),
  ('00000000-0000-0000-0004-000000000003', 'equipo',
   'Tres fundadoras: agronomía, electrónica y negocio. Dos personas en desarrollo de firmware por contrato mercantil.',
   'validada')
) as v(company_id, code, content, status)
join bp_section_templates t on t.code = v.code
where s.company_id = v.company_id::uuid and s.template_id = t.id;

-- Hipótesis clave con su evidencia
insert into hypotheses (company_id, section_id, statement, validation_criteria, status)
select s.company_id, s.id, v.statement, v.criteria, v.status
from (values
  ('00000000-0000-0000-0004-000000000001', 'go_to_market',
   'Un piloto de tres meses convierte en contrato anual en más de la mitad de los casos.',
   'Conversión de piloto a cliente por encima del 50 por ciento sostenida durante dos trimestres.',
   'en_contraste'),
  ('00000000-0000-0000-0004-000000000001', 'modelo_negocio',
   'El coste de infraestructura por centro se mantiene por debajo del 10 por ciento de la tarifa al escalar.',
   'Coste cloud sobre ingresos por debajo del 10 por ciento con más de 30 centros activos.',
   'en_contraste'),
  ('00000000-0000-0000-0004-000000000002', 'problema',
   'Las distribuidoras aceptan ceder su histórico de ventas para entrenar el modelo.',
   'Tres distribuidoras firman cesión de datos sin exigir exclusividad.',
   'sin_contrastar'),
  ('00000000-0000-0000-0004-000000000003', 'modelo_negocio',
   'El coste unitario de la sonda baja de 210 euros a partir de 2.000 unidades.',
   'Presupuesto en firme del fabricante a ese volumen.',
   'en_contraste')
) as v(company_id, section_code, statement, criteria, status)
join bp_section_templates t on t.code = v.section_code
join bp_sections s on s.company_id = v.company_id::uuid and s.template_id = t.id;

-- La hipótesis de coste de infraestructura se apoya en el KPI técnico
insert into evidence_links (company_id, hypothesis_id, kind, target_code, label)
select h.company_id, h.id, 'kpi', 'coste_cloud_sobre_ingresos',
       'Coste cloud sobre ingresos, del update mensual'
from hypotheses h
where h.company_id = '00000000-0000-0000-0004-000000000001'
  and h.statement like 'El coste de infraestructura%';

-- -----------------------------------------------------------------------------
-- Due diligence tecnológico · evaluaciones publicadas
-- -----------------------------------------------------------------------------

insert into tech_assessments (id, company_id, reviewer_id, assessed_on, stage, tech_profile, status, summary, strengths, published_at)
values
  ('00000000-0000-0000-0005-000000000001',
   '00000000-0000-0000-0004-000000000001',
   '00000000-0000-0000-0002-000000000003',
   current_date - 40, 'semilla', 'software', 'publicada',
   'Producto sólido para la etapa. La arquitectura sostiene el roadmap de los próximos dos trimestres sin rehacerse. Lo que falta está en operación: copias sin prueba de restauración y monitorización incompleta.',
   'Cobertura de tests alta en el núcleo clínico. Modelo de datos documentado y decisiones registradas. Despliegue automatizado desde el primer día.',
   now() - interval '40 days'),

  ('00000000-0000-0000-0005-000000000002',
   '00000000-0000-0000-0004-000000000002',
   '00000000-0000-0000-0002-000000000004',
   current_date - 8, 'pre_semilla', 'software_ia', 'publicada',
   'Prototipo que demuestra el valor del modelo, con la base legal de los datos de entrenamiento sin resolver. Es lo primero que hay que cerrar: condiciona el producto entero.',
   'Evaluación del modelo con conjunto estable y métricas declaradas desde el principio. Resultados reproducibles.',
   now() - interval '8 days'),

  ('00000000-0000-0000-0005-000000000003',
   '00000000-0000-0000-0004-000000000003',
   '00000000-0000-0000-0002-000000000003',
   current_date - 25, 'semilla', 'hardware', 'publicada',
   'Sonda en versión industrializable y plataforma en producción. El riesgo está en la cadena de suministro: dos componentes críticos sin segunda fuente y certificación radio pendiente.',
   'TRL respaldado con campaña de campo real. Firmware con actualización remota funcionando.',
   now() - interval '25 days');

-- Puntuaciones por dimensión, siempre con evidencia
insert into tech_scores (assessment_id, company_id, dimension_id, level, evidence, source, scored_by)
select v.assessment_id::uuid, v.company_id::uuid, d.id, v.level, v.evidence, 'manual',
       (select reviewer_id from tech_assessments where id = v.assessment_id::uuid)
from (values
  -- Marea Clínica · semilla, software
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','arquitectura_producto',3,'Diagrama actualizado en agosto y registro de decisiones con doce entradas. Componentes separados por dominio clínico.'),
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','codigo_calidad',3,'Cobertura del 74 por ciento, concentrada en el motor de alertas. Documentación de arranque probada con una persona nueva.'),
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','seguridad',2,'Sin secretos en el repositorio y dependencias al día. Falta revisión de autorización a nivel de registro de paciente.'),
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','infraestructura_operacion',2,'CI/CD y despliegue automatizados. Copias configuradas pero sin prueba de restauración registrada.'),
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','escalabilidad_rendimiento',2,'Prueba de carga a cinco veces el volumen actual. El cuello está en la consulta de histórico, identificado y medido.'),
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','datos_privacidad',3,'Datos en región UE, registro de actividades completo y contratos de encargo con los tres proveedores.'),
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','propiedad_intelectual_tecnica',3,'Cesión firmada por las cinco personas que han escrito código. Licencias revisadas, sin copyleft fuerte.'),
  ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0004-000000000001','equipo_proceso',2,'Despliegue semanal y tiempo de recuperación medido. El motor de alertas lo conoce a fondo una sola persona.'),

  -- Vega Predictiva · pre-semilla, IA
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','arquitectura_producto',1,'Cuadernos de análisis y un servicio de inferencia. No hay separación entre experimentación y producto.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','codigo_calidad',1,'Sin tests automatizados. El código vive en cuadernos y depende de quién los ejecuta.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','seguridad',2,'Sin secretos en el repositorio. Dependencias con dos vulnerabilidades de severidad media, con plan.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','infraestructura_operacion',1,'Despliegue manual a una máquina. Sin infraestructura como código.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','escalabilidad_rendimiento',1,'Volumen actual muy por debajo de cualquier límite. Sin análisis de carga, coherente con la etapa.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','datos_privacidad',1,'Datos de cliente en la máquina de desarrollo, sin contrato de encargo firmado.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','ia_modelos',1,'Evaluación sólida con conjunto estable. El origen de los datos de entrenamiento no tiene cesión documentada.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','propiedad_intelectual_tecnica',1,'Parte del código lo escribió un colaborador antes de constituir la sociedad, sin cesión.'),
  ('00000000-0000-0000-0005-000000000002','00000000-0000-0000-0004-000000000002','equipo_proceso',1,'Todo el conocimiento en la fundadora y el científico de datos a media jornada.'),

  -- Raíz Sensórica · semilla, hardware
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','arquitectura_producto',2,'Sonda, pasarela y plataforma separadas y documentadas. El protocolo entre sonda y pasarela está sin versionar.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','codigo_calidad',2,'Tests en la plataforma. El firmware se prueba a mano sobre placa.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','seguridad',2,'Actualización de firmware firmada. Credenciales de pasarela compartidas entre dispositivos.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','infraestructura_operacion',2,'Plataforma en cloud con despliegue automatizado. Monitorización de dispositivos en campo incompleta.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','escalabilidad_rendimiento',2,'Nueve explotaciones y 140 sondas. Límite conocido en la pasarela a partir de 200 sondas por nodo.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','datos_privacidad',3,'Dato agronómico, no personal. Propiedad del dato pactada con el agricultor por contrato.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','hardware',2,'TRL 7 con campaña de campo completa. BOM cerrada a 248 euros. Certificación radio pendiente y dos componentes sin segunda fuente.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','propiedad_intelectual_tecnica',2,'Cesión firmada por el equipo interno. Los dos contratos de firmware externo no incluyen cláusula de cesión.'),
  ('00000000-0000-0000-0005-000000000003','00000000-0000-0000-0004-000000000003','equipo_proceso',2,'Cadencia medida en plataforma. El firmware depende de un contrato mercantil sin relevo.')
) as v(assessment_id, company_id, dimension_code, level, evidence)
join tech_dimensions d on d.code = v.dimension_code;

-- Hallazgos técnicos
insert into tech_findings (company_id, assessment_id, dimension_id, severity, title, description, evidence, recommendation, status)
select v.company_id::uuid, v.assessment_id::uuid, d.id, v.severity::severidad_hallazgo,
       v.title, v.description, v.evidence, v.recommendation, v.status::estado_hallazgo
from (values
  ('00000000-0000-0000-0004-000000000001','00000000-0000-0000-0005-000000000001','infraestructura_operacion','alto',
   'Copias sin prueba de restauración',
   'Hay copias diarias configuradas y verificadas por el proveedor, pero no consta que se haya restaurado nunca una copia completa en un entorno limpio.',
   'Panel de copias del proveedor. Sin registro de restauración en los últimos doce meses.',
   'Restaurar una copia completa en entorno aislado y dejar el procedimiento escrito con el tiempo que tarda. Repetir cada trimestre.',
   'abierto'),
  ('00000000-0000-0000-0004-000000000001','00000000-0000-0000-0005-000000000001','seguridad','medio',
   'Autorización a nivel de registro sin pruebas',
   'El control de acceso por centro está implementado en servidor, pero no hay tests que comprueben que un profesional de un centro no alcanza el registro de otro.',
   'Revisión del código de autorización y ausencia de tests específicos.',
   'Añadir tests de autorización que cubran el acceso cruzado entre centros, con un caso por rol.',
   'en_curso'),
  ('00000000-0000-0000-0004-000000000001','00000000-0000-0000-0005-000000000001','equipo_proceso','medio',
   'Motor de alertas concentrado en una persona',
   'El componente que decide cuándo avisar al equipo clínico lo ha escrito y lo mantiene una sola persona.',
   'Reparto de contribuciones: 94 por ciento del módulo en un único autor.',
   'Revisión cruzada obligatoria en ese módulo y una sesión de traspaso documentada con el resto del equipo.',
   'abierto'),

  ('00000000-0000-0000-0004-000000000002','00000000-0000-0000-0005-000000000002','ia_modelos','critico',
   'Datos de entrenamiento sin derecho de uso documentado',
   'El modelo está entrenado con el histórico de ventas de dos distribuidoras. No hay cesión firmada que autorice usar esos datos para entrenar un modelo que se venderá a terceros.',
   'Cuadernos de entrenamiento con referencia a los ficheros recibidos. Sin contrato que cubra el uso.',
   'Firmar cesión de uso para entrenamiento con las dos distribuidoras antes de seguir entrenando, o reentrenar con datos propios o licenciados.',
   'abierto'),
  ('00000000-0000-0000-0004-000000000002','00000000-0000-0000-0005-000000000002','propiedad_intelectual_tecnica','alto',
   'Código sin cesión de derechos del colaborador inicial',
   'Parte del código de preparación de datos lo escribió un colaborador antes de constituir la sociedad, sin contrato ni cesión.',
   'Historial de git: 31 por ciento de las líneas del módulo de preparación con autoría externa.',
   'Firmar cesión retroactiva de derechos o reescribir ese módulo dejando constancia de la autoría.',
   'abierto'),
  ('00000000-0000-0000-0004-000000000002','00000000-0000-0000-0005-000000000002','datos_privacidad','alto',
   'Datos de cliente en máquina de desarrollo',
   'El histórico de ventas de las distribuidoras está en el portátil de desarrollo, sin cifrado en reposo ni contrato de encargo firmado.',
   'Inventario de ubicaciones de datos de la revisión del 15 de septiembre.',
   'Mover los datos a un entorno cifrado con control de acceso y firmar contrato de encargo con cada distribuidora.',
   'en_curso'),

  ('00000000-0000-0000-0004-000000000003','00000000-0000-0000-0005-000000000003','hardware','alto',
   'Dos componentes críticos sin segunda fuente',
   'El sensor de conductividad y el módulo de radio tienen un único proveedor, con plazos de entrega de catorce semanas.',
   'Mapa de proveedores de la revisión técnica. Sin alternativa homologada.',
   'Homologar una segunda fuente para cada uno, o mantener stock para una campaña completa mientras no la haya.',
   'abierto'),
  ('00000000-0000-0000-0004-000000000003','00000000-0000-0000-0005-000000000003','hardware','medio',
   'Certificación radio pendiente',
   'El módulo de radio no tiene certificación propia y la sonda no ha pasado ensayo.',
   'Sin expediente de certificación abierto a fecha de la revisión.',
   'Abrir expediente con laboratorio acreditado y reservar presupuesto antes del cierre del trimestre.',
   'en_curso'),
  ('00000000-0000-0000-0004-000000000003','00000000-0000-0000-0005-000000000003','propiedad_intelectual_tecnica','alto',
   'Contratos de firmware sin cláusula de cesión',
   'Las dos personas que desarrollan el firmware trabajan por contrato mercantil sin cláusula de cesión de derechos.',
   'Revisión de los contratos aportados en el data room.',
   'Adenda de cesión de derechos en ambos contratos, con efecto retroactivo desde el inicio de la relación.',
   'abierto')
) as v(company_id, assessment_id, dimension_code, severity, title, description, evidence, recommendation, status)
join tech_dimensions d on d.code = v.dimension_code;

-- Plan de trabajo técnico, enlazado a sus hallazgos
insert into tech_plan_items (company_id, finding_id, title, description, owner, effort_days, estimated_cost, quarter, due_date, status)
select f.company_id, f.id, v.plan_title, v.description, v.owner::responsable_plan,
       v.effort_days, v.cost, v.quarter, (current_date + v.dias)::date, v.status::estado_plan
from (values
  ('Copias sin prueba de restauración',
   'Probar la restauración de una copia completa',
   'Restaurar una copia completa en entorno aislado, cronometrar y documentar el procedimiento.',
   'compania', 2.0, 1200.00, '2026-T4', 30, 'pendiente'),
  ('Autorización a nivel de registro sin pruebas',
   'Tests de autorización entre centros',
   'Batería de tests de autorización con un caso por rol y por centro.',
   'compania', 4.0, 2400.00, '2026-T4', 25, 'en_curso'),
  ('Motor de alertas concentrado en una persona',
   'Traspaso del motor de alertas',
   'Sesión de traspaso documentada y revisión cruzada obligatoria en el módulo.',
   'compania', 3.0, 1800.00, '2027-T1', 60, 'pendiente'),
  ('Datos de entrenamiento sin derecho de uso documentado',
   'Cesión de uso de los datos de entrenamiento',
   'Acuerdo de cesión de uso para entrenamiento con las dos distribuidoras. Lo acompaña Niage en la parte técnica.',
   'niage', 5.0, 3000.00, '2026-T4', 20, 'en_curso'),
  ('Código sin cesión de derechos del colaborador inicial',
   'Cesión de derechos del código inicial',
   'Cesión retroactiva firmada, o reescritura del módulo de preparación de datos.',
   'compania', 8.0, 4800.00, '2026-T4', 45, 'pendiente'),
  ('Datos de cliente en máquina de desarrollo',
   'Entorno cifrado para los datos de cliente',
   'Entorno cifrado con control de acceso y contratos de encargo firmados.',
   'niage', 4.0, 2400.00, '2026-T4', 15, 'en_curso'),
  ('Dos componentes críticos sin segunda fuente',
   'Segunda fuente para los componentes críticos',
   'Homologación de segunda fuente para sensor de conductividad y módulo de radio.',
   'compania', 15.0, 9000.00, '2027-T1', 90, 'pendiente'),
  ('Certificación radio pendiente',
   'Expediente de certificación radio',
   'Expediente con laboratorio acreditado y ensayo de la sonda.',
   'compania', 10.0, 14000.00, '2026-T4', 60, 'en_curso'),
  ('Contratos de firmware sin cláusula de cesión',
   'Adenda de cesión en los contratos de firmware',
   'Adenda de cesión de derechos con efecto retroactivo en los dos contratos.',
   'compania', 1.0, 900.00, '2026-T4', 30, 'pendiente')
) as v(finding_title, plan_title, description, owner, effort_days, cost, quarter, dias, status)
join tech_findings f on f.title = v.finding_title;

-- Sesiones de revisión técnica
insert into tech_review_sessions (company_id, assessment_id, held_on, duration_min, attendees, conclusions)
values
  ('00000000-0000-0000-0004-000000000001','00000000-0000-0000-0005-000000000001',
   current_date - 45, 120, 'Ingeniería Niage, CTO Marea, Programa IWL',
   'Repaso de arquitectura y operación. Se acuerda priorizar la prueba de restauración antes que la integración con historia clínica.'),
  ('00000000-0000-0000-0004-000000000002','00000000-0000-0000-0005-000000000002',
   current_date - 10, 90, 'Ingeniería Niage 2, Fundadora Vega',
   'La base legal de los datos de entrenamiento se trata como bloqueo. No se sigue entrenando hasta cerrarla.'),
  ('00000000-0000-0000-0004-000000000003','00000000-0000-0000-0005-000000000003',
   current_date - 28, 150, 'Ingeniería Niage, Fundadora Raíz, electrónica',
   'Revisión de BOM y cadena de suministro. Se decide mantener stock de campaña mientras se homologa la segunda fuente.');

-- -----------------------------------------------------------------------------
-- Seis meses de KPI, de abril a septiembre de 2026
--
-- Los valores se generan a partir de una base y un crecimiento mensual por
-- compañía y KPI: es más realista que una tabla inventada a mano y deja ver
-- tendencias en el dashboard.
-- -----------------------------------------------------------------------------

insert into kpi_values (company_id, company_kpi_id, period, value, source)
select
  ck.company_id,
  ck.id,
  per.period,
  round((v.base * power(1 + v.growth, p.i))::numeric, case when v.decimales then 2 else 0 end),
  v.source
from generate_series(0, 5) as p(i)
cross join lateral (
  select (date '2026-04-01' + (p.i || ' month')::interval)::date as period
) as per(period)
cross join (values
  -- Marea Clínica · semilla con tracción
  ('marea-clinica', 'ingresos',                 9800.0,   0.09,  false, 'manual'),
  ('marea-clinica', 'mrr',                      9200.0,   0.08,  false, 'manual'),
  ('marea-clinica', 'clientes_activos',         14.0,     0.07,  false, 'manual'),
  ('marea-clinica', 'clientes_pago',            9.0,      0.08,  false, 'manual'),
  ('marea-clinica', 'pilotos_activos',          5.0,      0.03,  false, 'manual'),
  ('marea-clinica', 'caja',                     310000.0, -0.06, false, 'manual'),
  ('marea-clinica', 'burn_mensual',             21000.0,  0.02,  false, 'manual'),
  ('marea-clinica', 'equipo_personas',          6.0,      0.03,  false, 'manual'),
  ('marea-clinica', 'coste_cloud_mensual',      780.0,    0.05,  false, 'analisis'),
  ('marea-clinica', 'vulnerabilidades_criticas', 0.0,     0.0,   false, 'analisis'),
  ('marea-clinica', 'frecuencia_despliegue',    4.0,      0.06,  false, 'analisis'),
  ('marea-clinica', 'disponibilidad',           99.4,     0.001, true,  'analisis'),

  -- Vega Predictiva · pre-semilla, sin ingresos recurrentes todavía
  ('vega-predictiva', 'ingresos',                 0.0,     0.0,   false, 'manual'),
  ('vega-predictiva', 'mrr',                      0.0,     0.0,   false, 'manual'),
  ('vega-predictiva', 'clientes_activos',         2.0,     0.0,   false, 'manual'),
  ('vega-predictiva', 'clientes_pago',            0.0,     0.0,   false, 'manual'),
  ('vega-predictiva', 'pilotos_activos',          2.0,     0.07,  false, 'manual'),
  ('vega-predictiva', 'caja',                     74000.0, -0.12, false, 'manual'),
  ('vega-predictiva', 'burn_mensual',             8600.0,  0.03,  false, 'manual'),
  ('vega-predictiva', 'equipo_personas',          2.0,     0.0,   false, 'manual'),
  ('vega-predictiva', 'coste_cloud_mensual',      420.0,   0.09,  false, 'analisis'),
  ('vega-predictiva', 'vulnerabilidades_criticas', 0.0,    0.0,   false, 'analisis'),
  ('vega-predictiva', 'frecuencia_despliegue',    1.0,     0.0,   false, 'analisis'),
  ('vega-predictiva', 'disponibilidad',           97.8,    0.002, true,  'analisis'),

  -- Raíz Sensórica · semilla con venta de hardware
  ('raiz-sensorica', 'ingresos',                 16400.0,  0.05,  false, 'manual'),
  ('raiz-sensorica', 'mrr',                      3900.0,   0.07,  false, 'manual'),
  ('raiz-sensorica', 'clientes_activos',         9.0,      0.06,  false, 'manual'),
  ('raiz-sensorica', 'clientes_pago',            7.0,      0.05,  false, 'manual'),
  ('raiz-sensorica', 'pilotos_activos',          3.0,      0.0,   false, 'manual'),
  ('raiz-sensorica', 'caja',                     240000.0, -0.07, false, 'manual'),
  ('raiz-sensorica', 'burn_mensual',             19500.0,  0.03,  false, 'manual'),
  ('raiz-sensorica', 'equipo_personas',          7.0,      0.0,   false, 'manual'),
  ('raiz-sensorica', 'coste_cloud_mensual',      610.0,    0.04,  false, 'analisis'),
  ('raiz-sensorica', 'vulnerabilidades_criticas', 0.0,     0.0,   false, 'analisis'),
  ('raiz-sensorica', 'frecuencia_despliegue',    2.0,      0.04,  false, 'analisis'),
  ('raiz-sensorica', 'disponibilidad',           98.9,     0.001, true,  'analisis'),
  ('raiz-sensorica', 'unidades_fabricadas',      45.0,     0.11,  false, 'manual'),
  ('raiz-sensorica', 'coste_unitario',           268.0,    -0.015, false,'manual')
) as v(slug, kpi_code, base, growth, decimales, source)
join companies c on c.slug = v.slug
join kpi_definitions k on k.code = v.kpi_code
join company_kpis ck on ck.company_id = c.id and ck.kpi_id = k.id
on conflict (company_kpi_id, period) do nothing;

-- La disponibilidad no puede pasar del 100 por cien
update kpi_values v
set value = least(v.value, 100)
from company_kpis ck
join kpi_definitions k on k.id = ck.kpi_id
where ck.id = v.company_kpi_id and k.code = 'disponibilidad';

-- -----------------------------------------------------------------------------
-- Updates mensuales
-- -----------------------------------------------------------------------------

insert into monthly_updates (company_id, period, status, achievements, blockers, requests, due_date)
select c.id, per.period, v.status::estado_update, v.achievements, v.blockers, v.requests,
       (per.period + interval '1 month' + interval '9 days')::date
from (values
  ('marea-clinica', 0, 'revisado',
   'Dos centros nuevos en piloto. Cerrada la integración de mediciones por bluetooth.',
   'La contratación del perfil comercial se retrasa: dos candidaturas caídas en la última fase.',
   'Contactos en mutuas para abrir el segundo canal.'),
  ('marea-clinica', 1, 'revisado',
   'Primer piloto convertido en contrato anual. Tiempo de respuesta del panel clínico reducido a la mitad.',
   'Sin bloqueos.',
   'Revisión del modelo financiero antes de empezar la ronda.'),
  ('marea-clinica', 2, 'revisado',
   'Tres centros contratados. Cobertura de tests por encima del 70 por ciento.',
   'La prueba de restauración de copias sigue sin hacerse por falta de ventana.',
   'Ninguna este mes.'),
  ('marea-clinica', 3, 'revisado',
   'Cerrada la revisión técnica con Niage. Plan de trabajo acordado.',
   'Sin bloqueos.',
   'Presentación a dos fondos de la red.'),
  ('marea-clinica', 4, 'revisado',
   'Perfil comercial incorporado. Cuatro pilotos abiertos en paralelo.',
   'El embudo comercial lleva un mes sin actualizar en el data room.',
   'Revisión del guion de venta a dirección médica.'),
  ('marea-clinica', 5, 'entregado',
   'Dos contratos firmados. Integración con el primer proveedor de historia clínica en pruebas.',
   'Sin bloqueos.',
   'Fecha para la sesión de preparación de ronda.'),

  ('vega-predictiva', 3, 'revisado',
   'Prototipo validado con la segunda distribuidora. Error de predicción por debajo del objetivo.',
   'Sin contrato de cesión de datos todavía.',
   'Asesoría legal para el acuerdo de cesión de datos de entrenamiento.'),
  ('vega-predictiva', 4, 'revisado',
   'Primera versión del panel para el cliente.',
   'La cesión de datos sigue abierta. Bloquea seguir entrenando.',
   'Contacto con despacho especializado en propiedad de datos.'),
  ('vega-predictiva', 5, 'entregado',
   'Revisión técnica con Niage cerrada. Plan de trabajo priorizado sobre la base legal de los datos.',
   'Hallazgo crítico abierto sobre derechos de los datos de entrenamiento.',
   'Acompañamiento en la negociación con las distribuidoras.'),

  ('raiz-sensorica', 2, 'revisado',
   'Campaña de campo cerrada con nueve explotaciones. BOM a 248 euros.',
   'Plazo de catorce semanas del módulo de radio.',
   'Contactos de fabricación en electrónica.'),
  ('raiz-sensorica', 3, 'revisado',
   'Dos explotaciones nuevas. Actualización remota de firmware funcionando en campo.',
   'Certificación radio sin expediente abierto.',
   'Referencias de laboratorios acreditados.'),
  ('raiz-sensorica', 4, 'revisado',
   'Revisión técnica con Niage cerrada.',
   'El pacto de socios sigue sin recoger el vesting de la tercera fundadora.',
   'Asesoría societaria para la adenda.'),
  ('raiz-sensorica', 5, 'entregado',
   'Presupuesto en firme del fabricante a 2.000 unidades.',
   'Segunda fuente de componentes sin homologar.',
   'Ninguna este mes.')
) as v(slug, mes, status, achievements, blockers, requests)
cross join lateral (
  select (date '2026-04-01' + (v.mes || ' month')::interval)::date as period
) as per
join companies c on c.slug = v.slug
on conflict (company_id, period) do nothing;

-- Enlazar los valores de KPI con el update de su mes
update kpi_values v
set update_id = u.id
from monthly_updates u
where u.company_id = v.company_id and u.period = v.period and v.update_id is null;

-- -----------------------------------------------------------------------------
-- Documentos del data room
-- -----------------------------------------------------------------------------

insert into documents (company_id, area_id, name, folder, expires_on)
select c.id, a.id, v.name, a.code, v.expires::date
from (values
  ('marea-clinica', 'societario_legal',   'Escritura de constitución',            null),
  ('marea-clinica', 'societario_legal',   'Pacto de socios 2025',                 null),
  ('marea-clinica', 'financiero',         'Cuentas anuales 2025',                 '2027-06-30'),
  ('marea-clinica', 'comercial_traccion', 'Embudo comercial agosto 2026',         '2026-09-08'),
  ('vega-predictiva', 'societario_legal', 'Escritura de constitución',            null),
  ('vega-predictiva', 'financiero',       'Certificado de saldo septiembre 2026', '2026-10-31'),
  ('raiz-sensorica', 'societario_legal',  'Pacto de socios 2024',                 null),
  ('raiz-sensorica', 'regulatorio',       'Informe preliminar de certificación',  '2027-03-31')
) as v(slug, area_code, name, expires)
join companies c on c.slug = v.slug
join dd_areas a on a.code = v.area_code;

-- -----------------------------------------------------------------------------
-- Comentarios anclados
-- -----------------------------------------------------------------------------

insert into comments (company_id, entity, entity_id, body, author_id)
select s.company_id, 'bp_section', s.id, v.body, v.author::uuid
from (values
  ('00000000-0000-0000-0004-000000000001', 'go_to_market',
   'El coste de adquisición de 3.100 euros sale de cuatro operaciones. Con dos más lo damos por bueno para la ronda.',
   '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0004-000000000001', 'necesidad_capital',
   'Falta añadir el coste de remediación del plan técnico: son 5.400 euros que ya están estimados.',
   '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0004-000000000002', 'solucion_producto',
   'Antes de describir el producto autoservicio, cierra la cesión de datos. Lo demás depende de eso.',
   '00000000-0000-0000-0002-000000000002')
) as v(company_id, section_code, body, author)
join bp_section_templates t on t.code = v.section_code
join bp_sections s on s.company_id = v.company_id::uuid and s.template_id = t.id;

-- Devolver la sesión a su estado
select set_config('request.jwt.claims', '', false);
