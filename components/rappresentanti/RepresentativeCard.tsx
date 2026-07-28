"use client";

import type { Rappresentante } from "@/lib/rappresentanti/types";
import { formattaDataIt, inizialiRappresentante } from "@/lib/rappresentanti/utils";
import { BadgeList, StatusBadge, secondaryButton } from "./Common";

export default function RepresentativeCard({ rappresentante, onEdit }: { rappresentante: Rappresentante; onEdit: () => void }) {
  const nomeAziende = rappresentante.aziende.map((x) => ({ id: x.azienda.id, label: x.azienda.nome_commerciale || x.azienda.ragione_sociale }));
  return (
    <article className="rounded-2xl border border-[#2B2F5E]/8 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#5E9AD3]/12 font-bold text-[#2D80B3]">
          {rappresentante.avatar_url ? <img src={rappresentante.avatar_url} alt="" className="h-full w-full object-cover" /> : inizialiRappresentante(rappresentante.nome, rappresentante.cognome)}
        </div>
        <div className="min-w-0 flex-1"><a href={`/rubrica/rappresentanti/${rappresentante.id}`} className="font-semibold text-[#2B2F5E] hover:text-[#2D80B3]">{rappresentante.nome} {rappresentante.cognome}</a><p className="truncate text-xs text-[#2B2F5E]/55">{rappresentante.ruolo || "Ruolo non indicato"}</p></div>
        <StatusBadge active={rappresentante.active} />
      </div>
      <div className="mt-4 space-y-3"><BadgeList items={nomeAziende} /><BadgeList items={rappresentante.categorie.map((x) => ({ id: x.id, label: x.nome, color: x.colore }))} /></div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[#2B2F5E]/45">Telefono</dt><dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">{rappresentante.cellulare || "—"}</dd></div><div><dt className="text-[#2B2F5E]/45">Email</dt><dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">{rappresentante.email || "—"}</dd></div><div><dt className="text-[#2B2F5E]/45">Area</dt><dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">{rappresentante.regione || rappresentante.area_competenza || "—"}</dd></div><div><dt className="text-[#2B2F5E]/45">Ultimo contatto</dt><dd className="mt-0.5 font-medium text-[#2B2F5E]">{formattaDataIt(rappresentante.ultimo_contatto_at)}</dd></div></dl>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#2B2F5E]/8 pt-4">
        {rappresentante.cellulare && <a title="Chiama" href={`tel:${rappresentante.cellulare}`} className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}>Chiama</a>}
        {rappresentante.email && <a title="Invia email" href={`mailto:${rappresentante.email}`} className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}>Email</a>}
        {(rappresentante.sito_web || rappresentante.aziende.find((x) => x.azienda.sito_web)?.azienda.sito_web) && <a title="Apri sito" target="_blank" rel="noreferrer" href={rappresentante.sito_web || rappresentante.aziende.find((x) => x.azienda.sito_web)?.azienda.sito_web || "#"} className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}>Sito</a>}
        <a href={`/rubrica/rappresentanti/${rappresentante.id}`} className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}>Scheda</a>
        <button type="button" onClick={onEdit} className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}>Modifica</button>
      </div>
    </article>
  );
}
