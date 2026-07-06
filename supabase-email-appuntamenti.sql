alter table public.personale
  add column if not exists email text;

create unique index if not exists personale_email_unique_idx
  on public.personale (lower(email))
  where email is not null and btrim(email) <> '';

create table if not exists public.appuntamenti_personale (
  appuntamento_id uuid not null references public.appuntamenti_commesse(id) on delete cascade,
  persona_id uuid not null references public.personale(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (appuntamento_id, persona_id)
);

create index if not exists appuntamenti_personale_persona_idx
  on public.appuntamenti_personale (persona_id);

alter table public.appuntamenti_personale enable row level security;

drop policy if exists "appuntamenti_personale_select"
  on public.appuntamenti_personale;
create policy "appuntamenti_personale_select"
  on public.appuntamenti_personale
  for select
  to authenticated
  using (true);

drop policy if exists "appuntamenti_personale_insert"
  on public.appuntamenti_personale;
create policy "appuntamenti_personale_insert"
  on public.appuntamenti_personale
  for insert
  to authenticated
  with check (true);

drop policy if exists "appuntamenti_personale_update"
  on public.appuntamenti_personale;
create policy "appuntamenti_personale_update"
  on public.appuntamenti_personale
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "appuntamenti_personale_delete"
  on public.appuntamenti_personale;
create policy "appuntamenti_personale_delete"
  on public.appuntamenti_personale
  for delete
  to authenticated
  using (true);
