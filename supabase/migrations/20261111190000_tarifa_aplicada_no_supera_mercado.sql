-- =============================================================================
-- La tarifa aplicada no pasa de la de mercado
--
-- REVISION, 11 nov. La diferencia entre las dos es la aportación de IWL por
-- hora, que es lo que sostiene el equity. Con la aplicada por encima, esa
-- aportación sale negativa, y el extracto le diría a la compañía que IWL le
-- cobra más que el mercado.
--
-- Integridad, no autorización: vale también con la clave de servicio.
-- Se comprueba al escribir; las tarifas que ya hay cumplen.
-- =============================================================================

create or replace function app.guard_tarifa_aplicada()
returns trigger
language plpgsql
as $$
begin
  if new.applied_rate > new.market_rate then
    raise exception 'La tarifa aplicada (% €/h) no puede pasar de la de mercado (% €/h): la diferencia es la aportación de IWL, y saldría negativa.',
      replace(trim_scale(new.applied_rate)::text, '.', ','), replace(trim_scale(new.market_rate)::text, '.', ',')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists rate_cards_guard_aplicada on rate_cards;
create trigger rate_cards_guard_aplicada
  before insert or update of applied_rate, market_rate on rate_cards
  for each row execute function app.guard_tarifa_aplicada();
