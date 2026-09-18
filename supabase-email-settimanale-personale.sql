-- FIDEPA - Registro invii della programmazione settimanale del personale
-- Migrazione additiva e idempotente. Eseguire nel SQL Editor di Supabase.

begin;

create extension if not exists pgcrypto;

create table if not exists public.email_settimanali_personale (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personale(id) on delete cascade,
  data_inizio_settimana date not null,
  numero_settimana integer not null check (numero_settimana between 1 and 53),
  tipo_invio text not null default 'manuale'
    check (tipo_invio in ('automatico', 'manuale')),
  stato text not null default 'in_corso'
    check (stato in ('in_corso', 'inviata', 'fallita')),
  errore text,
  inviata_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_settimanali_automatiche_unique_idx
  on public.email_settimanali_personale(persona_id, data_inizio_settimana)
  where tipo_invio = 'automatico';

create index if not exists email_settimanali_settimana_idx
  on public.email_settimanali_personale(data_inizio_settimana desc, stato);

create or replace function public.email_settimanali_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists email_settimanali_updated_at
  on public.email_settimanali_personale;
create trigger email_settimanali_updated_at
before update on public.email_settimanali_personale
for each row execute function public.email_settimanali_set_updated_at();

alter table public.email_settimanali_personale enable row level security;
revoke all on table public.email_settimanali_personale from anon;
grant select, insert, update
  on table public.email_settimanali_personale to authenticated;

drop policy if exists email_settimanali_authenticated_select
  on public.email_settimanali_personale;
create policy email_settimanali_authenticated_select
  on public.email_settimanali_personale
  for select to authenticated using (true);

drop policy if exists email_settimanali_authenticated_insert
  on public.email_settimanali_personale;
create policy email_settimanali_authenticated_insert
  on public.email_settimanali_personale
  for insert to authenticated with check (true);

drop policy if exists email_settimanali_authenticated_update
  on public.email_settimanali_personale;
create policy email_settimanali_authenticated_update
  on public.email_settimanali_personale
  for update to authenticated using (true) with check (true);

commit;
