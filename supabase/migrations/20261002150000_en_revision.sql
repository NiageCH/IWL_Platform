-- =============================================================================
-- Un punto entregado entra en revisión, y de ahí solo lo mueve IWL
--
-- Antes, subir un documento dejaba el punto en «entregado» y la fundadora
-- podía seguir moviéndolo. Eso convierte el checklist en una lista que cada
-- parte interpreta a su manera.
--
-- El recorrido ahora es: pendiente → (sube documento) en revisión → validado
-- o bloqueante. El salto a «en revisión» lo da la propia subida; a partir de
-- ahí el estado es una valoración, y las valoraciones son de IWL.
--
-- Entrar en revisión sí lo puede hacer la compañía: es lo que pasa cuando
-- entrega. Lo que no puede es sacarlo de ahí.
-- =============================================================================

create or replace function app.guard_validacion_dd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'validado'
     and (tg_op = 'INSERT' or old.status is distinct from 'validado')
     and not app.can_validate_company(new.company_id) then
    raise exception 'Validar un punto de due diligence es del equipo de IWL'
      using errcode = '42501';
  end if;

  -- Marcar algo como bloqueante también es una valoración
  if new.status = 'bloqueante'
     and (tg_op = 'INSERT' or old.status is distinct from 'bloqueante')
     and not app.can_validate_company(new.company_id) then
    raise exception 'Marcar un punto como bloqueante es del equipo de IWL'
      using errcode = '42501';
  end if;

  /*
   * Y lo que ya está en manos de IWL no vuelve atrás solo.
   *
   * Sin esto, quien entrega podía devolver a «pendiente» un punto que el
   * revisor ya estaba mirando, o deshacer un «validado». El estado dejaría
   * de significar lo mismo para las dos partes, que es justo lo que un
   * checklist compartido tiene que evitar.
   */
  if tg_op = 'UPDATE'
     /*
      * Solo cuando hay alguien a quien restringir.
      *
      * Sin sesión —la clave de servicio, una migración— no hay actor, y la
      * clave de servicio ya se salta el RLS entero por diseño: es la puerta
      * de atrás de confianza. Un disparador que la bloquee no protege nada
      * y sí impide que una prueba deje las cosas como las encontró.
      *
      * La semilla, cuando quiere que esto se aplique, se declara una
      * sesión. Ahí sí entra.
      */
     and auth.uid() is not null
     and old.status in ('en_revision', 'validado', 'bloqueante')
     and new.status is distinct from old.status
     and not app.can_validate_company(new.company_id) then
    raise exception
      'Ese punto ya está en manos de IWL. Para moverlo, habla con quien lo revisa'
      using errcode = '42501';
  end if;

  if new.status = 'validado' and new.validated_at is null then
    new.validated_by := auth.uid();
    new.validated_at := now();
  end if;

  if new.status <> 'validado' then
    new.validated_by := null;
    new.validated_at := null;
  end if;

  return new;
end;
$$;
