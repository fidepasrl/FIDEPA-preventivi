-- FIDEPA 2.3.3 - Collegamento collaboratori esterni alla rubrica professionisti
-- Migrazione additiva e idempotente. I collaboratori esterni esistenti restano validi.

begin;

alter table public.economia_commesse_collaboratori
  add column if not exists professionista_id uuid
    references public.professionisti(id) on delete set null;

create index if not exists economia_collaboratori_professionista_idx
  on public.economia_commesse_collaboratori (professionista_id)
  where professionista_id is not null;

create unique index if not exists economia_collaboratore_professionista_unico_idx
  on public.economia_commesse_collaboratori (
    economia_commessa_id,
    professionista_id
  )
  where professionista_id is not null and deleted_at is null;

commit;
