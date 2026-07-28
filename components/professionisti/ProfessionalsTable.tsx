"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Professionista } from "@/lib/professionisti/types";
import { formattaDataProfessionista } from "@/lib/professionisti/utils";

export type ProfessionalAction = "view" | "edit" | "duplicate" | "delete";

export default function ProfessionalsTable({
  professionisti,
  onAction,
}: {
  professionisti: Professionista[];
  onAction: (action: ProfessionalAction, item: Professionista) => void;
}) {
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
    openUp: boolean;
  } | null>(null);
  const selected = professionisti.find((item) => item.id === menu?.id);

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
      top: spazioSotto < 190 ? rect.top - 8 : rect.bottom + 8,
      left: Math.max(
        12,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)
      ),
      openUp: spazioSotto < 190,
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-[#2B2F5E]/8 bg-white shadow-sm">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-wide text-[#2B2F5E]/55">
            <tr>
              {[
                "Professionista",
                "Professione",
                "Albo",
                "Provincia",
                "N. iscrizione",
                "Prima iscrizione",
                "Partita IVA",
                "PEC",
                "Azioni",
              ].map((label) => (
                <th key={label} className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2B2F5E]/7">
            {professionisti.map((item) => (
              <tr
                key={item.id}
                onClick={() => onAction("view", item)}
                className="cursor-pointer hover:bg-[#F8FAFC]"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#2B2F5E]">
                    {item.cognome || "—"} {item.nome || ""}
                  </p>
                  <p className="text-xs text-[#2B2F5E]/50">
                    {item.codice_fiscale || "Codice fiscale non indicato"}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-[#2B2F5E]">
                  {item.professione || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[#2B2F5E]">
                  <p>{item.albo || "—"}</p>
                  {item.sezione && (
                    <p className="text-[#2B2F5E]/50">Sez. {item.sezione}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{item.provincia || "—"}</td>
                <td className="px-4 py-3 text-xs">{item.numero || "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {formattaDataProfessionista(item.prima_iscrizione)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {item.partita_iva || "—"}
                </td>
                <td className="max-w-52 truncate px-4 py-3 text-xs">
                  {item.pec ? (
                    <a
                      href={`mailto:${item.pec}`}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:text-[#2D80B3]"
                    >
                      {item.pec}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  className="px-4 py-3"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Azioni professionista"
                    aria-expanded={menu?.id === item.id}
                    onClick={(event) => toggleMenu(event, item.id)}
                    className="h-9 w-9 rounded-xl border border-[#2B2F5E]/10 bg-white font-bold text-[#2B2F5E] hover:bg-[#F2F2F2]"
                  >
                    •••
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {menu &&
        selected &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Chiudi menu azioni"
              className="fixed inset-0 z-[1390] cursor-default"
              onClick={() => setMenu(null)}
            />
            <div
              className="fixed z-[1400] w-48 overflow-hidden rounded-xl border border-[#2B2F5E]/10 bg-white py-1 shadow-xl"
              style={{
                top: menu.top,
                left: menu.left,
                transform: menu.openUp ? "translateY(-100%)" : undefined,
              }}
            >
              {[
                ["view", "Visualizza"],
                ["edit", "Modifica"],
                ["duplicate", "Duplica"],
                ["delete", "Elimina"],
              ].map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    setMenu(null);
                    onAction(action as ProfessionalAction, selected);
                  }}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-[#F2F2F2] ${
                    action === "delete" ? "text-red-600" : "text-[#2B2F5E]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
