-- FIDEPA 2.3.3 - Spese studio continue nel tempo
-- Converte le voci Studio esistenti in ricorrenze mensili con data iniziale/finale.

begin;

update public.economia_costi_societa
set categoria = case
  when frequenza = 'Una tantum' then 'Acquisti'
  else 'Studio'
end
where categoria is null or btrim(categoria) = '';

update public.economia_costi_societa
set data_inizio = coalesce(
      data_inizio,
      data_riferimento,
      make_date(extract(year from created_at)::integer, 1, 1)
    )
where categoria = 'Studio'
  and data_inizio is null;

update public.economia_costi_societa
set data_fine = case
      when data_fine is not null then data_fine
      when coalesce(numero_mesi, 0) > 0 then
        (data_inizio + make_interval(months => greatest(numero_mesi - 1, 0)))::date
      when frequenza = 'Annuale' then
        (data_inizio + interval '11 months')::date
      else null
    end,
    frequenza = 'Mensile',
    cassa = 0,
    data_riferimento = null,
    numero_mesi = null
where categoria = 'Studio';

commit;
