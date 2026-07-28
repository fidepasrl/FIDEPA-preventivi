-- FIDEPA 2.3.1 - Dati fiscali del personale nella gestione economica
-- Migrazione additiva e idempotente. Non modifica l'anagrafica operativa esistente.

begin;

alter table public.personale
  add column if not exists economia_cassa_attiva boolean not null default false,
  add column if not exists economia_cassa_aliquota numeric(7,4) not null default 0,
  add column if not exists economia_iva_attiva boolean not null default false,
  add column if not exists economia_iva_aliquota numeric(7,4) not null default 0;

alter table public.economia_commesse_collaboratori
  add column if not exists cassa_aliquota numeric(7,4) not null default 0,
  add column if not exists iva_aliquota numeric(7,4) not null default 0;

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

commit;
