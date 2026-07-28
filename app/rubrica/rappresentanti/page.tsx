"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LayoutApp from "@/components/LayoutApp";
import AppIcon from "@/components/AppIcon";
import RepresentativeCard from "@/components/rappresentanti/RepresentativeCard";
import RepresentativesFilters from "@/components/rappresentanti/RepresentativesFilters";
import RepresentativesTable from "@/components/rappresentanti/RepresentativesTable";
import { EmptyState, LoadingSkeleton, Modal, PageHeader, Toast, inputClass, primaryButton, secondaryButton } from "@/components/rappresentanti/Common";
import { cambiaStatoRappresentante, caricaAziende, caricaCategorie, caricaProdotti, caricaRappresentanti, duplicaRappresentante, eliminaRappresentante, salvaRappresentante } from "@/lib/rappresentanti/api";
import type { AziendaRappresentata, CategoriaRappresentante, FiltriRappresentanti, OrdinamentoRappresentanti, ProdottoRappresentato, Rappresentante } from "@/lib/rappresentanti/types";
import { FILTRI_RAPPRESENTANTI_INIZIALI, RAPPRESENTANTE_FORM_INIZIALE } from "@/lib/rappresentanti/types";
import { esportaRappresentantiCsv, filtraRappresentanti, leggiCsvRappresentanti, ordinaRappresentanti } from "@/lib/rappresentanti/utils";

export default function RepresentativesPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Rappresentante[]>([]);
  const [categorie, setCategorie] = useState<CategoriaRappresentante[]>([]);
  const [aziende, setAziende] = useState<AziendaRappresentata[]>([]);
  const [prodotti, setProdotti] = useState<ProdottoRappresentato[]>([]);
  const [loading, setLoading] = useState(true);
  const [ricerca, setRicerca] = useState("");
  const [filtri, setFiltri] = useState<FiltriRappresentanti>(FILTRI_RAPPRESENTANTI_INIZIALI);
  const [filtriOpen, setFiltriOpen] = useState(false);
  const [vista, setVista] = useState<"table" | "cards">("table");
  const [ordine, setOrdine] = useState<OrdinamentoRappresentanti>("nome");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [deleteItem, setDeleteItem] = useState<Rappresentante | null>(null);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  async function load() {
    setLoading(true);
    try { const [r, c, a, p] = await Promise.all([caricaRappresentanti(), caricaCategorie(false), caricaAziende(), caricaProdotti()]); setItems(r); setCategorie(c); setAziende(a); setProdotti(p); }
    catch (e) { setToast({ message: e instanceof Error ? e.message : "Impossibile caricare la rubrica.", error: true }); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    // I dati remoti e le preferenze locali vengono inizializzati al montaggio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); const stored = localStorage.getItem("rubrica-rappresentanti-filtri"); if (stored) { try { setFiltri(JSON.parse(stored)); } catch { /* impostazioni locali non valide */ } }
  }, []);
  useEffect(() => {
    // Ogni variazione dei criteri riporta l’elenco alla prima pagina.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [ricerca, filtri, ordine, perPage]);

  const filtered = useMemo(() => ordinaRappresentanti(filtraRappresentanti(items, ricerca, filtri), ordine), [items, ricerca, filtri, ordine]);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const regioni = Array.from(new Set(items.map((x) => x.regione).filter((x): x is string => Boolean(x)))).sort();
  const province = Array.from(new Set(items.map((x) => x.provincia).filter((x): x is string => Boolean(x)))).sort();

  async function action(kind: "view" | "edit" | "contact" | "duplicate" | "toggle" | "delete", item: Rappresentante) {
    if (kind === "view") return router.push(`/rubrica/rappresentanti/${item.id}`);
    if (kind === "edit") return router.push(`/rubrica/rappresentanti/${item.id}/modifica`);
    if (kind === "contact") return router.push(`/rubrica/rappresentanti/${item.id}?contatto=1`);
    if (kind === "delete") return setDeleteItem(item);
    try { if (kind === "toggle") await cambiaStatoRappresentante(item.id, !item.active); if (kind === "duplicate") { const id = await duplicaRappresentante(item); router.push(`/rubrica/rappresentanti/${id}/modifica`); return; } await load(); setToast({ message: kind === "toggle" ? "Stato aggiornato." : "Operazione completata." }); }
    catch (e) { setToast({ message: e instanceof Error ? e.message : "Operazione non riuscita.", error: true }); }
  }

  async function importCsv(file: File) {
    try {
      const righe = leggiCsvRappresentanti(await file.text());
      if (!righe.length) throw new Error("Il file non contiene righe importabili.");
      let create = 0; let skipped = 0;
      for (const riga of righe) {
        if (!riga.nome || !riga.cognome) { skipped += 1; continue; }
        try { await salvaRappresentante({ ...RAPPRESENTANTE_FORM_INIZIALE, ...riga }); create += 1; } catch { skipped += 1; }
      }
      await load(); setToast({ message: `Importazione completata: ${create} creati, ${skipped} ignorati.` });
    } catch (e) { setToast({ message: e instanceof Error ? e.message : "Importazione non riuscita.", error: true }); }
  }

  return <LayoutApp><PageHeader title="Rubrica rappresentanti" subtitle="Gestisci rappresentanti, aziende, prodotti e categorie merceologiche." actions={<><Link href="/rubrica/rappresentanti/categorie" className={secondaryButton}>Gestione categorie</Link><Link href="/rubrica/rappresentanti/aziende" className={secondaryButton}>Aziende</Link><Link href="/rubrica/rappresentanti/prodotti" className={secondaryButton}>Prodotti e linee</Link><Link href="/rubrica/rappresentanti/nuovo" className={primaryButton}><AppIcon name="plus" size={16} />Nuovo rappresentante</Link></>} />
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[280px] flex-[1_1_360px]"><AppIcon name="search" size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-[#2B2F5E]/40" /><input className={`${inputClass} pl-10`} value={ricerca} onChange={(e) => setRicerca(e.target.value)} placeholder="Cerca nome, azienda, prodotto, categoria, località, telefono o email..." /></div>
      <button type="button" className={`${secondaryButton} shrink-0`} onClick={() => setFiltriOpen(!filtriOpen)}>Filtri</button>
      <div className="w-48 shrink-0"><select className={inputClass} value={ordine} onChange={(e) => setOrdine(e.target.value as OrdinamentoRappresentanti)} aria-label="Ordinamento"><option value="nome">Nome A-Z</option><option value="azienda">Azienda</option><option value="ultimo_contatto">Ultimo contatto</option><option value="created_at">Data inserimento</option><option value="updated_at">Ultimo aggiornamento</option></select></div>
      <div className="flex shrink-0 rounded-xl border border-[#2B2F5E]/15 bg-white p-1"><button type="button" title="Vista tabellare" onClick={() => setVista("table")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista === "table" ? "bg-[#2B2F5E] text-white" : "text-[#2B2F5E]"}`}>Tabella</button><button type="button" title="Vista a schede" onClick={() => setVista("cards")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista === "cards" ? "bg-[#2B2F5E] text-white" : "text-[#2B2F5E]"}`}>Schede</button></div>
      <button type="button" className={`${secondaryButton} shrink-0`} onClick={() => esportaRappresentantiCsv(filtered)}><AppIcon name="download" size={15} />Esporta CSV</button>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) importCsv(file); e.target.value = ""; }} />
      <button type="button" className={`${secondaryButton} shrink-0`} onClick={() => fileRef.current?.click()}>Importa CSV</button>
    </div>
    {filtriOpen && <div className="mb-4"><RepresentativesFilters filtri={filtri} onChange={setFiltri} categorie={categorie} aziende={aziende} prodotti={prodotti} regioni={regioni} province={province} /><div className="mt-2 flex justify-end"><button type="button" className="text-xs font-semibold text-[#2D80B3]" onClick={() => { localStorage.setItem("rubrica-rappresentanti-filtri", JSON.stringify(filtri)); setToast({ message: "Filtri salvati nel browser." }); }}>Salva questi filtri</button></div></div>}
    <div className="mb-3 flex items-center justify-between text-xs text-[#2B2F5E]/55"><span>{filtered.length} rappresentanti</span>{filtered.length !== items.length && <span>{items.length} totali</span>}</div>
    {loading ? <LoadingSkeleton rows={5} /> : filtered.length === 0 ? <EmptyState title={items.length ? "Nessun rappresentante corrisponde alla ricerca." : "Non sono ancora presenti rappresentanti nella rubrica."} actionLabel={!items.length ? "Aggiungi il primo rappresentante" : undefined} onAction={!items.length ? () => router.push("/rubrica/rappresentanti/nuovo") : undefined} /> : vista === "table" ? <RepresentativesTable rappresentanti={paged} onAction={action} /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{paged.map((x) => <RepresentativeCard key={x.id} rappresentante={x} onEdit={() => router.push(`/rubrica/rappresentanti/${x.id}/modifica`)} />)}</div>}
    {!loading && filtered.length > 0 && <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl bg-white p-3 sm:flex-row"><label className="flex items-center gap-2 text-xs text-[#2B2F5E]/55">Righe per pagina<select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="rounded-lg border border-[#2B2F5E]/15 px-2 py-1.5 text-[#2B2F5E]"><option>10</option><option>20</option><option>50</option></select></label><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={`${secondaryButton} min-h-9 py-1.5`}>Precedente</button><span className="px-2 text-xs text-[#2B2F5E]">Pagina {page} di {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={`${secondaryButton} min-h-9 py-1.5`}>Successiva</button></div></div>}
    {deleteItem && <Modal title="Eliminare il rappresentante?" onClose={() => setDeleteItem(null)}><p className="text-sm text-[#2B2F5E]/70">La scheda di <strong>{deleteItem.nome} {deleteItem.cognome}</strong> verrà disattivata e archiviata. Le aziende e i prodotti collegati non saranno eliminati.</p><div className="mt-5 flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDeleteItem(null)}>Annulla</button><button type="button" className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700" onClick={async () => { try { await eliminaRappresentante(deleteItem.id); setDeleteItem(null); await load(); setToast({ message: "Rappresentante eliminato." }); } catch (e) { setToast({ message: e instanceof Error ? e.message : "Errore eliminazione.", error: true }); } }}>Elimina</button></div></Modal>}
    {toast && <Toast message={toast.message} error={toast.error} onClose={() => setToast(null)} />}
  </LayoutApp>;
}
