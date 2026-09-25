-- =============================================================================
-- 013 · Índice de madurez
--
-- El score técnico dice si la tecnología aguanta y el de preparación si el
-- expediente está en orden. Ninguno contesta a «¿está este proyecto más
-- maduro que hace seis meses?», que es la pregunta de una incubadora y la que
-- justifica el programa.
--
-- Los pesos viven aquí y no en el código por lo mismo que los umbrales: son
-- una decisión de IWL y tienen que poder cambiarse sin desplegar.
-- =============================================================================

insert into platform_settings (key, value, description) values
  ('pesos_madurez',
   '{
      "tecnologia": 30,
      "gobierno": 20,
      "plan": 20,
      "traccion": 20,
      "solidez": 10
    }'::jsonb,
   'Peso de cada eje del índice de madurez. Un eje sin datos no cuenta como cero: se reparte sobre el peso realmente medido, igual que en el score técnico.'),

  ('objetivos_traccion',
   '{
      "pre_semilla": 2000,
      "semilla": 15000,
      "serie_a": 80000
    }'::jsonb,
   'Ingreso recurrente mensual (MRR) esperado en cada etapa de inversión. Es la referencia del eje de tracción del índice de madurez.')
on conflict (key) do nothing;
