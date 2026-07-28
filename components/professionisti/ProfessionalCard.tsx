"use client";

import type { Professionista } from "@/lib/professionisti/types";
import {
  formattaDataProfessionista,
  inizialiProfessionista,
} from "@/lib/professionisti/utils";
import { secondaryButton } from "@/components/rappresentanti/Common";

export default function ProfessionalCard({
  professionista,
  onView,
  onEdit,
}: {
  professionista: Professionista;
  onView: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[#2B2F5E]/8 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#5E9AD3]/12 font-bold text-[#2D80B3]">
          {inizialiProfessionista(
            professionista.nome,
            professionista.cognome
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onView}
            className="text-left font-semibold text-[#2B2F5E] hover:text-[#2D80B3]"
          >
            {professionista.cognome || "—"} {professionista.nome || ""}
          </button>
          <p className="truncate text-xs text-[#2B2F5E]/55">
            {professionista.professione || "Professione non indicata"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {professionista.albo && (
          <span className="rounded-full bg-[#5E9AD3]/10 px-2.5 py-1 text-[11px] font-medium text-[#2D80B3]">
            {professionista.albo}
          </span>
        )}
        {professionista.sezione && (
          <span className="rounded-full bg-[#D79D06]/10 px-2.5 py-1 text-[11px] font-medium text-[#9A6800]">
            Sezione {professionista.sezione}
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-[#2B2F5E]/45">Provincia</dt>
          <dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">
            {professionista.provincia || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[#2B2F5E]/45">N. iscrizione</dt>
          <dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">
            {professionista.numero || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[#2B2F5E]/45">Prima iscrizione</dt>
          <dd className="mt-0.5 font-medium text-[#2B2F5E]">
            {formattaDataProfessionista(professionista.prima_iscrizione)}
          </dd>
        </div>
        <div>
          <dt className="text-[#2B2F5E]/45">Partita IVA</dt>
          <dd className="mt-0.5 truncate font-medium text-[#2B2F5E]">
            {professionista.partita_iva || "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[#2B2F5E]/8 pt-4">
        {professionista.pec && (
          <a
            href={`mailto:${professionista.pec}`}
            className={`${secondaryButton} min-h-9 px-3 py-1.5 text-xs`}
          >
            PEC
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
