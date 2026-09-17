-- FIDEPA 2.3.5 - Organigramma e attività organizzative del personale
-- Migrazione additiva: conserva persone, attività di commessa e dati economici.
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

create extension if not exists pgcrypto;

alter table public.personale
  add column if not exists ruolo_organigramma text not null default 'collaboratore',
  add column if not exists titolo_ruolo text,
  add column if not exists descrizione text,
  add column if not exists foto_url text,
  add column if not exists foto_path text;

update public.personale
set ruolo_organigramma = 'collaboratore'
where ruolo_organigramma is null
   or ruolo_organigramma not in ('amministratore', 'project_manager', 'collaboratore');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'personale_ruolo_organigramma_check'
      and conrelid = 'public.personale'::regclass
  ) then
    alter table public.personale
      add constraint personale_ruolo_organigramma_check
      check (ruolo_organigramma in ('amministratore', 'project_manager', 'collaboratore'));
  end if;
end
$$;

create table if not exists public.personale_attivita_organizzative (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personale(id) on delete cascade,
  titolo text not null,
  tipo text not null default 'compito',
  completata boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personale_attivita_titolo_check check (nullif(btrim(titolo), '') is not null)
);

alter table public.personale_attivita_organizzative
  add column if not exists tipo text not null default 'compito';

-- La funzione dei compiti comuni è stata rimossa: ogni compito deve avere
-- una persona responsabile. Gli eventuali record comuni esistenti vengono eliminati.
delete from public.personale_attivita_organizzative
where persona_id is null;

alter table public.personale_attivita_organizzative
  alter column persona_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'personale_attivita_tipo_check'
      and conrelid = 'public.personale_attivita_organizzative'::regclass
  ) then
    alter table public.personale_attivita_organizzative
      add constraint personale_attivita_tipo_check
      check (tipo in ('compito', 'responsabilita'));
  end if;
end
$$;

create index if not exists personale_attivita_persona_idx
  on public.personale_attivita_organizzative(persona_id, completata, created_at desc);

create or replace function public.personale_set_updated_at()
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

drop trigger if exists personale_attivita_updated_at
  on public.personale_attivita_organizzative;
create trigger personale_attivita_updated_at
before update on public.personale_attivita_organizzative
for each row execute function public.personale_set_updated_at();

alter table public.personale_attivita_organizzative enable row level security;
revoke all on table public.personale_attivita_organizzative from anon;
grant select, insert, update, delete
  on table public.personale_attivita_organizzative to authenticated;

drop policy if exists "personale_attivita_authenticated_all"
  on public.personale_attivita_organizzative;
create policy "personale_attivita_authenticated_all"
  on public.personale_attivita_organizzative
  for all
  to authenticated
  using (true)
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'personale-foto',
  'personale-foto',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists personale_foto_storage_select on storage.objects;
create policy personale_foto_storage_select
  on storage.objects for select to authenticated
  using (bucket_id = 'personale-foto');

drop policy if exists personale_foto_storage_insert on storage.objects;
create policy personale_foto_storage_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'personale-foto');

drop policy if exists personale_foto_storage_update on storage.objects;
create policy personale_foto_storage_update
  on storage.objects for update to authenticated
  using (bucket_id = 'personale-foto')
  with check (bucket_id = 'personale-foto');

drop policy if exists personale_foto_storage_delete on storage.objects;
create policy personale_foto_storage_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'personale-foto');

-- Impostazione iniziale dell'organigramma richiesta per FIDEPA.
-- Il confronto avviene sul primo nome e non crea nuove anagrafiche.
with profili(nome, ruolo, titolo_ruolo, descrizione) as (
  values
    (
      'andrea',
      'amministratore',
      'BUSINESS & COMMESSE',
      'Sviluppo commerciale, rapporto con il cliente e visione complessiva delle commesse.'
    ),
    (
      'rocco',
      'amministratore',
      'FINANCE & CONTROL',
      'Gestione finanziaria, controllo economico e sostenibilità dello studio.'
    ),
    (
      'agostino',
      'amministratore',
      'SERVIZI GENERALI & SVILUPPO INTERNO',
      'Servizi generali, digitalizzazione, comunicazione e sviluppo interno.'
    ),
    (
      'antonio',
      'project_manager',
      'OPERATION MANAGER · PRODUZIONE',
      'Coordinamento della produzione, dei carichi di lavoro e dell’operatività interna.'
    ),
    (
      'gennaro',
      'collaboratore',
      'PROJECT ENGINEER',
      'Esecuzione tecnica delle lavorazioni e presidio operativo delle attività assegnate.'
    )
)
update public.personale p
set ruolo_organigramma = profili.ruolo,
    titolo_ruolo = profili.titolo_ruolo,
    descrizione = profili.descrizione
from profili
where lower(split_part(btrim(p.nome), ' ', 1)) = profili.nome;

-- Compiti e responsabilità iniziali. L'inserimento è idempotente.
with compiti(nome, titolo) as (
  values
    ('andrea', 'Sviluppare il lavoro futuro: nuovi clienti, opportunità, preventivi, offerte, rapporti commerciali, gare e nuove collaborazioni.'),
    ('andrea', 'Gestire il rapporto con il cliente durante l’incarico, comprese richieste extra e criticità.'),
    ('andrea', 'Mantenere la visione di tutte le commesse: inizio, fine, avanzamento, problemi, priorità, ritardi e rischi.'),
    ('andrea', 'Tenere sotto controllo consulenze esterne, rilievi, geologi e strutturisti.'),
    ('rocco', 'Gestire fatture, incassi, pagamenti, banca, scadenze e rapporti con commercialista e consulenti.'),
    ('rocco', 'Monitorare IVA, imposte, contributi, disponibilità finanziaria, entrate previste e uscite previste.'),
    ('rocco', 'Analizzare costi, margini e redditività.'),
    ('rocco', 'Conoscere il costo dello studio e di ogni collaboratore, il rendimento di ogni commessa e la sufficienza del fatturato rispetto ai costi.'),
    ('agostino', 'Tenere sotto controllo software, forniture, noleggi e altri costi, evitando una crescita non controllata delle spese.'),
    ('agostino', 'Gestire IT e digitalizzazione: licenze, hardware, backup, sicurezza dei dati, software tecnici e procedure digitali.'),
    ('agostino', 'Curare marketing e comunicazione: sito, portfolio lavori, presentazioni, social, immagine coordinata, referenze, candidature e materiale commerciale.'),
    ('agostino', 'Programmare necessità, interventi e manutenzione dello studio e della casa.'),
    ('antonio', 'Organizzare il lavoro operativo, pianificando attività, tempi e priorità.'),
    ('antonio', 'Assegnare il lavoro ai collaboratori.'),
    ('antonio', 'Stimare i carichi di lavoro e verificarne l’avanzamento.'),
    ('antonio', 'Segnalare blocchi, ritardi e necessità operative.'),
    ('antonio', 'Garantire qualità interna e ordine documentale.'),
    ('gennaro', 'Eseguire le lavorazioni assegnate.'),
    ('gennaro', 'Rispettare tempi, priorità e standard interni.'),
    ('gennaro', 'Segnalare immediatamente blocchi o mancanza di informazioni.'),
    ('gennaro', 'Mantenere file e cartelle in ordine.'),
    ('gennaro', 'Recepire le revisioni e aggiornare Antonio sullo stato delle lavorazioni.')
), persone as (
  select id, lower(split_part(btrim(nome), ' ', 1)) as nome
  from public.personale
)
insert into public.personale_attivita_organizzative (persona_id, titolo, tipo)
select persone.id, compiti.titolo, 'responsabilita'
from compiti
join persone on persone.nome = compiti.nome
where not exists (
  select 1
  from public.personale_attivita_organizzative esistente
  where esistente.persona_id = persone.id
    and lower(btrim(esistente.titolo)) = lower(btrim(compiti.titolo))
);

commit;

select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'personale'
  and column_name in ('ruolo_organigramma', 'titolo_ruolo', 'descrizione', 'foto_url', 'foto_path')
order by column_name;
