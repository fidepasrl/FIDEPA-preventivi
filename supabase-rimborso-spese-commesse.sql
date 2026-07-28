-- FIDEPA 2.3.1 - Rimborso spese nelle schede economiche delle commesse
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

alter table public.economia_commesse
  add column if not exists rimborso_spese numeric(14,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'economia_commesse_rimborso_spese_check'
      and conrelid = 'public.economia_commesse'::regclass
  ) then
    alter table public.economia_commesse
      add constraint economia_commesse_rimborso_spese_check
      check (rimborso_spese >= 0);
  end if;
end
$$;

commit;
