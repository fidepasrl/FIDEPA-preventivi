"use client";

import { useEffect, useState } from "react";
import { caricaContatti, registraContatto } from "@/lib/rappresentanti/api";
import type { ContattoRappresentante, TipoContatto } from "@/lib/rappresentanti/types";
import { formattaDataIt } from "@/lib/rappresentanti/utils";
import { EmptyState, FormField, Modal, Toast, inputClass, primaryButton, secondaryButton } from "./Common";

const iniziale = { data_contatto: new Date().toISOString().slice(0, 16), tipo: "telefonata" as TipoContatto, oggetto: "", descrizione: "", esito: "", prossima_azione: "", prossimo_ricontatto_at: "" };

export default function ContactHistoryTimeline({ rappresentanteId, openForm = false, onRecorded }: { rappresentanteId: string; openForm?: boolean; onRecorded?: () => void }) {
  const [contatti, setContatti] = useState<ContattoRappresentante[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(openForm);
  const [form, setForm] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const load = () => caricaContatti(rappresentanteId).then(setContatti).catch((e) => setToast({ message: e.message, error: true })).finally(() => setLoading(false));
  useEffect(() => { load(); }, [rappresentanteId]);

  async function save() {
    if (!form.oggetto.trim()) return;
    setBusy(true);
    try { await registraContatto(rappresentanteId, { ...form, data_contatto: new Date(form.data_contatto).toISOString(), prossimo_ricontatto_at: form.prossimo_ricontatto_at ? new Date(form.prossimo_ricontatto_at).toISOString() : "" }); setModal(false); setForm(iniziale); await load(); onRecorded?.(); setToast({ message: "Contatto registrato." }); }
    catch (e) { setToast({ message: e instanceof Error ? e.message : "Errore registrazione contatto.", error: true }); }
    finally { setBusy(false); }
  }

  return <div>
    <div className="mb-5 flex justify-end"><button type="button" className={primaryButton} onClick={() => setModal(true)}>Registra contatto</button></div>
    {loading ? <div className="h-40 animate-pulse rounded-2xl bg-white" /> : contatti.length === 0 ? <EmptyState title="Non sono ancora presenti contatti registrati." actionLabel="Registra il primo contatto" onAction={() => setModal(true)} /> : <ol className="relative ml-3 border-l border-[#5E9AD3]/25 pl-7">{contatti.map((item) => <li key={item.id} className="relative mb-5 rounded-2xl border border-[#2B2F5E]/8 bg-white p-4 shadow-sm"><span className="absolute -left-[35px] top-5 h-4 w-4 rounded-full border-4 border-[#F2F2F2] bg-[#5E9AD3]" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-[#2B2F5E]">{item.oggetto}</p><p className="mt-0.5 text-xs font-medium capitalize text-[#2D80B3]">{item.tipo} · {new Date(item.data_contatto).toLocaleString("it-IT")}</p></div>{item.prossimo_ricontatto_at && <span className="rounded-full bg-[#D79D06]/12 px-3 py-1 text-xs font-semibold text-[#A87600]">Ricontatto {formattaDataIt(item.prossimo_ricontatto_at)}</span>}</div>{item.descrizione && <p className="mt-3 whitespace-pre-wrap text-sm text-[#2B2F5E]/75">{item.descrizione}</p>}<div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">{item.esito && <p><span className="text-[#2B2F5E]/45">Esito:</span> {item.esito}</p>}{item.prossima_azione && <p><span className="text-[#2B2F5E]/45">Prossima azione:</span> {item.prossima_azione}</p>}{item.utente_nome && <p><span className="text-[#2B2F5E]/45">Registrato da:</span> {item.utente_nome}</p>}</div></li>)}</ol>}
    {modal && <Modal title="Registra contatto" onClose={() => setModal(false)}><div className="grid gap-4 sm:grid-cols-2"><FormField label="Data e ora"><input type="datetime-local" className={inputClass} value={form.data_contatto} onChange={(e) => setForm({ ...form, data_contatto: e.target.value })} /></FormField><FormField label="Tipo"><select className={inputClass} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoContatto })}>{["telefonata", "email", "riunione", "visita", "videoconferenza", "messaggio", "altro"].map((x) => <option key={x}>{x}</option>)}</select></FormField><div className="sm:col-span-2"><FormField label="Oggetto" required><input className={inputClass} value={form.oggetto} onChange={(e) => setForm({ ...form, oggetto: e.target.value })} /></FormField></div><div className="sm:col-span-2"><FormField label="Descrizione"><textarea className={`${inputClass} min-h-28`} value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} /></FormField></div><FormField label="Esito"><input className={inputClass} value={form.esito} onChange={(e) => setForm({ ...form, esito: e.target.value })} /></FormField><FormField label="Prossima azione"><input className={inputClass} value={form.prossima_azione} onChange={(e) => setForm({ ...form, prossima_azione: e.target.value })} /></FormField><FormField label="Data prossimo ricontatto"><input type="datetime-local" className={inputClass} value={form.prossimo_ricontatto_at} onChange={(e) => setForm({ ...form, prossimo_ricontatto_at: e.target.value })} /></FormField></div><div className="mt-5 flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setModal(false)}>Annulla</button><button type="button" className={primaryButton} disabled={busy || !form.oggetto.trim()} onClick={save}>{busy ? "Salvataggio..." : "Registra"}</button></div></Modal>}
    {toast && <Toast message={toast.message} error={toast.error} onClose={() => setToast(null)} />}
  </div>;
}
