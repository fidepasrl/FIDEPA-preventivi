"use client";

import type { AziendaRappresentata, CategoriaRappresentante, FiltriRappresentanti, ProdottoRappresentato } from "@/lib/rappresentanti/types";
import { FILTRI_RAPPRESENTANTI_INIZIALI } from "@/lib/rappresentanti/types";
import { inputClass, secondaryButton } from "./Common";

export default function RepresentativesFilters({ filtri, onChange, categorie, aziende, prodotti, regioni, province }: {
  filtri: FiltriRappresentanti;
  onChange: (filtri: FiltriRappresentanti) => void;
  categorie: CategoriaRappresentante[];
  aziende: AziendaRappresentata[];
  prodotti: ProdottoRappresentato[];
  regioni: string[];
  province: string[];
}) {
  const set = <K extends keyof FiltriRappresentanti>(key: K, value: FiltriRappresentanti[K]) => onChange({ ...filtri, [key]: value });
  const attivi = Object.entries(filtri).filter(([, value]) => value && value !== "tutti");
  const etichetta = (key: string, value: string) => {
    const map: Record<string, string> = {
      categoria_id: categorie.find((x) => x.id === value)?.nome || value,
      azienda_id: aziende.find((x) => x.id === value)?.ragione_sociale || value,
      prodotto_id: prodotti.find((x) => x.id === value)?.nome || value,
      stato: value === "attivi" ? "Attivi" : "Non attivi",
      email: `Email ${value}`,
      telefono: `Telefono ${value}`,
      ultimo_contatto: value === "mai" ? "Mai contattati" : value === "oltre_90" ? "Oltre 90 giorni" : `Entro ${value} giorni`,
    };
    return map[key] || value;
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#2B2F5E]/8 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select className={inputClass} value={filtri.categoria_id} onChange={(e) => set("categoria_id", e.target.value)} aria-label="Categoria"><option value="">Tutte le categorie</option>{categorie.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
        <select className={inputClass} value={filtri.azienda_id} onChange={(e) => set("azienda_id", e.target.value)} aria-label="Azienda"><option value="">Tutte le aziende</option>{aziende.map((x) => <option key={x.id} value={x.id}>{x.nome_commerciale || x.ragione_sociale}</option>)}</select>
        <select className={inputClass} value={filtri.prodotto_id} onChange={(e) => set("prodotto_id", e.target.value)} aria-label="Prodotto"><option value="">Tutti i prodotti</option>{prodotti.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
        <select className={inputClass} value={filtri.regione} onChange={(e) => set("regione", e.target.value)} aria-label="Regione"><option value="">Tutte le regioni</option>{regioni.map((x) => <option key={x}>{x}</option>)}</select>
        <select className={inputClass} value={filtri.provincia} onChange={(e) => set("provincia", e.target.value)} aria-label="Provincia"><option value="">Tutte le province</option>{province.map((x) => <option key={x}>{x}</option>)}</select>
        <select className={inputClass} value={filtri.stato} onChange={(e) => set("stato", e.target.value as FiltriRappresentanti["stato"])} aria-label="Stato"><option value="tutti">Tutti gli stati</option><option value="attivi">Attivi</option><option value="non_attivi">Non attivi</option></select>
        <select className={inputClass} value={filtri.email} onChange={(e) => set("email", e.target.value as FiltriRappresentanti["email"])} aria-label="Presenza email"><option value="tutti">Email: tutte</option><option value="presente">Con email</option><option value="assente">Senza email</option></select>
        <select className={inputClass} value={filtri.telefono} onChange={(e) => set("telefono", e.target.value as FiltriRappresentanti["telefono"])} aria-label="Presenza telefono"><option value="tutti">Telefono: tutti</option><option value="presente">Con telefono</option><option value="assente">Senza telefono</option></select>
        <select className={inputClass} value={filtri.ultimo_contatto} onChange={(e) => set("ultimo_contatto", e.target.value as FiltriRappresentanti["ultimo_contatto"])} aria-label="Ultimo contatto"><option value="tutti">Ultimo contatto: tutti</option><option value="30">Ultimi 30 giorni</option><option value="90">Ultimi 90 giorni</option><option value="oltre_90">Oltre 90 giorni</option><option value="mai">Mai contattati</option></select>
      </div>
      {attivi.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-[#2B2F5E]/8 pt-3">
        {attivi.map(([key, value]) => <button type="button" key={key} onClick={() => set(key as keyof FiltriRappresentanti, FILTRI_RAPPRESENTANTI_INIZIALI[key as keyof FiltriRappresentanti])} className="rounded-full bg-[#5E9AD3]/10 px-3 py-1.5 text-xs font-medium text-[#2D80B3]">{etichetta(key, String(value))} ×</button>)}
        <button type="button" onClick={() => onChange(FILTRI_RAPPRESENTANTI_INIZIALI)} className={`${secondaryButton} ml-auto min-h-9 py-1.5 text-xs`}>Azzera filtri</button>
      </div>}
    </div>
  );
}
