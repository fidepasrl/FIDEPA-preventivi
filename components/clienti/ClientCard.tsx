"use client";

import { secondaryButton } from "@/components/rappresentanti/Common";
import type { Cliente } from "@/lib/clienti/types";
import { inizialiCliente } from "@/lib/clienti/utils";

export default function ClientCard({
  cliente,
  onView,
  onEdit,
}: {
  cliente: Cliente;
  onView: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[#2B2F5E]/8 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5E9AD3]/12 font-bold text-[#2D80B3]">
          {inizialiCliente(cliente.cliente)}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onView}
            className="max-w-full truncate text-left font-semibold text-[#2B2F5E] hover:text-[#2D80B3]"
          >
            {cliente.cliente || "—"}
          </button>
          <p className="truncate text-xs text-[#2B2F5E]/55">
            {cliente.comune || "Comune non indicato"}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              cliente.tipo_cliente === "azienda"
                ? "bg-[#D79D06]/10 text-[#9A6800]"
                : "bg-[#5E9AD3]/10 text-[#2D80B3]"
            }`}
          >
            {cliente.tipo_cliente === "azienda" ? "Azienda" : "Persona fisica"}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-[#2B2F5E]/45">
            {cliente.tipo_cliente === "azienda" ? "Partita IVA" : "P. IVA / C.F."}
          </dt>
          <dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">
            {cliente.piva || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[#2B2F5E]/45">Referente</dt>
          <dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">
            {cliente.referente || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[#2B2F5E]/45">Telefono</dt>
          <dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">
            {cliente.telefono || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[#2B2F5E]/45">Email</dt>
          <dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">
            {cliente.email || "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#2B2F5E]/8 pt-4">
        {cliente.telefono && (
          <a
            href={`tel:${cliente.telefono}`}
            className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}
          >
            Chiama
          </a>
        )}
        {cliente.email && (
          <a
            href={`mailto:${cliente.email}`}
            className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}
          >
            Email
          </a>
        )}
        <button
          type="button"
          onClick={onView}
          className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}
        >
          Visualizza
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}
        >
          Modifica
        </button>
      </div>
    </article>
  );
}
