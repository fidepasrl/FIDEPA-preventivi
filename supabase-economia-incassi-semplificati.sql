begin;

alter table public.economia_movimenti_finanziari
  add column if not exists imponibile numeric(14,2),
  add column if not exists cassa_aliquota numeric(7,4) not null default 0,
  add column if not exists cassa numeric(14,2) not null default 0,
  add column if not exists iva_aliquota numeric(7,4) not null default 0,
  add column if not exists iva numeric(14,2) not null default 0,
  add column if not exists allegato_nome text,
  add column if not exists allegato_url text;

alter table public.economia_movimenti_finanziari
  drop constraint if exists economia_movimenti_componenti_fiscali_check;

alter table public.economia_movimenti_finanziari
  add constraint economia_movimenti_componenti_fiscali_check
  check (
    (imponibile is null or imponibile > 0)
    and cassa_aliquota >= 0
    and cassa >= 0
    and iva_aliquota >= 0
    and iva >= 0
  );

comment on column public.economia_movimenti_finanziari.imponibile is
  'Importo base dell’incasso semplificato prima di Cassa e IVA.';
comment on column public.economia_movimenti_finanziari.allegato_url is
  'Percorso privato del documento che attesta il movimento finanziario.';

commit;
