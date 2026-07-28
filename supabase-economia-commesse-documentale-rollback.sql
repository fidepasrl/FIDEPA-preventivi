-- FIDEPA 2.3.1 - Rollback protetto della gestione economica documentale
-- Il rollback si interrompe se rileva dati creati con la nuova interfaccia.

begin;

do $$
begin
  if exists (select 1 from public.economia_commesse_variazioni where deleted_at is null)
    or exists (select 1 from public.economia_documenti_attivi where deleted_at is null)
    or exists (select 1 from public.economia_documenti_collaboratori where deleted_at is null)
    or exists (
      select 1 from public.economia_movimenti_finanziari
      where legacy_source is null and deleted_at is null
    )
  then
    raise exception 'Rollback bloccato: sono presenti dati creati con il nuovo modello. Esportarli o archiviarli prima di procedere.';
  end if;
end
$$;

drop policy if exists economia_documenti_storage_select on storage.objects;
drop policy if exists economia_documenti_storage_insert on storage.objects;
drop policy if exists economia_documenti_storage_update on storage.objects;

do $$
begin
  if not exists (
    select 1 from storage.objects where bucket_id = 'economia-documenti'
  ) then
    delete from storage.buckets where id = 'economia-documenti';
  end if;
end
$$;

drop function if exists public.economia_sostituisci_allocazioni(uuid, jsonb);

drop table if exists public.economia_allocazioni_movimenti;
drop table if exists public.economia_anomalie;
drop table if exists public.economia_audit_log;
drop table if exists public.economia_documenti_attivi_righe;
drop table if exists public.economia_commesse_variazioni;
drop table if exists public.economia_documenti_attivi;
drop table if exists public.economia_documenti_collaboratori_righe;
drop table if exists public.economia_documenti_collaboratori;
drop table if exists public.economia_movimenti_finanziari;

drop trigger if exists economia_commesse_updated_at on public.economia_commesse;
drop trigger if exists economia_commesse_audit on public.economia_commesse;
drop trigger if exists economia_commesse_collaboratori_updated_at on public.economia_commesse_collaboratori;
drop trigger if exists economia_commesse_collaboratori_audit on public.economia_commesse_collaboratori;
drop trigger if exists economia_commesse_costi_updated_at on public.economia_commesse_costi;
drop trigger if exists economia_commesse_costi_audit on public.economia_commesse_costi;

alter table public.economia_commesse
  drop column if exists compenso_iniziale,
  drop column if exists preventivo_numero,
  drop column if exists soggetto_fiscale_id,
  drop column if exists created_by,
  drop column if exists updated_by,
  drop column if exists deleted_at;

alter table public.economia_commesse_collaboratori
  drop constraint if exists economia_collaboratori_tipo_check,
  drop constraint if exists economia_collaboratori_modalita_check,
  drop constraint if exists economia_collaboratori_percentuale_check,
  drop column if exists tipo,
  drop column if exists percentuale,
  drop column if exists modalita_calcolo,
  drop column if exists profilo_fiscale_id,
  drop column if exists cassa_aliquota,
  drop column if exists iva_aliquota,
  drop column if exists note,
  drop column if exists created_by,
  drop column if exists updated_by,
  drop column if exists updated_at,
  drop column if exists deleted_at;

alter table public.personale
  drop constraint if exists personale_economia_cassa_aliquota_check,
  drop constraint if exists personale_economia_iva_aliquota_check,
  drop column if exists economia_cassa_attiva,
  drop column if exists economia_cassa_aliquota,
  drop column if exists economia_iva_attiva,
  drop column if exists economia_iva_aliquota;

alter table public.economia_commesse_costi
  drop column if exists created_by,
  drop column if exists updated_by,
  drop column if exists updated_at,
  drop column if exists deleted_at;

drop table if exists public.economia_profili_fiscali;
drop table if exists public.economia_soggetti_fiscali;

drop function if exists private.economia_verifica_allocazione();
drop function if exists private.economia_sincronizza_compenso_legacy();
drop function if exists private.economia_audit_changes();
drop function if exists private.economia_set_updated_at();

commit;
