-- FIDEPA 2.3.3 - Collaboratori continuativi e variazioni del compenso
-- Migrazione additiva: collega i costi al personale e conserva lo storico importi.

begin;

alter table public.economia_costi_societa
  add column if not exists persona_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'economia_costi_societa_persona_fk'
      and conrelid = 'public.economia_costi_societa'::regclass
  ) then
    alter table public.economia_costi_societa
      add constraint economia_costi_societa_persona_fk
      foreign key (persona_id) references public.personale(id) on delete restrict;
  end if;
end
$$;

create table if not exists public.economia_costi_societa_variazioni (
  id uuid primary key default gen_random_uuid(),
  costo_societa_id uuid not null
    references public.economia_costi_societa(id) on delete cascade,
  data_decorrenza date not null,
  importo numeric(14,2) not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint economia_costi_societa_variazioni_importo_check
    check (importo > 0),
  constraint economia_costi_societa_variazioni_data_unique
    unique (costo_societa_id, data_decorrenza)
);

create index if not exists economia_costi_societa_persona_idx
  on public.economia_costi_societa(persona_id);

create index if not exists economia_costi_societa_variazioni_costo_data_idx
  on public.economia_costi_societa_variazioni(costo_societa_id, data_decorrenza);

-- Collega automaticamente soltanto i record storici con una corrispondenza univoca.
update public.economia_costi_societa c
set persona_id = (
  select p.id
  from public.personale p
  where lower(btrim(p.nome)) = lower(btrim(c.descrizione))
  limit 1
)
where c.categoria = 'Collaboratori'
  and c.persona_id is null
  and 1 = (
    select count(*)
    from public.personale p
    where lower(btrim(p.nome)) = lower(btrim(c.descrizione))
  );

-- Converte i collaboratori storici in periodi mensili senza perdere la scadenza.
update public.economia_costi_societa
set data_inizio = coalesce(data_inizio, data_riferimento, created_at::date)
where categoria = 'Collaboratori'
  and data_inizio is null;

update public.economia_costi_societa
set data_fine = case
      when data_fine is not null then data_fine
      when frequenza = 'Una tantum' then data_inizio
      when coalesce(numero_mesi, 0) > 0 then
        (data_inizio + make_interval(months => greatest(numero_mesi - 1, 0)))::date
      when frequenza = 'Annuale' then
        (data_inizio + interval '11 months')::date
      else null
    end,
    frequenza = 'Mensile',
    tipo = 'Fisso',
    data_riferimento = null,
    numero_mesi = null
where categoria = 'Collaboratori';

alter table public.economia_costi_societa_variazioni enable row level security;
revoke all on table public.economia_costi_societa_variazioni from anon;
grant select, insert, update, delete
  on table public.economia_costi_societa_variazioni to authenticated;

drop policy if exists economia_costi_societa_variazioni_admin_developer_all
  on public.economia_costi_societa_variazioni;
create policy economia_costi_societa_variazioni_admin_developer_all
  on public.economia_costi_societa_variazioni
  for all
  to authenticated
  using ((select private.is_admin_or_developer()))
  with check ((select private.is_admin_or_developer()));

commit;
