-- FIDEPA 2.3.1 - Registro pagamenti ricevuti delle commesse
-- Eseguire l'intero contenuto nel SQL Editor di Supabase.

begin;

create table if not exists public.economia_commesse_pagamenti (
  id uuid primary key default gen_random_uuid(),
  economia_commessa_id uuid not null references public.economia_commesse(id) on delete cascade,
  importo numeric(14,2) not null,
  data_pagamento date not null,
  created_at timestamptz not null default now(),
  constraint economia_commesse_pagamenti_importo_check check (importo > 0)
);

create index if not exists economia_pagamenti_commessa_data_idx
  on public.economia_commesse_pagamenti(economia_commessa_id, data_pagamento);

alter table public.economia_commesse_pagamenti enable row level security;
revoke all on table public.economia_commesse_pagamenti from anon;
grant select, insert, update, delete
  on table public.economia_commesse_pagamenti to authenticated;

drop policy if exists economia_commesse_pagamenti_admin_developer_all
  on public.economia_commesse_pagamenti;
create policy economia_commesse_pagamenti_admin_developer_all
  on public.economia_commesse_pagamenti
  for all
  to authenticated
  using ((select private.is_admin_or_developer()))
  with check ((select private.is_admin_or_developer()));

commit;
