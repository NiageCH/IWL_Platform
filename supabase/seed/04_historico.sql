-- =============================================================================
-- Semilla 04 · Histórico de evaluaciones técnicas
--
-- Cada compañía tiene más de una evaluación publicada, para que el movimiento
-- enseñe un recorrido y no un punto. Las puntuaciones antiguas son peores que
-- las de hoy, que es lo que se espera de un programa que funciona, salvo donde
-- hay una regresión a propósito: Raíz Sensórica empeora en cadena de
-- suministro al crecer el volumen, y eso tiene que verse tal cual.
--
-- Las instantáneas de preparación no se escriben aquí: las genera
-- `npm run snapshots`, que usa el mismo código de cálculo que la aplicación.
-- Dos implementaciones del mismo score acabarían divergiendo.
-- =============================================================================

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '00000000-0000-0000-0002-000000000001',
    'role', 'authenticated'
  )::text,
  false
);

-- -----------------------------------------------------------------------------
-- Evaluaciones anteriores
-- -----------------------------------------------------------------------------

insert into tech_assessments (id, company_id, reviewer_id, assessed_on, stage, tech_profile, status, summary, strengths, published_at)
values
  -- Marea Clínica · línea base al entrar, y una revisión intermedia
  ('00000000-0000-0000-0006-000000000001',
   '00000000-0000-0000-0004-000000000001',
   '00000000-0000-0000-0002-000000000003',
   current_date - 200, 'semilla', 'software', 'publicada',
   'Primera evaluación al incorporarse al programa. Producto funcionando con dos centros, pero construido a mano: sin tests, sin despliegue automatizado y con el conocimiento repartido de forma desigual.',
   'Conocimiento clínico muy por encima de la media. El modelo de datos ya distingue bien paciente, medición y alerta.',
   now() - interval '200 days'),

  ('00000000-0000-0000-0006-000000000002',
   '00000000-0000-0000-0004-000000000001',
   '00000000-0000-0000-0002-000000000003',
   current_date - 110, 'semilla', 'software', 'publicada',
   'Revisión intermedia. La automatización de despliegue y la cobertura de tests han subido con claridad. Queda la operación: copias sin probar y monitorización a medias.',
   'Cadencia de entrega semanal sostenida. Decisiones técnicas empezadas a registrar.',
   now() - interval '110 days'),

  -- Vega Predictiva · una sola anterior, entró hace poco
  ('00000000-0000-0000-0006-000000000003',
   '00000000-0000-0000-0004-000000000002',
   '00000000-0000-0000-0002-000000000004',
   current_date - 75, 'pre_semilla', 'software_ia', 'publicada',
   'Primera evaluación. Cuadernos de análisis y un modelo prometedor, sin nada de la infraestructura que necesita un producto. La base legal de los datos todavía no se había mirado.',
   'Rigor en la evaluación del modelo desde el primer día.',
   now() - interval '75 days'),

  -- Raíz Sensórica · línea base y una intermedia
  ('00000000-0000-0000-0006-000000000004',
   '00000000-0000-0000-0004-000000000003',
   '00000000-0000-0000-0002-000000000003',
   current_date - 240, 'semilla', 'hardware', 'publicada',
   'Primera evaluación. Prototipo de sonda validado en laboratorio, sin campaña de campo y sin plataforma en producción.',
   'Diseño electrónico sobrio y bien documentado.',
   now() - interval '240 days'),

  ('00000000-0000-0000-0006-000000000005',
   '00000000-0000-0000-0004-000000000003',
   '00000000-0000-0000-0002-000000000003',
   current_date - 120, 'semilla', 'hardware', 'publicada',
   'Revisión intermedia. Plataforma en producción con cinco explotaciones y firmware actualizable en campo. Aparece el riesgo de suministro al subir el volumen.',
   'Actualización remota de firmware resuelta antes de tener flota.',
   now() - interval '120 days')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Puntuaciones de las evaluaciones anteriores
-- -----------------------------------------------------------------------------

insert into tech_scores (assessment_id, company_id, dimension_id, level, evidence, source, scored_by)
select v.assessment_id::uuid, v.company_id::uuid, d.id, v.level, v.evidence, 'manual',
       (select reviewer_id from tech_assessments where id = v.assessment_id::uuid)
from (values
  -- Marea · línea base, hace 200 días
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','arquitectura_producto',1,'Sin diagrama. La arquitectura se explica de palabra y solo la conoce entera la dirección técnica.'),
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','codigo_calidad',1,'Sin tests automatizados. Arrancar el proyecto en una máquina nueva requiere acompañamiento.'),
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','seguridad',1,'Una credencial de servicio en el repositorio, ya rotada. Dependencias sin revisar desde la constitución.'),
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','infraestructura_operacion',1,'Despliegue manual por SSH. Sin copias configuradas.'),
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','escalabilidad_rendimiento',1,'Dos centros y sesenta pacientes. Sin análisis de carga, razonable para el momento.'),
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','datos_privacidad',2,'Datos en región UE desde el principio. Registro de actividades a medias y sin contratos de encargo.'),
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','propiedad_intelectual_tecnica',1,'Parte del código escrito antes de constituir, sin cesión firmada.'),
  ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001','equipo_proceso',1,'Todo el sistema en una persona. Sin cadencia de entrega medible.'),

  -- Marea · intermedia, hace 110 días
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','arquitectura_producto',2,'Primer diagrama de arquitectura y tres decisiones registradas.'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','codigo_calidad',2,'Cobertura del 41 por ciento, concentrada en el registro de mediciones.'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','seguridad',2,'Repositorio limpio de secretos y dependencias al día. Autorización sin pruebas.'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','infraestructura_operacion',2,'CI/CD en marcha y copias configuradas, sin prueba de restauración.'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','escalabilidad_rendimiento',1,'Siete centros. Se empieza a notar la consulta de histórico, sin medir todavía.'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','datos_privacidad',3,'Registro de actividades completo y contratos de encargo firmados con los tres proveedores.'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','propiedad_intelectual_tecnica',3,'Cesión firmada por las cinco personas que han escrito código.'),
  ('00000000-0000-0000-0006-000000000002','00000000-0000-0000-0004-000000000001','equipo_proceso',2,'Despliegue semanal medido. El motor de alertas sigue en una sola persona.'),

  -- Vega · primera, hace 75 días
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','arquitectura_producto',0,'Solo cuadernos de análisis. No hay servicio desplegado.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','codigo_calidad',0,'Código en cuadernos, sin estructura de proyecto.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','seguridad',1,'Dependencias sin revisar. Nada expuesto todavía porque no hay servicio.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','infraestructura_operacion',0,'Todo se ejecuta en el portátil de la fundadora.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','escalabilidad_rendimiento',1,'Sin carga que analizar, coherente con la etapa.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','datos_privacidad',1,'Datos de cliente en la máquina de desarrollo, sin cifrar.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','ia_modelos',1,'Evaluación con conjunto estable desde el principio. Origen de los datos sin mirar.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','propiedad_intelectual_tecnica',1,'Sin cesión del colaborador inicial.'),
  ('00000000-0000-0000-0006-000000000003','00000000-0000-0000-0004-000000000002','equipo_proceso',0,'Una persona y media, sin proceso.'),

  -- Raíz · línea base, hace 240 días
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','arquitectura_producto',1,'Prototipo de sonda y un script de lectura. Sin plataforma.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','codigo_calidad',1,'Firmware sin pruebas automatizadas. Nada de plataforma que revisar.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','seguridad',1,'Firmware sin firma. Sin dispositivos en campo todavía.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','infraestructura_operacion',0,'No hay nada desplegado.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','escalabilidad_rendimiento',0,'Sin sistema que escalar.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','datos_privacidad',2,'Dato agronómico, no personal. Propiedad sin pactar con el agricultor.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','hardware',1,'TRL 4: prototipo validado en laboratorio. BOM abierta, sin coste unitario cerrado.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','propiedad_intelectual_tecnica',1,'Firmware desarrollado por contrato mercantil sin cláusula de cesión.'),
  ('00000000-0000-0000-0006-000000000004','00000000-0000-0000-0004-000000000003','equipo_proceso',1,'Tres fundadoras, sin cadencia medible.'),

  -- Raíz · intermedia, hace 120 días
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','arquitectura_producto',2,'Sonda, pasarela y plataforma separadas y documentadas.'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','codigo_calidad',2,'Tests en la plataforma. Firmware todavía a mano sobre placa.'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','seguridad',2,'Actualización de firmware firmada. Credenciales de pasarela compartidas.'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','infraestructura_operacion',2,'Plataforma en cloud con despliegue automatizado.'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','escalabilidad_rendimiento',2,'Cinco explotaciones y 60 sondas. Límite de la pasarela identificado.'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','datos_privacidad',3,'Propiedad del dato pactada por contrato con cada agricultor.'),
  -- Regresión a propósito: el riesgo de suministro aparece al subir el volumen
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','hardware',3,'TRL 6 con piloto en campo. Dos proveedores por componente en ese momento.'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','propiedad_intelectual_tecnica',2,'Cesión firmada por el equipo interno. Los contratos externos siguen sin cláusula.'),
  ('00000000-0000-0000-0006-000000000005','00000000-0000-0000-0004-000000000003','equipo_proceso',2,'Cadencia medida en plataforma.')
) as v(assessment_id, company_id, dimension_code, level, evidence)
join tech_dimensions d on d.code = v.dimension_code
on conflict (assessment_id, dimension_id) do nothing;

select set_config('request.jwt.claims', '', false);

-- -----------------------------------------------------------------------------
-- Repartir el historial del checklist a lo largo del programa
--
-- La semilla instancia el checklist y le pone su estado final de una vez, así
-- que todas las transiciones quedan con la fecha de hoy y el score de
-- preparación pasa de golpe de cero a su valor actual. Aquí se reparten esas
-- transiciones entre la entrada al programa y hoy, en el orden en que IWL
-- revisa las áreas: primero societario, después financiero, y así.
--
-- Con esto el movimiento de preparación enseña un recorrido, que es lo que
-- pasa de verdad, en vez de un escalón.
-- -----------------------------------------------------------------------------

with inicio as (
  select company_id, min(assessed_on) as desde
  from tech_assessments
  where status = 'publicada'
  group by company_id
),
cambios as (
  select
    h.id,
    i.desde,
    row_number() over (
      partition by h.company_id
      order by a.order_index, t.order_index, h.id
    ) as n,
    count(*) over (partition by h.company_id) as total
  from dd_item_status_history h
  join inicio i on i.company_id = h.company_id
  join dd_items d on d.id = h.dd_item_id
  join dd_areas a on a.id = d.area_id
  left join dd_item_templates t on t.id = d.template_id
  -- Solo las transiciones. El alta del punto se queda en la fecha de entrada
  where h.from_status is not null
)
update dd_item_status_history h
set created_at = (
      c.desde
      + ((current_date - c.desde) * (c.n::numeric / (c.total + 1)))::int * interval '1 day'
    )::timestamptz
from cambios c
where c.id = h.id;

-- El alta de cada punto, a la fecha de entrada al programa
with inicio as (
  select company_id, min(assessed_on) as desde
  from tech_assessments
  where status = 'publicada'
  group by company_id
)
update dd_item_status_history h
set created_at = i.desde::timestamptz
from inicio i
where i.company_id = h.company_id and h.from_status is null;
