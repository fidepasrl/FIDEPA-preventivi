-- FIDEPA 2.3.0 - Gestione Economica
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

create extension if not exists pgcrypto;

create table if not exists public.economia_commesse (
  id uuid primary key default gen_random_uuid(),
  commessa_id uuid not null references public.commesse(id) on delete cascade,
  anno integer not null default extract(year from now())::integer,
  compenso numeric(14,2) not null default 0,
  trattenuta_percentuale numeric(5,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  fatturato_come_ing_pascale boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint economia_commesse_anno_check check (anno between 2000 and 2100),
  constraint economia_commesse_unica_per_anno unique (commessa_id, anno)
);

create table if not exists public.economia_commesse_collaboratori (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid not null references public.economia_commesse(id) on delete cascade,
  persona_id uuid references public.personale(id) on delete cascade,
  collaboratore_esterno_nome text,
  compenso numeric(14,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint economia_collaboratore_unico unique (economia_commessa_id, persona_id),
  constraint economia_collaboratore_persona_o_esterno_check
    check (
      persona_id is not null
      or nullif(btrim(coalesce(collaboratore_esterno_nome, '')), '') is not null
    )
);

create table if not exists public.economia_commesse_costi (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid not null references public.economia_commesse(id) on delete cascade,
  descrizione text not null,
  importo numeric(14,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  data_costo date,
  created_at timestamptz not null default now()
);

create table if not exists public.economia_collaboratori_sal (
  id uuid primary key default gen_random_uuid(),
  collaboratore_id uuid not null references public.economia_commesse_collaboratori(id) on delete cascade,
  importo numeric(14,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  data_pagamento date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.economia_costi_progetto_sal (
  id uuid primary key default gen_random_uuid(),
  costo_progetto_id uuid not null references public.economia_commesse_costi(id) on delete cascade,
  importo numeric(14,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  data_pagamento date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.economia_costi_societa (
  id uuid primary key default gen_random_uuid(),
  descrizione text not null,
  categoria text,
  tipo text not null default 'Fisso',
  frequenza text not null default 'Mensile',
  importo numeric(14,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  data_riferimento date,
  data_inizio date,
  data_fine date,
  numero_mesi integer,
  attivo boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint economia_costi_societa_tipo_check
    check (tipo in ('Fisso', 'Una tantum')),
  constraint economia_costi_societa_frequenza_check
    check (frequenza in ('Mensile', 'Annuale', 'Una tantum'))
);

create index if not exists economia_commesse_commessa_idx
  on public.economia_commesse(commessa_id);
create index if not exists economia_commesse_anno_idx
  on public.economia_commesse(anno);
create index if not exists economia_collaboratori_commessa_idx
  on public.economia_commesse_collaboratori(economia_commessa_id);
create index if not exists economia_costi_commessa_idx
  on public.economia_commesse_costi(economia_commessa_id);
create index if not exists economia_collaboratori_sal_collaboratore_idx
  on public.economia_collaboratori_sal(collaboratore_id);
create index if not exists economia_costi_progetto_sal_costo_idx
  on public.economia_costi_progetto_sal(costo_progetto_id);
create index if not exists economia_costi_societa_data_idx
  on public.economia_costi_societa(data_riferimento);

alter table public.economia_commesse
  add column if not exists trattenuta_percentuale numeric(5,2) not null default 0,
  add column if not exists cassa numeric(14,2) not null default 0,
  add column if not exists iva numeric(14,2) not null default 0,
  add column if not exists fatturato_come_ing_pascale boolean not null default false;

alter table public.economia_commesse_collaboratori
  alter column persona_id drop not null,
  add column if not exists collaboratore_esterno_nome text,
  add column if not exists cassa numeric(14,2) not null default 0,
  add column if not exists iva numeric(14,2) not null default 0;

alter table public.economia_commesse_costi
  add column if not exists cassa numeric(14,2) not null default 0,
  add column if not exists iva numeric(14,2) not null default 0;

alter table public.economia_costi_societa
  add column if not exists cassa numeric(14,2) not null default 0,
  add column if not exists iva numeric(14,2) not null default 0,
  add column if not exists data_inizio date,
  add column if not exists data_fine date,
  add column if not exists numero_mesi integer;

alter table public.economia_collaboratori_sal
  add column if not exists cassa numeric(14,2) not null default 0,
  add column if not exists iva numeric(14,2) not null default 0;

alter table public.economia_costi_progetto_sal
  add column if not exists cassa numeric(14,2) not null default 0,
  add column if not exists iva numeric(14,2) not null default 0;

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

revoke all on schema private from public;
revoke all on function private.is_admin_or_developer() from public;
revoke all on function private.is_admin_or_developer() from anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin_or_developer() to authenticated;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'economia_commesse',
    'economia_commesse_collaboratori',
    'economia_commesse_costi',
    'economia_collaboratori_sal',
    'economia_costi_progetto_sal',
    'economia_costi_societa'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      table_name
    );

    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_name,
        table_name
      );
    end loop;

    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_admin_or_developer())) with check ((select private.is_admin_or_developer()))',
      table_name || '_admin_developer_all',
      table_name
    );
  end loop;
end
$$;

commit;

select
  schemaname,
  tablename,
  rowsecurity as rls_attivo
from pg_tables
where schemaname = 'public'
  and tablename like 'economia_%'
order by tablename;
