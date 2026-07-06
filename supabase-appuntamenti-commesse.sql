create table if not exists public.appuntamenti_commesse (
  id uuid primary key default gen_random_uuid(),
  commessa_id uuid references public.commesse(id) on delete cascade,
  data date not null,
  ora time not null,
  posizione text,
  descrizione text not null,
  created_at timestamptz not null default now()
);

alter table public.appuntamenti_commesse
  alter column commessa_id drop not null;

alter table public.appuntamenti_commesse
  add column if not exists posizione text;

create index if not exists appuntamenti_commesse_data_ora_idx
  on public.appuntamenti_commesse (data, ora);

create index if not exists appuntamenti_commesse_commessa_id_idx
  on public.appuntamenti_commesse (commessa_id);

alter table public.appuntamenti_commesse enable row level security;

drop policy if exists "appuntamenti_commesse_select"
  on public.appuntamenti_commesse;

create policy "appuntamenti_commesse_select"
  on public.appuntamenti_commesse
  for select
  to authenticated
  using (true);

drop policy if exists "appuntamenti_commesse_insert"
  on public.appuntamenti_commesse;

create policy "appuntamenti_commesse_insert"
  on public.appuntamenti_commesse
  for insert
  to authenticated
  with check (true);

drop policy if exists "appuntamenti_commesse_update"
  on public.appuntamenti_commesse;

create policy "appuntamenti_commesse_update"
  on public.appuntamenti_commesse
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "appuntamenti_commesse_delete"
  on public.appuntamenti_commesse;

create policy "appuntamenti_commesse_delete"
  on public.appuntamenti_commesse
  for delete
  to authenticated
  using (true);
