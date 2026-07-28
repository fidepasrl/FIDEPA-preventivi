-- FIDEPA 2.3.1 - Gestione economica documentale e finanziaria delle commesse
-- Migrazione additiva e idempotente. Conserva tutte le tabelle e i dati legacy.
-- Eseguire l'intero file nel SQL Editor di Supabase.

begin;

create extension if not exists pgcrypto;
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

insert into storage.buckets (id, name, public, file_size_limit)
values ('economia-documenti', 'economia-documenti', false, 20971520)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists economia_documenti_storage_select on storage.objects;
create policy economia_documenti_storage_select
  on storage.objects for select to authenticated
  using (bucket_id = 'economia-documenti' and (select private.is_admin_or_developer()));

drop policy if exists economia_documenti_storage_insert on storage.objects;
create policy economia_documenti_storage_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'economia-documenti' and (select private.is_admin_or_developer()));

drop policy if exists economia_documenti_storage_update on storage.objects;
create policy economia_documenti_storage_update
  on storage.objects for update to authenticated
  using (bucket_id = 'economia-documenti' and (select private.is_admin_or_developer()))
  with check (bucket_id = 'economia-documenti' and (select private.is_admin_or_developer()));

create or replace function private.economia_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by' then
    new.updated_by := coalesce(new.updated_by, auth.uid());
  end if;
  return new;
end;
$$;

alter table public.personale
  add column if not exists economia_cassa_attiva boolean not null default false,
  add column if not exists economia_cassa_aliquota numeric(7,4) not null default 0,
  add column if not exists economia_iva_attiva boolean not null default false,
  add column if not exists economia_iva_aliquota numeric(7,4) not null default 0;

create table if not exists public.economia_soggetti_fiscali (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  intestazione text,
  cassa_aliquota numeric(5,2) not null default 0,
  iva_aliquota numeric(5,2) not null default 22,
  ritenuta_aliquota numeric(5,2) not null default 0,
  attivo boolean not null default true,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_soggetti_fiscali_aliquote_check check (
    cassa_aliquota between 0 and 100
    and iva_aliquota between 0 and 100
    and ritenuta_aliquota between 0 and 100
  )
);

insert into public.economia_soggetti_fiscali
  (nome, intestazione, cassa_aliquota, iva_aliquota, ritenuta_aliquota)
values
  ('FIDEPA S.R.L.', 'FIDEPA S.R.L.', 0, 22, 0),
  ('Ing. Pascale', 'Ing. Pascale', 4, 22, 0)
on conflict (nome) do nothing;

create table if not exists public.economia_profili_fiscali (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,
  nome text not null,
  cassa_aliquota numeric(5,2) not null default 0,
  iva_aliquota numeric(5,2) not null default 0,
  ritenuta_aliquota numeric(5,2) not null default 0,
  bollo numeric(14,2) not null default 0,
  cassa_base text not null default 'nessuna',
  iva_base text not null default 'imponibile',
  ritenuta_base text not null default 'nessuna',
  descrizione_regime text,
  attivo boolean not null default true,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_profili_aliquote_check check (
    cassa_aliquota between 0 and 100
    and iva_aliquota between 0 and 100
    and ritenuta_aliquota between 0 and 100
    and bollo >= 0
  ),
  constraint economia_profili_cassa_base_check check (cassa_base in ('imponibile', 'nessuna')),
  constraint economia_profili_iva_base_check check (iva_base in ('imponibile', 'imponibile_cassa', 'nessuna')),
  constraint economia_profili_ritenuta_base_check check (ritenuta_base in ('imponibile', 'imponibile_cassa', 'nessuna'))
);

insert into public.economia_profili_fiscali
  (codice, nome, cassa_aliquota, iva_aliquota, ritenuta_aliquota, bollo, cassa_base, iva_base, ritenuta_base, descrizione_regime)
values
  ('professionista_cassa_iva', 'Professionista con Cassa e IVA', 4, 22, 20, 0, 'imponibile', 'imponibile_cassa', 'imponibile', 'Professionista ordinario con contributo integrativo, IVA e ritenuta.'),
  ('professionista_iva', 'Professionista con IVA senza Cassa', 0, 22, 20, 0, 'nessuna', 'imponibile', 'imponibile', 'Professionista ordinario senza contributo integrativo.'),
  ('forfettario', 'Professionista in regime forfettario', 4, 0, 0, 2, 'imponibile', 'nessuna', 'nessuna', 'Regime forfettario; verificare soglia e applicazione del bollo.'),
  ('occasionale', 'Prestazione occasionale', 0, 0, 20, 0, 'nessuna', 'nessuna', 'imponibile', 'Prestazione occasionale con ritenuta.'),
  ('societa', 'Società o impresa', 0, 22, 0, 0, 'nessuna', 'imponibile', 'nessuna', 'Società o impresa in regime IVA ordinario.'),
  ('personale_interno', 'Personale interno', 0, 0, 0, 0, 'nessuna', 'nessuna', 'nessuna', 'Costo interno senza documento professionale.'),
  ('rimborso_spese', 'Rimborso spese', 0, 0, 0, 0, 'nessuna', 'nessuna', 'nessuna', 'Rimborso spese senza automatismi fiscali.'),
  ('personalizzato', 'Configurazione personalizzata', 0, 0, 0, 0, 'nessuna', 'imponibile', 'nessuna', 'Aliquote impostate sul singolo documento.')
on conflict (codice) do nothing;

alter table public.economia_commesse
  add column if not exists compenso_iniziale numeric(14,2),
  add column if not exists preventivo_numero text,
  add column if not exists soggetto_fiscale_id uuid references public.economia_soggetti_fiscali(id),
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_by uuid default auth.uid(),
  add column if not exists deleted_at timestamptz;

update public.economia_commesse
set compenso_iniziale = compenso
where compenso_iniziale is null;

alter table public.economia_commesse
  alter column compenso_iniziale set default 0,
  alter column compenso_iniziale set not null;

update public.economia_commesse e
set soggetto_fiscale_id = s.id
from public.economia_soggetti_fiscali s
where e.soggetto_fiscale_id is null
  and s.nome = case
    when coalesce(e.fatturato_come_ing_pascale, false) then 'Ing. Pascale'
    else 'FIDEPA S.R.L.'
  end;

create table if not exists public.economia_commesse_variazioni (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid not null references public.economia_commesse(id),
  data_variazione date not null,
  descrizione text not null,
  importo numeric(14,2) not null,
  tipologia text not null,
  documento_attivo_id uuid,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_variazioni_importo_check check (importo > 0),
  constraint economia_variazioni_tipo_check check (tipologia in ('aumento', 'diminuzione'))
);

create table if not exists public.economia_documenti_attivi (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid not null references public.economia_commesse(id),
  numero text,
  data_documento date not null,
  tipologia text not null,
  soggetto_fiscale_id uuid references public.economia_soggetti_fiscali(id),
  cliente text not null,
  descrizione text not null,
  imponibile numeric(14,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  ritenuta numeric(14,2) not null default 0,
  bollo numeric(14,2) not null default 0,
  totale numeric(14,2) not null default 0,
  scadenza date,
  stato text not null default 'bozza',
  rilevanza_fiscale boolean not null default true,
  note text,
  allegato_nome text,
  allegato_url text,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_documenti_attivi_tipo_check check (tipologia in ('proforma', 'fattura', 'fattura_acconto', 'nota_credito', 'richiesta_pagamento', 'rimborso_spese', 'altro')),
  constraint economia_documenti_attivi_stato_check check (stato in ('bozza', 'da_emettere', 'emesso', 'parzialmente_pagato', 'pagato', 'annullato', 'scaduto')),
  constraint economia_documenti_attivi_importi_check check (imponibile >= 0 and cassa >= 0 and iva >= 0 and ritenuta >= 0 and bollo >= 0 and totale >= 0)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'economia_variazioni_documento_fk'
      and conrelid = 'public.economia_commesse_variazioni'::regclass
  ) then
    alter table public.economia_commesse_variazioni
      add constraint economia_variazioni_documento_fk
      foreign key (documento_attivo_id) references public.economia_documenti_attivi(id);
  end if;
end
$$;

create table if not exists public.economia_documenti_attivi_righe (
  id uuid primary key default gen_random_uuid(),
  documento_attivo_id uuid not null references public.economia_documenti_attivi(id),
  descrizione text not null,
  imponibile numeric(14,2) not null default 0,
  cassa_aliquota numeric(5,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva_aliquota numeric(5,2) not null default 0,
  iva numeric(14,2) not null default 0,
  ritenuta_aliquota numeric(5,2) not null default 0,
  ritenuta numeric(14,2) not null default 0,
  bollo numeric(14,2) not null default 0,
  totale numeric(14,2) not null default 0,
  ordine integer not null default 0,
  override_fiscale boolean not null default false,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_documenti_attivi_righe_importi_check check (imponibile >= 0 and cassa >= 0 and iva >= 0 and ritenuta >= 0 and bollo >= 0 and totale >= 0),
  constraint economia_documenti_attivi_righe_aliquote_check check (cassa_aliquota between 0 and 100 and iva_aliquota between 0 and 100 and ritenuta_aliquota between 0 and 100)
);

alter table public.economia_commesse_collaboratori
  add column if not exists tipo text not null default 'esterno',
  add column if not exists percentuale numeric(7,4) not null default 0,
  add column if not exists modalita_calcolo text not null default 'importo_fisso',
  add column if not exists profilo_fiscale_id uuid references public.economia_profili_fiscali(id),
  add column if not exists cassa_aliquota numeric(7,4) not null default 0,
  add column if not exists iva_aliquota numeric(7,4) not null default 0,
  add column if not exists note text,
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_by uuid default auth.uid(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.economia_commesse_costi
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists updated_by uuid default auth.uid(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.economia_commesse_collaboratori
set tipo = case when persona_id is null then 'esterno' else 'personale' end;

update public.economia_commesse_collaboratori c
set profilo_fiscale_id = p.id
from public.economia_profili_fiscali p
where c.profilo_fiscale_id is null
  and p.codice = case
    when c.persona_id is not null then 'personale_interno'
    when coalesce(c.cassa, 0) > 0 and coalesce(c.iva, 0) > 0 then 'professionista_cassa_iva'
    when coalesce(c.iva, 0) > 0 then 'professionista_iva'
    else 'personalizzato'
  end;

update public.economia_commesse_collaboratori c
set cassa_aliquota = case
      when p.economia_cassa_attiva then p.economia_cassa_aliquota
      else 0
    end,
    iva_aliquota = case
      when p.economia_iva_attiva then p.economia_iva_aliquota
      else 0
    end
from public.personale p
where c.persona_id = p.id
  and c.tipo = 'personale'
  and coalesce(c.cassa_aliquota, 0) = 0
  and coalesce(c.iva_aliquota, 0) = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personale_economia_cassa_aliquota_check'
      and conrelid = 'public.personale'::regclass
  ) then
    alter table public.personale
      add constraint personale_economia_cassa_aliquota_check
      check (economia_cassa_aliquota between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'personale_economia_iva_aliquota_check'
      and conrelid = 'public.personale'::regclass
  ) then
    alter table public.personale
      add constraint personale_economia_iva_aliquota_check
      check (economia_iva_aliquota between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'economia_collaboratori_tipo_check'
      and conrelid = 'public.economia_commesse_collaboratori'::regclass
  ) then
    alter table public.economia_commesse_collaboratori
      add constraint economia_collaboratori_tipo_check
      check (tipo in ('personale', 'esterno'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'economia_collaboratori_modalita_check'
      and conrelid = 'public.economia_commesse_collaboratori'::regclass
  ) then
    alter table public.economia_commesse_collaboratori
      add constraint economia_collaboratori_modalita_check
      check (modalita_calcolo in ('importo_fisso', 'percentuale_compenso', 'percentuale_quota_fidepa', 'importo_sal', 'altro'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'economia_collaboratori_percentuale_check'
      and conrelid = 'public.economia_commesse_collaboratori'::regclass
  ) then
    alter table public.economia_commesse_collaboratori
      add constraint economia_collaboratori_percentuale_check
      check (percentuale between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'economia_collaboratori_cassa_aliquota_check'
      and conrelid = 'public.economia_commesse_collaboratori'::regclass
  ) then
    alter table public.economia_commesse_collaboratori
      add constraint economia_collaboratori_cassa_aliquota_check
      check (cassa_aliquota between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'economia_collaboratori_iva_aliquota_check'
      and conrelid = 'public.economia_commesse_collaboratori'::regclass
  ) then
    alter table public.economia_commesse_collaboratori
      add constraint economia_collaboratori_iva_aliquota_check
      check (iva_aliquota between 0 and 100);
  end if;
end
$$;

create table if not exists public.economia_documenti_collaboratori (
  id uuid primary key default gen_random_uuid(),
  collaboratore_id uuid not null references public.economia_commesse_collaboratori(id),
  data_documento date not null,
  numero text,
  tipologia text not null default 'fattura',
  descrizione text not null,
  imponibile numeric(14,2) not null default 0,
  cassa_aliquota numeric(5,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva_aliquota numeric(5,2) not null default 0,
  iva numeric(14,2) not null default 0,
  ritenuta_aliquota numeric(5,2) not null default 0,
  ritenuta numeric(14,2) not null default 0,
  bollo numeric(14,2) not null default 0,
  totale numeric(14,2) not null default 0,
  stato text not null default 'emesso',
  profilo_fiscale_id uuid references public.economia_profili_fiscali(id),
  override_fiscale boolean not null default false,
  override_fiscale_by uuid,
  override_fiscale_at timestamptz,
  valori_fiscali_precedenti jsonb,
  allegato_nome text,
  allegato_url text,
  note text,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_documenti_collaboratori_stato_check check (stato in ('bozza', 'da_emettere', 'emesso', 'parzialmente_pagato', 'pagato', 'annullato', 'scaduto')),
  constraint economia_documenti_collaboratori_importi_check check (imponibile >= 0 and cassa >= 0 and iva >= 0 and ritenuta >= 0 and bollo >= 0 and totale >= 0),
  constraint economia_documenti_collaboratori_aliquote_check check (cassa_aliquota between 0 and 100 and iva_aliquota between 0 and 100 and ritenuta_aliquota between 0 and 100)
);

create table if not exists public.economia_documenti_collaboratori_righe (
  id uuid primary key default gen_random_uuid(),
  documento_collaboratore_id uuid not null references public.economia_documenti_collaboratori(id),
  descrizione text not null,
  imponibile numeric(14,2) not null default 0,
  cassa_aliquota numeric(5,2) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva_aliquota numeric(5,2) not null default 0,
  iva numeric(14,2) not null default 0,
  ritenuta_aliquota numeric(5,2) not null default 0,
  ritenuta numeric(14,2) not null default 0,
  bollo numeric(14,2) not null default 0,
  totale numeric(14,2) not null default 0,
  ordine integer not null default 0,
  override_fiscale boolean not null default false,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_documenti_collaboratori_righe_importi_check check (imponibile >= 0 and cassa >= 0 and iva >= 0 and ritenuta >= 0 and bollo >= 0 and totale >= 0)
);

create table if not exists public.economia_movimenti_finanziari (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid not null references public.economia_commesse(id),
  direzione text not null,
  tipologia text not null,
  collaboratore_id uuid references public.economia_commesse_collaboratori(id),
  costo_progetto_id uuid references public.economia_commesse_costi(id),
  data_movimento date not null,
  importo numeric(14,2) not null,
  imponibile numeric(14,2),
  cassa_aliquota numeric(7,4) not null default 0,
  cassa numeric(14,2) not null default 0,
  iva_aliquota numeric(7,4) not null default 0,
  iva numeric(14,2) not null default 0,
  modalita text not null default 'bonifico',
  soggetto text not null,
  conto_cassa text not null,
  causale text not null,
  note text,
  stato_riconciliazione text not null default 'da_documentare',
  anticipo_da_fatturare boolean not null default false,
  allegato_nome text,
  allegato_url text,
  legacy_source text,
  legacy_id uuid,
  legacy_dettaglio jsonb,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_movimenti_importo_check check (importo > 0),
  constraint economia_movimenti_componenti_fiscali_check check ((imponibile is null or imponibile > 0) and cassa_aliquota >= 0 and cassa >= 0 and iva_aliquota >= 0 and iva >= 0),
  constraint economia_movimenti_direzione_check check (direzione in ('entrata', 'uscita')),
  constraint economia_movimenti_tipo_check check (tipologia in ('incasso_cliente', 'pagamento_collaboratore', 'rimborso', 'anticipo', 'storno', 'altro')),
  constraint economia_movimenti_modalita_check check (modalita in ('bonifico', 'contanti', 'carta', 'assegno', 'compensazione', 'altro')),
  constraint economia_movimenti_stato_check check (stato_riconciliazione in ('riconciliato', 'parzialmente_riconciliato', 'da_associare', 'da_documentare', 'anomalia', 'annullato', 'da_verificare'))
);

create unique index if not exists economia_movimenti_legacy_unique
  on public.economia_movimenti_finanziari(legacy_source, legacy_id)
  where legacy_source is not null and legacy_id is not null;

create table if not exists public.economia_allocazioni_movimenti (
  id uuid primary key default gen_random_uuid(),
  movimento_id uuid not null references public.economia_movimenti_finanziari(id),
  documento_attivo_id uuid references public.economia_documenti_attivi(id),
  documento_collaboratore_id uuid references public.economia_documenti_collaboratori(id),
  importo numeric(14,2) not null,
  consenti_eccedenza boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_allocazioni_importo_check check (importo > 0),
  constraint economia_allocazioni_destinazione_check check (
    (documento_attivo_id is not null and documento_collaboratore_id is null)
    or (documento_attivo_id is null and documento_collaboratore_id is not null)
  )
);

create table if not exists public.economia_anomalie (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid not null references public.economia_commesse(id),
  tipologia text not null,
  gravita text not null default 'attenzione',
  descrizione text not null,
  data_anomalia date not null default current_date,
  entita_tipo text not null,
  entita_id uuid,
  stato text not null default 'aperta',
  azione_suggerita text,
  motivazione_ignorata text,
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint economia_anomalie_gravita_check check (gravita in ('informativa', 'attenzione', 'critica')),
  constraint economia_anomalie_stato_check check (stato in ('aperta', 'in_lavorazione', 'risolta', 'ignorata')),
  constraint economia_anomalie_ignorata_check check (stato <> 'ignorata' or nullif(btrim(coalesce(motivazione_ignorata, '')), '') is not null)
);

create unique index if not exists economia_anomalie_entita_aperta_unique
  on public.economia_anomalie(tipologia, entita_tipo, entita_id)
  where deleted_at is null and stato in ('aperta', 'in_lavorazione');

create table if not exists public.economia_audit_log (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid,
  tabella text not null,
  record_id uuid not null,
  operazione text not null,
  valori_precedenti jsonb,
  valori_nuovi jsonb,
  autore uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function private.economia_audit_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  scheda_id uuid;
  record_uuid uuid;
begin
  old_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  record_uuid := coalesce((new_row ->> 'id')::uuid, (old_row ->> 'id')::uuid);
  scheda_id := coalesce(
    nullif(new_row ->> 'economia_commessa_id', '')::uuid,
    nullif(old_row ->> 'economia_commessa_id', '')::uuid,
    case when tg_table_name = 'economia_commesse' then record_uuid else null end
  );

  if scheda_id is null and tg_table_name = 'economia_documenti_attivi_righe' then
    select economia_commessa_id into scheda_id
    from public.economia_documenti_attivi
    where id = nullif(coalesce(new_row, old_row) ->> 'documento_attivo_id', '')::uuid;
  elsif scheda_id is null and tg_table_name in ('economia_documenti_collaboratori', 'economia_documenti_collaboratori_righe') then
    select c.economia_commessa_id into scheda_id
    from public.economia_commesse_collaboratori c
    where c.id = case
      when tg_table_name = 'economia_documenti_collaboratori'
        then nullif(coalesce(new_row, old_row) ->> 'collaboratore_id', '')::uuid
      else (
        select collaboratore_id
        from public.economia_documenti_collaboratori
        where id = nullif(coalesce(new_row, old_row) ->> 'documento_collaboratore_id', '')::uuid
      )
    end
    limit 1;
  elsif scheda_id is null and tg_table_name = 'economia_allocazioni_movimenti' then
    select economia_commessa_id into scheda_id
    from public.economia_movimenti_finanziari
    where id = nullif(coalesce(new_row, old_row) ->> 'movimento_id', '')::uuid;
  end if;

  insert into public.economia_audit_log
    (economia_commessa_id, tabella, record_id, operazione, valori_precedenti, valori_nuovi, autore)
  values
    (scheda_id, tg_table_name, record_uuid, lower(tg_op), old_row, new_row, auth.uid());
  return coalesce(new, old);
end;
$$;

create or replace function private.economia_sincronizza_compenso_legacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scheda_id uuid;
begin
  scheda_id := case
    when tg_op = 'DELETE' then old.economia_commessa_id
    else new.economia_commessa_id
  end;
  update public.economia_commesse e
  set compenso = e.compenso_iniziale + coalesce((
    select sum(case when v.tipologia = 'aumento' then v.importo else -v.importo end)
    from public.economia_commesse_variazioni v
    where v.economia_commessa_id = scheda_id and v.deleted_at is null
  ), 0)
  where e.id = scheda_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists economia_variazioni_sync_compenso on public.economia_commesse_variazioni;
create trigger economia_variazioni_sync_compenso
after insert or update or delete on public.economia_commesse_variazioni
for each row execute function private.economia_sincronizza_compenso_legacy();

create or replace function private.economia_verifica_allocazione()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  importo_movimento numeric(14,2);
  totale_movimento numeric(14,2);
  totale_documento numeric(14,2);
  allocato_documento numeric(14,2);
begin
  if new.deleted_at is not null then return new; end if;

  select importo into importo_movimento
  from public.economia_movimenti_finanziari
  where id = new.movimento_id and deleted_at is null;

  select coalesce(sum(importo), 0) into totale_movimento
  from public.economia_allocazioni_movimenti
  where movimento_id = new.movimento_id
    and deleted_at is null
    and id <> new.id;

  if totale_movimento + new.importo > importo_movimento then
    raise exception 'La somma delle allocazioni supera l''importo del movimento.';
  end if;

  if new.documento_attivo_id is not null then
    select totale into totale_documento
    from public.economia_documenti_attivi
    where id = new.documento_attivo_id and deleted_at is null;

    select coalesce(sum(importo), 0) into allocato_documento
    from public.economia_allocazioni_movimenti
    where documento_attivo_id = new.documento_attivo_id
      and deleted_at is null
      and id <> new.id;
  else
    select totale into totale_documento
    from public.economia_documenti_collaboratori
    where id = new.documento_collaboratore_id and deleted_at is null;

    select coalesce(sum(importo), 0) into allocato_documento
    from public.economia_allocazioni_movimenti
    where documento_collaboratore_id = new.documento_collaboratore_id
      and deleted_at is null
      and id <> new.id;
  end if;

  if allocato_documento + new.importo > totale_documento and not new.consenti_eccedenza then
    raise exception 'L''allocazione supera il residuo del documento.';
  end if;
  return new;
end;
$$;

drop trigger if exists economia_allocazioni_verifica on public.economia_allocazioni_movimenti;
create trigger economia_allocazioni_verifica
before insert or update on public.economia_allocazioni_movimenti
for each row execute function private.economia_verifica_allocazione();

create or replace function public.economia_sostituisci_allocazioni(
  p_movimento_id uuid,
  p_allocazioni jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  riga jsonb;
  importo_movimento numeric(14,2);
  totale_allocato numeric(14,2);
  stato_finale text;
  anticipo boolean;
  scheda_id uuid;
begin
  select importo, anticipo_da_fatturare, economia_commessa_id
    into importo_movimento, anticipo, scheda_id
  from public.economia_movimenti_finanziari
  where id = p_movimento_id and deleted_at is null
  for update;

  if importo_movimento is null then
    raise exception 'Movimento finanziario non trovato.';
  end if;

  update public.economia_allocazioni_movimenti
  set deleted_at = now()
  where movimento_id = p_movimento_id and deleted_at is null;

  for riga in select value from jsonb_array_elements(coalesce(p_allocazioni, '[]'::jsonb))
  loop
    insert into public.economia_allocazioni_movimenti
      (movimento_id, documento_attivo_id, documento_collaboratore_id, importo, consenti_eccedenza, created_by)
    values
      (
        p_movimento_id,
        nullif(riga ->> 'documento_attivo_id', '')::uuid,
        nullif(riga ->> 'documento_collaboratore_id', '')::uuid,
        (riga ->> 'importo')::numeric,
        coalesce((riga ->> 'consenti_eccedenza')::boolean, false),
        auth.uid()
      );
  end loop;

  select coalesce(sum(importo), 0) into totale_allocato
  from public.economia_allocazioni_movimenti
  where movimento_id = p_movimento_id and deleted_at is null;

  stato_finale := case
    when totale_allocato <= 0 and anticipo then 'da_associare'
    when totale_allocato <= 0 then 'da_documentare'
    when totale_allocato < importo_movimento then 'parzialmente_riconciliato'
    else 'riconciliato'
  end;

  update public.economia_movimenti_finanziari
  set stato_riconciliazione = stato_finale,
      updated_by = auth.uid()
  where id = p_movimento_id;

  update public.economia_documenti_attivi d
  set stato = case
    when coalesce((
      select sum(a.importo)
      from public.economia_allocazioni_movimenti a
      where a.documento_attivo_id = d.id and a.deleted_at is null
    ), 0) >= d.totale then 'pagato'
    when coalesce((
      select sum(a.importo)
      from public.economia_allocazioni_movimenti a
      where a.documento_attivo_id = d.id and a.deleted_at is null
    ), 0) > 0 then 'parzialmente_pagato'
    when d.stato in ('pagato', 'parzialmente_pagato') then 'emesso'
    else d.stato
  end,
  updated_by = auth.uid()
  where d.economia_commessa_id = scheda_id
    and d.stato not in ('bozza', 'da_emettere', 'annullato');

  update public.economia_documenti_collaboratori d
  set stato = case
    when coalesce((
      select sum(a.importo)
      from public.economia_allocazioni_movimenti a
      where a.documento_collaboratore_id = d.id and a.deleted_at is null
    ), 0) >= d.totale then 'pagato'
    when coalesce((
      select sum(a.importo)
      from public.economia_allocazioni_movimenti a
      where a.documento_collaboratore_id = d.id and a.deleted_at is null
    ), 0) > 0 then 'parzialmente_pagato'
    when d.stato in ('pagato', 'parzialmente_pagato') then 'emesso'
    else d.stato
  end,
  updated_by = auth.uid()
  where exists (
      select 1
      from public.economia_commesse_collaboratori c
      where c.id = d.collaboratore_id
        and c.economia_commessa_id = scheda_id
    )
    and d.stato not in ('bozza', 'da_emettere', 'annullato');

  return stato_finale;
end;
$$;

revoke all on function public.economia_sostituisci_allocazioni(uuid, jsonb) from public;
revoke all on function public.economia_sostituisci_allocazioni(uuid, jsonb) from anon;
grant execute on function public.economia_sostituisci_allocazioni(uuid, jsonb) to authenticated;

-- Migrazione conservativa dei movimenti esistenti. I dati ambigui restano da verificare.
insert into public.economia_movimenti_finanziari
  (economia_commessa_id, direzione, tipologia, data_movimento, importo, modalita, soggetto, conto_cassa, causale, stato_riconciliazione, legacy_source, legacy_id, legacy_dettaglio)
select
  p.economia_commessa_id,
  'entrata',
  'incasso_cliente',
  p.data_pagamento,
  p.importo,
  'altro',
  coalesce(c.cliente_nome, 'Cliente'),
  'Da verificare',
  'Incasso migrato dal registro precedente',
  'da_documentare',
  'economia_commesse_pagamenti',
  p.id,
  jsonb_build_object('importo_legacy', p.importo, 'data_legacy', p.data_pagamento)
from public.economia_commesse_pagamenti p
join public.economia_commesse e on e.id = p.economia_commessa_id
join public.commesse c on c.id = e.commessa_id
where not exists (
  select 1 from public.economia_movimenti_finanziari m
  where m.legacy_source = 'economia_commesse_pagamenti' and m.legacy_id = p.id
);

insert into public.economia_movimenti_finanziari
  (economia_commessa_id, direzione, tipologia, collaboratore_id, data_movimento, importo, modalita, soggetto, conto_cassa, causale, stato_riconciliazione, legacy_source, legacy_id, legacy_dettaglio)
select
  c.economia_commessa_id,
  'uscita',
  'pagamento_collaboratore',
  c.id,
  s.data_pagamento,
  s.importo + coalesce(s.cassa, 0) + coalesce(s.iva, 0),
  'altro',
  coalesce(c.collaboratore_esterno_nome, p.nome, 'Collaboratore'),
  'Da verificare',
  'SAL collaboratore migrato: classificazione da verificare',
  'da_verificare',
  'economia_collaboratori_sal',
  s.id,
  jsonb_build_object('imponibile', s.importo, 'cassa', s.cassa, 'iva', s.iva)
from public.economia_collaboratori_sal s
join public.economia_commesse_collaboratori c on c.id = s.collaboratore_id
left join public.personale p on p.id = c.persona_id
where not exists (
  select 1 from public.economia_movimenti_finanziari m
  where m.legacy_source = 'economia_collaboratori_sal' and m.legacy_id = s.id
);

insert into public.economia_movimenti_finanziari
  (economia_commessa_id, direzione, tipologia, costo_progetto_id, data_movimento, importo, modalita, soggetto, conto_cassa, causale, stato_riconciliazione, legacy_source, legacy_id, legacy_dettaglio)
select
  c.economia_commessa_id,
  'uscita',
  'altro',
  c.id,
  s.data_pagamento,
  s.importo + coalesce(s.cassa, 0) + coalesce(s.iva, 0),
  'altro',
  c.descrizione,
  'Da verificare',
  'SAL costo progetto migrato: classificazione da verificare',
  'da_verificare',
  'economia_costi_progetto_sal',
  s.id,
  jsonb_build_object('imponibile', s.importo, 'cassa', s.cassa, 'iva', s.iva)
from public.economia_costi_progetto_sal s
join public.economia_commesse_costi c on c.id = s.costo_progetto_id
where not exists (
  select 1 from public.economia_movimenti_finanziari m
  where m.legacy_source = 'economia_costi_progetto_sal' and m.legacy_id = s.id
);

insert into public.economia_anomalie
  (economia_commessa_id, tipologia, gravita, descrizione, data_anomalia, entita_tipo, entita_id, stato, azione_suggerita)
select
  m.economia_commessa_id,
  case when m.direzione = 'entrata' then 'incasso_senza_documento' else 'pagamento_senza_documento' end,
  'attenzione',
  case
    when m.direzione = 'entrata' then 'Incasso storico senza documento associato.'
    else 'Pagamento storico senza documento associato; verificare la classificazione del SAL.'
  end,
  m.data_movimento,
  'movimento_finanziario',
  m.id,
  'aperta',
  case
    when m.direzione = 'entrata' then 'Associa a documento esistente o crea il documento.'
    else 'Associa a documento, inserisci il documento o classifica come anticipo.'
  end
from public.economia_movimenti_finanziari m
where m.legacy_source is not null
  and not exists (
    select 1 from public.economia_anomalie a
    where a.entita_tipo = 'movimento_finanziario'
      and a.entita_id = m.id
      and a.tipologia = case when m.direzione = 'entrata' then 'incasso_senza_documento' else 'pagamento_senza_documento' end
  );

create index if not exists economia_variazioni_commessa_data_idx on public.economia_commesse_variazioni(economia_commessa_id, data_variazione);
create index if not exists economia_documenti_attivi_commessa_data_idx on public.economia_documenti_attivi(economia_commessa_id, data_documento);
create index if not exists economia_documenti_attivi_righe_documento_idx on public.economia_documenti_attivi_righe(documento_attivo_id, ordine);
create index if not exists economia_documenti_collaboratori_collaboratore_idx on public.economia_documenti_collaboratori(collaboratore_id, data_documento);
create index if not exists economia_documenti_collaboratori_righe_documento_idx on public.economia_documenti_collaboratori_righe(documento_collaboratore_id, ordine);
create index if not exists economia_movimenti_commessa_data_idx on public.economia_movimenti_finanziari(economia_commessa_id, data_movimento);
create index if not exists economia_movimenti_collaboratore_idx on public.economia_movimenti_finanziari(collaboratore_id);
create index if not exists economia_allocazioni_movimento_idx on public.economia_allocazioni_movimenti(movimento_id);
create index if not exists economia_allocazioni_documento_attivo_idx on public.economia_allocazioni_movimenti(documento_attivo_id);
create index if not exists economia_allocazioni_documento_collaboratore_idx on public.economia_allocazioni_movimenti(documento_collaboratore_id);
create index if not exists economia_anomalie_commessa_stato_idx on public.economia_anomalie(economia_commessa_id, stato);
create index if not exists economia_audit_commessa_data_idx on public.economia_audit_log(economia_commessa_id, created_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'economia_soggetti_fiscali',
    'economia_profili_fiscali',
    'economia_commesse_variazioni',
    'economia_documenti_attivi',
    'economia_documenti_attivi_righe',
    'economia_documenti_collaboratori',
    'economia_documenti_collaboratori_righe',
    'economia_movimenti_finanziari',
    'economia_allocazioni_movimenti',
    'economia_anomalie',
    'economia_audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('grant select, insert, update on table public.%I to authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_developer_all', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_admin_or_developer())) with check ((select private.is_admin_or_developer()))',
      table_name || '_admin_developer_all',
      table_name
    );
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'economia_soggetti_fiscali',
    'economia_profili_fiscali',
    'economia_commesse',
    'economia_commesse_variazioni',
    'economia_documenti_attivi',
    'economia_documenti_attivi_righe',
    'economia_commesse_collaboratori',
    'economia_commesse_costi',
    'economia_documenti_collaboratori',
    'economia_documenti_collaboratori_righe',
    'economia_movimenti_finanziari',
    'economia_anomalie'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.economia_set_updated_at()',
      table_name || '_updated_at',
      table_name
    );
  end loop;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'economia_commesse',
    'economia_commesse_variazioni',
    'economia_documenti_attivi',
    'economia_documenti_attivi_righe',
    'economia_commesse_collaboratori',
    'economia_commesse_costi',
    'economia_documenti_collaboratori',
    'economia_documenti_collaboratori_righe',
    'economia_movimenti_finanziari',
    'economia_allocazioni_movimenti',
    'economia_anomalie'
  ] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_audit', table_name);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.economia_audit_changes()',
      table_name || '_audit',
      table_name
    );
  end loop;
end
$$;

commit;

-- Verifica post-migrazione: i conteggi legacy e nuovi devono essere coerenti.
select
  (select count(*) from public.economia_commesse_pagamenti) as incassi_legacy,
  (select count(*) from public.economia_movimenti_finanziari where legacy_source = 'economia_commesse_pagamenti') as incassi_migrati,
  (select count(*) from public.economia_collaboratori_sal) as sal_collaboratori_legacy,
  (select count(*) from public.economia_movimenti_finanziari where legacy_source = 'economia_collaboratori_sal') as sal_collaboratori_migrati,
  (select count(*) from public.economia_costi_progetto_sal) as sal_costi_legacy,
  (select count(*) from public.economia_movimenti_finanziari where legacy_source = 'economia_costi_progetto_sal') as sal_costi_migrati;
