alter table public.gara_lavori
  add column if not exists prestazioni text[] not null default '{}';

alter table public.gara_lavori
  add column if not exists updated_at timestamptz not null default now();
