-- FIDEPA - Riunioni amministrative settimanali
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

create extension if not exists pgcrypto;

create table if not exists public.riunioni_amministrative (
  id uuid primary key default gen_random_uuid(),
  anno integer not null,
  settimana integer not null,
  data_inizio_settimana date not null,
  argomenti jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint riunioni_amministrative_anno_check check (anno between 2000 and 2100),
  constraint riunioni_amministrative_settimana_check check (settimana between 1 and 53),
  constraint riunioni_amministrative_argomenti_array_check check (jsonb_typeof(argomenti) = 'array'),
  constraint riunioni_amministrative_settimana_unica unique (data_inizio_settimana),
  constraint riunioni_amministrative_anno_week_unica unique (anno, settimana)
);

create index if not exists riunioni_amministrative_data_idx
  on public.riunioni_amministrative(data_inizio_settimana desc);

create schema if not exists private;

create or replace function private.is_admin_or_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profili_utente
    where id = (select auth.uid())
      and lower(btrim(coalesce(ruolo, ''))) in ('admin', 'developer', 'sviluppatore')
  );
$$;

create or replace function private.aggiorna_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists riunioni_amministrative_updated_at
  on public.riunioni_amministrative;
create trigger riunioni_amministrative_updated_at
before update on public.riunioni_amministrative
for each row execute function private.aggiorna_updated_at();

revoke all on schema private from public;
revoke all on function private.is_admin_or_developer() from public;
revoke all on function private.is_admin_or_developer() from anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin_or_developer() to authenticated;

alter table public.riunioni_amministrative enable row level security;
revoke all on table public.riunioni_amministrative from anon;
grant select, insert, update, delete on table public.riunioni_amministrative to authenticated;

drop policy if exists "riunioni_amministrative_admin_developer_all"
  on public.riunioni_amministrative;
create policy "riunioni_amministrative_admin_developer_all"
  on public.riunioni_amministrative
  for all
  to authenticated
  using ((select private.is_admin_or_developer()))
  with check ((select private.is_admin_or_developer()));

commit;

select
  schemaname,
  tablename,
  rowsecurity as rls_attivo
from pg_tables
where schemaname = 'public'
  and tablename = 'riunioni_amministrative';
