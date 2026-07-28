"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Rappresentante } from "@/lib/rappresentanti/types";
import { formattaDataIt } from "@/lib/rappresentanti/utils";
import { BadgeList, StatusBadge } from "./Common";

export default function RepresentativesTable({ rappresentanti, onAction }: { rappresentanti: Rappresentante[]; onAction: (action: "view" | "edit" | "contact" | "duplicate" | "toggle" | "delete", item: Rappresentante) => void }) {
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
    openUp: boolean;
  } | null>(null);
  const selected = rappresentanti.find((item) => item.id === menu?.id);

  function toggleMenu(event: React.MouseEvent<HTMLButtonElement>, id: string) {
    if (menu?.id === id) {
      setMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const spazioSotto = window.innerHeight - rect.bottom;
    setMenu({
      id,
      top: spazioSotto < 250 ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
      openUp: spazioSotto < 250,
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-[#2B2F5E]/8 bg-white shadow-sm">
        <table className="min-w-[1250px] w-full text-left text-sm">
          <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-wide text-[#2B2F5E]/55"><tr>{["Rappresentante", "Aziende rappresentate", "Prodotti principali", "Categorie", "Area geografica", "Telefono", "Email", "Ultimo contatto", "Stato", "Azioni"].map((x) => <th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead>
          <tbody className="divide-y divide-[#2B2F5E]/7">
            {rappresentanti.map((r) => <tr key={r.id} onClick={() => onAction("view", r)} className="cursor-pointer hover:bg-[#F8FAFC]">
              <td className="px-4 py-3"><p className="font-semibold text-[#2B2F5E]">{r.nome} {r.cognome}</p><p className="text-xs text-[#2B2F5E]/50">{r.ruolo || "—"}</p></td>
              <td className="px-4 py-3"><BadgeList items={r.aziende.map((x) => ({ id: x.azienda.id, label: x.azienda.nome_commerciale || x.azienda.ragione_sociale }))} /></td>
              <td className="px-4 py-3"><BadgeList items={r.prodotti.map((x) => ({ id: x.id, label: x.nome }))} /></td>
              <td className="px-4 py-3"><BadgeList items={r.categorie.map((x) => ({ id: x.id, label: x.nome, color: x.colore }))} /></td>
              <td className="px-4 py-3 text-xs text-[#2B2F5E]">{[r.regione, r.provincia].filter(Boolean).join(" · ") || r.area_competenza || "—"}</td>
              <td className="px-4 py-3 text-xs"><a href={r.cellulare ? `tel:${r.cellulare}` : undefined} onClick={(e) => e.stopPropagation()} className="hover:text-[#2D80B3]">{r.cellulare || "—"}</a></td>
              <td className="max-w-48 truncate px-4 py-3 text-xs"><a href={r.email ? `mailto:${r.email}` : undefined} onClick={(e) => e.stopPropagation()} className="hover:text-[#2D80B3]">{r.email || "—"}</a></td>
              <td className="px-4 py-3 text-xs">{formattaDataIt(r.ultimo_contatto_at)}</td>
              <td className="px-4 py-3"><StatusBadge active={r.active} /></td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><button type="button" aria-label="Azioni" title="Azioni" aria-expanded={menu?.id === r.id} onClick={(event) => toggleMenu(event, r.id)} className="h-9 w-9 rounded-xl border border-[#2B2F5E]/10 bg-white font-bold text-[#2B2F5E] hover:bg-[#F2F2F2]">•••</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>

      {menu && selected && createPortal(
        <>
          <button type="button" aria-label="Chiudi menu azioni" className="fixed inset-0 z-[1390] cursor-default" onClick={() => setMenu(null)} />
          <div
            className="fixed z-[1400] w-48 overflow-hidden rounded-xl border border-[#2B2F5E]/10 bg-white py-1 shadow-xl"
            style={{
              top: menu.top,
              left: menu.left,
              transform: menu.openUp ? "translateY(-100%)" : undefined,
            }}
          >
            {[["view", "Visualizza"], ["edit", "Modifica"], ["contact", "Registra contatto"], ["duplicate", "Duplica"], ["toggle", selected.active ? "Disattiva" : "Attiva"], ["delete", "Elimina"]].map(([action, label]) => <button key={action} type="button" onClick={() => { setMenu(null); onAction(action as Parameters<typeof onAction>[0], selected); }} className={`block w-full px-4 py-2 text-left text-sm hover:bg-[#F2F2F2] ${action === "delete" ? "text-red-600" : "text-[#2B2F5E]"}`}>{label}</button>)}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
