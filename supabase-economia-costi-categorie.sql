-- FIDEPA 2.3.3 - Categorie dei costi societari
-- Usa il campo categoria esistente e classifica le voci storiche non categorizzate.

begin;

update public.economia_costi_societa
set categoria = case
  when frequenza = 'Una tantum' then 'Acquisti'
  else 'Studio'
end
where categoria is null or btrim(categoria) = '';

create index if not exists economia_costi_societa_categoria_idx
  on public.economia_costi_societa (categoria);

commit;
