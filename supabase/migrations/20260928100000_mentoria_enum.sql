-- =============================================================================
-- 014 · Mentoría: los dos papeles
--
-- IWL trabaja con mentores, y no todos hacen lo mismo en un proyecto. El
-- principal coordina: es quien responde de que el proyecto avance. Los
-- secundarios entran a retos concretos con horas asignadas.
--
-- Una misma persona es principal en un proyecto y secundaria en otro, que es
-- por lo que el papel va en la asignación y no en el rol de la persona.
--
-- Va en su propia migración porque Postgres no deja usar un valor nuevo de un
-- enum en la misma transacción en la que se añade.
-- =============================================================================

alter type company_member_role add value if not exists 'mentor_principal';
alter type company_member_role add value if not exists 'mentor_secundario';

/*
 * El valor `mentor` se queda en el tipo aunque deje de usarse.
 *
 * Postgres no permite quitar un valor de un enum sin recrear el tipo entero,
 * y recrearlo obligaría a reescribir todas las políticas que lo comparan. La
 * siguiente migración pasa las filas que lo usan a `mentor_secundario` y la
 * interfaz deja de ofrecerlo.
 */
comment on type company_member_role is
  'Papel de una persona en una compañía concreta. «mentor» está obsoleto: usar mentor_principal o mentor_secundario.';
