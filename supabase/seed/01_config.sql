-- =============================================================================
-- Semilla 01 · Configuración del programa y de la evaluación
--
-- Fases, pilares, áreas de due diligence con su checklist, dimensiones técnicas
-- con criterios, niveles objetivo por etapa, pesos, secciones de business plan,
-- biblioteca de KPI y reglas de alerta.
--
-- Esto no son datos de prueba: es la configuración real con la que trabaja IWL.
-- Se edita desde la administración, no desde el código.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fases del programa (§3)
-- -----------------------------------------------------------------------------

insert into phases (code, name, description, order_index) values
  ('fase_0', 'Acuerdo Marco',
   'Incorporación formal a la cohorte.', 0),
  ('fase_1', 'Due diligence conjunto',
   'Máximo dos semanas. Diagnóstico y firma del Anexo de Programa.', 1),
  ('fase_2', 'Incubación',
   'De seis a dieciocho meses según Anexo. Plan a medida y seguimiento periódico.', 2),
  ('fase_3', 'Cierre y graduación',
   'Evaluación frente a hitos, demo day y relación post-programa.', 3)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Pilares (§3). Se activan por proyecto con intensidad distinta
-- -----------------------------------------------------------------------------

insert into pillars (code, name, description, order_index) values
  ('acompanamiento_operativo', 'Acompañamiento operativo',
   'Trabajo periódico con el equipo fundador sobre la operación del negocio.', 0),
  ('mentoria_especializada', 'Mentoría especializada',
   'Personas expertas asignadas a retos concretos del proyecto.', 1),
  ('fundraising_readiness', 'Fundraising readiness',
   'Preparación de materiales, métricas y relato para levantar ronda.', 2),
  ('espacio_recursos', 'Espacio y recursos',
   'Espacio de trabajo, infraestructura y recursos del programa.', 3),
  ('comunicacion_visibilidad', 'Comunicación y visibilidad',
   'Presencia pública del proyecto y de su equipo fundador.', 4),
  ('red_partnerships', 'Red y partnerships',
   'Acceso a la red de IWL para clientes, socios e inversores.', 5)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Escala de madurez técnica (§4.4)
-- -----------------------------------------------------------------------------

insert into tech_maturity_levels (level, name, description) values
  (0, 'No existe',
   'No hay nada construido ni documentado en esta dimensión.'),
  (1, 'Ad hoc',
   'Existe, pero depende de una persona y no está documentado ni repetible.'),
  (2, 'Básico',
   'Funciona para la etapa actual con un riesgo conocido y acotado.'),
  (3, 'Sólido',
   'Sólido para la etapa y defendible ante un inversor.'),
  (4, 'Preparado para escalar',
   'Preparado para sostener la siguiente etapa sin rehacerlo.')
on conflict (level) do nothing;

-- -----------------------------------------------------------------------------
-- Áreas de due diligence general (§4.3)
-- -----------------------------------------------------------------------------

insert into dd_areas (code, name, description, weight, order_index) values
  ('societario_legal', 'Societario y legal',
   'Constitución, estatutos, pacto de socios, cap table y contratos relevantes.', 1.5, 0),
  ('propiedad_intelectual', 'Propiedad intelectual',
   'Titularidad de marcas, dominios y derechos sobre lo que la compañía vende.', 1.0, 1),
  ('financiero', 'Financiero',
   'Cuentas, previsiones, caja, deuda y subvenciones.', 1.5, 2),
  ('comercial_traccion', 'Comercial y tracción',
   'Clientes, pilotos, contratos, embudo y evidencia de demanda.', 1.5, 3),
  ('equipo', 'Equipo',
   'Contratos del equipo, dedicación, vesting y dependencias críticas.', 1.0, 4),
  ('regulatorio', 'Regulatorio',
   'Licencias, certificaciones y normativa sectorial aplicable.', 1.0, 5),
  ('impacto_2x', 'Impacto y 2X Criteria',
   'Liderazgo femenino, gobernanza, empleo de calidad y criterios 2X.', 1.0, 6)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Checklist de due diligence general
-- -----------------------------------------------------------------------------

insert into dd_item_templates (area_id, code, title, description, is_required, validity_months, order_index)
select a.id, v.code, v.title, v.description, v.is_required, v.validity_months, v.order_index
from (values
  -- Societario y legal
  ('societario_legal', 'sl_escritura', 'Escritura de constitución',
   'Escritura pública y estatutos vigentes inscritos en el registro.', true, null, 0),
  ('societario_legal', 'sl_pacto_socios', 'Pacto de socios',
   'Pacto vigente firmado, con cláusulas de salida, vesting y arrastre.', true, null, 1),
  ('societario_legal', 'sl_cap_table', 'Cap table certificada',
   'Reparto actual con instrumentos convertibles y opciones incluidos.', true, 6, 2),
  ('societario_legal', 'sl_actas', 'Libro de actas al día',
   'Acuerdos societarios de los dos últimos ejercicios.', true, 12, 3),
  ('societario_legal', 'sl_litigios', 'Declaración de litigios',
   'Procedimientos abiertos o reclamaciones conocidas. Si no hay, se declara.', true, 6, 4),

  -- Propiedad intelectual
  ('propiedad_intelectual', 'pi_marcas', 'Marcas registradas',
   'Registro de marca en las clases y territorios donde se opera.', true, null, 0),
  ('propiedad_intelectual', 'pi_dominios', 'Dominios y perfiles',
   'Titularidad de dominios y cuentas a nombre de la sociedad, no de una persona.', true, null, 1),
  ('propiedad_intelectual', 'pi_cesion_derechos', 'Cesión de derechos',
   'Cesión firmada por quien ha creado marca, diseño o contenido.', true, null, 2),
  ('propiedad_intelectual', 'pi_patentes', 'Patentes y solicitudes',
   'Solicitudes presentadas, concedidas o en estudio. Si no aplica, se declara.', false, null, 3),

  -- Financiero
  ('financiero', 'fin_cuentas', 'Cuentas anuales',
   'Cuentas de los dos últimos ejercicios cerrados o desde constitución.', true, 12, 0),
  ('financiero', 'fin_balance_sumas', 'Balance de sumas y saldos',
   'Balance del ejercicio en curso a fecha reciente.', true, 3, 1),
  ('financiero', 'fin_modelo_financiero', 'Modelo financiero',
   'Previsión a veinticuatro meses con hipótesis explícitas.', true, 6, 2),
  ('financiero', 'fin_deuda_subvenciones', 'Deuda y subvenciones',
   'Préstamos, líneas y ayudas concedidas con sus obligaciones.', true, 6, 3),
  ('financiero', 'fin_extracto_caja', 'Posición de caja',
   'Extracto bancario o certificado de saldo del mes en curso.', true, 1, 4),

  -- Comercial y tracción
  ('comercial_traccion', 'ct_contratos_clientes', 'Contratos de clientes',
   'Contratos o pedidos firmados con los clientes de pago actuales.', true, null, 0),
  ('comercial_traccion', 'ct_pilotos', 'Acuerdos de piloto',
   'Pilotos en curso con alcance, duración y criterio de éxito.', true, null, 1),
  ('comercial_traccion', 'ct_embudo', 'Embudo comercial',
   'Oportunidades abiertas por etapa, importe y fecha estimada de cierre.', true, 3, 2),
  ('comercial_traccion', 'ct_precios', 'Política de precios',
   'Tarifa vigente y descuentos aplicados.', true, 6, 3),

  -- Equipo
  ('equipo', 'eq_contratos', 'Contratos del equipo',
   'Contratos laborales y mercantiles del equipo con dedicación declarada.', true, null, 0),
  ('equipo', 'eq_vesting', 'Vesting del equipo fundador',
   'Calendario de consolidación firmado por cada fundadora.', true, null, 1),
  ('equipo', 'eq_organigrama', 'Organigrama y plan de contratación',
   'Estructura actual y contrataciones previstas a doce meses.', true, 6, 2),
  ('equipo', 'eq_dependencias', 'Dependencias de terceros',
   'Proveedores y colaboradores de los que depende la operación.', true, 6, 3),

  -- Regulatorio
  ('regulatorio', 'reg_licencias', 'Licencias y autorizaciones',
   'Licencias necesarias para operar en el sector y territorio.', true, 12, 0),
  ('regulatorio', 'reg_certificaciones', 'Certificaciones',
   'Certificaciones obtenidas o en proceso, con su alcance.', false, 12, 1),
  ('regulatorio', 'reg_analisis_normativo', 'Análisis normativo',
   'Normativa aplicable identificada y plan de cumplimiento.', true, 12, 2),

  -- Impacto y 2X
  ('impacto_2x', 'imp_liderazgo_femenino', 'Liderazgo femenino',
   'Porcentaje de propiedad y de dirección en manos de mujeres, documentado.', true, 6, 0),
  ('impacto_2x', 'imp_gobernanza', 'Gobernanza',
   'Composición del órgano de administración y política de decisiones.', true, 12, 1),
  ('impacto_2x', 'imp_empleo', 'Calidad del empleo',
   'Condiciones, brecha salarial y política de conciliación.', true, 12, 2),
  ('impacto_2x', 'imp_medicion', 'Medición de impacto',
   'Indicadores de impacto declarados y forma de medirlos.', false, 12, 3)
) as v(area_code, code, title, description, is_required, validity_months, order_index)
join dd_areas a on a.code = v.area_code
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Dimensiones técnicas (§4.4)
-- -----------------------------------------------------------------------------

insert into tech_dimensions (code, name, description, applicability, order_index) values
  ('arquitectura_producto', 'Arquitectura y producto',
   'Componentes, diagrama, decisiones clave, acoplamiento y adecuación a la etapa y al roadmap.',
   'siempre', 0),
  ('codigo_calidad', 'Código y calidad',
   'Tamaño, lenguajes, complejidad, tests y cobertura, documentación y deuda técnica.',
   'siempre', 1),
  ('seguridad', 'Seguridad',
   'Dependencias vulnerables, secretos en el repositorio, autenticación, cifrado, OWASP Top 10 e historial de incidentes.',
   'siempre', 2),
  ('infraestructura_operacion', 'Infraestructura y operación',
   'Proveedor cloud, infraestructura como código, CI/CD, monitorización, copias, recuperación y coste cloud por cliente.',
   'siempre', 3),
  ('escalabilidad_rendimiento', 'Escalabilidad y rendimiento',
   'Qué pasa con diez veces la carga actual, cuellos de botella y límites conocidos.',
   'siempre', 4),
  ('datos_privacidad', 'Datos y privacidad',
   'Modelo de datos, alojamiento, RGPD, contratos de encargo con proveedores, calidad y propiedad del dato.',
   'siempre', 5),
  ('ia_modelos', 'IA y modelos',
   'Origen y derechos de los datos de entrenamiento, evaluación, dependencia de proveedor, coste de inferencia y clasificación de riesgo según el AI Act.',
   'ia', 6),
  ('hardware', 'Hardware',
   'Nivel de madurez TRL, lista de materiales y coste unitario, proveedores y cadena de suministro, certificación CE y radio, firmware y actualización remota, fabricabilidad.',
   'hardware', 7),
  ('propiedad_intelectual_tecnica', 'Propiedad intelectual técnica',
   'Titularidad del código y cesión de derechos de quien lo escribió, licencias open source y riesgo copyleft, patentes.',
   'siempre', 8),
  ('equipo_proceso', 'Equipo y proceso',
   'Concentración de conocimiento en una persona, dependencia de terceros, cadencia de entrega y roadmap técnico.',
   'siempre', 9)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Criterios por dimensión
--
-- `automatable` marca los criterios para los que el análisis de la capa 1
-- puede proponer puntuación. El revisor de Niage siempre confirma o ajusta.
-- -----------------------------------------------------------------------------

insert into tech_criteria (dimension_id, code, title, description, expected_evidence, automatable, order_index)
select d.id, v.code, v.title, v.description, v.expected_evidence, v.automatable, v.order_index
from (values
  -- Arquitectura y producto
  ('arquitectura_producto', 'arq_diagrama', 'Diagrama de arquitectura vigente',
   'Existe un diagrama que refleja lo que está desplegado hoy, no lo que se planeó.',
   'Diagrama con fecha y autor', false, 0),
  ('arquitectura_producto', 'arq_decisiones', 'Decisiones técnicas registradas',
   'Las decisiones estructurales están escritas con su motivo y sus alternativas descartadas.',
   'Registro de decisiones o ADR', false, 1),
  ('arquitectura_producto', 'arq_acoplamiento', 'Acoplamiento entre componentes',
   'Un cambio en un componente no obliga a tocar el resto del sistema.',
   'Mapa de dependencias internas', true, 2),
  ('arquitectura_producto', 'arq_adecuacion_etapa', 'Adecuación a la etapa',
   'La arquitectura resuelve el problema de hoy sin sobrecoste de complejidad prematura.',
   'Valoración del revisor con ejemplos', false, 3),
  ('arquitectura_producto', 'arq_roadmap_tecnico', 'Encaje con el roadmap',
   'Lo que hay construido sostiene lo que el roadmap promete en los próximos dos trimestres.',
   'Roadmap enlazado al business plan', false, 4),

  -- Código y calidad
  ('codigo_calidad', 'cod_tamano_lenguajes', 'Tamaño y lenguajes',
   'Volumen de código y reparto por lenguaje, coherentes con el equipo y la etapa.',
   'Salida de scc', true, 0),
  ('codigo_calidad', 'cod_complejidad', 'Complejidad',
   'La complejidad está concentrada donde aporta valor, no repartida por todo el código.',
   'Métrica de complejidad por módulo', true, 1),
  ('codigo_calidad', 'cod_tests', 'Tests automatizados',
   'Existen tests que se ejecutan solos y cubren los caminos críticos del producto.',
   'Informe de cobertura y ejecución en CI', true, 2),
  ('codigo_calidad', 'cod_documentacion', 'Documentación',
   'Una persona nueva puede levantar el proyecto y entender su estructura sin preguntar.',
   'README y documentación de arranque', true, 3),
  ('codigo_calidad', 'cod_deuda_tecnica', 'Deuda técnica reconocida',
   'La deuda está identificada y priorizada, no descubierta a posteriori.',
   'Lista de deuda con impacto estimado', false, 4),

  -- Seguridad
  ('seguridad', 'seg_dependencias', 'Dependencias sin vulnerabilidades críticas',
   'No hay vulnerabilidades conocidas de severidad crítica o alta sin plan de resolución.',
   'Informe de Grype y OSV-Scanner', true, 0),
  ('seguridad', 'seg_secretos', 'Sin secretos en el repositorio',
   'No hay credenciales en el código ni en el historial de git.',
   'Informe de Gitleaks. Se guarda tipo y ubicación, nunca el valor', true, 1),
  ('seguridad', 'seg_autenticacion', 'Autenticación y autorización',
   'El control de acceso se aplica en servidor y está probado, no solo en interfaz.',
   'Descripción del modelo y tests de autorización', false, 2),
  ('seguridad', 'seg_cifrado', 'Cifrado en tránsito y en reposo',
   'Los datos personales y las credenciales viajan y se guardan cifrados.',
   'Configuración de TLS y cifrado en base', false, 3),
  ('seguridad', 'seg_owasp', 'Patrones inseguros',
   'No aparecen patrones del OWASP Top 10 en el análisis estático.',
   'Informe de Semgrep', true, 4),
  ('seguridad', 'seg_incidentes', 'Historial de incidentes',
   'Los incidentes de seguridad pasados están registrados con su resolución.',
   'Registro de incidentes. Si no hay, se declara', false, 5),

  -- Infraestructura y operación
  ('infraestructura_operacion', 'inf_proveedor', 'Proveedor cloud y regiones',
   'Se sabe dónde corre cada pieza y en qué región están los datos.',
   'Inventario de servicios y regiones', false, 0),
  ('infraestructura_operacion', 'inf_iac', 'Infraestructura como código',
   'La infraestructura se puede recrear desde el repositorio, sin pasos manuales.',
   'Terraform, Pulumi o equivalente en el repositorio', true, 1),
  ('infraestructura_operacion', 'inf_cicd', 'Integración y despliegue continuos',
   'Cada cambio pasa por una tubería automática antes de llegar a producción.',
   'Configuración de CI y registro de ejecuciones', true, 2),
  ('infraestructura_operacion', 'inf_monitorizacion', 'Monitorización y alertas',
   'Una caída se detecta antes de que la reporte un cliente.',
   'Panel de monitorización y reglas de alerta', false, 3),
  ('infraestructura_operacion', 'inf_copias', 'Copias y recuperación',
   'Hay copias y consta la última vez que se probó una restauración.',
   'Política de copias y registro de prueba de restauración', false, 4),
  ('infraestructura_operacion', 'inf_coste_cliente', 'Coste cloud por cliente',
   'Se conoce lo que cuesta servir a un cliente y cómo evoluciona.',
   'Cálculo de coste unitario. Alimenta el plan financiero', false, 5),

  -- Escalabilidad y rendimiento
  ('escalabilidad_rendimiento', 'esc_diez_veces', 'Diez veces la carga actual',
   'Está analizado qué se rompe primero al multiplicar por diez la carga.',
   'Análisis o prueba de carga con conclusiones', false, 0),
  ('escalabilidad_rendimiento', 'esc_cuellos', 'Cuellos de botella identificados',
   'Los límites del sistema están nombrados, no supuestos.',
   'Lista de cuellos con métrica que lo demuestra', false, 1),
  ('escalabilidad_rendimiento', 'esc_medicion', 'Medición de rendimiento',
   'Hay métricas de latencia y throughput en producción.',
   'Panel con percentiles de latencia', false, 2),
  ('escalabilidad_rendimiento', 'esc_limites_proveedor', 'Límites de proveedores',
   'Se conocen las cuotas de los servicios de terceros de los que depende el producto.',
   'Inventario de límites y cuotas', false, 3),

  -- Datos y privacidad
  ('datos_privacidad', 'dat_modelo', 'Modelo de datos documentado',
   'El modelo de datos está descrito y se entiende sin leer el código.',
   'Esquema y diccionario de datos', true, 0),
  ('datos_privacidad', 'dat_alojamiento', 'Alojamiento y transferencias',
   'Los datos personales se alojan en la UE o hay base legal para la transferencia.',
   'Mapa de alojamiento por servicio', false, 1),
  ('datos_privacidad', 'dat_rgpd', 'Cumplimiento RGPD',
   'Registro de actividades, bases de legitimación y derechos de las personas resueltos.',
   'Registro de actividades de tratamiento', false, 2),
  ('datos_privacidad', 'dat_encargo', 'Contratos de encargo',
   'Hay contrato de encargo firmado con cada proveedor que trata datos.',
   'Contratos de encargo vigentes', false, 3),
  ('datos_privacidad', 'dat_calidad_propiedad', 'Calidad y propiedad del dato',
   'Se sabe de quién es cada dato y qué se puede hacer con él.',
   'Política de datos y cláusulas con clientes', false, 4),

  -- IA y modelos
  ('ia_modelos', 'ia_origen_datos', 'Origen y derechos de los datos',
   'Los datos de entrenamiento tienen origen conocido y derecho de uso documentado.',
   'Procedencia y licencias de los conjuntos de datos', false, 0),
  ('ia_modelos', 'ia_evaluacion', 'Evaluación del modelo',
   'El modelo se evalúa con un conjunto estable y métricas declaradas.',
   'Informe de evaluación con métricas y fecha', false, 1),
  ('ia_modelos', 'ia_dependencia_proveedor', 'Dependencia de proveedor',
   'Está valorado qué pasa si el proveedor de modelo sube precios o retira el modelo.',
   'Plan de contingencia y alternativas probadas', false, 2),
  ('ia_modelos', 'ia_coste_inferencia', 'Coste de inferencia',
   'Se conoce el coste por petición y su peso sobre el margen.',
   'Cálculo de coste por petición y por cliente', false, 3),
  ('ia_modelos', 'ia_ai_act', 'Clasificación según el AI Act',
   'El sistema está clasificado por nivel de riesgo y se cumplen las obligaciones que le tocan.',
   'Clasificación razonada y plan de cumplimiento', false, 4),

  -- Hardware
  ('hardware', 'hw_trl', 'Nivel de madurez TRL',
   'El TRL declarado está respaldado por prototipos y pruebas verificables.',
   'Evidencia de prototipo y pruebas por nivel', false, 0),
  ('hardware', 'hw_bom', 'Lista de materiales y coste unitario',
   'Existe BOM completa con coste unitario a volumen actual y a volumen objetivo.',
   'BOM con precios y escalados', false, 1),
  ('hardware', 'hw_suministro', 'Proveedores y cadena de suministro',
   'Los componentes críticos tienen alternativa o stock, y sus plazos están medidos.',
   'Mapa de proveedores con plazos y riesgo', false, 2),
  ('hardware', 'hw_certificacion', 'Certificación CE y radio',
   'Las certificaciones necesarias están obtenidas o planificadas con presupuesto.',
   'Certificados o plan de certificación con coste', false, 3),
  ('hardware', 'hw_firmware', 'Firmware y actualización remota',
   'El firmware se puede actualizar en campo de forma segura.',
   'Mecanismo de actualización y registro de versiones', false, 4),
  ('hardware', 'hw_fabricabilidad', 'Fabricabilidad',
   'El diseño es fabricable al volumen previsto con el socio industrial identificado.',
   'Revisión de fabricabilidad y acuerdo con fabricante', false, 5),

  -- Propiedad intelectual técnica
  ('propiedad_intelectual_tecnica', 'pit_titularidad', 'Titularidad del código',
   'Todo el código es de la sociedad, incluido el escrito por terceros o antes de constituir.',
   'Cesiones de derechos firmadas por cada persona que escribió código', false, 0),
  ('propiedad_intelectual_tecnica', 'pit_licencias', 'Licencias de dependencias',
   'Las licencias de las dependencias son compatibles con el modelo de negocio.',
   'Informe de licencias de Grant o ScanCode', true, 1),
  ('propiedad_intelectual_tecnica', 'pit_copyleft', 'Riesgo copyleft',
   'No hay dependencias con copyleft fuerte en el producto distribuido.',
   'Lista de licencias copyleft detectadas', true, 2),
  ('propiedad_intelectual_tecnica', 'pit_patentes', 'Patentes técnicas',
   'Las invenciones patentables están identificadas y decidido si se protegen.',
   'Análisis de patentabilidad o declaración razonada', false, 3),

  -- Equipo y proceso
  ('equipo_proceso', 'eqp_concentracion', 'Concentración de conocimiento',
   'Ninguna parte crítica del sistema depende de una sola persona.',
   'Reparto de contribuciones por área del código', true, 0),
  ('equipo_proceso', 'eqp_terceros', 'Dependencia de terceros',
   'Si hay desarrollo externo, está contratado con entrega de código y derechos.',
   'Contratos de desarrollo con cláusula de cesión', false, 1),
  ('equipo_proceso', 'eqp_cadencia', 'Cadencia de entrega',
   'Frecuencia de despliegue, tiempo de entrega, tasa de fallo y tiempo de recuperación medidos.',
   'Métricas de entrega de los últimos tres meses', true, 2),
  ('equipo_proceso', 'eqp_roadmap', 'Roadmap técnico',
   'Existe roadmap técnico por trimestres, con responsables y esfuerzo estimado.',
   'Roadmap enlazado al plan de trabajo técnico', false, 3)
) as v(dimension_code, code, title, description, expected_evidence, automatable, order_index)
join tech_dimensions d on d.code = v.dimension_code
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Niveles objetivo por dimensión y etapa (§4.4)
--
-- El score técnico mide la distancia a estos números. Una compañía pre-semilla
-- con nivel 2 en arquitectura está en su sitio; la misma compañía en serie A
-- tiene una brecha. Cambiar la etapa cambia el score sin tocar las puntuaciones.
-- -----------------------------------------------------------------------------

insert into tech_stage_targets (dimension_id, stage, target_level)
select d.id, v.stage::company_stage, v.target_level
from (values
  ('arquitectura_producto',        'pre_semilla', 1), ('arquitectura_producto',        'semilla', 2), ('arquitectura_producto',        'serie_a', 3),
  ('codigo_calidad',               'pre_semilla', 1), ('codigo_calidad',               'semilla', 2), ('codigo_calidad',               'serie_a', 3),
  ('seguridad',                    'pre_semilla', 2), ('seguridad',                    'semilla', 3), ('seguridad',                    'serie_a', 4),
  ('infraestructura_operacion',    'pre_semilla', 1), ('infraestructura_operacion',    'semilla', 2), ('infraestructura_operacion',    'serie_a', 4),
  ('escalabilidad_rendimiento',    'pre_semilla', 0), ('escalabilidad_rendimiento',    'semilla', 2), ('escalabilidad_rendimiento',    'serie_a', 3),
  ('datos_privacidad',             'pre_semilla', 2), ('datos_privacidad',             'semilla', 3), ('datos_privacidad',             'serie_a', 4),
  ('ia_modelos',                   'pre_semilla', 1), ('ia_modelos',                   'semilla', 2), ('ia_modelos',                   'serie_a', 3),
  ('hardware',                     'pre_semilla', 1), ('hardware',                     'semilla', 2), ('hardware',                     'serie_a', 3),
  ('propiedad_intelectual_tecnica','pre_semilla', 2), ('propiedad_intelectual_tecnica','semilla', 3), ('propiedad_intelectual_tecnica','serie_a', 4),
  ('equipo_proceso',               'pre_semilla', 1), ('equipo_proceso',               'semilla', 2), ('equipo_proceso',               'serie_a', 3)
) as v(dimension_code, stage, target_level)
join tech_dimensions d on d.code = v.dimension_code
on conflict (dimension_id, stage) do nothing;

-- -----------------------------------------------------------------------------
-- Pesos por dimensión y perfil tecnológico (§4.4)
--
-- Peso 0 desactiva la dimensión para ese perfil: así las dimensiones «si aplica»
-- no penalizan a quien no las tiene.
-- -----------------------------------------------------------------------------

insert into tech_dimension_weights (dimension_id, tech_profile, weight)
select d.id, v.tech_profile::company_tech_profile, v.weight
from (values
  --                                software  software_ia  hardware
  ('arquitectura_producto',         'software',    1.5), ('arquitectura_producto',         'software_ia', 1.5), ('arquitectura_producto',         'hardware', 1.0),
  ('codigo_calidad',                'software',    1.5), ('codigo_calidad',                'software_ia', 1.2), ('codigo_calidad',                'hardware', 1.0),
  ('seguridad',                     'software',    2.0), ('seguridad',                     'software_ia', 2.0), ('seguridad',                     'hardware', 1.5),
  ('infraestructura_operacion',     'software',    1.5), ('infraestructura_operacion',     'software_ia', 1.5), ('infraestructura_operacion',     'hardware', 1.0),
  ('escalabilidad_rendimiento',     'software',    1.0), ('escalabilidad_rendimiento',     'software_ia', 1.0), ('escalabilidad_rendimiento',     'hardware', 0.5),
  ('datos_privacidad',              'software',    1.5), ('datos_privacidad',              'software_ia', 2.0), ('datos_privacidad',              'hardware', 1.0),
  ('ia_modelos',                    'software',    0.0), ('ia_modelos',                    'software_ia', 2.0), ('ia_modelos',                    'hardware', 0.0),
  ('hardware',                      'software',    0.0), ('hardware',                      'software_ia', 0.0), ('hardware',                      'hardware', 2.5),
  ('propiedad_intelectual_tecnica', 'software',    1.5), ('propiedad_intelectual_tecnica', 'software_ia', 1.5), ('propiedad_intelectual_tecnica', 'hardware', 1.5),
  ('equipo_proceso',                'software',    1.0), ('equipo_proceso',                'software_ia', 1.0), ('equipo_proceso',                'hardware', 1.0)
) as v(dimension_code, tech_profile, weight)
join tech_dimensions d on d.code = v.dimension_code
on conflict (dimension_id, tech_profile) do nothing;

-- -----------------------------------------------------------------------------
-- Secciones del business plan (§4.2)
-- -----------------------------------------------------------------------------

insert into bp_section_templates (code, name, guidance, order_index) values
  ('problema', 'Problema',
   'Qué problema resuelve la compañía, a quién le pasa y qué hace hoy esa persona para resolverlo.', 0),
  ('solucion_producto', 'Solución y producto',
   'Qué está construido hoy, qué falta y por qué esta solución resuelve el problema mejor que la alternativa actual.', 1),
  ('mercado', 'Mercado',
   'Tamaño alcanzable con el producto de hoy, segmentos y competencia real.', 2),
  ('modelo_negocio', 'Modelo de negocio',
   'Cómo se cobra, a quién, cuánto y con qué margen.', 3),
  ('go_to_market', 'Go to market',
   'Cómo llega el producto al cliente, con qué coste de adquisición y en cuánto tiempo.', 4),
  ('roadmap', 'Roadmap',
   'Qué se construye en los próximos cuatro trimestres y con qué criterio se decide.', 5),
  ('equipo', 'Equipo',
   'Quién está, qué aporta cada persona y qué perfiles faltan.', 6),
  ('plan_financiero', 'Plan financiero',
   'Previsión a veinticuatro meses. Los reales los toma la plataforma de los KPI mensuales.', 7),
  ('necesidad_capital', 'Necesidad de capital',
   'Cuánto se necesita, para qué se usa y hasta qué hito lleva.', 8)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Biblioteca de KPI (§4.6)
-- -----------------------------------------------------------------------------

insert into kpi_definitions (code, name, description, category, unit, direction, is_derived, derived_from, order_index) values
  -- Núcleo común
  ('ingresos', 'Ingresos del mes',
   'Ingresos reconocidos en el mes, sin IVA.', 'nucleo', 'moneda', 'sube_mejor', false, '{}', 0),
  ('mrr', 'MRR',
   'Ingreso recurrente mensual contratado a cierre de mes.', 'nucleo', 'moneda', 'sube_mejor', false, '{}', 1),
  ('clientes_activos', 'Clientes activos',
   'Clientes que han usado el producto en el mes.', 'nucleo', 'numero', 'sube_mejor', false, '{}', 2),
  ('clientes_pago', 'Clientes de pago',
   'Clientes con contrato de pago vigente a cierre de mes.', 'nucleo', 'numero', 'sube_mejor', false, '{}', 3),
  ('pilotos_activos', 'Pilotos activos',
   'Pilotos en curso a cierre de mes.', 'nucleo', 'numero', 'sube_mejor', false, '{}', 4),
  ('caja', 'Caja',
   'Saldo disponible a cierre de mes.', 'nucleo', 'moneda', 'sube_mejor', false, '{}', 5),
  ('burn_mensual', 'Burn mensual',
   'Consumo neto de caja en el mes.', 'nucleo', 'moneda', 'baja_mejor', false, '{}', 6),
  ('equipo_personas', 'Equipo',
   'Personas dedicadas a jornada completa equivalente a cierre de mes.', 'nucleo', 'numero', 'neutro', false, '{}', 7),

  -- Derivadas. No se teclean: las calcula la plataforma (carga única)
  ('runway_meses', 'Runway',
   'Meses de caja al ritmo de consumo actual. Caja dividida entre burn mensual.',
   'nucleo', 'meses', 'sube_mejor', true, '{caja,burn_mensual}', 8),
  ('crecimiento_mrr', 'Crecimiento de MRR',
   'Variación del MRR respecto al mes anterior.',
   'nucleo', 'porcentaje', 'sube_mejor', true, '{mrr}', 9),
  ('conversion_piloto_cliente', 'Conversión de piloto a cliente',
   'Clientes de pago sobre la suma de clientes de pago y pilotos activos.',
   'nucleo', 'porcentaje', 'sube_mejor', true, '{clientes_pago,pilotos_activos}', 10),
  ('coste_cloud_sobre_ingresos', 'Coste cloud sobre ingresos',
   'Coste cloud mensual dividido entre los ingresos del mes.',
   'nucleo', 'porcentaje', 'baja_mejor', true, '{coste_cloud_mensual,ingresos}', 11),

  -- Técnicos. Llegan del análisis automático, no los introduce nadie (§4.6)
  ('vulnerabilidades_criticas', 'Vulnerabilidades críticas abiertas',
   'Vulnerabilidades de severidad crítica sin resolver a cierre de mes.',
   'tecnico', 'numero', 'baja_mejor', false, '{}', 20),
  ('frecuencia_despliegue', 'Frecuencia de despliegue',
   'Despliegues a producción en el mes.', 'tecnico', 'numero', 'sube_mejor', false, '{}', 21),
  ('disponibilidad', 'Disponibilidad',
   'Porcentaje de tiempo con el servicio operativo en el mes.',
   'tecnico', 'porcentaje', 'sube_mejor', false, '{}', 22),
  ('coste_cloud_mensual', 'Coste cloud mensual',
   'Gasto en infraestructura cloud en el mes.', 'tecnico', 'moneda', 'baja_mejor', false, '{}', 23)
on conflict (code) do nothing;

-- KPI por sector
insert into kpi_definitions (code, name, description, category, unit, direction, sector, is_derived, derived_from, order_index) values
  ('unidades_fabricadas', 'Unidades fabricadas',
   'Unidades producidas en el mes.', 'sector', 'numero', 'sube_mejor', 'hardware', false, '{}', 30),
  ('coste_unitario', 'Coste unitario',
   'Coste de fabricación por unidad al volumen del mes.', 'sector', 'moneda', 'baja_mejor', 'hardware', false, '{}', 31),
  ('peticiones_modelo', 'Peticiones al modelo',
   'Peticiones de inferencia atendidas en el mes.', 'sector', 'numero', 'sube_mejor', 'ia', false, '{}', 32),
  ('coste_inferencia', 'Coste de inferencia',
   'Coste medio por petición de inferencia.', 'sector', 'moneda', 'baja_mejor', 'ia', false, '{}', 33)
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Reglas de alerta (§4.7). Umbrales configurables
-- -----------------------------------------------------------------------------

insert into alert_rules (code, name, description, config) values
  ('update_no_entregado', 'Update mensual no entregado',
   'La compañía no ha entregado el update pasada la fecha límite.',
   '{"dias_gracia": 3, "severidad": "media"}'),
  ('runway_bajo', 'Runway por debajo del umbral',
   'El runway calculado cae por debajo del umbral configurado.',
   '{"umbral_meses": 6, "severidad": "alta"}'),
  ('hito_vencido', 'Hito vencido',
   'Un hito del Anexo ha pasado su fecha sin cumplirse.',
   '{"dias_gracia": 0, "severidad": "media"}'),
  ('documento_caducado', 'Documento caducado',
   'Un documento del data room ha superado su validez y vuelve a pendiente.',
   '{"dias_aviso_previo": 30, "severidad": "media"}'),
  ('hallazgo_critico_abierto', 'Hallazgo crítico abierto',
   'Existe un hallazgo de severidad crítica sin resolver. Bloquea el estado invertible.',
   '{"severidad": "alta"}'),
  ('vulnerabilidad_critica_nueva', 'Vulnerabilidad crítica nueva',
   'El análisis ha detectado una vulnerabilidad crítica que no estaba en la ejecución anterior.',
   '{"severidad": "alta"}'),
  ('secreto_detectado', 'Secreto detectado',
   'El análisis ha encontrado una credencial en el código o en el historial.',
   '{"severidad": "alta"}'),
  ('repositorio_desconectado', 'Repositorio desconectado',
   'La conexión con el repositorio ha dejado de funcionar o se ha revocado.',
   '{"severidad": "media"}'),
  ('reevaluacion_tecnica_pendiente', 'Reevaluación técnica pendiente',
   'Han pasado más meses de los configurados desde la última evaluación técnica.',
   '{"meses": 3, "severidad": "media"}')
on conflict (code) do nothing;

-- -----------------------------------------------------------------------------
-- Ajustes de plataforma
-- -----------------------------------------------------------------------------

insert into platform_settings (key, value, description) values
  ('score_preparacion_peso_tecnico',
   '{"peso": 2.0}',
   'Peso con el que el score técnico entra en el score de preparación total. Las áreas de due diligence general aportan su propio peso (§4.3).'),
  ('update_mensual_dia_limite',
   '{"dia": 10}',
   'Día del mes en que vence el update del mes anterior.'),
  ('reevaluacion_tecnica_meses',
   '{"meses": 3}',
   'Cadencia de reevaluación técnica. La plataforma avisa cuando toca (§4.4).')
on conflict (key) do nothing;
