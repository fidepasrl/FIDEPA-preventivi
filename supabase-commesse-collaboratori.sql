-- Collegamento professionisti alle commesse.
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

create table if not exists public.commesse_collaboratori (
  id uuid primary key default gen_random_uuid(),
  commessa_id uuid not null references public.commesse(id) on delete cascade,
  professionista_id uuid not null references public.professionisti(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.commesse_collaboratori
  add column if not exists id uuid default gen_random_uuid();

update public.commesse_collaboratori
set id = gen_random_uuid()
where id is null;

alter table public.commesse_collaboratori
  alter column id set not null;

do $$
begin
  alter table public.commesse_collaboratori
    add constraint commesse_collaboratori_pkey primary key (id);
exception
  when duplicate_object then null;
  when invalid_table_definition then null;
end
$$;

alter table public.commesse_collaboratori
  add column if not exists commessa_id uuid references public.commesse(id) on delete cascade;

alter table public.commesse_collaboratori
  add column if not exists professionista_id uuid references public.professionisti(id) on delete cascade;

alter table public.commesse_collaboratori
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists commesse_collaboratori_commessa_professionista_idx
  on public.commesse_collaboratori(commessa_id, professionista_id);

alter table public.commesse_collaboratori enable row level security;

grant select, insert, update, delete on table public.commesse_collaboratori to authenticated;
revoke all on table public.commesse_collaboratori from anon;

drop policy if exists "commesse_collaboratori_authenticated_all" on public.commesse_collaboratori;
create policy "commesse_collaboratori_authenticated_all"
  on public.commesse_collaboratori
  for all
  to authenticated
  using (true)
  with check (true);

commit;
