"use client";

import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import {
  PRIORITA_COMMESSA,
  type CommessaElenco,
  type PrioritaCommessa,
} from "@/lib/commesse/lista";
import { COLORE_TIPO_COMMESSA, SIMBOLO_TIPO_COMMESSA } from "@/lib/tipiCommesse";

const stilePriorita: Record<PrioritaCommessa, string> = {
  Urgente: "bg-[#D96F4B]/12 text-[#B84929]",
  Alta: "bg-[#D79D06]/12 text-[#A87500]",
  Normale: "bg-[#5E9AD3]/12 text-[#2D80B3]",
  Bassa: "bg-[#64B445]/12 text-[#4D9634]",
  Terminato: "bg-gray-100 text-gray-500",
};

function formattaData(value: string | null | undefined) {
  if (!value) return "—";
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("it-IT");
}

export default function CommesseTable({
  commesse,
  onPriorityChange,
  onDelete,
}: {
  commesse: CommessaElenco[];
  onPriorityChange: (commessa: CommessaElenco, priorita: PrioritaCommessa) => void;
  onDelete: (commessa: CommessaElenco) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#2B2F5E]/8 bg-white shadow-sm">
      <table className="min-w-[1050px] w-full border-collapse text-left">
        <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-[0.08em] text-[#2B2F5E]/55">
          <tr>
            <th className="px-4 py-3 font-semibold">Commessa</th>
            <th className="px-4 py-3 font-semibold">Cliente</th>
            <th className="px-4 py-3 font-semibold">Posizione</th>
            <th className="px-4 py-3 font-semibold">Tipologia</th>
            <th className="px-4 py-3 font-semibold">Priorità</th>
            <th className="px-4 py-3 font-semibold">Ultimo aggiornamento</th>
            <th className="px-4 py-3 text-right font-semibold">Azioni</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2B2F5E]/8">
          {commesse.map((commessa) => (
            <tr key={commessa.id} className="group hover:bg-[#F8F9FB]">
              <td className="px-4 py-3">
                <Link href={`/commesse/${commessa.id}`} className="block max-w-72">
                  <span className="block truncate text-sm font-semibold text-[#2B2F5E]">{commessa.codice || "Senza codice"}</span>
                  <span className="mt-0.5 block truncate text-xs text-[#2B2F5E]/55">{commessa.titolo}</span>
                </Link>
              </td>
              <td className="max-w-48 truncate px-4 py-3 text-sm text-[#2B2F5E]/75">{commessa.cliente_nome || "—"}</td>
              <td className="max-w-48 truncate px-4 py-3 text-sm text-[#2B2F5E]/75">{commessa.posizione || "—"}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F6F7FA] px-2.5 py-1 text-xs text-[#2B2F5E]">
                  <span className={COLORE_TIPO_COMMESSA[commessa.tipo_commessa]}>{SIMBOLO_TIPO_COMMESSA[commessa.tipo_commessa]}</span>
                  {commessa.tipo_commessa}
                </span>
              </td>
              <td className="px-4 py-3">
                <select
                  value={commessa.priorita}
                  onChange={(event) => onPriorityChange(commessa, event.target.value as PrioritaCommessa)}
                  className={`rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold outline-none ${stilePriorita[commessa.priorita]}`}
                  aria-label={`Priorità di ${commessa.titolo}`}
                >
                  {PRIORITA_COMMESSA.map((priorita) => <option key={priorita}>{priorita}</option>)}
                </select>
              </td>
              <td className="px-4 py-3">
                <span className="block text-xs text-[#2B2F5E]/65">{formattaData(commessa.dataUltimaNota || commessa.updated_at || commessa.created_at)}</span>
                {commessa.ultimaNota && <span className="mt-0.5 block max-w-56 truncate text-xs text-[#2B2F5E]/40">{commessa.ultimaNota}</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Link href={`/commesse/${commessa.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#2D80B3] hover:bg-[#5E9AD3]/10" title="Visualizza commessa" aria-label="Visualizza commessa">
                    <AppIcon name="eye" size={17} />
                  </Link>
                  <button type="button" onClick={() => onDelete(commessa)} className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" title="Elimina commessa" aria-label="Elimina commessa">
                    <AppIcon name="trash" size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
