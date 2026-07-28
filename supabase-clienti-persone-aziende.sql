-- FIDEPA 2.3.2 - Distinzione tra clienti persona fisica e azienda
-- Migrazione additiva e idempotente: preserva integralmente i clienti esistenti.

begin;

alter table public.clienti
  add column if not exists tipo_cliente text not null default 'persona_fisica',
  add column if not exists codice_fiscale text,
  add column if not exists forma_giuridica text,
  add column if not exists rea text,
  add column if not exists cap text,
  add column if not exists provincia text,
  add column if not exists nazione text,
  add column if not exists codice_sdi text,
  add column if not exists sito_web text,
  add column if not exists referente_qualifica text,
  add column if not exists referente_codice_fiscale text,
  add column if not exists referente_data_nascita date,
  add column if not exists referente_luogo_nascita text,
  add column if not exists referente_residenza text,
  add column if not exists referente_email text,
  add column if not exists referente_telefono text;

update public.clienti
set tipo_cliente = 'persona_fisica'
where tipo_cliente is null
   or tipo_cliente not in ('persona_fisica', 'azienda');

alter table public.clienti
  alter column tipo_cliente set default 'persona_fisica',
  alter column tipo_cliente set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clienti_tipo_cliente_check'
      and conrelid = 'public.clienti'::regclass
  ) then
    alter table public.clienti
      add constraint clienti_tipo_cliente_check
      check (tipo_cliente in ('persona_fisica', 'azienda'));
  end if;
end
$$;

create index if not exists clienti_tipo_cliente_idx
  on public.clienti (tipo_cliente);

create index if not exists clienti_codice_fiscale_idx
  on public.clienti (codice_fiscale)
  where codice_fiscale is not null;

commit;
