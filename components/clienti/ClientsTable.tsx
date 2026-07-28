"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Cliente } from "@/lib/clienti/types";

export type ClientAction = "view" | "edit" | "duplicate" | "delete";

export default function ClientsTable({
  clienti,
  onAction,
}: {
  clienti: Cliente[];
  onAction: (action: ClientAction, item: Cliente) => void;
}) {
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
    openUp: boolean;
  } | null>(null);
  const selected = clienti.find((item) => item.id === menu?.id);

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
                "Cliente",
                "Tipo",
                "P. IVA / C.F.",
                "Comune",
                "Referente",
                "Telefono",
                "Email",
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
            {clienti.map((item) => (
              <tr
                key={item.id}
                onClick={() => onAction("view", item)}
                className="cursor-pointer hover:bg-[#F8FAFC]"
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#2B2F5E]">
                    {item.cliente || "—"}
                  </p>
                  <p className="max-w-64 truncate text-xs text-[#2B2F5E]/50">
                    {item.indirizzo || "Indirizzo non indicato"}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      item.tipo_cliente === "azienda"
                        ? "bg-[#D79D06]/10 text-[#9A6800]"
                        : "bg-[#5E9AD3]/10 text-[#2D80B3]"
                    }`}
                  >
                    {item.tipo_cliente === "azienda"
                      ? "Azienda"
                      : "Persona fisica"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#2B2F5E]">
                  <p>{item.piva || "—"}</p>
                  {item.tipo_cliente === "azienda" && item.codice_fiscale && (
                    <p className="text-[#2B2F5E]/50">
                      C.F. {item.codice_fiscale}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[#2B2F5E]">
                  {item.comune || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[#2B2F5E]">
                  {item.referente || "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {item.telefono ? (
                    <a
                      href={`tel:${item.telefono}`}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:text-[#2D80B3]"
                    >
                      {item.telefono}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-52 truncate px-4 py-3 text-xs">
                  {item.email ? (
                    <a
                      href={`mailto:${item.email}`}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:text-[#2D80B3]"
                    >
                      {item.email}
                    </a>
                  ) : (
                    "—"
                  )}
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
                    aria-label="Azioni cliente"
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
                    onAction(action as ClientAction, selected);
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
