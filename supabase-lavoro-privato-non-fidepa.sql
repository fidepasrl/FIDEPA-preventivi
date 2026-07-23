-- Flag per escludere le commesse private non FIDEPA dalle aree condivise.
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

alter table public.commesse
  add column if not exists lavoro_privato_non_fidepa boolean default false;

update public.commesse
set lavoro_privato_non_fidepa = false
where lavoro_privato_non_fidepa is null;

alter table public.commesse
  alter column lavoro_privato_non_fidepa set default false,
  alter column lavoro_privato_non_fidepa set not null;

commit;
