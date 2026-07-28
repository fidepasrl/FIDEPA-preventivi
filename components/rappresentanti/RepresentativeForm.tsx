"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppIcon from "@/components/AppIcon";
import {
  caricaAziende,
  caricaCategorie,
  caricaProdotti,
  caricaTag,
  creaTag,
  salvaAzienda,
  salvaProdotto,
  salvaRappresentante,
  trovaPossibiliDuplicati,
} from "@/lib/rappresentanti/api";
import type {
  AssociazioneAziendaForm,
  AziendaRappresentata,
  CategoriaRappresentante,
  ProdottoRappresentato,
  RappresentanteFormData,
  TagRappresentante,
} from "@/lib/rappresentanti/types";
import { RAPPRESENTANTE_FORM_INIZIALE } from "@/lib/rappresentanti/types";
import { validaEmail, validaUrl } from "@/lib/rappresentanti/utils";
import { FormField, Modal, SectionCard, Toast, inputClass, primaryButton, secondaryButton } from "./Common";

const tabs = ["Dati personali", "Contatti", "Aziende e prodotti", "Informazioni commerciali", "Note e allegati"] as const;

type Errori = Partial<Record<keyof RappresentanteFormData, string>>;

function associazioneVuota(aziendaId: string): AssociazioneAziendaForm {
  return { azienda_id: aziendaId, referente_interno: "", note: "", area_territoriale: "", data_inizio: "", data_fine: "", stato_collaborazione: "attiva", active: true, prodotto_ids: [] };
}

export default function RepresentativeForm({ initialData, id }: { initialData?: RappresentanteFormData; id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<RappresentanteFormData>(initialData || RAPPRESENTANTE_FORM_INIZIALE);
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0]);
  const [aziende, setAziende] = useState<AziendaRappresentata[]>([]);
  const [prodotti, setProdotti] = useState<ProdottoRappresentato[]>([]);
  const [categorie, setCategorie] = useState<CategoriaRappresentante[]>([]);
  const [tag, setTag] = useState<TagRappresentante[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errori, setErrori] = useState<Errori>({});
  const [duplicati, setDuplicati] = useState<Array<{ id: string; nome: string; cognome: string; email: string | null }>>([]);
  const [ignoraDuplicati, setIgnoraDuplicati] = useState(false);
  const [quickCompany, setQuickCompany] = useState(false);
  const [quickProductCompany, setQuickProductCompany] = useState<string | null>(null);
  const [nuovoTag, setNuovoTag] = useState("");
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  useEffect(() => {
    Promise.all([caricaAziende(), caricaProdotti(), caricaCategorie(false), caricaTag()])
      .then(([a, p, c, t]) => { setAziende(a); setProdotti(p); setCategorie(c); setTag(t); })
      .catch((errore) => setToast({ message: errore.message || "Impossibile caricare i dati di supporto.", error: true }))
      .finally(() => setCaricamento(false));
  }, []);

  const set = <K extends keyof RappresentanteFormData>(key: K, value: RappresentanteFormData[K]) => setForm((current) => ({ ...current, [key]: value }));
  const aziendaDisponibili = aziende.filter((azienda) => !form.aziende.some((x) => x.azienda_id === azienda.id));
  const associazioneConNome = useMemo(() => form.aziende.map((item) => ({ item, azienda: aziende.find((x) => x.id === item.azienda_id) })).filter((x): x is { item: AssociazioneAziendaForm; azienda: AziendaRappresentata } => Boolean(x.azienda)), [form.aziende, aziende]);

  function aggiornaAssociazione(indice: number, patch: Partial<AssociazioneAziendaForm>) {
    set("aziende", form.aziende.map((item, i) => i === indice ? { ...item, ...patch } : item));
  }

  function valida() {
    const next: Errori = {};
    if (!form.nome.trim()) next.nome = "Il nome è obbligatorio.";
    if (!form.cognome.trim()) next.cognome = "Il cognome è obbligatorio.";
    if (!validaEmail(form.email)) next.email = "Inserisci un indirizzo email valido.";
    if (!validaEmail(form.email_secondaria)) next.email_secondaria = "Inserisci un indirizzo email valido.";
    (["avatar_url", "sito_web", "linkedin_url"] as const).forEach((campo) => { if (!validaUrl(form[campo])) next[campo] = "Inserisci un URL valido."; });
    setErrori(next);
    if (next.nome || next.cognome) setTab("Dati personali");
    else if (next.email || next.email_secondaria || next.sito_web || next.linkedin_url) setTab("Contatti");
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valida()) return;
    setSalvataggio(true);
    try {
      if (!ignoraDuplicati) {
        const possibili = await trovaPossibiliDuplicati(form, id);
        if (possibili.length > 0) { setDuplicati(possibili); setSalvataggio(false); return; }
      }
      const savedId = await salvaRappresentante(form, id);
      router.push(`/rubrica/rappresentanti/${savedId}`);
    } catch (errore) {
      setToast({ message: errore instanceof Error ? errore.message : "Errore durante il salvataggio.", error: true });
      setSalvataggio(false);
    }
  }

  async function aggiungiTag() {
    if (!nuovoTag.trim()) return;
    try { const creato = await creaTag(nuovoTag); setTag((x) => [...x, creato]); set("tag_ids", [...form.tag_ids, creato.id]); setNuovoTag(""); }
    catch (errore) { setToast({ message: errore instanceof Error ? errore.message : "Errore creazione tag.", error: true }); }
  }

  if (caricamento) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="sticky top-[84px] z-30 overflow-x-auto rounded-2xl border border-[#2B2F5E]/8 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex min-w-max gap-1">{tabs.map((item, index) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-xl px-4 py-2.5 text-sm font-medium ${tab === item ? "bg-[#2B2F5E] text-white" : "text-[#2B2F5E] hover:bg-[#F2F2F2]"}`}>{index + 1}. {item}</button>)}</div>
      </div>

      {tab === "Dati personali" && <SectionCard title="Dati personali" description="Informazioni anagrafiche e stato del rappresentante.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nome" required error={errori.nome}><input className={inputClass} value={form.nome} onChange={(e) => set("nome", e.target.value)} /></FormField>
          <FormField label="Cognome" required error={errori.cognome}><input className={inputClass} value={form.cognome} onChange={(e) => set("cognome", e.target.value)} /></FormField>
          <FormField label="Ruolo o qualifica"><input className={inputClass} value={form.ruolo} onChange={(e) => set("ruolo", e.target.value)} placeholder="Es. agente commerciale" /></FormField>
          <FormField label="Azienda personale"><input className={inputClass} value={form.azienda_personale} onChange={(e) => set("azienda_personale", e.target.value)} /></FormField>
          <FormField label="URL foto o avatar" error={errori.avatar_url}><input className={inputClass} value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://..." /></FormField>
          <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-[#2B2F5E]/10 px-4 text-sm font-medium text-[#2B2F5E]"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 accent-[#64B445]" />Rappresentante attivo</label>
        </div>
      </SectionCard>}

      {tab === "Contatti" && <SectionCard title="Contatti" description="I recapiti saranno cliccabili nella scheda di dettaglio.">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Cellulare principale"><input type="tel" className={inputClass} value={form.cellulare} onChange={(e) => set("cellulare", e.target.value)} /></FormField>
          <FormField label="Secondo telefono"><input type="tel" className={inputClass} value={form.telefono_secondario} onChange={(e) => set("telefono_secondario", e.target.value)} /></FormField>
          <FormField label="Email principale" error={errori.email}><input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} /></FormField>
          <FormField label="Seconda email" error={errori.email_secondaria}><input type="email" className={inputClass} value={form.email_secondaria} onChange={(e) => set("email_secondaria", e.target.value)} /></FormField>
          <FormField label="Sito web personale" error={errori.sito_web}><input className={inputClass} value={form.sito_web} onChange={(e) => set("sito_web", e.target.value)} placeholder="https://..." /></FormField>
          <FormField label="Profilo LinkedIn" error={errori.linkedin_url}><input className={inputClass} value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." /></FormField>
          <FormField label="Indirizzo"><input className={inputClass} value={form.indirizzo} onChange={(e) => set("indirizzo", e.target.value)} /></FormField>
          <FormField label="Comune"><input className={inputClass} value={form.comune} onChange={(e) => set("comune", e.target.value)} /></FormField>
          <FormField label="Provincia"><input className={inputClass} value={form.provincia} onChange={(e) => set("provincia", e.target.value)} /></FormField>
          <FormField label="Regione"><input className={inputClass} value={form.regione} onChange={(e) => set("regione", e.target.value)} /></FormField>
          <FormField label="CAP"><input className={inputClass} value={form.cap} onChange={(e) => set("cap", e.target.value)} /></FormField>
          <FormField label="Area geografica di competenza"><input className={inputClass} value={form.area_competenza} onChange={(e) => set("area_competenza", e.target.value)} /></FormField>
        </div>
      </SectionCard>}

      {tab === "Aziende e prodotti" && <div className="space-y-4">
        <SectionCard title="Aziende rappresentate" description="Associa aziende esistenti o creane una senza uscire dal form." actions={<button type="button" className={secondaryButton} onClick={() => setQuickCompany(true)}><AppIcon name="plus" size={15} />Nuova azienda</button>}>
          <div className="flex flex-col gap-3 sm:flex-row"><select className={inputClass} defaultValue="" onChange={(e) => { if (e.target.value) set("aziende", [...form.aziende, associazioneVuota(e.target.value)]); e.target.value = ""; }}><option value="">Cerca e seleziona un’azienda...</option>{aziendaDisponibili.map((azienda) => <option key={azienda.id} value={azienda.id}>{azienda.nome_commerciale || azienda.ragione_sociale}</option>)}</select></div>
        </SectionCard>
        {associazioneConNome.map(({ item, azienda }, indice) => {
          const prodottiAzienda = prodotti.filter((p) => p.azienda_id === azienda.id);
          return <SectionCard key={azienda.id} title={azienda.nome_commerciale || azienda.ragione_sociale} description={azienda.sito_web || azienda.email || "Anagrafica azienda"} actions={<button type="button" onClick={() => set("aziende", form.aziende.filter((_, i) => i !== indice))} className="text-xs font-semibold text-red-600">Rimuovi</button>}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Referente interno"><input className={inputClass} value={item.referente_interno} onChange={(e) => aggiornaAssociazione(indice, { referente_interno: e.target.value })} /></FormField>
              <FormField label="Area territoriale"><input className={inputClass} value={item.area_territoriale} onChange={(e) => aggiornaAssociazione(indice, { area_territoriale: e.target.value })} /></FormField>
              <FormField label="Stato collaborazione"><select className={inputClass} value={item.stato_collaborazione} onChange={(e) => aggiornaAssociazione(indice, { stato_collaborazione: e.target.value as AssociazioneAziendaForm["stato_collaborazione"] })}><option value="attiva">Attiva</option><option value="sospesa">Sospesa</option><option value="terminata">Terminata</option></select></FormField>
              <FormField label="Inizio collaborazione"><input type="date" className={inputClass} value={item.data_inizio} onChange={(e) => aggiornaAssociazione(indice, { data_inizio: e.target.value })} /></FormField>
              <FormField label="Fine collaborazione"><input type="date" className={inputClass} value={item.data_fine} onChange={(e) => aggiornaAssociazione(indice, { data_fine: e.target.value })} /></FormField>
              <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-[#2B2F5E]/10 px-4 text-sm text-[#2B2F5E]"><input type="checkbox" checked={item.active} onChange={(e) => aggiornaAssociazione(indice, { active: e.target.checked })} className="accent-[#64B445]" />Collaborazione attiva</label>
              <FormField label="Note azienda"><textarea className={`${inputClass} min-h-24`} value={item.note} onChange={(e) => aggiornaAssociazione(indice, { note: e.target.value })} /></FormField>
              <div className="md:col-span-2"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-[#2B2F5E]">Prodotti rappresentati</span><button type="button" onClick={() => setQuickProductCompany(azienda.id)} className="text-xs font-semibold text-[#2D80B3]">+ Aggiungi prodotto</button></div><div className="grid gap-2 sm:grid-cols-2">{prodottiAzienda.map((prodotto) => <label key={prodotto.id} className="flex items-center gap-2 rounded-xl border border-[#2B2F5E]/10 p-3 text-sm text-[#2B2F5E]"><input type="checkbox" checked={item.prodotto_ids.includes(prodotto.id)} onChange={(e) => aggiornaAssociazione(indice, { prodotto_ids: e.target.checked ? [...item.prodotto_ids, prodotto.id] : item.prodotto_ids.filter((x) => x !== prodotto.id) })} className="accent-[#64B445]" /><span>{prodotto.nome}</span>{prodotto.codice && <span className="ml-auto text-xs text-[#2B2F5E]/45">{prodotto.codice}</span>}</label>)}</div>{prodottiAzienda.length === 0 && <p className="rounded-xl bg-[#F7F8FA] p-3 text-xs text-[#2B2F5E]/55">Nessun prodotto censito per questa azienda.</p>}</div>
            </div>
          </SectionCard>;
        })}
      </div>}

      {tab === "Informazioni commerciali" && <SectionCard title="Informazioni commerciali">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Area o zona di competenza"><input className={inputClass} value={form.zona_commerciale} onChange={(e) => set("zona_commerciale", e.target.value)} /></FormField>
          <FormField label="Province servite"><input className={inputClass} value={form.province_servite} onChange={(e) => set("province_servite", e.target.value)} placeholder="MI, BG, BS" /></FormField>
          <FormField label="Condizioni commerciali"><textarea className={`${inputClass} min-h-24`} value={form.condizioni_commerciali} onChange={(e) => set("condizioni_commerciali", e.target.value)} /></FormField>
          <FormField label="Sconto abituale (%)"><input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.sconto_abituale} onChange={(e) => set("sconto_abituale", e.target.value)} /></FormField>
          <FormField label="Tempi medi di consegna"><input className={inputClass} value={form.tempi_consegna} onChange={(e) => set("tempi_consegna", e.target.value)} /></FormField>
          <FormField label="Modalità di contatto preferita"><select className={inputClass} value={form.modalita_contatto_preferita} onChange={(e) => set("modalita_contatto_preferita", e.target.value)}><option value="">Non indicata</option><option>Telefono</option><option>Email</option><option>WhatsApp</option><option>Riunione</option></select></FormField>
          <FormField label="Livello di interesse"><select className={inputClass} value={form.livello_interesse} onChange={(e) => set("livello_interesse", e.target.value as RappresentanteFormData["livello_interesse"])}><option value="basso">Basso</option><option value="medio">Medio</option><option value="alto">Alto</option></select></FormField>
          <FormField label="Priorità"><select className={inputClass} value={form.priorita} onChange={(e) => set("priorita", e.target.value as RappresentanteFormData["priorita"])}><option value="bassa">Bassa</option><option value="normale">Normale</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></FormField>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[#2B2F5E]/10 px-4 text-sm text-[#2B2F5E]"><input type="checkbox" checked={form.disponibilita_sopralluoghi} onChange={(e) => set("disponibilita_sopralluoghi", e.target.checked)} className="accent-[#64B445]" />Disponibile per sopralluoghi</label>
          <FormField label="Note commerciali"><textarea className={`${inputClass} min-h-24`} value={form.note_commerciali} onChange={(e) => set("note_commerciali", e.target.value)} /></FormField>
          <div className="md:col-span-2"><span className="text-sm font-medium text-[#2B2F5E]">Tag personalizzati</span><div className="mt-2 flex flex-wrap gap-2">{tag.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-full border border-[#2B2F5E]/10 px-3 py-2 text-xs text-[#2B2F5E]"><input type="checkbox" checked={form.tag_ids.includes(item.id)} onChange={(e) => set("tag_ids", e.target.checked ? [...form.tag_ids, item.id] : form.tag_ids.filter((x) => x !== item.id))} className="accent-[#64B445]" />{item.nome}</label>)}</div><div className="mt-3 flex max-w-md gap-2"><input className={inputClass} value={nuovoTag} onChange={(e) => setNuovoTag(e.target.value)} placeholder="Nuovo tag" /><button type="button" className={secondaryButton} onClick={aggiungiTag}>Aggiungi</button></div></div>
        </div>
      </SectionCard>}

      {tab === "Note e allegati" && <SectionCard title="Note e allegati">
        <FormField label="Note generali"><textarea className={`${inputClass} min-h-40`} value={form.note_generali} onChange={(e) => set("note_generali", e.target.value)} /></FormField>
        <div className="mt-4 rounded-xl bg-[#5E9AD3]/8 p-4 text-sm text-[#2B2F5E]">{id ? "Gli allegati si gestiscono dalla scheda di dettaglio, nella tab Allegati." : "Salva prima il rappresentante: potrai caricare cataloghi, listini, schede tecniche, brochure e immagini dalla sua scheda."}</div>
      </SectionCard>}

      {duplicati.length > 0 && <div className="rounded-2xl border border-[#D79D06]/30 bg-[#D79D06]/8 p-4 text-sm text-[#2B2F5E]"><p className="font-semibold">Possibili duplicati rilevati</p><p className="mt-1">Controlla prima di creare una nuova anagrafica:</p><ul className="mt-2 list-disc pl-5">{duplicati.map((x) => <li key={x.id}><a className="text-[#2D80B3] underline" target="_blank" href={`/rubrica/rappresentanti/${x.id}`}>{x.nome} {x.cognome}</a>{x.email ? ` · ${x.email}` : ""}</li>)}</ul><button type="button" className={`${secondaryButton} mt-3`} onClick={() => { setIgnoraDuplicati(true); setDuplicati([]); }}>Ho verificato, salva comunque</button></div>}

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" onClick={() => router.back()} className={secondaryButton}>Annulla</button><button type="submit" disabled={salvataggio} className={primaryButton}>{salvataggio ? "Salvataggio..." : id ? "Salva modifiche" : "Crea rappresentante"}</button></div>

      {quickCompany && <QuickCompany categories={categorie} onClose={() => setQuickCompany(false)} onCreated={async (newId) => { const refreshed = await caricaAziende(); setAziende(refreshed); set("aziende", [...form.aziende, associazioneVuota(newId)]); setQuickCompany(false); }} />}
      {quickProductCompany && <QuickProduct companyId={quickProductCompany} categories={categorie} onClose={() => setQuickProductCompany(null)} onCreated={async (newId) => { const refreshed = await caricaProdotti(); setProdotti(refreshed); const index = form.aziende.findIndex((x) => x.azienda_id === quickProductCompany); if (index >= 0) aggiornaAssociazione(index, { prodotto_ids: [...form.aziende[index].prodotto_ids, newId] }); setQuickProductCompany(null); }} />}
      {toast && <Toast message={toast.message} error={toast.error} onClose={() => setToast(null)} />}
    </form>
  );
}

function CategoryChecks({ categories, selected, onChange }: { categories: CategoriaRappresentante[]; selected: string[]; onChange: (value: string[]) => void }) {
  return <div className="grid gap-2 sm:grid-cols-2">{categories.map((x) => <label key={x.id} className="flex items-center gap-2 rounded-xl border border-[#2B2F5E]/10 p-2.5 text-xs text-[#2B2F5E]"><input type="checkbox" checked={selected.includes(x.id)} onChange={(e) => onChange(e.target.checked ? [...selected, x.id] : selected.filter((id) => id !== x.id))} className="accent-[#64B445]" />{x.nome}</label>)}</div>;
}

function QuickCompany({ categories, onClose, onCreated }: { categories: CategoriaRappresentante[]; onClose: () => void; onCreated: (id: string) => Promise<void> }) {
  const [nome, setNome] = useState(""); const [sito, setSito] = useState(""); const [email, setEmail] = useState(""); const [telefono, setTelefono] = useState(""); const [selected, setSelected] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  return <Modal title="Crea nuova azienda" onClose={onClose}><div className="space-y-4"><FormField label="Ragione sociale" required><input autoFocus className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField label="Sito web"><input className={inputClass} value={sito} onChange={(e) => setSito(e.target.value)} /></FormField><FormField label="Email"><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></FormField><FormField label="Telefono"><input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} /></FormField></div><div><p className="mb-2 text-sm font-medium text-[#2B2F5E]">Categorie</p><CategoryChecks categories={categories} selected={selected} onChange={setSelected} /></div><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={onClose}>Annulla</button><button type="button" disabled={!nome.trim() || busy} className={primaryButton} onClick={async () => { setBusy(true); const newId = await salvaAzienda({ ragione_sociale: nome, sito_web: sito, email, telefono }, selected); await onCreated(newId); }}>{busy ? "Creazione..." : "Crea azienda"}</button></div></div></Modal>;
}

function QuickProduct({ companyId, categories, onClose, onCreated }: { companyId: string; categories: CategoriaRappresentante[]; onClose: () => void; onCreated: (id: string) => Promise<void> }) {
  const [nome, setNome] = useState(""); const [codice, setCodice] = useState(""); const [descrizione, setDescrizione] = useState(""); const [link, setLink] = useState(""); const [selected, setSelected] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  return <Modal title="Crea nuovo prodotto" onClose={onClose}><div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><FormField label="Nome prodotto" required><input autoFocus className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} /></FormField><FormField label="Codice o sigla"><input className={inputClass} value={codice} onChange={(e) => setCodice(e.target.value)} /></FormField></div><FormField label="Descrizione breve"><textarea className={`${inputClass} min-h-24`} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} /></FormField><FormField label="Link prodotto"><input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} /></FormField><div><p className="mb-2 text-sm font-medium text-[#2B2F5E]">Categorie</p><CategoryChecks categories={categories} selected={selected} onChange={setSelected} /></div><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={onClose}>Annulla</button><button type="button" disabled={!nome.trim() || busy} className={primaryButton} onClick={async () => { setBusy(true); const newId = await salvaProdotto({ nome, azienda_id: companyId, codice, descrizione, link_prodotto: link }, selected); await onCreated(newId); }}>{busy ? "Creazione..." : "Crea prodotto"}</button></div></div></Modal>;
}
