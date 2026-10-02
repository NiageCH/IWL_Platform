-- =============================================================================
-- «Graduación» fuera
--
-- La fase 3 se llamaba «Cierre y graduación». No es la palabra: esto no es
-- una escuela y lo que termina es un proceso de aceleración, no unos
-- estudios. Pasa a «Fin del programa».
--
-- Va en una migración y no solo en la semilla porque la semilla inserta con
-- `on conflict do nothing`: en una base que ya existe —la nube— no cambiaría
-- nada.
-- =============================================================================

update phases
set name = 'Fin del programa'
where code = 'fase_3';
