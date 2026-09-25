-- =============================================================================
-- 012 · Diario de avance y aportación no horaria
--
-- La hoja de ruta dice qué se quería conseguir. Esto dice qué se ha hecho, y
-- lo dicen las dos partes: la compañía carga sus avances y IWL los suyos. Se
-- leen sobre la misma línea de tiempo, en dos carriles, porque la pregunta
-- que contestan juntos es «¿quién ha movido esto?».
--
-- Y se amplía el registro de aportación. Hasta ahora recogía horas, caja,
-- introducciones y entregables. Faltaba todo lo que IWL pone y no es ninguna
-- de esas cuatro cosas: una compra que asume, un evento en el que mete al
-- proyecto, una reunión con un inversor que organiza y a la que va.
-- =============================================================================

create type lado_avance as enum ('compania', 'iwl');

create table progress_entries (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  -- Contra qué parte del plan se apunta. Los dos son opcionales: hay avances
  -- que no cuelgan de ningún hito y siguen siendo avances
  stage_id      uuid references roadmap_stages (id) on delete set null,
  milestone_id  uuid references milestones (id) on delete set null,

  /*
   * El carril no se elige: lo pone el trigger según quién escribe.
   *
   * Si se pudiera elegir, IWL podría apuntarse avances en el carril de la
   * compañía y al revés, y los dos carriles dejarían de significar nada.
   */
  side          lado_avance not null,

  entry_date    date not null default current_date,
  title         text not null,
  body          text,
  evidence_url  text,
  document_id   uuid references documents (id) on delete set null,

  author_id     uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index progress_entries_company_idx
  on progress_entries (company_id, entry_date desc);
create index progress_entries_stage_idx on progress_entries (stage_id);
create index progress_entries_milestone_idx on progress_entries (milestone_id);

create trigger progress_entries_touch
  before update on progress_entries
  for each row execute function app.touch_updated_at();

create or replace function app.asignar_lado_avance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.side := case when app.is_iwl() then 'iwl' else 'compania' end;
    new.author_id := coalesce(new.author_id, auth.uid());
  else
    -- Un avance no cambia de carril al editarlo
    new.side := old.side;
    new.author_id := old.author_id;
  end if;
  return new;
end;
$$;

create trigger progress_entries_lado
  before insert or update on progress_entries
  for each row execute function app.asignar_lado_avance();

-- =============================================================================
-- Aportación que no son horas
-- =============================================================================

create type tipo_aportacion as enum (
  'compra',           -- Algo que IWL paga y la compañía usa
  'evento',           -- Un escenario al que IWL lleva al proyecto
  'reunion_inversor', -- Una reunión que IWL organiza y a la que acude
  'gestion'           -- Un trámite que IWL hace por la compañía
);

/*
 * No sustituye a `introductions`.
 *
 * Una introducción es presentar a la compañía a alguien y seguir el embudo
 * hasta ver en qué acaba. Una reunión con inversor de aquí es una reunión
 * concreta, con su fecha y su resultado, que puede ser parte de esa
 * introducción o no tener nada que ver.
 */
create table contribution_items (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  annex_id      uuid references annexes (id) on delete set null,
  stage_id      uuid references roadmap_stages (id) on delete set null,
  subject_id    uuid references contribution_subjects (id) on delete set null,

  kind          tipo_aportacion not null,
  occurred_on   date not null,
  title         text not null,
  description   text,
  -- Con quién: el proveedor, el fondo, quien organiza el evento
  counterpart   text,

  -- Lo que le cuesta a IWL. Es el desembolso real
  amount        numeric(12,2) check (amount >= 0),
  /*
   * Lo que le habría costado a la compañía por su cuenta.
   *
   * Misma lógica que las tarifas: la diferencia es la aportación real. Un
   * stand en una feria cuesta lo mismo lo pague quien lo pague, pero una
   * compañía sola no entra en la agenda de un fondo.
   */
  market_value  numeric(12,2) check (market_value >= 0),

  -- Qué salió de ahí. Sin esto, un evento es un gasto y no una aportación
  outcome       text,
  document_id   uuid references documents (id) on delete set null,

  created_by    uuid references profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index contribution_items_company_idx
  on contribution_items (company_id, occurred_on desc);
create index contribution_items_stage_idx on contribution_items (stage_id);

create trigger contribution_items_touch
  before update on contribution_items
  for each row execute function app.touch_updated_at();

/**
 * Resumen por tipo, para el extracto.
 *
 * El descuento es la diferencia entre lo que costaría por su cuenta y lo que
 * ha costado: es la parte que sostiene el equity, igual que en las horas.
 */
create or replace view contribution_items_summary as
select
  company_id,
  kind,
  count(*)                                        as items,
  coalesce(sum(amount), 0)                        as amount,
  coalesce(sum(market_value), 0)                  as market_value,
  coalesce(sum(market_value), 0) - coalesce(sum(amount), 0) as discount
from contribution_items
group by company_id, kind;

alter view contribution_items_summary set (security_invoker = true);
grant select on contribution_items_summary to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table progress_entries   enable row level security;
alter table contribution_items enable row level security;

/*
 * Los avances los escriben las dos partes y los ven las dos partes.
 *
 * Es el sentido de los dos carriles: si cada uno solo viera el suyo, no habría
 * conversación. Editar y borrar queda para quien lo escribió, y para IWL, que
 * mantiene el registro.
 */
create policy progress_entries_select on progress_entries
  for select to authenticated using (app.can_read_company(company_id));

create policy progress_entries_insert on progress_entries
  for insert to authenticated with check (app.can_write_company(company_id));

create policy progress_entries_update on progress_entries
  for update to authenticated
  using (author_id = auth.uid() or app.is_iwl())
  with check (app.can_write_company(company_id));

create policy progress_entries_delete on progress_entries
  for delete to authenticated
  using (author_id = auth.uid() or app.is_iwl());

/*
 * La aportación la registra IWL y la ve la compañía.
 *
 * Misma decisión que con las tarifas (§7.1): la fundadora ve lo que recibe y
 * lo que vale. Es el argumento del equity y esconderlo lo debilita.
 */
create policy contribution_items_select on contribution_items
  for select to authenticated using (app.can_read_company(company_id));
create policy contribution_items_write on contribution_items
  for all to authenticated using (app.is_iwl()) with check (app.is_iwl());
