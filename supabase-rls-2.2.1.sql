-- FIDEPA 2.2.1 - Row Level Security
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

-- Le tabelle operative sono condivise tra i pochi utenti dello studio,
-- ma non devono essere accessibili tramite la chiave anon senza login.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'commesse',
    'commesse_note',
    'commesse_collaboratori',
    'attivita_commesse',
    'personale',
    'attivita_personale',
    'pianificazione_personale',
    'pianificazione_commesse',
    'appuntamenti_commesse',
    'appuntamenti_personale',
    'argomenti_riunione',
    'lista_studio',
    'riunioni',
    'clienti',
    'professionisti',
    'preventivi',
    'lavorazioni',
    'gara_categorie',
    'gara_lavori',
    'gara_lavori_categorie',
    'gara_fatturati',
    'gara_preparazioni',
    'gara_preparazione_requisiti',
    'gara_preparazione_partecipanti',
    'gara_preparazione_partecipante_requisiti',
    'professionisti_requisiti_gara'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise notice 'Tabella public.% non trovata: ignorata', table_name;
      continue;
    end if;

    execute format(
      'alter table public.%I enable row level security',
      table_name
    );
    execute format('revoke all on table public.%I from anon', table_name);
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      table_name
    );

    -- Le policy permissive si combinano con OR: vanno rimosse tutte prima
    -- di creare la policy autenticata definitiva.
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
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      table_name || '_authenticated_all',
      table_name
    );
  end loop;
end
$$;

-- Funzione privata usata dalle policy riservate allo sviluppatore.
create schema if not exists private;

create or replace function private.is_developer()
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
      and lower(btrim(coalesce(ruolo, ''))) in ('developer', 'sviluppatore')
  );
$$;

revoke all on schema private from public;
revoke all on function private.is_developer() from public;
revoke all on function private.is_developer() from anon;
grant usage on schema private to authenticated;
grant execute on function private.is_developer() to authenticated;

-- Ogni utente legge soltanto il proprio profilo. I profili si amministrano
-- dal pannello Supabase, non dal client del portale.
alter table public.profili_utente enable row level security;
revoke all on table public.profili_utente from anon;
revoke insert, update, delete on table public.profili_utente from authenticated;
grant select on table public.profili_utente to authenticated;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profili_utente'
  loop
    execute format(
      'drop policy if exists %I on public.profili_utente',
      policy_name
    );
  end loop;
end
$$;

create policy "profili_utente_select_own"
  on public.profili_utente
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Tutti gli utenti autenticati possono inviare feedback; soltanto lo
-- sviluppatore puo leggerli, modificarli o eliminarli.
alter table public.feedback enable row level security;
revoke all on table public.feedback from anon;
grant select, insert, update, delete on table public.feedback to authenticated;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback'
  loop
    execute format('drop policy if exists %I on public.feedback', policy_name);
  end loop;
end
$$;

create policy "feedback_insert_authenticated"
  on public.feedback
  for insert
  to authenticated
  with check (true);

create policy "feedback_select_developer"
  on public.feedback
  for select
  to authenticated
  using ((select private.is_developer()));

create policy "feedback_update_developer"
  on public.feedback
  for update
  to authenticated
  using ((select private.is_developer()))
  with check ((select private.is_developer()));

create policy "feedback_delete_developer"
  on public.feedback
  for delete
  to authenticated
  using ((select private.is_developer()));

-- Gli utenti leggono i consigli attivi. Lo sviluppatore vede anche quelli
-- disattivati e puo gestire l'intero archivio dei consigli.
alter table public.consigli enable row level security;
revoke all on table public.consigli from anon;
grant select, insert, update, delete on table public.consigli to authenticated;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consigli'
  loop
    execute format('drop policy if exists %I on public.consigli', policy_name);
  end loop;
end
$$;

create policy "consigli_select_authenticated"
  on public.consigli
  for select
  to authenticated
  using (attivo = true or (select private.is_developer()));

create policy "consigli_insert_developer"
  on public.consigli
  for insert
  to authenticated
  with check ((select private.is_developer()));

create policy "consigli_update_developer"
  on public.consigli
  for update
  to authenticated
  using ((select private.is_developer()))
  with check ((select private.is_developer()));

create policy "consigli_delete_developer"
  on public.consigli
  for delete
  to authenticated
  using ((select private.is_developer()));

commit;

-- Riepilogo finale: tutte le tabelle public devono mostrare RLS attivo.
select
  schemaname,
  tablename,
  rowsecurity as rls_attivo
from pg_tables
where schemaname = 'public'
order by tablename;
